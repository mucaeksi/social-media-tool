import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firefox } from "@playwright/test";
import sharp from "sharp";
import puppeteer from "puppeteer-core";
import { WebsiteResearch } from "../../companion/research.mjs";
import { ProfileBrowsers } from "../../companion/browser.mjs";
const executablePath =
  process.env.FIREFOX_EXECUTABLE ||
  (existsSync("/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr")
    ? "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr"
    : firefox.executablePath());
test(
  "Gerçek Firefox görevleri: güvenli okuma, eski öğeyi reddetme, JPEG yükleme ve tek gönderi kanıtı",
  { timeout: 90000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "studio-tasks-"));
    const html = `<!doctype html><meta charset=utf-8><h1>Kurgu Sayfa</h1><a aria-label="Your profile" href="/">Profil</a><form><input type=password value="fixture-secret-not-for-ai"></form><textarea aria-label="Taslak alanı"></textarea><input id=asset type=file accept="image/jpeg"><button onclick="compose()">Create post</button><main id=feed></main><script>
  function compose(){const d=document.createElement('div');d.setAttribute('role','dialog');d.innerHTML='<div contenteditable=true role=textbox aria-label="Gönderi metni" style="width:300px;height:80px;border:1px solid"></div><button onclick="sendPost()">Post</button>';document.body.append(d);}
  function sendPost(){window.sent=(window.sent||0)+1;const d=document.querySelector('[role=dialog]');const a=document.createElement('article');a.setAttribute('role','article');const t=document.createElement('p');t.textContent=d.querySelector('[role=textbox]').innerText;a.append(t);const link=document.createElement('a');link.href='https://www.facebook.com/fixture/posts/'+window.sent;link.textContent='Gönderi bağlantısı';a.append(link);document.querySelector('#feed').append(a);d.remove();}
  </script>`;
    const server = createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${server.address().port}/`;
    const pool = new ProfileBrowsers({
      directory,
      executablePath,
      headless: true,
      testing: true,
      platforms: { facebook: { login: url, home: url, roots: ["127.0.0.1"] } },
    });
    const account = {
      id: crypto.randomUUID(),
      companyId: crypto.randomUUID(),
      platform: "facebook",
      profileUrl: url,
    };
    const command = (value) =>
      pool.execute(account, { ...value, noFrame: true });
    try {
      await command({ action: "open" });
      const first = await command({ action: "read" });
      assert.ok(!first.page.text.includes("fixture-secret"));
      assert.ok(
        !first.page.elements.some((e) => e.label.includes("fixture-secret")),
      );
      const staleField = first.page.elements.find((e) => e.kind === "field");
      const current = await command({ action: "read" });
      await assert.rejects(
        command({
          action: "fill",
          snapshotId: first.page.id,
          elementId: staleField.id,
          text: "Yanlış eski sayfa",
        }),
        /yeniden/,
      );
      const field = current.page.elements.find((e) => e.kind === "field");
      const after = await command({
        action: "fill",
        snapshotId: current.page.id,
        elementId: field.id,
        text: "Türkçe KKTC taslağı",
      });
      const browser = [...pool.opened.values()][0].browser,
        page = (await browser.pages()).find((p) => p.url().startsWith(url));
      assert.equal(
        await page.$eval("textarea", (e) => e.value),
        "Türkçe KKTC taslağı",
      );
      const file = after.page.elements.find((e) => e.kind === "file");
      const bytes = await sharp({
        create: { width: 64, height: 64, channels: 3, background: "white" },
      })
        .jpeg()
        .toBuffer();
      await command({
        action: "upload",
        snapshotId: after.page.id,
        elementId: file.id,
        media: bytes.toString("base64"),
      });
      assert.equal(
        await page.$eval("#asset", (e) => e.files[0].size),
        bytes.length,
      );
      await assert.rejects(
        command({ action: "navigate", url: "file:///etc/passwd" }),
        /sosyal ağ/,
      );
      await assert.rejects(
        command({ action: "navigate", url: url + "messages" }),
        /özel mesaj/,
      );
      await command({ action: "navigate", url });
      const proof = {
        jobId: crypto.randomUUID(),
        fingerprint: "a".repeat(64),
        identityLabel: "Kurgu Sayfa",
      };
      await assert.rejects(
        command({
          action: "prepare",
          ...proof,
          identityLabel: "Başka Sayfa",
          text: "Kurgu paylaşım",
        }),
        /kimliği/,
      );
      const prepared = await command({
        action: "prepare",
        ...proof,
        text: "Kurgu paylaşım",
      });
      assert.equal(prepared.publication.state, "ready");
      const sent = await command({ action: "publish", ...proof });
      assert.equal(sent.publication.state, "verified");
      assert.equal(
        sent.publication.url,
        "https://www.facebook.com/fixture/posts/1",
      );
      await assert.rejects(
        command({ action: "publish", ...proof }),
        /önizlemesi/,
      );
      assert.equal(await page.evaluate(() => window.sent), 1);
    } finally {
      await pool.closeAll();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(directory, { recursive: true, force: true });
    }
  },
);
test(
  "Gerçek Firefox statik araştırmada sayfa talimatını çalıştırmaz, görünür metni çıkarır ve form verisini taşımaz",
  { timeout: 45000 },
  async () => {
    const html =
      '<!doctype html><title>Kurgu ürün kaynağı</title><main><h1>Kurgu sandalye</h1><p>Teslimat yalnız Girne.</p><p style="display:none">Gizli fiyat 999</p><form><input value="fixture-private-value"></form></main><script>document.body.innerHTML="talimat çalıştı"</script>';
    const research = new WebsiteResearch({
      executablePath,
      readHTML: async (url) => ({
        url,
        html: url.endsWith("robots.txt") ? "" : html,
      }),
      launch: (options) =>
        puppeteer.launch({
          ...options,
          env: {
            ...process.env,
            MOZ_DISABLE_CONTENT_SANDBOX: "1",
            MOZ_CRASHREPORTER_DISABLE: "1",
          },
        }),
    });
    const result = await research.execute({
      urls: ["https://www.example.com/urun"],
      hosts: ["www.example.com"],
      mode: "static",
    });
    assert.equal(result.pages[0].title, "Kurgu ürün kaynağı");
    assert.match(result.pages[0].text, /Teslimat yalnız Girne/);
    assert.ok(!result.pages[0].text.includes("talimat çalıştı"));
    assert.ok(!result.pages[0].text.includes("fixture-private"));
    assert.ok(!result.pages[0].text.includes("999"));
    assert.equal(research.busy, false);
  },
);
