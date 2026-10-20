import { test, expect } from "@playwright/test";

test("Küçük yerel AI kurulumu, şirket hafızası ve dokuz platformun stüdyoya aktarımı", async ({
  page,
  request,
}) => {
  const company = await (
    await request.post("/api/companies", {
      data: {
        name: "Yerel AI kurgu şirketi",
        handle: "",
        website: "",
        tone: "Sade",
        audience: "Ev sahipleri",
        keywords: "tasarım",
        color: "#326f61",
      },
    })
  ).json();
  let phase = "runtime_missing",
    sent,
    modelCalls = 0;
  const status = () => ({
    model: "qwen3.5:9b",
    phase,
    progress: phase === "downloading" ? 0.5 : null,
    busy: phase === "downloading",
    code: null,
  });
  await page.route("**/api/health", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      json: {
        ...(await r.json()),
        database: "d1",
        companyComputer: true,
        ai: "cloudflare",
      },
    });
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "fixture-local",
          username: "admin",
          email: "admin@example.test",
          name: "Test",
          role: "admin",
        },
      },
    }),
  );
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        model: "fixture-cloud-off",
        reservedNeurons: 0,
        limits: {
          dailyNeurons: 9000,
          providerDailyNeurons: 10000,
          memoryItems: 30,
          memoryCharacters: 8000,
        },
      },
    }),
  );
  await page.route("**/api/ai/workspace?*", (route) =>
    route.fulfill({
      json: {
        memory: [
          {
            id: "rule",
            companyId: company.id,
            kind: "rule",
            title: "Marka kuralı",
            body: "Fiyat uydurulmaz.",
          },
        ],
        turns: [],
      },
    }),
  );
  await page.route("**/api/computer/ai/status", (route) =>
    route.fulfill({ json: status() }),
  );
  await page.route("**/api/computer/ai/setup", (route) => {
    phase = "downloading";
    return route.fulfill({ status: 202, json: status() });
  });
  await page.route("**/api/computer/ai/ask", async (route) => {
    sent = route.request().postDataJSON();
    modelCalls++;
    await route.fulfill({
      json: {
        id: crypto.randomUUID(),
        companyId: sent.companyId,
        question: sent.question,
        answer: "Yerel taslaklar hazır, henüz paylaşılmadı.",
        posts: sent.selected.map((p) => ({
          platform: p,
          title: "Kaynak başlığı",
          caption: `${p} için yerel kurgu taslağı.`,
          hashtags: [],
          alt: "",
        })),
        mediaId: null,
        createdAt: new Date().toISOString(),
        engine: "local",
        model: "qwen3.5:9b",
        published: false,
      },
    });
  });
  try {
    await page.goto("/");
    await page
      .getByRole("combobox", { name: "Aktif şirket" })
      .selectOption(company.id);
    await page
      .getByRole("button", { name: "AI asistanı", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Asistanın çalışacağı yer" }),
    ).toHaveValue("local");
    await expect(
      page.getByText("İlk kurulum gerekli", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "İçerikleri hazırla", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Yerel AI kurulumunu başlat" })
      .click();
    await expect(
      page.getByRole("progressbar", { name: "Model indirme ilerlemesi" }),
    ).toHaveAttribute("value", "0.5");
    phase = "ready";
    await expect(
      page.getByText("Yerel model hazır", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await page
      .getByLabel("Asistandan ne istersiniz?")
      .fill("Yeni ürünümüzü kaynak bilgilere bağlı kalarak tanıt.");
    await page
      .getByRole("button", { name: "İçerikleri hazırla", exact: true })
      .click();
    await expect(
      page.getByText("Yerel taslaklar hazır, henüz paylaşılmadı.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(modelCalls).toBe(1);
    expect(sent.companyId).toBe(company.id);
    expect(sent.selected).toHaveLength(9);
    expect(sent.selected).toContain("tumblr");
    await expect(
      page.getByText("Fiyat uydurulmaz.", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Stüdyoya aktar", exact: true })
      .click();
    await expect(
      page.getByText("AI içerikleri stüdyoya aktarıldı", {
        exact: false,
      }),
    ).toBeVisible();
  } finally {
    await request.delete(`/api/companies/${company.id}`);
  }
});
