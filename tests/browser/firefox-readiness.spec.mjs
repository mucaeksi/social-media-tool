import { test, expect } from "@playwright/test";

test("Açık Firefox hesapları tek onayla bağlanır; yardımcı gözlemi ve taslak eksikleri bağlantıyı bozmaz", async ({ page, request }, testInfo) => {
  const companies = [];
  for (const name of ["Firefox bağlantı kurgu", "Diğer Firefox bağlantı kurgu"])
    companies.push(await (await request.post("/api/companies", { data: { name } })).json());
  const [company, other] = companies;
  const accounts = ["facebook", "instagram", "x"].map((platform) => ({
    id: crypto.randomUUID(), companyId: company.id, platform,
    label: "Kurgu " + platform,
    profileUrl: platform === "x" ? "" : `https://www.${platform}.com/kurgu/`,
  }));
  const commands = [];
  try {
    await page.route("**/api/health", async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r, json: { ...(await r.json()), database: "d1", companyComputer: true } });
    });
    await page.route("**/api/auth/me", (r) => r.fulfill({ json: { user: {
      id: "fixture", username: "admin", name: "Kurgu", role: "admin",
    } } }));
    await page.route("**/api/social/accounts?*", (r) => r.fulfill({ json:
      new URL(r.request().url()).searchParams.get("companyId") === company.id ? accounts : [],
    }));
    let updatedAccount = null;
    await page.route("**/api/social/accounts/*", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      const input = route.request().postDataJSON();
      const account = accounts.find((a) => route.request().url().endsWith("/" + a.id));
      expect(input.companyId).toBe(company.id);
      expect(Object.keys(input).sort()).toEqual(["companyId", "profileUrl"]);
      account.profileUrl = input.profileUrl;
      updatedAccount = account.id;
      await route.fulfill({ json: account });
    });
    // The extension uses the normal Firefox profile. Its connection must still
    // work when the separate helper's status/profile service is unavailable.
    await page.route("**/api/computer/**", (r) => r.fulfill({ status: 503, json: { error: "Kurgu yardımcı çevrimdışı." } }));
    await page.route("**/api/tab-publications?*", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/publications?*", (r) => r.fulfill({ json: [] }));
    await page.exposeFunction("recordFirefoxReadiness", (action) => commands.push(action));
    await page.addInitScript(({ companyId, accounts }) => {
      window.readinessFixture = { connected: false, pending: false, online: true, tabsFail: false };
      window.addEventListener("message", (e) => {
        const m = e.data;
        if (e.source !== window || m?.source !== "sosyal-studio-panel-v1") return;
        void window.recordFirefoxReadiness(m.action);
        const f = window.readinessFixture;
        let value = {};
        if (!f.online) {
          window.postMessage({ source: "sosyal-studio-firefox-v1", id: m.id, ok: false, error: "Kurgu eklenti bağlantısı kesildi." }, location.origin);
          return;
        }
        if (m.action === "connect-workspace") { f.pending = true; value = { pending: true, approvalOpened: true }; }
        if (m.action === "status") value = {
          version: "1.4.0", window: f.connected ? { companyId, windowId: 7 } : null,
          binding: null, pending: f.pending,
          bindings: f.connected ? accounts.filter((a) => a.profileUrl).map((a, i) => ({
            ...a, accountId: a.id, identityLabel: "Kurgu", tabId: i + 2,
          })) : [],
        };
        if (m.action === "tabs") value = f.tabsFail ? {} : { tabs: accounts.filter((a) => a.profileUrl).map((a, i) => ({
          id: i + 2, title: a.label, url: a.profileUrl, active: false, pinned: true, panel: false,
        })) };
        window.postMessage({ source: "sosyal-studio-firefox-v1", id: m.id, ok: true, ...value }, location.origin);
      });
    }, { companyId: company.id, accounts });
    await page.goto(`/?company=${company.id}&page=connections`);
    const connection = page.locator(".firefox-connection");
    await expect(connection.getByText("Eklenti 1.4.0 · 0 hesap sekmesi bağlı", { exact: true })).toBeVisible();
    const accountStates = page.getByLabel("Firefox hesap bağlantısı");
    await expect(accountStates).toHaveCount(3);
    await expect(accountStates.filter({ hasText: "Firefox pencere onayı gerekli" })).toHaveCount(2);
    await expect(accountStates.filter({ hasText: "Hedef profil/sayfa adresi eksik" })).toHaveCount(1);
    await connection.getByRole("button", { name: "Açık hesap sekmelerini topluca bağla", exact: true }).click();
    await expect(accountStates.filter({ hasText: "Pencere bağlantısı onay bekliyor" })).toHaveCount(2);
    expect(commands.filter((c) => c === "connect-workspace")).toHaveLength(1);
    await expect(connection.getByRole("status").filter({ hasText: "onay sekmesi açıldı" })).toBeVisible();
    expect(commands).not.toContain("publish-batch");
    // Simulate the explicit toolbar approval; the web page itself cannot grant.
    await page.evaluate(() => {
      Object.assign(window.readinessFixture, { connected: true, pending: false });
      window.dispatchEvent(new Event("focus"));
    });
    await expect(accountStates.filter({ hasText: "Firefox sekmesi bağlı" })).toHaveCount(2);
    await expect(connection.getByText("Eklenti 1.4.0 · 2 hesap sekmesi bağlı", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Yayın takvimi", exact: true }).click();
    const targets = page.getByRole("group", { name: "Yayınlanacak hesaplar ve sayfalar" });
    await expect(targets.getByText("Firefox sekmesi bağlı", { exact: true })).toHaveCount(2);
    await expect(targets.getByText("Önce kaydedilmiş taslağı seçin.", { exact: true })).toHaveCount(2);
    await expect(targets.getByRole("checkbox").first()).toBeDisabled();
    await expect(page.getByRole("link", { name: "Hesap ve sayfa adreslerini düzenle" })).toHaveAttribute("href", `?company=${company.id}&page=connections`);
    await expect(connection.getByRole("button", { name: "Açık hesap sekmelerini topluca bağla", exact: true })).toBeVisible();
    await page.evaluate(() => { window.readinessFixture.tabsFail = true; window.dispatchEvent(new Event("focus")); });
    await expect(connection.getByRole("alert").filter({ hasText: "Sekme listesi yenilenemedi" })).toBeVisible();
    await expect(targets.getByText("Firefox sekmesi bağlı", { exact: true })).toHaveCount(2);
    await page.evaluate(() => { window.readinessFixture.online = false; window.dispatchEvent(new Event("focus")); });
    await expect(connection.getByText("Kurgu eklenti bağlantısı kesildi.", { exact: true })).toBeVisible();
    await expect(targets.getByText("Firefox sekmesi bağlı", { exact: true })).toHaveCount(0);
    await page.evaluate(() => { Object.assign(window.readinessFixture, { online: true, tabsFail: false }); window.dispatchEvent(new Event("focus")); });
    await expect(targets.getByText("Firefox sekmesi bağlı", { exact: true })).toHaveCount(2);
    await expect(connection.getByRole("alert")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("heading", { name: "Firefox'ta toplu otomatik yayın", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("firefox-baglanti-mobil.png"), fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("combobox", { name: "Aktif şirket" }).selectOption(other.id);
    await expect(targets.getByText("Firefox sekmesi bağlı", { exact: true })).toHaveCount(0);
    await expect(connection.getByText("Eklenti 1.4.0 · 0 hesap sekmesi bağlı", { exact: true })).toBeVisible();
    expect(commands).not.toContain("publish-batch");
    const connect = connection.getByRole("button", { name: "Açık hesap sekmelerini topluca bağla", exact: true });
    await expect(connect).toBeEnabled();
    await connect.click();
    await expect(connection.getByRole("alert").filter({ hasText: "hedef hesap/sayfa adresi bulunamadı" })).toBeVisible();
    expect(commands.filter((c) => c === "connect-workspace")).toHaveLength(1);
    await page.getByRole("combobox", { name: "Aktif şirket" }).selectOption(company.id);
    await page.getByRole("button", { name: "Hesap bağlantıları", exact: true }).click();
    await page.getByRole("button", { name: "Adres ekle", exact: true }).click();
    const addressForm = page.getByRole("dialog", { name: "X / Twitter hesabının adresini ekle" });
    await expect(addressForm.getByLabel("Hesap etiketi")).toHaveValue("Kurgu x");
    await expect(addressForm.getByLabel("Hesap etiketi")).toHaveAttribute("readonly", "");
    await addressForm.getByLabel("Hesap / sayfa bağlantısı").fill("https://x.com/kurgu");
    await addressForm.getByRole("button", { name: "Adresi kaydet", exact: true }).click();
    await expect(addressForm).toHaveCount(0);
    await expect(page.locator('a[href="https://x.com/kurgu"]')).toBeVisible();
    expect(updatedAccount).toBe(accounts.find((a) => a.platform === "x").id);
    expect(commands).not.toContain("prepare");
  } finally {
    for (const c of companies) await request.delete(`/api/companies/${c.id}`);
  }
});
