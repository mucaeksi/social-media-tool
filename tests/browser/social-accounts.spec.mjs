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
