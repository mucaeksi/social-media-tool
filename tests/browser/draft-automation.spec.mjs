import { test, expect } from "@playwright/test";
test("Qwen hazırlığı eksik platform metinlerini üretir, kısmi önizlemeyi tekrar kullanır ve iptalden sonra yayın başlatmaz", async ({ page, request }) => {
  test.setTimeout(60000);
  const health = await (await request.get("/api/health")).json();
  test.skip(health.database !== "d1", "Üretim yayın kuyruğu D1 üzerindedir.");
  const company = await (await request.post("/api/companies", { data: { name: "Qwen otomasyon kurgu" } })).json();
  try {
    const accounts = [];
    for (const platform of ["facebook", "x"]) accounts.push(await (await request.post("/api/social/accounts", { data: {
      companyId: company.id, platform, label: "Kurgu " + platform,
      profileUrl: platform === "x" ? "https://x.com/fixture" : "https://www.facebook.com/fixture",
    } })).json());
    const source = await (await request.post("/api/drafts", { data: {
      companyId: company.id, name: "Asıl kaynak", text: "Girne için tanıtım.", selected: ["facebook"], posts: [], mediaId: null,
    } })).json();
    await page.addInitScript(({ companyId, accounts }) => {
      window.automationFixture = { batches: [] };
      window.addEventListener("message", (e) => {
        const m = e.data; if (m?.source !== "sosyal-studio-panel-v1") return;
        let result = {};
        if (m.action === "status") result = { version: "1.5.0", window: { companyId, windowId: 7 },
          bindings: accounts.map((a, i) => ({ ...a, accountId: a.id, identityLabel: "Kurgu", tabId: i + 2 })), binding: null, pending: false };
        if (m.action === "tabs") result = { tabs: [] };
        if (m.action === "publish-batch") { window.automationFixture.batches.push(m.jobIds); result = { pending: true }; }
        window.postMessage({ source: "sosyal-studio-firefox-v1", id: m.id, ok: true, ...result }, location.origin);
      });
    }, { companyId: company.id, accounts });
    await page.route("**/api/computer/ai/status", (r) => r.fulfill({ json: { phase: "ready", busy: false, draftAutomationVersion: "draft-automation-v1" } }));
    let prepared, generation = 0, seenId;
    await page.route("**/api/computer/ai/prepare-draft", async (route) => {
      const input = route.request().postDataJSON();
      if (seenId) expect(input.id).toBe(seenId); seenId = input.id;
      expect(input.draftId).toBe(source.id); expect(input.accountIds.sort()).toEqual(accounts.map((a) => a.id).sort());
      if (!prepared) {
        generation++;
        prepared = await (await request.post("/api/drafts", { data: { ...source, name: "Qwen çalışma kopyası", selected: ["facebook", "x"],
          posts: ["facebook", "x"].map((platform) => ({ platform, title: "Kurgu", caption: platform + " için ayrı Girne metni.", hashtags: ["#Girne"], alt: "" })) } })).json();
      }
      await route.fulfill({ json: { draft: prepared, published: false } });
    });
    let createCount = 0;
    await page.route("**/api/tab-publications", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      createCount++;
      if (createCount === 2) return route.fulfill({ status: 503, json: { error: "İkinci önizlemede kurgu kesinti." } });
      return route.continue();
    });
    await page.goto(`/?company=${company.id}&page=publications&draft=${source.id}`);
    const panel = page.getByRole("region", { name: "Qwen ile otomatik yayın hazırlığı" });
    await page.getByLabel("Toplu yayın için kaydedilmiş taslak").selectOption(source.id);
    const start = panel.getByRole("button", { name: "Qwen ile hazırla ve eklenti onayına gönder (2)", exact: true });
    await expect(start).toBeEnabled(); await start.click();
    await expect(panel.getByRole("alert")).toHaveText("İkinci önizlemede kurgu kesinti.");
    expect((await (await request.get(`/api/tab-publications?companyId=${company.id}`)).json())).toHaveLength(1);
    expect(await page.evaluate(() => window.automationFixture.batches)).toEqual([]);
    await page.evaluate(() => { Object.defineProperty(Storage.prototype, "setItem", { configurable: true, value() { throw new DOMException("fixture storage full", "QuotaExceededError"); } }); });
    await start.click();
    await expect(panel.getByText(/Önizlemeler hazır/)).toBeVisible();
    await expect(page.getByLabel("Toplu yayın için kaydedilmiş taslak")).toHaveValue(source.id);
    const jobs = await (await request.get(`/api/tab-publications?companyId=${company.id}`)).json();
    expect(jobs).toHaveLength(2); expect(jobs.every((j) => j.state === "draft")).toBe(true);
    expect(generation).toBe(1);
    expect(await page.evaluate(() => window.automationFixture.batches)).toEqual([expect.arrayContaining(jobs.map((j) => j.id))]);
    expect((await (await request.get(`/api/drafts/${source.id}`)).json()).posts).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // A late response after cancellation must not start previews or publishing.
    await page.getByLabel("Toplu yayın için kaydedilmiş taslak").selectOption(source.id);
    let release, started;
    const gate = new Promise((r) => { release = r; }), waiting = new Promise((r) => { started = r; });
    await page.unroute("**/api/computer/ai/prepare-draft");
    await page.route("**/api/computer/ai/prepare-draft", async (route) => { started(); await gate; await route.fulfill({ json: { draft: prepared } }).catch(() => {}); });
    await page.route("**/api/computer/ai/jobs/*/cancel", (route) => route.fulfill({ json: { phase: "ready" } }));
    await start.click(); await waiting;
    await panel.getByRole("button", { name: "Hazırlığı durdur", exact: true }).click(); release();
    await expect(panel.getByRole("alert")).toBeVisible();
    expect(createCount).toBe(4);
    expect((await page.evaluate(() => window.automationFixture.batches)).length).toBe(1);
    await page.reload();
    await page.getByLabel("Toplu yayın için kaydedilmiş taslak").selectOption(source.id);
    await expect(start).toBeEnabled();
    await page.evaluate(() => { Object.defineProperty(Storage.prototype, "getItem", { configurable: true, value() { throw new DOMException("fixture storage disabled", "SecurityError"); } }); });
    await start.click();
    await expect(panel.getByRole("alert")).toContainText("Hazırlık kimliği sekme belleğine kaydedilemiyor");
    expect(createCount).toBe(4);
  } finally { await request.delete(`/api/companies/${company.id}`); }
});
