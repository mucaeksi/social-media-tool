globalThis.createStudioBrowserAgent = ({ validBinding, validWindow, queue, publishing }) => {
  const sessions = new Map(), p = StudioPolicy, policy = StudioAgentPolicy;
  const stop = (panelTab) => sessions.delete(panelTab);
  const summary = (panelTab) => {
    const s = sessions.get(panelTab);
    if (s && (Date.now() > s.expiresAt || publishing())) stop(panelTab);
    const current = sessions.get(panelTab);
    return current ? { id: current.id, companyId: current.companyId, task: current.task, steps: current.steps, expiresAt: current.expiresAt,
      accountId: current.accountId } : null;
  };
  const anyActive = () => [...sessions.keys()].some((id) => summary(id));
  async function bindingsFor(sender, m, rows) {
    const result = [];
    for (const row of rows) {
      const b = await validBinding(sender, { userId: m.userId, companyId: m.companyId, accountId: row.accountId, platform: row.platform });
      if (!policy.safeURL(b.target.profileUrl, b.target.platform)) continue;
      result.push(b);
    }
    return result;
  }
  async function validate(m, sender) {
    const s = sessions.get(sender.tab.id);
    if (!summary(sender.tab.id) || !s || s.id !== m.sessionId || s.userId !== m.userId || s.companyId !== m.companyId)
      throw new Error("Firefox görevi sona erdi. Yeni görev başlatın.");
    if (publishing()) throw new Error("Yayın işlemi sürüyor. Firefox görevi durduruldu.");
    await validWindow(sender, m);
    const auth = await browser.tabs.sendMessage(sender.tab.id, { source: "studio-auth-check" }, { frameId: 0 });
    if (auth?.userId !== s.userId || auth.companyId !== s.companyId) throw new Error("Şirket veya yönetici oturumu değişti.");
    for (const frozen of s.bindings) {
      const live = await validBinding(sender, { userId: m.userId, companyId: m.companyId, accountId: frozen.target.accountId, platform: frozen.target.platform });
      if (JSON.stringify(live) !== JSON.stringify(frozen)) throw new Error("Göreve izin verilen hesap sekmeleri değişti.");
    }
    return s;
  }
  async function page(s, b, action, extra = {}) {
    if (!sessions.has(s.panelTab)) throw new Error("Firefox görevi durduruldu.");
    const tab = await browser.tabs.get(b.tabId);
    if (tab.incognito || tab.windowId !== s.windowId || !policy.safeURL(tab.url, b.target.platform) || !p.clean(tab.url, b.target.platform))
      throw new Error("Yalnız göreve bağlı sosyal medya sekmesi kullanılabilir.");
    for (const file of ["advertising.js", "policy.js", "publication-policy.js", "agent-policy.js", "browser-agent.js"])
      await browser.tabs.executeScript(b.tabId, { file, frameId: 0 });
    if (!sessions.has(s.panelTab)) throw new Error("Firefox görevi durduruldu.");
    const value = await browser.tabs.sendMessage(b.tabId, { source: "studio-browser-agent", action, target: b.target, ...extra }, { frameId: 0 });
    if (!value?.ok) throw new Error(value?.error || "Firefox sayfa işlemi doğrulanamadı.");
    return value;
  }
  async function screenshot(tabId, o) {
    const raw = await browser.tabs.captureTab(tabId, { format: "jpeg", quality: 55 });
    const picture = new Image();
    picture.src = raw;
    await picture.decode();
    const scale = Math.min(1, 960 / picture.naturalWidth, 720 / picture.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(picture.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#18211d";
    for (const r of o.redactions) ctx.fillRect(
      Math.floor(r.x * canvas.width / o.width) - 2, Math.floor(r.y * canvas.height / o.height) - 2,
      Math.ceil(r.width * canvas.width / o.width) + 4, Math.ceil(r.height * canvas.height / o.height) + 4,
    );
    const image = canvas.toDataURL("image/jpeg", 0.55).split(",")[1];
    if (image.length > 266668) throw new Error("Firefox görüntüsü çok büyük. Sayfayı sadeleştirip tekrar deneyin.");
    return image;
  }
  async function handle(m, sender) {
    if (m.action === "agent-stop") {
      if (sessions.get(sender.tab.id)?.id === m.sessionId) stop(sender.tab.id);
      return {};
    }
    if (m.action === "agent-start") {
      if (publishing()) throw new Error("Önce devam eden yayın işleminin tamamlanmasını bekleyin.");
      if (anyActive()) throw new Error("Önce devam eden Firefox görevini durdurun.");
      await validWindow(sender, m);
      if (!/^[a-f0-9-]{36}$/i.test(m.requestId || "") || typeof m.task !== "string" || !m.task.trim() || m.task.length > 1000 || !Array.isArray(m.targets) || !m.targets.length || m.targets.length > 25)
        throw new Error("Bağlı hesapları ve en fazla 1.000 karakterlik görevi belirtin.");
      const rows = await bindingsFor(sender, m, m.targets);
      if (!rows.length || new Set(rows.map((b) => b.target.accountId)).size !== rows.length) throw new Error("Görev için farklı kayıtlı hesap sekmeleri seçin.");
      if (!rows.some((b) => b.target.accountId === m.accountId)) throw new Error("Görevin başlangıç hesabını seçin.");
      stop(sender.tab.id);
      return queue({ action: "agent-start", userId: m.userId, panelTab: sender.tab.id,
        windowId: sender.tab.windowId, target: { companyId: m.companyId, companyName: String(m.companyName || "").slice(0, 150) },
        runId: m.requestId, task: m.task.trim(), bindings: structuredClone(rows), accountId: m.accountId });
    }
    let s;
    try {
      s = await validate(m, sender);
      if (s.busy) throw new Error("Firefox görevi bir önceki işlemi tamamlıyor.");
      s.busy = true;
      const b = s.bindings.find((b) => b.target.accountId === s.accountId);
      if (m.action === "agent-observe") {
        s.observation = null;
        await browser.tabs.update(b.tabId, { active: true });
        const result = await page(s, b, "observe"), o = result.observation;
        const image = await screenshot(b.tabId, o);
        await page(s, b, "capture-check", { snapshotId: o.id });
        if (!sessions.has(s.panelTab)) throw new Error("Firefox görevi durduruldu.");
        s.observation = o;
        const { redactions, width, height, ...observation } = o;
        return { observation, image, target: b.target, tabs: s.bindings.map((b) => ({
          accountId: b.target.accountId, platform: b.target.platform, label: b.target.identityLabel || b.target.label,
        })) };
      }
      if (m.action !== "agent-act" || !s.observation || s.observation.id !== m.snapshotId) throw new Error("Güncel görev görüntüsü gerekli.");
      if (s.steps >= policy.maxSteps) throw new Error("Bu görevin 8 adımlık sınırı doldu. Sonucu inceleyip yeni görev başlatın.");
      const choice = policy.decision(m.decision, s.observation, s.bindings.map((b) => ({ accountId: b.target.accountId })));
      s.observation = null;
      s.steps++;
      if (choice.action === "switch-tab") {
        const next = s.bindings.find((b) => b.target.accountId === choice.accountId);
        await browser.tabs.update(next.tabId, { active: true });
        s.accountId = choice.accountId;
        return { applied: true, detail: "Görevin bağlı sosyal medya sekmesine geçildi." };
      }
      if (choice.action === "profile") {
        await browser.tabs.update(b.tabId, { url: b.target.profileUrl, active: true });
        return { applied: true, detail: "Kayıtlı şirket profil/sayfa adresi açıldı." };
      }
      if (["done", "ask"].includes(choice.action)) {
        stop(s.panelTab);
        await browser.tabs.update(s.panelTab, { active: true });
        return { finished: choice.action, detail: choice.message };
      }
      const result = await page(s, b, "act", { snapshotId: m.snapshotId, decision: choice });
      if (result.navigate) {
        const url = policy.safeURL(result.navigate, b.target.platform);
        if (!url) throw new Error("Sayfa bağlantısı sosyal medya kapsamı dışında.");
        if (!sessions.has(s.panelTab)) throw new Error("Firefox görevi durduruldu.");
        await browser.tabs.update(b.tabId, { url, active: true });
        return { applied: true, detail: "Görünür sosyal medya bağlantısı açıldı." };
      }
      return result;
    } catch (e) { stop(sender.tab.id); throw e; }
    finally { if (s) s.busy = false; }
  }
  async function approve(r) {
    if (publishing()) throw new Error("Yayın işlemi sürüyor; görev başlatılmadı.");
    if (anyActive()) throw new Error("Başka bir Firefox görevi sürüyor; önce onu durdurun.");
    if (!await browser.permissions.contains({ origins: ["<all_urls>"] })) throw new Error("Firefox ekran görüntüsü izni gerekli. Görevi yeniden onaylayın.");
    const sender = { tab: await browser.tabs.get(r.panelTab) };
    await validWindow(sender, { companyId: r.target.companyId, userId: r.userId });
    const auth = await browser.tabs.sendMessage(r.panelTab, { source: "studio-auth-check" }, { frameId: 0 });
    if (auth?.userId !== r.userId || auth.companyId !== r.target.companyId) throw new Error("Görevin şirket/yönetici oturumu değişti.");
    for (const b of r.bindings) {
      const live = await validBinding(sender, { companyId: r.target.companyId, userId: r.userId, accountId: b.target.accountId, platform: b.target.platform });
      if (JSON.stringify(b) !== JSON.stringify(live)) throw new Error("Görev hesapları değişti. Yeniden başlatın.");
    }
    sessions.set(r.panelTab, { id: r.runId, panelTab: r.panelTab, userId: r.userId,
      companyId: r.target.companyId, windowId: r.windowId, bindings: structuredClone(r.bindings),
      task: r.task, accountId: r.accountId, steps: 0, expiresAt: Date.now() + policy.lifetime, observation: null, busy: false });
  }
  return { handle, approve, stop, summary, anyActive, clear: () => sessions.clear(), active: (panelTab) => Boolean(summary(panelTab)),
    removed(tabId) { for (const s of sessions.values()) if (s.panelTab === tabId || s.bindings.some((b) => b.tabId === tabId)) stop(s.panelTab); } };
};
