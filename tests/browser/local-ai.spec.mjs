import { test, expect } from "@playwright/test";
import { qwenSkills, QWEN_SKILLS_PROTOCOL, QWEN_SKILLS_VERSION } from "../../shared/qwen-skills.mjs";

test("Küçük yerel AI kurulumu, şirket hafızası ve dokuz platformun stüdyoya aktarımı", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const company = await (
    await request.post("/api/companies", {
      data: {
        name: "Yerel AI kurgu şirketi",
        preferredPlatforms: [
          "instagram",
          "facebook",
          "x",
          "threads",
          "pinterest",
          "youtube",
          "tiktok",
          "linkedin",
          "tumblr",
        ],
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
    modelCalls = 0, selfTest = null, testCalls = 0, skillsValid = false, skillChecks = 0, skillRepairs = 0, lastUse = null;
  const status = () => ({
    model: "qwen3.5:9b",
    phase,
    progress: phase === "downloading" ? 0.5 : null,
    busy: phase === "downloading",
    code: null,
    diagnosticVersion: "local-ai-check-v1",
    selfTest,
    skills: { protocol: QWEN_SKILLS_PROTOCOL, version: QWEN_SKILLS_VERSION, state: skillsValid ? "ready" : "invalid",
      checkedAt: new Date().toISOString(), digest: skillsValid ? "a".repeat(64) : null,
      skills: skillsValid ? qwenSkills.map((s) => ({ id: s.id, title: s.title, sha256: "b".repeat(64) })) : [], lastUse },
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
  await page.route("**/api/computer/ai/skills/check", (route) => { skillChecks++; return route.fulfill({ json: status() }); });
  await page.route("**/api/computer/ai/skills/repair", (route) => { skillRepairs++; skillsValid = true; return route.fulfill({ json: status() }); });
  await page.route("**/api/computer/ai/setup", (route) => {
    phase = "downloading";
    return route.fulfill({ status: 202, json: status() });
  });
  await page.route("**/api/computer/ai/self-test", (route) => {
    testCalls++;
    selfTest = { state: testCalls === 1 ? "failed" : "passed", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      code: testCalls === 1 ? "GPU_MEMORY" : null, steps: [{ id: "model", state: "passed", durationMs: 2, code: null },
        { id: "text", state: testCalls === 1 ? "failed" : "passed", durationMs: 120, code: testCalls === 1 ? "GPU_MEMORY" : null }] };
    return route.fulfill({ status: 202, json: status() });
  });
  let nightEnabled = true,
    noteState = "pending";
  const noteId = crypto.randomUUID();
  await page.route("**/api/computer/ai/night**", (route) => {
    const body =
      route.request().method() === "POST"
        ? route.request().postDataJSON()
        : null;
    if (body) expect(body.companyId).toBe(company.id);
    if (body?.enabled !== undefined) nightEnabled = body.enabled;
    if (route.request().url().endsWith("/review")) {
      expect(body.noteId).toBe(noteId);
      noteState = body.state;
    }
    return route.fulfill({
      json: {
        enabled: nightEnabled,
        running: false,
        syncedAt: new Date().toISOString(),
        expired: false,
        pendingCount: noteState === "pending" ? 1 : 0,
        attempts: [],
        notes: [
          {
            id: noteId,
            url: "https://creators.instagram.com/",
            summary: "Kaynağı kontrol ederek somut faydayla başlayın.",
            state: noteState,
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      },
    });
  });
  await page.route("**/api/computer/ai/ask", async (route) => {
    sent = route.request().postDataJSON();
    modelCalls++;
    lastUse = { task: "posts", ids: ["kaynak-marka", "platform-tumblr"], version: QWEN_SKILLS_VERSION, digest: "a".repeat(64), at: new Date().toISOString() };
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
    await page.getByText("Yerel AI ve beceri yönetimi", { exact: true }).click();
    const night = page.getByRole("region", { name: "Gece öğrenmesi" });
    await expect(
      night.getByText("Gece programı açık.", { exact: true }),
    ).toBeVisible();
    await night.getByText("Sabah incelemesi", { exact: false }).click();
    await night.getByRole("button", { name: "İnceledim, notu kullan" }).click();
    await expect(
      night.getByText("İncelendi; ikincil bağlamda kullanılabilir", {
        exact: false,
      }),
    ).toBeVisible();
    await night.getByRole("button", { name: "Notu reddet" }).click();
    await expect(night.getByText("Reddedildi", { exact: false })).toBeVisible();
    await night.getByRole("button", { name: "Gece programını kapat" }).click();
    await expect(
      night.getByText("Gece programı kapalı.", { exact: true }),
    ).toBeVisible();
    await night.getByRole("button", { name: "Gece programını aç" }).click();
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
      page.getByText("Model dosyası doğrulandı", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    const skills = page.getByLabel("Qwen sosyal medya becerileri");
    await expect(skills.getByText(/Beceri dosyaları doğrulanamadı/)).toBeVisible();
    await expect(page.getByRole("button", { name: "İçerikleri hazırla", exact: true })).toBeDisabled();
    await skills.getByRole("button", { name: "Beceri dosyalarını doğrula" }).click();
    expect(skillChecks).toBe(1); expect(modelCalls).toBe(0);
    await skills.getByRole("button", { name: "Beceri paketini onar" }).click();
    await expect(skills.getByText(/17 beceri dosyası doğrulandı/)).toBeVisible();
    await skills.getByText("Yüklü sosyal medya rehberleri", { exact: true }).click();
    await expect(skills.getByText("Tumblr içerik rehberi", { exact: true })).toBeVisible();
    await expect(skills.getByText(/henüz becerili model yanıtı alınmadı/)).toBeVisible();
    expect(skillRepairs).toBe(1); expect(modelCalls).toBe(0);
    await page.getByRole("button", { name: "Qwen'i gerçekten test et" }).click();
    await expect(page.getByText("Qwen testi: Başarısız", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "GPU_MEMORY" })).toBeVisible();
    await page.getByRole("button", { name: "Sorun raporunu kopyala" }).click();
    await expect(page.getByLabel("Güvenli tanılama raporu")).toContainText("GPU_MEMORY");
    await page.getByRole("button", { name: "Qwen'i gerçekten test et" }).click();
    await expect(page.getByText("Qwen testi: Geçti", { exact: true })).toBeVisible();
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
    await expect(skills.getByText(/Son model yanıtındaki beceriler: Kaynak ve marka dili, Tumblr/)).toBeVisible({ timeout: 10000 });
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
