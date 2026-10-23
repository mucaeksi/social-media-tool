import { test, expect } from "@playwright/test";
test("Toplu yayın önizlemesi gerçek D1 işlerini oluşturur; iki hedef yalnız eklenti onayına gönderilir", async ({
  page,
  request,
}, testInfo) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(health.database !== "d1", "Üretim yayın kuyruğu D1 üzerindedir.");
  const company = await (
    await request.post("/api/companies", {
      data: { name: "Toplu yayın kurgu" },
    })
  ).json();
  try {
    const accounts = [];
    for (const platform of ["facebook", "x"]) {
      const r = await request.post("/api/social/accounts", {
        data: {
          companyId: company.id,
          platform,
          label: "Kurgu " + platform,
          profileUrl:
            platform === "facebook"
              ? "https://www.facebook.com/fixture"
              : "https://x.com/fixture",
        },
      });
      expect(r.status()).toBe(201);
      accounts.push(await r.json());
    }
    const d = await request.post("/api/drafts", {
      data: {
        companyId: company.id,
        name: "İlk paylaşım kurgu",
        text: "Girne kurgu",
        selected: ["facebook", "x"],
        posts: ["facebook", "x"].map((platform) => ({
          platform,
          title: "Kurgu",
          caption: "Girne için kurgu ürün.",
          hashtags: ["#Girne"],
          alt: "",
        })),
        mediaId: null,
        mediaFit: "contain",
      },
    });
    expect(d.status()).toBe(201);
    const draft = await d.json();
    await page.addInitScript(
      ({ companyId, accounts }) => {
        window.publishFixture = { jobIds: [] };
        window.addEventListener("message", (e) => {
          const m = e.data;
          if (m?.source !== "sosyal-studio-panel-v1") return;
          let result = {};
          if (m.action === "status")
            result = {
              version: "1.3.0",
              window: { companyId },
              bindings: accounts.map((a) => ({
                ...a,
                accountId: a.id,
                identityLabel: "Kurgu",
                tabId: a.platform === "facebook" ? 2 : 3,
              })),
              binding: null,
              pending: false,
            };
          if (m.action === "publish-batch") {
            window.publishFixture.jobIds = m.jobIds;
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
      { companyId: company.id, accounts },
    );
    await page.goto(`/?company=${company.id}&page=publications`);
    await page
      .getByRole("button", {
        name: "Yayın penceresini kontrol et",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Toplu yayın için kaydedilmiş taslak")
      .selectOption(draft.id);
    const targets = page
      .getByRole("group", { name: "Yayınlanacak hesaplar ve sayfalar" })
      .getByRole("checkbox");
    await targets.nth(0).check();
    await targets.nth(1).check();
    await page.screenshot({
      path: testInfo.outputPath("toplu-yayin-masaustu.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Seçili hesapların yayın önizlemelerini oluştur",
      })
      .click();
    await expect(page.getByText(/Önizlemeler kaydedildi/)).toBeVisible();
    const rows = await (
      await request.get("/api/tab-publications?companyId=" + company.id)
    ).json();
    expect(rows).toHaveLength(2);
    expect(rows.every((j) => j.state === "draft")).toBe(true);
    await page
      .getByLabel(
        "Seçtiğim hedefleri, fotoğrafları, metinleri ve zamanı kontrol ettim; bu hesaplarda gerçek paylaşımı onaylıyorum.",
      )
      .check();
    await page
      .getByRole("button", {
        name: "Seçili gönderileri eklenti onayına gönder",
      })
      .click();
    await expect(
      page.getByText(
        /Firefox araç çubuğundaki Sosyal Studio simgesinde hedefleri inceleyip/,
      ),
    ).toBeVisible();
    expect(
      (await page.evaluate(() => window.publishFixture.jobIds)).sort(),
    ).toEqual(rows.map((j) => j.id).sort());
    expect(
      (
        await (
          await request.get("/api/tab-publications?companyId=" + company.id)
        ).json()
      ).every((j) => j.state === "draft"),
    ).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: testInfo.outputPath("toplu-yayin-mobil.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await request.delete("/api/companies/" + company.id).catch(() => {});
  }
});
