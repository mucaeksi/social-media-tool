(() => {
  const p = StudioPolicy, bindings = new Map(), windows = new Map(), requests = new Map();
  const ttl = 5 * 60 * 1000;
  let working = false;
  const popup = (s) => s.id === browser.runtime.id && s.url === browser.runtime.getURL("popup.html");
  function expire() {
    for (const [id, r] of requests) if (Date.now() - r.at > ttl) requests.delete(id);
    browser.browserAction.setBadgeText({ text: requests.size ? String(requests.size) : "" });
  }
  async function validBinding(sender, m) {
    const w = await validWindow(sender, m);
    const b = bindings.get(sender.tab.id);
    if (!b || b.userId !== m.userId || b.target.companyId !== m.companyId || b.target.accountId !== m.accountId) throw new Error("Bu şirket/hesap için Firefox sekmesini yeniden bağlayın.");
    const tab = await browser.tabs.get(b.tabId);
    if (tab.incognito || tab.windowId !== w.windowId || !p.clean(tab.url, b.target.platform)) throw new Error("Seçili sekme bu hedefin sosyal ağına ait değil veya bağlı pencereden ayrıldı. İlgili şirket hesabını seçip sekmesini bağlayın.");
    return b;
  }
  async function validWindow(sender, m) {
    const w = windows.get(sender.tab.id), tab = await browser.tabs.get(sender.tab.id);
    if (!w || w.userId !== m.userId || w.companyId !== m.companyId || w.windowId !== tab.windowId || tab.incognito) throw new Error("Bu şirket için panelin bulunduğu Firefox penceresini bağlayın.");
    return w;
  }
  async function page(b, action, extra = {}) {
    const tab = await browser.tabs.get(b.tabId);
    const panelTab = await browser.tabs.get(b.panelTab);
    if (tab.incognito || tab.windowId !== b.windowId || panelTab.windowId !== b.windowId || !p.clean(tab.url, b.target.platform)) throw new Error("Bu sayfa okunamaz. Yalnız bağlı penceredeki sosyal ağ kullanılır; giriş ve özel mesaj ekranları kapsam dışıdır.");
    await browser.tabs.executeScript(b.tabId, { file: "policy.js", frameId: 0 });
    await browser.tabs.executeScript(b.tabId, { file: "page-agent.js", frameId: 0 });
    return browser.tabs.sendMessage(b.tabId, { source: "studio-extension-agent", action, target: b.target, ...extra }, { frameId: 0 });
  }
  function queue(r) {
    for (const [id, old] of requests) if (old.panelTab === r.panelTab) requests.delete(id);
    if (requests.size >= 5) throw new Error("Bekleyen eklenti isteklerini tamamlayın.");
    const id = crypto.randomUUID(); requests.set(id, { ...r, id, at: Date.now() }); expire();
    return { pending: true };
  }
  browser.tabs.onRemoved.addListener((tabId) => {
    bindings.delete(tabId);
    windows.delete(tabId);
    for (const [id, b] of bindings) if (b.tabId === tabId) bindings.delete(id);
    for (const [id, r] of requests) if (r.panelTab === tabId || r.tabId === tabId) requests.delete(id);
    expire();
  });
  browser.tabs.onUpdated.addListener((id, change) => {
    if (!change.url) return;
    try { if (new URL(change.url).origin === p.panelOrigin) return; } catch { /* revoke below */ }
    bindings.delete(id);
    windows.delete(id);
    for (const [key, r] of requests) if (r.panelTab === id) requests.delete(key);
    expire();
  });
  browser.runtime.onMessage.addListener((m, sender) => (async () => {
    expire();
    if (!m || typeof m.action !== "string") throw new Error("Geçersiz eklenti isteği.");
    if (popup(sender)) {
      if (m.action === "popup-state") {
        const tabs = await browser.tabs.query({});
        return { requests: [...requests.values()].map((r) => ({ ...r, choices: r.action === "connect" ? tabs.filter((t) => t.id !== r.panelTab && !t.incognito && t.windowId === r.windowId && p.clean(t.url, r.target.platform)).slice(0, 100).map((t) => ({ id: t.id, title: (t.title || "Sekme").slice(0, 150), url: p.clean(t.url, r.target.platform), pinned: t.pinned })) : [] })), count: windows.size };
      }
      if (m.action === "revoke") { bindings.clear(); windows.clear(); requests.clear(); expire(); return {}; }
      const r = requests.get(m.id);
      if (!r) throw new Error("İstek süresi doldu. Panelden yeniden başlatın.");
      if (m.action === "reject") { requests.delete(m.id); expire(); return {}; }
      if (m.action !== "approve" || working) throw new Error("Eklenti işlemi devam ediyor.");
      working = true;
      try {
        const panelTab = await browser.tabs.get(r.panelTab);
        if (panelTab.incognito || panelTab.windowId !== r.windowId || new URL(panelTab.url).origin !== p.panelOrigin) throw new Error("Panel sekmesi veya penceresi değişti.");
        // Recheck the real panel session immediately before granting access or writing.
        const auth = await browser.tabs.sendMessage(r.panelTab, { source: "studio-auth-check" }, { frameId: 0 });
        if (auth?.userId !== r.userId) throw new Error("Panel oturumu değişti; yeniden bağlayın.");
        if (r.action === "connect-window") {
          windows.set(r.panelTab, { userId: r.userId, companyId: r.target.companyId, windowId: r.windowId });
          bindings.delete(r.panelTab);
        } else if (r.action === "connect") {
          const tab = await browser.tabs.get(m.tabId);
          if (tab.incognito || tab.windowId !== r.windowId || !p.clean(tab.url, r.target.platform) || tab.id === r.panelTab) throw new Error("Panelin bulunduğu pencereden uygun bir sosyal medya sekmesi seçin.");
          if (typeof m.identityLabel !== "string" || !m.identityLabel.trim() || m.identityLabel.length > 100) throw new Error("Hedef sayfanın ekranda görünen tam adını girin.");
          windows.set(r.panelTab, { userId: r.userId, companyId: r.target.companyId, windowId: r.windowId });
          bindings.set(r.panelTab, { userId: r.userId, target: p.target({ ...r.target, identityLabel: m.identityLabel }), tabId: tab.id, windowId: r.windowId, panelTab: r.panelTab });
        } else {
          const b = bindings.get(r.panelTab);
          if (!b || b.userId !== r.userId || b.tabId !== r.tabId || JSON.stringify(b.target) !== JSON.stringify(r.target)) throw new Error("Hedef hesap değişti.");
          const result = await page(b, "fill", { snapshotId: r.snapshotId, text: r.text });
          if (!result.ok) throw new Error(result.error);
        }
        requests.delete(m.id); expire(); return {};
      } finally { working = false; }
    }
    if (!p.panel(sender)) throw new Error("Yalnız Sosyal Studio paneli bağlantı kurabilir.");
    if (m.action === "disconnect") { bindings.delete(sender.tab.id); windows.delete(sender.tab.id); for (const [id, r] of requests) if (r.panelTab === sender.tab.id) requests.delete(id); expire(); return {}; }
    if (typeof m.userId !== "string" || m.userId.length > 100) throw new Error("Panel oturumu doğrulanamadı.");
    if (m.action === "status") {
      const b = bindings.get(sender.tab.id);
      const w = windows.get(sender.tab.id), current = await browser.tabs.get(sender.tab.id);
      if (w && (w.userId !== m.userId || w.windowId !== current.windowId)) { bindings.delete(sender.tab.id); windows.delete(sender.tab.id); throw new Error("Panel hesabı veya penceresi değişti; yeniden bağlayın."); }
      return { version: browser.runtime.getManifest().version, window: w ? { companyId: w.companyId, windowId: w.windowId } : null, binding: b ? { ...b.target, tabId: b.tabId } : null, pending: [...requests.values()].some((r) => r.panelTab === sender.tab.id) };
    }
    if (m.action === "connect" || m.action === "connect-window") {
      let target;
      if (m.action === "connect") target = p.target(m.target);
      else {
        if (!/^[a-f0-9-]{36}$/i.test(m.companyId || "") || typeof m.companyName !== "string" || m.companyName.length > 150) throw new Error("Şirket seçin.");
        target = { companyId: m.companyId, companyName: m.companyName };
      }
      const tab = await browser.tabs.get(sender.tab.id);
      return queue({ action: m.action, target, userId: m.userId, panelTab: sender.tab.id, windowId: tab.windowId });
    }
    if (m.action === "tabs" || m.action === "select-tab") {
      const w = await validWindow(sender, m);
      if (m.action === "select-tab") {
        if (!Number.isInteger(m.tabId)) throw new Error("Bir sekme seçin.");
        const tab = await browser.tabs.get(m.tabId);
        if (tab.incognito || tab.windowId !== w.windowId) throw new Error("Başka Firefox penceresine erişilemez.");
        await browser.tabs.update(tab.id, { active: true });
        const b = bindings.get(sender.tab.id); if (b) b.tabId = tab.id;
        for (const [id, r] of requests) if (r.panelTab === sender.tab.id && r.action === "prepare") requests.delete(id);
        expire();
      }
      const tabs = (await browser.tabs.query({ windowId: w.windowId })).filter((t) => !t.incognito && t.windowId === w.windowId).sort((a, b) => a.index - b.index);
      return { tabs: tabs.map((t) => { let url = ""; try { const u = new URL(t.url); url = u.protocol === "https:" || u.protocol === "http:" ? u.origin + u.pathname : u.protocol; } catch { /* internal */ }
        return { id: t.id, title: (t.title || "Sekme").slice(0, 150), url: url.slice(0, 400), active: t.active, pinned: t.pinned, panel: t.id === sender.tab.id }; }) };
    }
    const b = await validBinding(sender, m);
    if (m.action === "read") {
      const result = await page(b, "read");
      if (!result.ok) throw new Error(result.error);
      return { page: result.page };
    }
    if (m.action === "focus") { await browser.tabs.update(b.tabId, { active: true }); return {}; }
    if (m.action === "prepare") {
      if (typeof m.text !== "string" || !m.text.trim() || m.text.length > 10000 || typeof m.snapshotId !== "string" || m.snapshotId.length > 64) throw new Error("Önce sekmeyi okuyun ve bir taslak seçin.");
      return queue({ action: "prepare", target: b.target, userId: m.userId, panelTab: sender.tab.id, windowId: b.windowId, tabId: b.tabId, snapshotId: m.snapshotId, text: m.text });
    }
    throw new Error("Bu işlem desteklenmiyor.");
  })().then((value) => ({ ok: true, ...value })).catch((e) => ({ ok: false, error: e.message || "Eklenti işlemi tamamlanamadı." })));
})();
