import { test, expect } from "@playwright/test";

test("Hesap ekranı seçili şirketi kullanır ve açılamayan tarayıcıyı bağlı göstermez", async ({
  page,
  request,
}) => {
  const companies = [],
    accounts = [];
  try {
    for (const name of ["Hesap denemesi A", "Hesap denemesi B"]) {
      const response = await request.post("/api/companies", {
        data: {
          name,
          handle: "",
          website: "",
          tone: "Türkçe",
          audience: "",
          keywords: "",
          color: "#326f61",
        },
      });
      companies.push(await response.json());
    }
    await page.route("**/api/health", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), socialBrowser: true },
      });
    });
    await page.route("**/api/social/status", (route) =>
      route.fulfill({
        json: { usedMs: 0, limits: { dailyMs: 600000 }, active: null },
      }),
    );
    await page.route("**/api/social/accounts**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.pathname.endsWith("/open"))
        return route.fulfill({
          status: 503,
          json: { error: "Platform tarayıcı erişimini reddetti." },
        });
      if (req.method() === "POST") {
        const record = {
          ...req.postDataJSON(),
          id: crypto.randomUUID(),
          hasSession: false,
          savedAt: null,
        };
        accounts.push(record);
        return route.fulfill({ status: 201, json: record });
      }
      return route.fulfill({
        json: accounts.filter(
          (a) => a.companyId === url.searchParams.get("companyId"),
        ),
      });
    });
    await page.goto("/");
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(companies[0].id);
    await page
      .getByRole("button", { name: "Hesap bağlantıları", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Hesap ekle", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Hesap etiketi").fill("Şirket A Instagram");
    await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Hesap ekle", exact: true })
      .click();
    await expect(
      page.getByText("Şirket A Instagram", { exact: true }),
    ).toBeVisible();
    expect(accounts[0].companyId).toBe(companies[0].id);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Platform tarayıcı erişimini reddetti",
    );
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(
      page.getByText("Giriş bekliyor", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(companies[1].id);
    await expect(
      page.getByText("Şirket A Instagram", { exact: true }),
    ).toHaveCount(0);
  } finally {
    for (const company of companies)
      await request.delete(`/api/companies/${company.id}`);
  }
});

test("Profil ara kaydı ve şirket değişimi doğru hesabı kaydeder; uyku kartı gerçek giriş iddiası üretmez", async ({
  page,
  request,
}) => {
  const companies = [],
    calls = [];
  const account = {
    id: crypto.randomUUID(),
    platform: "tumblr",
    label: "Firma A Tumblr",
    profileUrl: "https://www.tumblr.com/fixture",
    hasSession: true,
    authDetected: null,
    savedAt: "2026-10-19T10:00:00Z",
  };
  try {
    for (const name of ["Profil denemesi A", "Profil denemesi B"]) {
      companies.push(
        await (await request.post("/api/companies", { data: { name } })).json(),
      );
    }
    account.companyId = companies[0].id;
    await page.route("**/api/health", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), socialBrowser: true },
      });
    });
    await page.route("**/api/social/status", (route) =>
      route.fulfill({
        json: { usedMs: 0, limits: { dailyMs: 600000 }, active: null },
      }),
    );
    await page.route("https://live.browser.run/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<p>Deneme sosyal hesap ekranı</p>",
      }),
    );
    await page.route("**/api/social/accounts**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (req.method() === "GET")
        return route.fulfill({
          json:
            url.searchParams.get("companyId") === account.companyId
              ? [account]
              : [],
        });
      calls.push(url.pathname);
      if (url.pathname.endsWith("/open"))
        return route.fulfill({
          json: {
            accountId: account.id,
            expiresAt: Date.now() + 180000,
            viewUrl: "https://live.browser.run/fixture",
          },
        });
      return route.fulfill({
        json: {
          saved: true,
          closed: url.pathname.endsWith("/save"),
          storageComplete: true,
          hasSession: false,
          savedAt: "2026-10-19T10:00:15Z",
        },
      });
    });
    await page.goto("/");
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(companies[0].id);
    await page
      .getByRole("button", { name: "Hesap bağlantıları", exact: true })
      .click();
    const card = page.locator("article").filter({ hasText: "Firma A Tumblr" });
    await expect(card).toContainText("Uyku modunda");
    await expect(card).toContainText("Hesaba giriş durumu doğrulanmadı");
    await expect(card.getByRole("link")).toHaveAttribute(
      "href",
      account.profileUrl,
    );
    await page.clock.install();
    await card.getByRole("button", { name: "Hesabı aç", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.clock.runFor(15100);
    await expect
      .poll(() => calls.filter((p) => p.endsWith("/checkpoint")).length)
      .toBe(1);
    await expect(page.getByRole("dialog")).toContainText(
      "Şifreli profil kaydedildi",
    );
    // The dialog traps keyboard focus; select programmatically to reproduce an
    // external company change while the real browser is still open.
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(companies[1].id, { force: true });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(() => calls.filter((p) => p.endsWith("/save")).length)
      .toBe(1);
    await expect(page.getByText("Firma A Tumblr", { exact: true })).toHaveCount(
      0,
    );
    expect(calls.every((p) => p.includes(account.id))).toBe(true);
  } finally {
    for (const company of companies)
      await request.delete(`/api/companies/${company.id}`);
  }
});
