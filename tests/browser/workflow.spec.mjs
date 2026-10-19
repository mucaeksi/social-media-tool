import { test, expect } from "@playwright/test";
import sharp from "sharp";

const ids = [];
test.afterEach(async ({ request }) => {
  for (const id of ids.splice(0)) await request.delete(`/api/companies/${id}`);
});

test("Türkçe panel: şirket, ChatGPT aktarımı, görsel, taslak, yeniden açma ve dışa aktarma", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  if (await page.getByRole("button", { name: "İlk şirketimi ekle" }).count()) {
    await page.getByRole("button", { name: "İlk şirketimi ekle" }).click();
  } else {
    await page.getByRole("button", { name: "Şirketler", exact: false }).click();
    await page
      .getByRole("button", { name: "Şirket ekle", exact: true })
      .click();
  }
  await page.getByLabel("Şirket adı").fill("Tarayıcı Deneme Şirketi");
  await page.getByLabel("Marka kullanıcı adı").fill("@denemesirketi");
  await page
    .getByLabel("Hedef kitle")
    .fill("Türkçe içerik hazırlayan şirketler");
  await page.getByLabel("Anahtar kelimeler").fill("tasarım, yenilik");
  await page
    .getByRole("button", { name: "Şirketi oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Aktif şirket" }),
  ).toContainText("Tarayıcı Deneme Şirketi");
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption({ label: "Tarayıcı Deneme Şirketi" });
  await page
    .getByRole("button", { name: "İçerik stüdyosu", exact: true })
    .click();
  ids.push(
    await page.getByRole("combobox", { name: "Aktif şirket" }).inputValue(),
  );
  await page
    .getByLabel("Taslak adı", { exact: true })
    .fill("Koleksiyon duyurusu");
  await page
    .getByLabel("Neyi paylaşmak istersiniz?")
    .fill(
      "Yeni koleksiyonumuz hazır. Tasarım meraklılarını atölyemize bekliyoruz.",
    );
  const image = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#d8b68d" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Gönderi görseli yükle")
    .setInputFiles({ name: "urun.png", mimeType: "image/png", buffer: image });
  await expect(page.getByText("Görseliniz hazır")).toBeVisible();
  await page.getByRole("button", { name: "Temel metinleri hazırla" }).click();
  await expect(page.getByRole("tab", { name: "Instagram" })).toBeVisible();
  await page.getByLabel("Etiketler Boşlukla ayırın").fill("#tasarım #Türkçe");
  await expect(page.getByLabel("Etiketler Boşlukla ayırın")).toHaveValue(
    "#tasarım #Türkçe",
  );
  await page.getByRole("button", { name: "ChatGPT talimatı oluştur" }).click();
  await expect(
    page.getByRole("textbox", { name: "ChatGPT talimatı", exact: true }),
  ).toHaveValue(/Tarayıcı Deneme Şirketi/);
  await page
    .getByRole("button", { name: "Yanıtı aldım, içe aktaracağım" })
    .click();
  await page.getByLabel("ChatGPT JSON yanıtı").fill("{broken");
  await page.getByRole("button", { name: "Kontrol et ve aktar" }).click();
  await expect(page.getByRole("alert")).toContainText("Geçerli JSON okunamadı");
  const posts = ["instagram", "facebook", "linkedin", "threads"].map(
    (platform) => ({
      platform,
      title: "",
      caption: `${platform} için Türkçe koleksiyon duyurusu.`,
      hashtags: ["#tasarım", "#Türkçe"],
      alt: "Bej renkli örnek ürün görseli",
    }),
  );
  await page.getByLabel("ChatGPT JSON yanıtı").fill(JSON.stringify({ posts }));
  await page.getByRole("button", { name: "Kontrol et ve aktar" }).click();
  await expect(page.getByLabel("Platform gönderi metni")).toHaveValue(
    posts[0].caption,
  );
  await page.getByRole("button", { name: "Taslağı kaydet" }).click();
  await expect(
    page.getByText("Taslak kaydedildi", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption(ids[0]);
  await page.getByRole("button", { name: "Taslaklar", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Koleksiyon duyurusu", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(page.getByLabel("Platform gönderi metni")).toHaveValue(
    posts[0].caption,
  );
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Görseli indir" }).click();
  expect((await imageDownload).suggestedFilename()).toContain("1080x1350");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Metinleri indir" }).click();
  expect((await jsonDownload).suggestedFilename()).toContain("Koleksiyon");
  await page.getByRole("button", { name: "Hesap bağlantıları" }).click();
  await expect(page.getByText("Hesap eklenmedi", { exact: true })).toHaveCount(
    9,
  );
  await expect(
    page.getByRole("button", { name: "Hesap ekle", exact: true }).first(),
  ).toBeDisabled();
  await expect(
    page.getByText("Toplu otomatik paylaşım henüz yoktur", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Mobil panel: menü, taşma kontrolü ve şirketler arasında taslakların ayrılması", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on("dialog", (dialog) => dialog.accept());
  const first = await (
    await request.post("/api/companies", {
      data: { name: "Birinci Deneme Şirketi" },
    })
  ).json();
  ids.push(first.id);
  await request.post("/api/drafts", {
    data: {
      companyId: first.id,
      name: "Koleksiyon duyurusu",
      text: "İlk şirketin içeriği",
      selected: ["instagram"],
      posts: [],
    },
  });
  const secondResponse = await request.post("/api/companies", {
    data: { name: "İkinci Deneme Şirketi" },
  });
  const second = await secondResponse.json();
  ids.push(second.id);
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption(second.id);
  await page
    .getByLabel("Neyi paylaşmak istersiniz?")
    .fill("İkinci şirketin özel içeriği.");
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption(ids[0]);
  await expect(page.getByRole("dialog")).toContainText(
    "Kaydedilmemiş değişiklikler var",
  );
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(page.getByLabel("Neyi paylaşmak istersiniz?")).toHaveValue(
    "İkinci şirketin özel içeriği.",
  );
  await page.getByRole("button", { name: "Taslağı kaydet" }).click();
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Taslaklar" }).click();
  await expect(
    page.getByRole("heading", { name: "Yeni gönderi", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption(ids[0]);
  await expect(
    page.getByRole("heading", { name: "Koleksiyon duyurusu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Yeni gönderi", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobil-panel.png",
    fullPage: true,
  });
});
