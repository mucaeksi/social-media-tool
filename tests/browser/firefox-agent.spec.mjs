import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("Qwen Firefox görevi görüntüyü görür, iki hesapta ilerler ve iptalden sonraki yanıtı çalıştırmaz", async ({ page, request }, testInfo) => {
  const company = await (await request.post("/api/companies", { data: { name: "Qwen Firefox kurgu" } })).json();
  const accounts = ["facebook", "instagram"].map((platform) => ({ id: crypto.randomUUID(), companyId: company.id,
    platform, label: "Kurgu " + platform, profileUrl: `https://www.${platform}.com/kurgu/` }));
  const image = (await sharp({ create: { width: 320, height: 180, channels: 3, background: "#39705b" } }).jpeg().toBuffer()).toString("base64");
  const stepInputs = [], commands = [], cancels = [];
  let hold = false, release, holding = false;
  try {
    await page.route("**/api/health", async (r) => { const response = await r.fetch(); await r.fulfill({ response, json: { ...(await response.json()), companyComputer: true, database: "d1" } }); });
    await page.route("**/api/auth/me", (r) => r.fulfill({ json: { user: { id: "fixture", role: "admin", username: "admin", name: "Kurgu" } } }));
    await page.route("**/api/social/accounts?*", (r) => r.fulfill({ json: accounts }));
    await page.route("**/api/computer/status", (r) => r.fulfill({ json: { devices: [], onlineDeviceId: null, active: null, commandsUsed: 0, dailyCommands: 20000 } }));
    await page.route("**/api/computer/profiles?*", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/computer/ai/status", (r) => r.fulfill({ json: { phase: "ready", busy: false, browserAgentVersion: "firefox-agent-v1" } }));
    await page.route("**/api/computer/ai/browser-cancel", (r) => { cancels.push(r.request().postDataJSON()); return r.fulfill({ json: { phase: "ready" } }); });
    await page.route("**/api/computer/ai/browser-step", async (r) => {
      const input = r.request().postDataJSON(); stepInputs.push(input);
      expect(input.companyId).toBe(company.id); expect(input.image).toBe(image); expect(input.runId).toMatch(/^[a-f0-9-]{36}$/);
      expect(input.profile).toBeUndefined();
      const n = input.history.length;
      const decision = { action: n === 0 ? "click" : n === 1 ? "type" : n === 2 ? "switch-tab" : "done",
        elementId: n < 2 ? input.observation.controls[0].id : "", accountId: n === 2 ? accounts[1].id : "",
        text: n === 1 ? "Girne mağazamıza bekleriz. #Girne" : "", message: n === 3 ? "Metin şirket formunda hazır; Instagram sayfası da incelendi." : "Sıradaki kurgu işlemi." };
      if (hold) { holding = true; await new Promise((resolve) => { release = resolve; }); }
      await r.fulfill({ json: { decision } }).catch(() => {});
    });
    await page.exposeFunction("recordAgentCommand", (m) => commands.push(m));
    await page.addInitScript(({ companyId, accounts, image }) => {
      const bindings = accounts.map((a, i) => ({ ...a, accountId: a.id, identityLabel: "Kurgu", tabId: i + 2 }));
      window.agentFixture = { pending: false, approved: false, sessionId: null, task: "", phase: 0, accountId: accounts[0].id, typed: "" };
      window.addEventListener("message", (e) => {
        const m = e.data;
        if (e.source !== window || m?.source !== "sosyal-studio-panel-v1") return;
        void window.recordAgentCommand(m);
        const f = window.agentFixture;
        let result = {};
        if (m.action === "status") result = { version: "1.5.0", window: { companyId, windowId: 7 }, bindings, binding: bindings[0], pending: f.pending,
          agent: f.approved ? { id: f.sessionId, task: f.task, steps: f.phase, expiresAt: Date.now() + 600000, accountId: f.accountId } : null };
        if (m.action === "tabs") result = { tabs: bindings.map((b) => ({ id: b.tabId, title: b.label, url: b.profileUrl, active: false, pinned: true, panel: false })) };
        if (m.action === "agent-start") { Object.assign(f, { pending: true, approved: false, sessionId: m.requestId, task: m.task, phase: 0, accountId: m.accountId, typed: "" }); result = { pending: true }; }
        if (m.action === "agent-observe") {
          const target = bindings.find((b) => b.accountId === f.accountId);
          result = { target, image, tabs: bindings.map((b) => ({ accountId: b.accountId, platform: b.platform, label: b.label })),
            observation: { id: crypto.randomUUID(), url: target.profileUrl, title: "Kurgu şirket sayfası", text: "KKTC kurgu ürünleri",
              controls: f.phase < 2 ? [{ id: crypto.randomUUID(), label: f.phase === 0 ? "Gönderi oluştur" : "Gönderi metni", kind: f.phase === 0 ? "button" : "field", clickable: f.phase === 0, writable: f.phase === 1 }] : [] } };
        }
        if (m.action === "agent-act") {
          if (m.decision.action === "type") f.typed = m.decision.text;
          if (m.decision.action === "switch-tab") f.accountId = m.decision.accountId;
          f.phase++;
          result = { applied: true, detail: "Kurgu işlem sonucu doğrulandı." };
          if (m.decision.action === "done") { f.approved = false; result = { finished: "done", detail: m.decision.message }; }
        }
        if (m.action === "agent-stop" && m.sessionId === f.sessionId) { f.pending = false; f.approved = false; }
        window.postMessage({ source: "sosyal-studio-firefox-v1", id: m.id, ok: true, ...result }, location.origin);
      });
    }, { companyId: company.id, accounts, image });
    await page.goto(`/?company=${company.id}&page=connections`);
    const agent = page.locator(".firefox-agent");
    await expect(agent.getByRole("button", { name: "Qwen Firefox görevini başlat" })).toBeDisabled();
    await agent.getByLabel("Firefox'ta Qwen'e verilecek görev").fill("Facebook'ta boş gönderi alanına Girne daveti yaz, ardından Instagram sayfamı incele.");
    await agent.getByRole("button", { name: "Qwen Firefox görevini başlat" }).click();
    await expect(agent.getByRole("status")).toContainText("Sosyal Studio simgesinden görevi onaylayın");
    expect(stepInputs).toHaveLength(0);
    await page.evaluate(() => { window.agentFixture.approved = true; window.agentFixture.pending = false; });
    await expect(agent.getByLabel("Qwen Firefox görev değerlendirmesi")).toContainText("Metin şirket formunda hazır");
    await expect(agent.getByRole("button", { name: "Qwen Firefox görevini başlat" })).toBeEnabled();
    expect(stepInputs).toHaveLength(4);
    expect(stepInputs.at(-1).target.platform).toBe("instagram");
    expect(await page.evaluate(() => window.agentFixture.typed)).toBe("Girne mağazamıza bekleriz. #Girne");
    await expect(agent.getByRole("img")).toBeVisible();
    await expect(agent.getByLabel("Qwen Firefox işlem adımları").locator("li")).toHaveCount(4);
    hold = true;
    await agent.getByRole("button", { name: "Qwen Firefox görevini başlat" }).click();
    await expect(agent.getByRole("status")).toContainText("Sosyal Studio simgesinden görevi onaylayın");
    await page.evaluate(() => { window.agentFixture.approved = true; window.agentFixture.pending = false; });
    await expect.poll(() => holding).toBe(true);
    const actionsBefore = commands.filter((c) => c.action === "agent-act").length;
    await agent.getByRole("button", { name: "Firefox görevini durdur" }).click();
    release();
    await expect(agent.getByRole("status")).toContainText("Firefox görevi durduruldu");
    await expect(agent.getByRole("button", { name: "Qwen Firefox görevini başlat" })).toBeEnabled();
    expect(commands.filter((c) => c.action === "agent-act")).toHaveLength(actionsBefore);
    expect(cancels.length).toBeGreaterThanOrEqual(2);
    expect(commands.some((c) => ["publish-batch", "prepare"].includes(c.action))).toBe(false);
    expect(await page.evaluate(() => Object.values(localStorage).some((v) => v.includes("/9j/")))).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    await agent.getByRole("heading").click();
    const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      outside: [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 60), right: el.getBoundingClientRect().right })) }));
    expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
    await page.screenshot({ path: testInfo.outputPath("qwen-firefox-gorev-mobil.png"), fullPage: true, animations: "disabled" });
  } finally { release?.(); await request.delete(`/api/companies/${company.id}`); }
});
