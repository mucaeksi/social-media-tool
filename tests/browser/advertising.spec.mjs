import { test, expect } from "@playwright/test";

test("KKTC reklam planı, ücretli ölçüm, onaylı ders ve Firefox alan onayı aynı akışta çalışır", async ({
  page,
  request,
}) => {
  const c = await (
    await request.post("/api/companies", {
      data: { name: "Reklam Kurgu Atölyesi" },
    })
  ).json();
  const accountId = crypto.randomUUID();
  try {
    await page.route("**/api/social/accounts?*", (r) =>
      r.fulfill({
        json: [
          {
            id: accountId,
            companyId: c.id,
            platform: "facebook",
            label: "Kurgu Meta",
          },
        ],
      }),
    );
    await page.route("**/api/computer/ai/status", (r) =>
      r.fulfill({
        json: {
          model: "qwen3.5:9b",
          advertisingVersion: "kktc-reklam-v1",
          phase: "ready",
          busy: false,
          progress: null,
          code: null,
        },
      }),
    );
    await page.route("**/api/computer/ai/night**", (r) =>
      r.fulfill({
        json: {
          enabled: true,
          running: false,
          syncedAt: new Date().toISOString(),
          expired: false,
          pendingCount: 0,
          notes: [],
          attempts: [],
        },
      }),
    );
    const aiQuestions = [];
    await page.route("**/api/computer/ai/ask", (r) => {
      const input = r.request().postDataJSON();
      expect(input.advertising).toBe(true);
      expect(input.question.length).toBeLessThanOrEqual(6000);
      aiQuestions.push(input.question);
      return r.fulfill({ json: { answer: "Girne için kurgu ürün reklamı." } });
    });
    await page.addInitScript(
      ({ companyId, accountId }) => {
        const binding = {
          companyId,
          accountId,
          platform: "ads-meta",
          companyName: "Kurgu",
          label: "Kurgu",
          identityLabel: "Kurgu Meta",
          identityId: "123456789",
          profileUrl: "https://adsmanager.facebook.com/adsmanager/",
          tabId: 5,
        };
        window.adFixture = { prepared: null };
        window.addEventListener("message", (e) => {
          const m = e.data;
          if (m?.source !== "sosyal-studio-panel-v1") return;
          let result = {};
          if (m.action === "status")
            result = {
              version: "1.2.0",
              window: { companyId, windowId: 2 },
              bindings: [binding],
              binding,
              pending: false,
            };
          if (m.action === "read")
            result = {
              page: {
                id: "ad-snapshot",
                url: binding.profileUrl,
                title: "Kurgu reklam taslağı",
                text: "Kurgu Meta 123456789. Yeni reklam taslağı.",
                canPrepare: true,
                reason: "Kurgu hesap doğrulandı",
                fields: [{ id: "headline", label: "Başlık", empty: true }],
              },
            };
          if (m.action === "prepare") {
            window.adFixture.prepared = m;
            result = { pending: true };
          }
          window.postMessage(
            {
              source: "sosyal-studio-firefox-v1",
              id: m.id,
              ok: true,
              ...result,
            },
            location.origin,
          );
        });
      },
      { companyId: c.id, accountId },
    );
    await page.goto(`/?company=${c.id}&page=ads`);
    await expect(
      page.getByRole("heading", {
        name: "KKTC reklam çalışma alanı",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Reklam platformu").locator("option"),
    ).toHaveCount(7);
    await page
      .getByRole("button", { name: "Yeni reklam planı", exact: true })
      .click();
    await page
      .getByLabel("Plan adı", { exact: true })
      .fill("Girne ürün denemesi");
    await page.getByLabel("KKTC hizmet ilçeleri").fill("Girne");
    await page.getByLabel("Önerilen günlük bütçe", { exact: true }).fill("100");
    await page.getByLabel("Önerilen toplam harcama üst sınırı").fill("500");
    await page
      .getByLabel("Reklam metni / çekim taslağı")
      .fill("KKTC ürün çekimi. ".repeat(200).slice(0, 3000));
    await page
      .getByRole("button", { name: "Reklam planını kaydet", exact: true })
      .click();
    await expect(
      page.getByText(
        "Reklam planı kaydedildi. Platformda reklam oluşturulmadı.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ölçülen reklam sonuçları", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reklam ölçümü ekle", exact: true })
      .click();
    await page.getByLabel("Harcama", { exact: true }).fill("100");
    await page.getByLabel("Gösterim", { exact: true }).fill("1000");
    await page.getByLabel("Tıklama", { exact: true }).fill("10");
    await page.getByLabel("Doğrulanmış dönüşüm sayısı").fill("2");
    await page
      .getByRole("button", { name: "Reklam ölçümünü kaydet", exact: true })
      .click();
    await expect(page.getByText(/CTR: 1.00%/)).toBeVisible();
    await expect(page.getByText(/ROAS: Hesaplanamadı/)).toBeVisible();
    const records = await (
      await request.get(`/api/content/records?companyId=${c.id}&kind=metric`)
    ).json();
    expect(records[0].advertising.spend).toBe(100);
    expect(records[0].values.messages).toBeNull();
    await page
      .getByRole("button", { name: "Reklam çalışma notları", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reklam çalışma notu ekle", exact: true })
      .click();
    await page
      .getByLabel("Kanıtlı gözlem ve sonraki deneme")
      .fill(
        "Üç günlük kurgu ölçümde iki talep; bir sonraki denemede yalnız açılışı değiştir.",
      );
    await page
      .getByRole("combobox", { name: "İnceleme durumu", exact: true })
      .selectOption("approved");
    await page
      .getByRole("button", { name: "Reklam notunu kaydet", exact: true })
      .click();
    await expect(page.getByText(/Yönetici onaylı/)).toBeVisible();
    await page
      .getByRole("button", { name: "Firefox reklam panelleri", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Reklam bağlantısını kontrol et",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Reklam ekranını oku", exact: true })
      .click();
    await page
      .getByLabel("Yerel AI reklam görevi")
      .fill("KKTC için bölge ve metin öner. ".repeat(40).slice(0, 1000));
    await page
      .getByRole("button", {
        name: "Reklam ekranını yerel AI ile değerlendir",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Girne için kurgu ürün reklamı.", { exact: true }),
    ).toBeVisible();
    expect(aiQuestions[0]).toContain("FIREFOX'TAN");
    await page
      .getByLabel("Doğrulanan boş reklam taslağı alanı")
      .selectOption("headline");
    await page
      .getByRole("button", {
        name: "Seçilen alan için AI metni hazırla",
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel("Alana yerleştirilecek reklam metni"),
    ).toHaveValue("Girne için kurgu ürün reklamı.");
    await page
      .getByRole("button", {
        name: "Metni eklenti onayına gönder",
        exact: true,
      })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.adFixture.prepared))
      .toMatchObject({
        platform: "ads-meta",
        elementId: "headline",
        companyId: c.id,
      });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await request.delete("/api/companies/" + c.id);
  }
});
