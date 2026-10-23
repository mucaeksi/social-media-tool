import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";

test("Gerçek Firefox: dokuz sosyal ağ biçiminde görsel alanları, şirket kimliği, tek yazma ve eski görüntü reddi", { timeout: 90000 }, async () => {
  const server = createServer((_q, r) => r.end('<!doctype html><meta charset="utf-8"><main></main>'));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX_EXECUTABLE || "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr", headless: true });
    const page = await browser.newPage();
    const scripts = await Promise.all(["policy.js", "publication-policy.js", "agent-policy.js", "browser-agent.js"].map((f) => readFile("firefox-extension/" + f, "utf8")));
    scripts[0] = scripts[0].replace('u.protocol !== "https:"', 'u.protocol !== "http:"').replace(/\|\|\s*u\.port/, "");
    for (const platform of ["facebook", "instagram", "x", "threads", "pinterest", "linkedin", "youtube", "tiktok", "tumblr"]) {
      await page.goto(origin + "/kurgu");
      const result = await page.evaluate(async ({ scripts, origin, platform }) => {
        const [policy, publication, agentPolicy, agent] = scripts;
        (0, eval)(policy); (0, eval)(publication); (0, eval)(agentPolicy);
        for (const key of Object.keys(StudioPolicy.roots)) StudioPolicy.roots[key] = ["127.0.0.1"];
        StudioAgentPolicy.safeURL = (v) => { try { const u = new URL(v); return u.origin === origin && !u.pathname.includes("messages") ? u.href : null; } catch { return null; } };
        let listener;
        globalThis.browser = { runtime: { id: "fixture", onMessage: { addListener: (f) => { listener = f; } } } };
        document.body.style.minHeight = "2000px";
        document.querySelector("main").innerHTML = '<h1>Kurgu</h1><p>KKTC şirket bilgisi.</p><div data-private>özel-fixture</div><div role="dialog"><a id="actor">Kişisel</a><textarea aria-label="Gönderi metni"></textarea><button id="publish">Paylaş</button><button id="create">Gönderi oluştur</button></div>';
        const links = document.createElement("div");
        for (let i = 0; i < 45; i++) { const link = document.createElement("a"); link.href = origin + "/reference-" + i; link.textContent = "Sayfa " + i + " "; links.append(link); }
        document.querySelector("main").prepend(links);
        const profile = platform === "linkedin" ? "/company/kurgu" : "/kurgu";
        const target = { companyId: crypto.randomUUID(), accountId: crypto.randomUUID(), platform, label: "Kurgu", companyName: "Kurgu", identityLabel: "Kurgu", profileUrl: origin + profile };
        const actor = document.querySelector("#actor"); actor.href = origin + "/personal";
        (0, eval)(agent);
        const call = (action, data = {}) => listener({ source: "studio-browser-agent", action, target, ...data }, { id: "fixture" });
        const wrong = await call("observe");
        const personalBlocked = !wrong.observation.controls.some((c) => c.writable);
        actor.href = target.profileUrl; actor.textContent = "Kurgu";
        const observation = (await call("observe")).observation;
        const field = observation.controls.find((c) => c.writable);
        let inputs = 0, published = 0;
        document.querySelector("textarea").addEventListener("input", () => inputs++);
        document.querySelector("#publish").onclick = () => published++;
        const decision = { action: "type", elementId: field.id, accountId: "", text: "Girne için kurgu tanıtım.", message: "Boş alana yaz." };
        const cover = document.createElement("div");
        cover.style.cssText = "position:fixed;inset:0;background:white;z-index:999";
        document.body.append(cover);
        const covered = await call("act", { snapshotId: observation.id, decision });
        cover.remove();
        const refreshed = (await call("observe")).observation;
        decision.elementId = refreshed.controls.find((c) => c.writable).id;
        const applied = await call("act", { snapshotId: refreshed.id, decision });
        const stale = await call("act", { snapshotId: observation.id, decision });
        const after = (await call("observe")).observation;
        const blocked = await call("act", { snapshotId: after.id, decision: { ...decision, action: "click", text: "", elementId: "#publish" } });
        history.replaceState(null, "", "/messages");
        const privatePage = await call("observe");
        return { personalBlocked, covered: covered.ok, applied: applied.applied, stale: stale.ok, blocked: blocked.ok, privatePage: privatePage.ok, inputs, published,
          text: document.querySelector("textarea").value, hasPrivateText: observation.text.includes("özel-fixture"),
          redactions: observation.redactions.length, publishControl: observation.controls.some((c) => c.label === "Paylaş") };
      }, { scripts, origin, platform });
      assert.equal(result.personalBlocked, true, platform);
      assert.equal(result.covered, false, platform);
      assert.equal(result.applied, true, platform);
      assert.equal(result.stale, false, platform);
      assert.equal(result.blocked, false, platform);
      assert.equal(result.privatePage, false, platform);
      assert.equal(result.inputs, 1, platform);
      assert.equal(result.published, 0, platform);
      assert.equal(result.text, "Girne için kurgu tanıtım.", platform);
      assert.equal(result.hasPrivateText, false, platform);
      assert.equal(result.publishControl, false, platform);
      assert.ok(result.redactions >= 1, platform);
    }
  } finally { await browser?.close(); await new Promise((r) => server.close(r)); }
});
