import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
const executablePath =
  process.env.FIREFOX_EXECUTABLE ||
  "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr";
test(
  "Gerçek Firefox: dokuz platformda fotoğraf + metin, doğru yazar ve tek yayın; değişmiş taslak veya eski bağlantı başarı sayılmaz",
  { timeout: 120000 },
  async () => {
    assert.ok(
      existsSync(executablePath),
      "Resmî Firefox test çalıştırıcısı gerekli.",
    );
    const server = createServer((_q, r) =>
      r.end('<!doctype html><meta charset=utf-8><main id="fixture"></main>'),
    );
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + server.address().port;
    let browser;
    try {
      browser = await puppeteer.launch({
        browser: "firefox",
        executablePath,
        headless: true,
      });
      const page = await browser.newPage();
      const policy = (
        await readFile("firefox-extension/publication-policy.js", "utf8")
      )
        .replace(
          'u.protocol !== "https:"',
          '!["https:","http:"].includes(u.protocol)',
        )
        .replace(/u\.port\s*\|\|/g, "");
      const agent = (
        await readFile("firefox-extension/publisher.js", "utf8")
      ).replace(/},\s*30000\)/g, "}, 400)");
      async function fixture(
        platform,
        { wrong = false, oldLink = false } = {},
      ) {
        await page.goto(origin + "/fixture");
        return page.evaluate(
          ({ policy, agent, platform, origin, wrong, oldLink }) => {
            (0, eval)(policy);
            for (const p of Object.values(StudioPublishing.platforms))
              p.hosts = ["127.0.0.1"];
            const profile =
              platform === "linkedin"
                ? "/company/fixture"
                : ["youtube", "tiktok", "threads"].includes(platform)
                  ? "/@fixture"
                  : "/fixture";
            const links = {
              facebook: "/fixture/posts/123",
              instagram: "/p/AbC123",
              x: "/fixture/status/123",
              threads: "/@fixture/post/AbC123",
              pinterest: "/pin/123",
              linkedin: "/feed/update/urn:li:activity:123",
              youtube: "/post/Ug123",
              tiktok: "/@fixture/photo/123",
              tumblr: "/fixture/123",
            };
            const p = StudioPublishing.platforms[platform],
              dialog = document.createElement("div");
            dialog.setAttribute("role", "dialog");
            dialog.style.cssText = "width:700px;min-height:250px;";
            document.querySelector("main").append(dialog);
            const actor = document.createElement("a");
            actor.href = origin + (wrong ? "/personal" : profile);
            actor.textContent = "Kurgu";
            const avatar = document.createElement("img");
            avatar.alt = "Kurgu";
            actor.append(avatar);
            actor.setAttribute(
              "aria-label",
              platform === "instagram" || platform === "threads"
                ? "Profile"
                : "Kurgu",
            );
            actor.dataset.testid =
              platform === "x" ? "AppTabBar_Profile_Link" : "";
            actor.dataset.e2e = "nav-profile";
            const nav = document.createElement("div");
            nav.dataset.testId = "header-profile";
            nav.id = "channel-handle";
            nav.append(actor);
            dialog.append(nav);
            const field = document.createElement(
              ["facebook", "pinterest", "instagram", "tumblr"].includes(
                platform,
              )
                ? "textarea"
                : "div",
            );
            if (field.tagName !== "TEXTAREA") {
              field.contentEditable = "true";
              field.setAttribute("role", "textbox");
              field.style.cssText = "width:400px;min-height:60px;";
            }
            if (platform === "instagram")
              field.setAttribute("aria-label", "caption");
            if (platform === "pinterest") field.placeholder = "description";
            if (platform === "x") field.dataset.testid = "tweetTextarea_0";
            if (platform === "linkedin") field.className = "ql-editor";
            if (platform === "youtube") field.id = "contenteditable-root";
            dialog.append(field);
            if (["pinterest", "tumblr"].includes(platform)) {
              const title = document.createElement("input");
              title.type = "text";
              title.setAttribute("aria-label", "Title");
              dialog.append(title);
            }
            if (platform === "pinterest") {
              const board = document.createElement("button");
              board.dataset.testId = "board-dropdown-select-button";
              board.textContent = "Kurgu pano";
              dialog.append(board);
            }
            const upload = document.createElement("input");
            upload.type = "file";
            upload.accept = "image/jpeg";
            upload.multiple = true;
            dialog.append(upload);
            let clicks = 0;
            const url = origin + links[platform];
            if (oldLink) {
              const old = document.createElement("a");
              old.href = url;
              old.textContent = "Eski gönderi";
              document.body.append(old);
            }
            const button = document.createElement("button");
            button.textContent = p.publish[0];
            dialog.append(button);
            button.onclick = () => {
              clicks++;
              const article = document.createElement("article");
              article.append(actor.cloneNode(true));
              const text = document.createElement("p");
              text.textContent = field.value ?? field.innerText;
              article.append(text);
              const link = document.createElement("a");
              link.href = url;
              link.textContent = "Gönderiyi aç";
              article.append(link);
              document.querySelector("main").append(article);
            };
            globalThis.StudioPolicy = {
              target: (v) => v,
              advertising: () => null,
              clean: () => true,
            };
            globalThis.browser = {
              runtime: {
                id: "fixture",
                onMessage: {
                  addListener: (f) => {
                    window.listener = f;
                  },
                },
              },
            };
            (0, eval)(agent);
            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 100;
            canvas.getContext("2d").fillRect(0, 0, 20, 20);
            const target = {
              companyId: "a",
              accountId: "b",
              platform,
              label: "Kurgu",
              identityLabel: "Kurgu",
              profileUrl: origin + profile,
            };
            const job = {
              id: crypto.randomUUID(),
              fingerprint: "fixed-content-hash",
              snapshot: {
                transport: "firefox-tabs",
                platform,
                profileUrl: target.profileUrl,
                identityLabel: "Kurgu",
                text: "KKTC için kurgu paylaşım #Girne",
                media: [{ mediaId: "fixture" }],
                post: { title: "Kurgu ürün" },
              },
            };
            window.pubFixture = {
              target,
              job,
              field,
              upload,
              clicks: () => clicks,
              images: [
                {
                  data: canvas.toDataURL("image/jpeg").split(",")[1],
                  type: "image/jpeg",
                },
              ],
            };
            return { platform };
          },
          { policy, agent, platform, origin, wrong, oldLink },
        );
      }
      const prepare = () =>
        page.evaluate(() =>
          listener(
            {
              source: "studio-publisher-agent",
              action: "prepare",
              target: pubFixture.target,
              job: pubFixture.job,
              images: pubFixture.images,
            },
            { id: "fixture" },
          ),
        );
      const publish = (id) =>
        page.evaluate(
          (id) =>
            listener(
              {
                source: "studio-publisher-agent",
                action: "publish",
                target: pubFixture.target,
                job: pubFixture.job,
                sessionId: id,
              },
              { id: "fixture" },
            ),
          id,
        );
      for (const platform of [
        "facebook",
        "instagram",
        "x",
        "threads",
        "pinterest",
        "linkedin",
        "youtube",
        "tiktok",
        "tumblr",
      ]) {
        await fixture(platform);
        const ready = await prepare();
        assert.equal(
          ready.ready,
          true,
          platform + ": " + JSON.stringify(ready),
        );
        assert.equal(
          await page.evaluate(() => pubFixture.upload.files.length),
          1,
        );
        const result = await publish(ready.sessionId);
        assert.equal(
          result.state,
          "verified",
          platform + ": " + JSON.stringify(result),
        );
        assert.equal(await page.evaluate(() => pubFixture.clicks()), 1);
        assert.equal((await publish(ready.sessionId)).ok, false);
        assert.equal(await page.evaluate(() => pubFixture.clicks()), 1);
      }
      await fixture("instagram");
      await page.evaluate(() =>
        pubFixture.upload.addEventListener("change", () => {
          const image = document.createElement("img");
          image.src = URL.createObjectURL(pubFixture.upload.files[0]);
          image.style.cssText = "width:100px;height:100px";
          pubFixture.upload.parentElement.append(image);
          pubFixture.upload.remove();
        }),
      );
      const imageFirst = await prepare();
      assert.equal(imageFirst.ready, true, JSON.stringify(imageFirst));
      assert.equal((await publish(imageFirst.sessionId)).state, "verified");
      await fixture("facebook");
      await page.evaluate(
        () => (pubFixture.field.value = "Kullanıcının mevcut taslağı"),
      );
      assert.equal((await prepare()).ok, false);
      assert.equal(
        await page.evaluate(() => pubFixture.upload.files.length),
        0,
      );
      await fixture("x");
      await page.evaluate(() => pubFixture.field.remove());
      assert.equal((await prepare()).ok, false);
      assert.equal(
        await page.evaluate(() => pubFixture.clicks()),
        0,
        "Tanınmayan formdaki Post düğmesi oluşturma sanılarak tıklanmaz",
      );
      await fixture("facebook");
      await page.evaluate(() => history.replaceState(null, "", "/adsmanager"));
      assert.equal((await prepare()).ok, false);
      assert.equal(await page.evaluate(() => pubFixture.clicks()), 0);
      await fixture("pinterest");
      const boardReady = await prepare();
      assert.equal(boardReady.ready, true);
      await page.evaluate(
        () =>
          (document.querySelector(
            '[data-test-id="board-dropdown-select-button"]',
          ).textContent = "Başka pano"),
      );
      assert.equal((await publish(boardReady.sessionId)).ok, false);
      assert.equal(await page.evaluate(() => pubFixture.clicks()), 0);
      await fixture("facebook", { wrong: true });
      await page.evaluate(() => {
        const preview = document.createElement("article"),
          link = document.createElement("a");
        link.href = pubFixture.target.profileUrl;
        link.textContent = "Kurgu";
        preview.append(link);
        pubFixture.field.parentElement.insertBefore(preview, pubFixture.field);
      });
      assert.equal(
        (await prepare()).ok,
        false,
        "Paylaşılacak bağlantı önizlemesi etkin yayıncı kimliği değildir",
      );
      assert.equal(
        await page.evaluate(() => pubFixture.upload.files.length),
        0,
      );
      await fixture("facebook", { wrong: true });
      assert.equal((await prepare()).ok, false);
      assert.equal(await page.evaluate(() => pubFixture.clicks()), 0);
      await fixture("facebook");
      const ready = await prepare();
      await page.evaluate(
        () => (pubFixture.field.value = "Sonradan değişen metin"),
      );
      assert.equal((await publish(ready.sessionId)).ok, false);
      assert.equal(await page.evaluate(() => pubFixture.clicks()), 0);
      await fixture("facebook", { oldLink: true });
      const uncertain = await prepare();
      assert.equal((await publish(uncertain.sessionId)).state, "unknown");
      assert.equal(await page.evaluate(() => pubFixture.clicks()), 1);
      assert.equal((await publish(uncertain.sessionId)).ok, false);
    } finally {
      await browser?.close();
      await new Promise((r) => server.close(r));
    }
  },
);
