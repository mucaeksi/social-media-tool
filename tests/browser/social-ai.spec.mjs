import { test, expect } from "@playwright/test";
import sharp from "sharp";

async function fixture(page, request) {
  const companies = [],
    memory = [],
    turns = [];
  for (const name of ["AI şirketi A", "AI şirketi B"]) {
    const response = await request.post("/api/companies", {
      data: {
        name,
        handle: "",
        website: "",
        tone: "Samimi",
        audience: "İşletmeler",
        keywords: "marka",
        color: "#326f61",
      },
    });
    companies.push(await response.json());
  }
  await page.route("**/api/health", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), database: "d1", ai: "cloudflare" },
    });
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "ai-fixture-admin",
          username: "yonetici",
          email: "yonetici@example.test",
          name: "AI denetimi",
          role: "admin",
        },
      },
    }),
  );
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        model: "test-model",
        reservedNeurons: 250,
        limits: {
          dailyNeurons: 9000,
          providerDailyNeurons: 10000,
          memoryItems: 30,
          memoryCharacters: 8000,
        },
      },
    }),
  );
  await page.route("**/api/ai/workspace?*", (route) => {
    const id = new URL(route.request().url()).searchParams.get("companyId");
    return route.fulfill({
      json: {
        memory: memory.filter((m) => m.companyId === id),
        turns: turns.filter((t) => t.companyId === id),
      },
    });
  });
  await page.route("**/api/ai/memory", async (route) => {
    const item = {
      id: crypto.randomUUID(),
      ...route.request().postDataJSON(),
      createdAt: new Date().toISOString(),
    };
    memory.push(item);
    await route.fulfill({ status: 201, json: item });
  });
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption(companies[0].id);
  await page.getByRole("button", { name: "AI asistanı", exact: true }).click();
  return {
    companies,
    memory,
    turns,
    async cleanup() {
      for (const c of companies) await request.delete(`/api/companies/${c.id}`);
    },
  };
}
test("AI şirket hafızası ve yanıtları ayrılır; onaylanan platform metinleri stüdyoya aktarılır", async ({
  page,
  request,
}) => {
  const f = await fixture(page, request);
  try {
    const media = {
      id: crypto.randomUUID(),
      companyId: f.companies[0].id,
      width: 128,
      height: 96,
    };
    const image = await sharp({
      create: { width: 128, height: 96, channels: 3, background: "#c32420" },
    })
      .jpeg()
      .toBuffer();
    await page.route(`**/api/media?companyId=${f.companies[0].id}`, (route) =>
      route.fulfill({ status: 201, json: media }),
    );
    await page.route(`**/api/media/${media.id}`, (route) =>
      route.fulfill({ json: media }),
    );
    await page.route(`**/api/media/${media.id}/*.jpg*`, (route) =>
      route.fulfill({ contentType: "image/jpeg", body: image }),
    );
    await page
      .getByLabel("AI için görsel yükle", { exact: true })
      .setInputFiles({
        name: "urun.jpg",
        mimeType: "image/jpeg",
        buffer: image,
      });
    await expect(
      page.getByAltText("Asistana verilen görsel", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Bilgi başlığı", { exact: true })
      .fill("Hizmet bölgemiz");
    await page
      .getByLabel("Hafıza içeriği", { exact: true })
      .fill("Yalnızca Sivas'ta hizmet veriyoruz.");
    await page
      .getByRole("button", { name: "Hafızaya ekle", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hizmet bölgemiz", exact: true }),
    ).toBeVisible();
    expect(f.memory[0].companyId).toBe(f.companies[0].id);
    await page.route("**/api/ai/ask", async (route) => {
      const input = route.request().postDataJSON();
      expect(input.mediaId).toBe(media.id);
      const turn = {
        id: crypto.randomUUID(),
        companyId: input.companyId,
        question: input.question,
        answer: "İçerikler kontrolünüz için hazır.",
        posts: input.selected.map((platform) => ({
          platform,
          title: "",
          caption: `Sivas'taki işletmelere özel ${platform} içeriği.`,
          hashtags: ["#Sivas"],
          alt: "",
        })),
        createdAt: new Date().toISOString(),
        mediaId: input.mediaId,
        imageObservation: "Beyaz zeminde kırmızı kupa.",
      };
      f.turns.push(turn);
      await route.fulfill({ json: turn });
    });
    await page
      .getByLabel("Platformlara içerik hazırla", { exact: true })
      .check();
    await page
      .getByLabel("Asistandan ne istersiniz?", { exact: true })
      .fill("İşletmeler için tanıtım gönderisi hazırla.");
    await page
      .getByRole("button", { name: "İçerikleri hazırla", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Stüdyoya aktar", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(f.companies[1].id);
    await expect(
      page.getByRole("heading", { name: "Hizmet bölgemiz", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Stüdyoya aktar", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByAltText("Asistana verilen görsel", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(f.companies[0].id);
    await page
      .getByRole("button", { name: "Stüdyoya aktar", exact: true })
      .click();
    await expect(
      page.getByLabel("Platform gönderi metni", { exact: true }),
    ).toHaveValue("Sivas'taki işletmelere özel instagram içeriği.");
    await expect(
      page.getByText("Cloudflare AI ile hazırlandı", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(`img[src*="${media.id}"]`).first()).toBeVisible();
    await expect(
      page.getByLabel("Neyi paylaşmak istersiniz?", { exact: true }),
    ).toHaveValue("İşletmeler için tanıtım gönderisi hazırla.");
  } finally {
    await f.cleanup();
  }
});

test("Şirket değiştikten sonra gelen eski AI yanıtı yeni şirketin ekranında gösterilmez", async ({
  page,
  request,
}) => {
  const f = await fixture(page, request);
  let release, started;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const requested = new Promise((resolve) => {
    started = resolve;
  });
  try {
    await page.route("**/api/ai/ask", async (route) => {
      const input = route.request().postDataJSON();
      started();
      await pending;
      const turn = {
        id: crypto.randomUUID(),
        companyId: input.companyId,
        question: input.question,
        answer: "Şirket A'ya özel geciken yanıt.",
        posts: null,
        createdAt: new Date().toISOString(),
      };
      f.turns.push(turn);
      await route.fulfill({ json: turn });
    });
    await page
      .getByLabel("Asistandan ne istersiniz?", { exact: true })
      .fill("Bu şirket için bir fikir ver.");
    await page.getByLabel("Danış / fikir üret", { exact: true }).check();
    await page
      .getByRole("button", { name: "Asistana gönder", exact: true })
      .click();
    await requested;
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(f.companies[1].id);
    await expect(
      page.getByRole("heading", {
        name: "Markanız için birlikte düşünelim.",
        exact: true,
      }),
    ).toBeVisible();
    release();
    await expect.poll(() => f.turns.length).toBe(1);
    await expect(
      page.getByText("Şirket A'ya özel geciken yanıt.", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(f.companies[0].id);
    await expect(
      page.getByText("Şirket A'ya özel geciken yanıt.", { exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await f.cleanup();
  }
});
