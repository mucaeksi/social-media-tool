import { test, expect } from "@playwright/test";
import sharp from "sharp";
const ids = [];
test.afterEach(async ({ request }) => {
  for (const id of ids.splice(0)) await request.delete(`/api/companies/${id}`);
});
async function company(request, name) {
  const r = await request.post("/api/companies", { data: { name } });
  expect(r.status()).toBe(201);
  const c = await r.json();
  ids.push(c.id);
  return c;
}
test("Geç açılan taslak gezinmeyi geri çevirmez; URL ve geri hareketi aynı ekranı korur", async ({
  page,
  request,
}) => {
  const c = await company(request, "Bağlantılı taslak"),
    d = await (
      await request.post("/api/drafts", {
        data: {
          companyId: c.id,
          name: "URL taslağı",
          text: "Bağlantıdan açılan metin",
          selected: ["facebook"],
          posts: [],
        },
      })
    ).json();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/drafts/${d.id}`, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(`/?company=${c.id}&page=studio&draft=${d.id}`);
  await expect(page.getByText("Çalışma alanınız hazırlanıyor…")).toBeVisible();
  release();
  await expect(page.getByLabel("Neyi paylaşmak istersiniz?")).toHaveValue(
    d.text,
  );
  await page.getByRole("button", { name: /^Taslaklar/ }).click();
  await expect(
    page.getByRole("heading", { name: d.name, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/page=drafts/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: d.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "İçerik stüdyosu", exact: true })
    .click();
  await expect(page.getByLabel("Neyi paylaşmak istersiniz?")).toHaveValue(
    d.text,
  );
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: d.name, exact: true }),
  ).toBeVisible();
});
test("Kayıt anındaki oturum kesintisinden sonra aynı kullanıcı metnini geri alır", async ({
  page,
  request,
}) => {
  const c = await company(request, "Kurtarma denemesi");
  await page.goto(`/?company=${c.id}`);
  await page
    .getByLabel("Neyi paylaşmak istersiniz?")
    .fill("Oturum kesilse de korunacak metin.");
  let expired = false;
  await page.route("**/api/drafts", async (route) => {
    if (!expired && route.request().method() === "POST") {
      expired = true;
      await route.fulfill({
        status: 401,
        json: { error: "Oturum sona erdi." },
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Taslağı kaydet", exact: true })
    .click();
  await expect(page.getByLabel("Kullanıcı adı veya e-posta")).toBeVisible();
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "local",
          username: "yerel",
          name: "Yerel geliştirme",
          email: "yerel",
          role: "admin",
          local: true,
        },
      },
    }),
  );
  await page.getByLabel("Kullanıcı adı veya e-posta").fill("yerel");
  await page.getByLabel("Şifre", { exact: true }).fill("Kurgu.Sifre.2026!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByLabel("Neyi paylaşmak istersiniz?")).toHaveValue(
    "Oturum kesilse de korunacak metin.",
  );
  await expect(
    page.getByText(/kaydedilmemiş çalışma geri getirildi/),
  ).toBeVisible();
  await expect
    .poll(
      async () => {
        const rows = await (
          await request.get(`/api/drafts?companyId=${c.id}`)
        ).json();
        return rows[0]?.text;
      },
      { timeout: 12000 },
    )
    .toBe("Oturum kesilse de korunacak metin.");
});
test("Taslak çakışması karşılaştırılır ve ayrı kopya kaydedilir", async ({
  page,
  request,
}) => {
  const c = await company(request, "Çakışma denemesi"),
    d = await (
      await request.post("/api/drafts", {
        data: {
          companyId: c.id,
          name: "Ortak taslak",
          text: "Eski metin",
          selected: ["facebook"],
          posts: [],
        },
      })
    ).json();
  await page.goto(`/?company=${c.id}&page=studio&draft=${d.id}`);
  await expect(page.getByLabel("Neyi paylaşmak istersiniz?")).toHaveValue(
    "Eski metin",
  );
  expect(
    (
      await request.put(`/api/drafts/${d.id}`, {
        data: { ...d, text: "Diğer editörün metni" },
      })
    ).status(),
  ).toBe(200);
  await page
    .getByLabel("Neyi paylaşmak istersiniz?")
    .fill("Benim korunacak düzenlemem");
  await page
    .getByRole("button", { name: "Taslağı kaydet", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Taslak sürümlerini karşılaştır",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Sunucudaki metin")).toHaveValue(
    "Diğer editörün metni",
  );
  await dialog
    .getByRole("button", { name: "Çalışmamı kopya kaydet", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const rows = await (
    await request.get(`/api/drafts?companyId=${c.id}`)
  ).json();
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.text)).toContain("Benim korunacak düzenlemem");
  expect(rows.map((r) => r.text)).toContain("Diğer editörün metni");
});
test("Kampanya takvimi, nullable ölçüm ve görselli parçalı yedek Türkçe çalışır", async ({
  page,
  request,
}) => {
  const c = await company(request, "Editoryal deneme");
  page.on("dialog", (d) => d.accept());
  await page.goto(`/?company=${c.id}`);
  const image = await sharp({
    create: { width: 500, height: 400, channels: 3, background: "#d8b68d" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Gönderi görseli yükle")
    .setInputFiles({ name: "urun.png", mimeType: "image/png", buffer: image });
  await expect(
    page.getByText("Görseliniz hazır", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Neyi paylaşmak istersiniz?")
    .fill("Yedeklenecek ürün metni");
  await page
    .getByRole("button", { name: "Taslağı kaydet", exact: true })
    .click();
  await expect(
    page.getByText("Taslak kaydedildi", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "İçerik planı", exact: true }).click();
  await page.getByRole("button", { name: "Yeni kayıt", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Kampanya adı", { exact: true })
    .fill("Ölçü rehberi kampanyası");
  await modal
    .getByRole("button", { name: "Kaydı kaydet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ölçü rehberi kampanyası", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ölçülen performans", exact: true })
    .click();
  await page.getByRole("button", { name: "Yeni kayıt", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Ölçüm / gönderi kaynak bağlantısı", { exact: true })
    .fill("https://example.com/post/1");
  await page
    .getByRole("dialog")
    .getByLabel("Tıklama", { exact: true })
    .fill("0");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydı kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const metrics = await (
    await request.get(`/api/content/records?companyId=${c.id}&kind=metric`)
  ).json();
  expect(metrics[0].values.clicks).toBe(0);
  expect(metrics[0].values.messages).toBeNull();
  await page
    .getByRole("button", { name: "Yedek ve geri yükleme", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tam içerik yedeğini indir", exact: true })
    .click();
  const file = await (await download).path();
  expect(file).toBeTruthy();
  await expect(page.getByText(/Yedek hazır:/)).toBeVisible();
  await page
    .getByLabel("Yedeğin bütün ZIP parçalarını seç")
    .setInputFiles(file);
  await expect(page.getByText(/Yeni şirket kopyası hazır/)).toBeVisible({
    timeout: 30000,
  });
  const copies = await (await request.get("/api/companies")).json(),
    copy = copies.find((v) => v.name === "Editoryal deneme — yedek");
  expect(copy).toBeTruthy();
  ids.push(copy.id);
  const restored = await (
    await request.get(`/api/drafts?companyId=${copy.id}`)
  ).json();
  expect(restored[0].text).toBe("Yedeklenecek ürün metni");
  expect(restored[0].mediaId).toBeTruthy();
  expect(
    (
      await request.get(`/api/media/${restored[0].mediaId}/original.jpg`)
    ).status(),
  ).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
