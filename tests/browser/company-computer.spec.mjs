import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("Windows Firefox kurulumu, çevrimiçi hesap kontrolü ve şirket değişiminde ekran kapatma", async ({
  page,
  request,
}) => {
  const companies = [],
    commands = [];
  const device = { id: crypto.randomUUID(), name: "Firma Windows" },
    account = {
      id: crypto.randomUUID(),
      platform: "x",
      label: "Firma X",
      profileUrl: "https://x.com/fixture",
    };
  const viewId = crypto.randomUUID(),
    selectedViewId = crypto.randomUUID(),
    frame = (
      await sharp({
        create: { width: 1280, height: 800, channels: 3, background: "white" },
      })
        .jpeg()
        .toBuffer()
    ).toString("base64");
  let paired = false,
    online = false;
  const secondAccount = { ...account, id: crypto.randomUUID(), platform: "facebook", label: "Firma Facebook" };
  try {
    for (const name of ["Bilgisayar şirket A", "Bilgisayar şirket B"])
      companies.push(
        await (await request.post("/api/companies", { data: { name } })).json(),
      );
    account.companyId = companies[0].id;
    secondAccount.companyId = companies[0].id;
    await page.route("**/api/health", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), companyComputer: true },
      });
    });
    await page.route("**/api/social/accounts**", (route) =>
      route.fulfill({
        json:
          new URL(route.request().url()).searchParams.get("companyId") ===
          account.companyId
            ? [account, secondAccount]
            : [],
      }),
    );
    await page.route("**/api/computer/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path.endsWith("/status"))
        return route.fulfill({
          json: {
            devices: paired ? [device] : [],
            onlineDeviceId: online ? device.id : null,
            companyTabs: true,
            active: null,
            commandsUsed: 0,
            dailyCommands: 20000,
          },
        });
      if (path.endsWith("/profiles")) return route.fulfill({ json: [] });
      if (path.endsWith("/pairing")) {
        paired = true;
        online = true;
        return route.fulfill({
          status: 201,
          json: { code: "F".repeat(43), expiresAt: Date.now() + 600000 },
        });
      }
      const input = req.postDataJSON();
      commands.push({ path, ...input });
      return route.fulfill({
        json:
          input.action === "close"
            ? { closed: true, loginVerified: false }
            : {
                accountId: path.split("/")[4],
                viewId: path.includes(secondAccount.id) ? selectedViewId : viewId,
                frame,
                width: 1280,
                height: 800,
                loginVerified: false,
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
    await expect(
      page.getByText("Henüz eşleştirilmedi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Windows yardımcısını indir" }),
    ).toHaveAttribute("href", "/indir/sosyal-studio-bilgisayar.zip");
    await expect(
      page.getByRole("button", { name: "Hesap ekranını aç", exact: true }).first(),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Bilgisayarı eşleştir", exact: true })
      .click();
    await expect(page.getByText("F".repeat(43), { exact: true })).toBeVisible();
    // Reopening the page refreshes device presence without waiting for a timer.
    await page
      .getByRole("button", { name: "İçerik stüdyosu", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Hesap bağlantıları", exact: true })
      .click();
    await expect(
      page.getByText("Bilgisayar çevrimiçi", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Şirket Firefox’unu aç", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("img")).toBeVisible();
    await dialog
      .getByLabel("Seçili alana yazılacak metin (gizli gösterilir)")
      .fill("fixture-input-not-a-credential");
    await dialog
      .getByRole("button", { name: "Seçili alana yaz", exact: true })
      .click();
    await expect
      .poll(() =>
        commands.some(
          (c) =>
            c.action === "type" &&
            c.text === "fixture-input-not-a-credential" &&
            c.viewId === viewId,
        ),
      )
      .toBe(true);
    await expect(
      dialog.getByLabel("Seçili alana yazılacak metin (gizli gösterilir)"),
    ).toHaveValue("");
    expect(commands.some((c) => c.action === "workspace")).toBe(true);
    await dialog.getByLabel("Sosyal ağ seç").selectOption(secondAccount.id);
    await expect(dialog.getByRole("heading", { name: "Firma Facebook" })).toBeVisible();
    expect(commands.some((c) => c.action === "open" && c.switchAccount && c.previousViewId === viewId && c.path.includes(secondAccount.id))).toBe(true);
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(companies[1].id, { force: true });
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        commands.some((c) => c.action === "close" && c.viewId === selectedViewId),
      )
      .toBe(true);
    await expect(page.getByText("Firma X", { exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/sirket-bilgisayari-mobil.png",
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    for (const c of companies) await request.delete(`/api/companies/${c.id}`);
  }
});
