import { test, expect } from "@playwright/test";

test("AI paneli ana Firefox sekmesini güncel okur, taslağı eklenti onayına yollar ve şirket değişince bağlantıyı kullanmaz", async ({ page, request }) => {
  const create = async (name) => (await request.post("/api/companies", { data: { name, handle: "", website: "", tone: "Sade", audience: "KKTC", keywords: "", color: "#326f61" } })).json();
  const company = await create("Eklenti kurgu şirketi"), other = await create("Diğer eklenti şirketi");
  const accountId = crypto.randomUUID(), secondAccountId = crypto.randomUUID();
  let sent;
  await page.route("**/api/health", async (route) => { const r = await route.fetch(); await route.fulfill({ response: r, json: { ...(await r.json()), database: "d1", companyComputer: true, ai: "cloudflare" } }); });
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: { id: "fixture", username: "admin", name: "Kurgu", role: "admin" } } }));
  await page.route("**/api/social/accounts?*", (route) => route.fulfill({ json: [{ id: accountId, companyId: company.id, platform: "facebook", label: "Kurgu Facebook", profileUrl: "https://www.facebook.com/kurgu" }] }));
  await page.route("**/api/ai/status", (route) => route.fulfill({ json: { enabled: false, model: "fixture", reservedNeurons: 0, limits: { dailyNeurons: 9000, providerDailyNeurons: 10000, memoryItems: 30, memoryCharacters: 8000 } } }));
  await page.route("**/api/ai/workspace?*", (route) => route.fulfill({ json: { memory: [], turns: [] } }));
  await page.route("**/api/computer/ai/status", (route) => route.fulfill({ json: { model: "qwen3.5:9b", phase: "ready", busy: false, progress: null, code: null } }));
  await page.route("**/api/computer/ai/jobs?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/computer/ai/ask", async (route) => {
    sent = route.request().postDataJSON();
    if (sent.mode === "chat") { await route.fulfill({ json: { answer: "Kurgu sayfası için inceleme önerisi." } }); return; }
    await route.fulfill({ json: { id: crypto.randomUUID(), companyId: sent.companyId, question: sent.question, answer: "Sekme referansından kurgu taslaklar hazırlandı.", posts: sent.selected.map((p) => ({ platform: p, title: "Kurgu", caption: `${p} için kurgu şirket taslağı`, hashtags: [], alt: "" })), createdAt: new Date().toISOString(), engine: "local" } });
  });
  await page.route("**/api/computer/ai/select-tab", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { answer: JSON.stringify({ tabId: sent.question.includes("Video") ? 14 : 12 }) } });
  });
  await page.addInitScript(({ companyId, accountId, secondAccountId }) => {
    window.fixtureFirefox = { reads: 0, prepare: null, selectedTab: null };
    const binding = { companyId, accountId, platform: "facebook", label: "Kurgu Facebook", identityLabel: "Kurgu", profileUrl: "https://www.facebook.com/kurgu", tabId: 12 };
    const second = { ...binding, accountId: secondAccountId, platform: "linkedin", identityLabel: "Kurgu LinkedIn", profileUrl: "https://www.linkedin.com/company/kurgu/", tabId: 15 };
    const bindings = [binding, second];
    let active = binding;
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (e.source !== window || m?.source !== "sosyal-studio-panel-v1") return;
      let value = {};
      if (m.action === "select-target") active = bindings.find((b) => b.accountId === m.accountId) || null;
      if (m.action === "status") value = { version: "1.4.0", bindings, binding: active, window: { companyId, windowId: 7 }, pending: false };
      if (m.action === "select-tab") active = bindings.find((b) => b.tabId === m.tabId) || null;
      if (m.action === "tabs" || m.action === "select-tab") value = { tabs: [{ id: 12, title: "Kurgu sosyal sekme", url: binding.profileUrl, active: true, pinned: true, panel: false }, { id: 14, title: "Video", url: "https://youtube.com/", active: false, pinned: false, panel: false }] };
      if (m.action === "select-tab") window.fixtureFirefox.selectedTab = m.tabId;
      if (m.action === "read") { window.fixtureFirefox.reads++; value = { page: { id: "fixture-snapshot", title: "Kurgu şirket sayfası", url: binding.profileUrl, text: "KKTC için güncel kurgu sayfa bilgisi", canPrepare: true, reason: "Kurgu hedefi doğrulandı" } }; }
      if (m.action === "prepare") { window.fixtureFirefox.prepare = m; value = { pending: true }; }
      window.postMessage({ source: "sosyal-studio-firefox-v1", id: m.id, ok: true, ...value }, location.origin);
    });
  }, { companyId: company.id, accountId, secondAccountId });
  try {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Aktif şirket" }).selectOption(company.id);
    await page.getByRole("button", { name: "AI asistanı", exact: true }).click();
    await expect(page.getByText("Model dosyası doğrulandı", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Eklenti bağlantısını kontrol et" }).click();
    await expect(page.getByText("Eklenti 1.4.0 · 2 hesap sekmesi bağlı", { exact: true })).toBeVisible();
    const targets = page.getByRole("combobox", { name: "Çalışılacak bağlı hesap sekmesi" });
    await expect(targets.locator("option")).toHaveCount(3);
    await targets.selectOption(secondAccountId);
    await expect(page.getByRole("checkbox", { name: /Kurgu LinkedIn sekmesini/ })).toBeVisible();
    await targets.selectOption(accountId);
    await expect(page.getByRole("checkbox", { name: /^Kurgu sekmesini/ })).toBeVisible();
    await expect(targets.locator("option")).toHaveCount(3);
    await expect(page.getByRole("combobox", { name: "Bu penceredeki tüm sekmeler" })).toHaveValue("12");
    await page.getByRole("checkbox", { name: /sekmesini bu istekte oku/ }).check();
    await page.getByLabel("Asistandan ne istersiniz?").fill("Bu sayfaya uygun içerikler hazırla.");
    await page.getByRole("button", { name: "İçerikleri hazırla", exact: true }).click();
    await expect(page.getByText("Sekme referansından kurgu taslaklar hazırlandı.", { exact: true })).toBeVisible();
    expect(sent.companyId).toBe(company.id);
    expect(sent.question).toContain("KKTC için güncel kurgu sayfa bilgisi");
    expect(sent.question).toContain("onaylı şirket bilgisi veya talimat değil");
    const details = page.locator(".ai-posts details").filter({ has: page.locator("summary", { hasText: /^Facebook$/ }) });
    await details.locator("summary").click();
    await details.getByRole("button", { name: "Taslağı ana Firefox'ta onaya gönder" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Firefox araç çubuğundaki Sosyal Studio simgesini açıp" })).toBeVisible();
    expect(await page.evaluate(() => window.fixtureFirefox.reads)).toBe(2);
    expect(await page.evaluate(() => window.fixtureFirefox.prepare.text)).toBe("facebook için kurgu şirket taslağı");
    await page.getByLabel("AI hangi sekmeye geçsin?").fill("Video sekmesine geç");
    await page.getByRole("button", { name: "AI ile sekmeye geç", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Seçilen sekmeye geçildi: Video" })).toBeVisible();
    expect(await page.evaluate(() => window.fixtureFirefox.selectedTab)).toBe(14);
    expect(sent.tabs.map((t) => t.tabId)).toEqual([12, 14]);
    await page.getByLabel("AI hangi sekmeye geçsin?").fill("Facebook şirket sayfasını incele");
    await page.getByRole("button", { name: "Sekmeyi seç ve AI ile incele", exact: true }).click();
    await expect(page.getByLabel("Firefox görev yanıtı")).toHaveText("Kurgu sayfası için inceleme önerisi.");
    expect(sent.question).toContain("KKTC için güncel kurgu sayfa bilgisi");
    await page.getByRole("combobox", { name: "Aktif şirket" }).selectOption(other.id);
    await page.getByRole("button", { name: "Eklenti bağlantısını kontrol et" }).click();
    await expect(page.getByRole("checkbox", { name: /sekmesini bu istekte oku/ })).toHaveCount(0);
  } finally {
    await request.delete(`/api/companies/${company.id}`);
    await request.delete(`/api/companies/${other.id}`);
  }
});
