import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("KKTC profili, kaynak onayı, kalite defteri, takvim ve depolama Türkçe akışı", async ({
  page,
  request,
}) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(
    health.database !== "d1",
    "Üretim çalışma alanı Cloudflare sürümündedir.",
  );
  const created = await request.post("/api/companies", {
    data: {
      name: "KKTC kurgu " + randomUUID(),
      website: "https://www.example.com/",
      regional: {
        districts: "Girne",
        languages: "Türkçe",
        delivery: "Yalnız Girne",
        timezone: "Asia/Famagusta",
      },
    },
  });
  expect(created.status()).toBe(201);
  const company = await created.json(),
    sourceId = randomUUID();
  let sources = [],
    facts = [];
  await page.route("**/api/knowledge**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname === "/api/knowledge" && req.method() === "GET")
      return route.fulfill({ json: { sources, facts } });
    if (url.pathname === "/api/knowledge/research") {
      sources = [
        {
          id: sourceId,
          title: "Kurgu şirket sitesi",
          url: company.website,
          final_url: company.website,
          excerpt: "Teslimat yalnız Girne.",
          fetched_at: new Date().toISOString(),
          state: "pending",
          content_hash: "fixture",
        },
      ];
      return route.fulfill({ status: 201, json: { saved: 1, unchanged: 0 } });
    }
    if (url.pathname.endsWith("/approve")) {
      const data = req.postDataJSON();
      facts = [
        {
          id: randomUUID(),
          source_id: sourceId,
          field: data.field,
          value: data.value,
          final_url: company.website,
          valid_until: data.validUntil,
          retired_at: null,
        },
      ];
      sources[0].state = "approved";
      return route.fulfill({ status: 201, json: { id: facts[0].id } });
    }
    return route.continue();
  });
  try {
    await page.goto("/");
    await page.getByLabel("Aktif şirket").selectOption(company.id);
    await page
      .getByRole("button", { name: "KKTC ve kaynaklar", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "KKTC şirket bilgileri" }),
    ).toBeVisible();
    await expect(page.getByText("Yalnız Girne", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Siteyi incele", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Kurgu şirket sitesi" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Bilgi seç ve onayla" }).click();
    await page.getByLabel("Bilgi alanı", { exact: true }).fill("Teslimat");
    await page.getByLabel("Doğrulanan değer").fill("yalnız Girne");
    await page
      .getByLabel("Kaynakta geçen kanıt alıntısı")
      .fill("Teslimat yalnız Girne.");
    await page
      .getByRole("button", { name: "Bilgiyi onayla", exact: true })
      .click();
    await expect(page.getByText("yalnız Girne", { exact: true })).toBeVisible();
    await page
      .getByLabel("Değerlendirilen gerçek yanıt")
      .fill("Kurgu senaryoda fiyat belirtilmediği için fiyat eklenmedi.");
    await page.getByLabel("Kaynak doğruluğu", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Değerlendirmeyi kaydet" }).click();
    await expect(page.getByText(/1\/30 senaryo değerlendirildi/)).toBeVisible();
    await page
      .getByRole("button", { name: "Yayın takvimi", exact: true })
      .click();
    await expect(page.getByText(/Asia\/Famagusta/).first()).toBeVisible();
    await page.getByText("Yayın ölçümlerini incele", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Ölçülen performans" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ekip ve ayarlar", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Depolama kullanımı" }),
    ).toBeVisible();
    await expect(page.getByText(/500 MB ücretsiz/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Metin yedeği ve geri yükleme" }),
    ).toBeVisible();
  } finally {
    await request.delete(`/api/companies/${company.id}`);
  }
});
