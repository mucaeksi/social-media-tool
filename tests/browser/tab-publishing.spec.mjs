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
    for (const platform of ["facebook", "x", "instagram"]) {
      const r = await request.post("/api/social/accounts", {
        data: {
          companyId: company.id,
          platform,
          label: "Kurgu " + platform,
          profileUrl:
            platform === "facebook"
              ? "https://www.facebook.com/fixture"
              : platform === "x" ? "https://x.com/fixture" : "https://www.instagram.com/fixture/",
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
        selected: ["facebook", "x", "instagram"],
        posts: ["facebook", "x", "instagram"].map((platform) => ({
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
              window: { companyId, windowId: 7 },
              bindings: accounts.map((a) => ({
                ...a,
                accountId: a.id,
                identityLabel: "Kurgu",
                tabId: a.platform === "facebook" ? 2 : 3,
              })),
              binding: null,
              pending: false,
            };
          if (m.action === "tabs") result = { tabs: accounts.map((a) => ({
            id: a.platform === "facebook" ? 2 : 3, title: a.label, url: a.profileUrl,
            active: false, pinned: true, panel: false,
          })) };
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
    await page.goto(`/?company=${company.id}&page=drafts`);
    const savedCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: draft.name, exact: true }) });
    await savedCard.getByRole("button", { name: "Yayına hazırla", exact: true }).click();
    await expect(page.getByLabel("Toplu yayın için kaydedilmiş taslak")).toHaveValue(draft.id);
    await expect(page.getByLabel("Yayın adımları")).toContainText("Firefox simgesinden toplu yayını onaylayın");
    await page.getByRole("button", { name: "İçerik stüdyosu", exact: true }).click();
    await page.getByLabel("Platform gönderi metni").fill("Kaydedilen son Facebook metni.");
    await page.getByRole("button", { name: "Kaydet ve yayına hazırla", exact: true }).click();
    await expect(page.getByLabel("Toplu yayın için kaydedilmiş taslak")).toHaveValue(draft.id);
    expect((await (await request.get(`/api/drafts/${draft.id}`)).json()).posts.find((p) => p.platform === "facebook").caption).toBe("Kaydedilen son Facebook metni.");
    expect(await (await request.get("/api/tab-publications?companyId=" + company.id)).json()).toEqual([]);
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
    await page.getByRole("button", { name: "Uygun tüm hesapları seç (2)", exact: true }).click();
    await expect(targets.nth(0)).toBeChecked();
    await expect(targets.nth(1)).toBeChecked();
    await expect(targets.nth(2)).toBeDisabled();
    await expect(page.getByText("Bu platform için taslağa fotoğraf ekleyin.", { exact: true })).toBeVisible();
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
    await expect(page.getByText("Henüz gönderime iletilmedi.", { exact: false })).toHaveCount(2);
    await page.reload();
    await expect(page.getByLabel("Toplu yayın için kaydedilmiş taslak")).toHaveValue(draft.id);
    await page.getByRole("button", { name: "Bu taslağın bekleyen gönderilerini seç (2)", exact: true }).click();
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
