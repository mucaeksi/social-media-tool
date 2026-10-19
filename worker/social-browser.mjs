import puppeteer from "@cloudflare/puppeteer";
import {
  BROWSER_LIMITS,
  browserPlatforms,
  accountCookies,
  domainMatches,
  openCookies,
  sealCookies,
  reserveBrowserTime,
  settleBrowserTime,
} from "./browser-state.mjs";

function failure(status, message) {
  throw Object.assign(new Error(message), { status, public: true });
}
async function disconnect(browser) {
  try {
    await browser.disconnect();
  } catch {}
}

// One controller for the application: no concurrent company cookie jars, and a
// persistent account-wide daily budget. Never exported as a public endpoint.
export class SocialBrowser {
  constructor(ctx, env, driver = puppeteer) {
    this.ctx = ctx;
    this.env = env;
    this.driver = driver;
    this.queue = Promise.resolve();
  }
  exclusive(action) {
    const result = this.queue.then(action);
    this.queue = result.catch(() => {});
    return result;
  }
  async fetch(request) {
    return this.exclusive(async () => {
      try {
        const { action, account, userId, text } = await request.json();
        let active = await this.ctx.storage.get("active");
        if (active && active.expiresAt <= Date.now()) {
          const ended = await this.finish(active, true);
          if (!ended.closed)
            failure(
              503,
              "Önceki tarayıcının kapanışı doğrulanamadı. Kapatma otomatik yeniden denenecek.",
            );
          active = null;
        }
        if (action === "status") {
          const budget = await this.ctx.storage.get("budget");
          return Response.json({
            limits: BROWSER_LIMITS,
            usedMs:
              budget?.day === new Date().toISOString().slice(0, 10)
                ? budget.usedMs
                : 0,
            active: active
              ? {
                  accountId: active.account.id,
                  companyId: active.account.companyId,
                  expiresAt: active.expiresAt,
                  owned: active.userId === userId,
                }
              : null,
          });
        }
        if (action === "remove-company") {
          if (
            active?.account.companyId === account.companyId &&
            !(await this.finish(active, false)).closed
          )
            failure(503, "Tarayıcı henüz kapatılamadı.");
          return Response.json({ ok: true });
        }
        if (action === "remove-account") {
          if (
            active?.account.id === account.id &&
            !(await this.finish(active, false)).closed
          )
            failure(503, "Tarayıcı henüz kapatılamadı.");
          return Response.json({ ok: true });
        }
        if (
          active &&
          (active.account.id !== account.id || active.userId !== userId)
        )
          failure(
            409,
            "Başka bir hesap için açık tarayıcı var. Önce o oturumu kapatın.",
          );
        if (action === "open") {
          if (active) return Response.json(await this.view(active));
          const reservation = reserveBrowserTime(
            await this.ctx.storage.get("budget"),
          );
          active = {
            account: {
              id: account.id,
              companyId: account.companyId,
              platform: account.platform,
            },
            userId,
            startedAt: Date.now(),
            expiresAt: Date.now() + reservation.duration,
            reservedMs: reservation.reservedMs,
            day: reservation.budget.day,
            sessionId: null,
          };
          await this.ctx.storage.put({ budget: reservation.budget, active });
          await this.ctx.storage.setAlarm(active.expiresAt);
          let browser;
          try {
            const acquired = await this.driver.acquire(this.env.BROWSER, {
              keep_alive: BROWSER_LIMITS.idleMs,
            });
            active.sessionId = acquired.sessionId;
            await this.ctx.storage.put("active", active);
            browser = await this.driver.connect(
              this.env.BROWSER,
              active.sessionId,
            );
            const pages = await browser.pages();
            const page = pages[0] || (await browser.newPage());
            if (account.encryptedCookies) {
              const cookies = await openCookies(
                account.encryptedCookies,
                account,
                this.env.BROWSER_STATE_KEY,
              );
              const cdp = await page.createCDPSession();
              try {
                if (cookies.length)
                  await cdp.send("Storage.setCookies", { cookies });
              } finally {
                await cdp.detach();
              }
            }
            await page.setViewport({ width: 1280, height: 800 });
            // This is a real visible browser. No stealth, CAPTCHA solver, login
            // bypass or password collection is used.
            const config = browserPlatforms[account.platform];
            let navigationFailed = false;
            await page
              .goto(account.encryptedCookies ? config.home : config.login, {
                waitUntil: "domcontentloaded",
                timeout: 20000,
              })
              .catch(() => {
                navigationFailed = true;
              });
            return Response.json({
              ...(await this.view(active, browser)),
              navigationFailed,
            });
          } catch {
            await this.finish(active, false).catch(() => {});
            failure(
              503,
              "Uzak tarayıcı açılamadı. Cloudflare kotası veya platform erişimi nedeniyle işlem tamamlanamadı.",
            );
          } finally {
            if (browser) await disconnect(browser);
          }
        }
        if (!active) failure(410, "Tarayıcı kapandı. Hesabı yeniden açın.");
        if (action === "paste") {
          if (typeof text !== "string" || !text.trim() || text.length > 70000)
            failure(400, "Aktarılacak metin geçersiz.");
          const browser = await this.driver.connect(
            this.env.BROWSER,
            active.sessionId,
          );
          try {
            const config = browserPlatforms[active.account.platform];
            const page = (await browser.pages()).find((p) => {
              try {
                return domainMatches(new URL(p.url()).hostname, config.roots);
              } catch {
                return false;
              }
            });
            if (!page) failure(400, "Önce sosyal ağın gönderi ekranını açın.");
            const editable = await page.evaluate(() => {
              const element = document.activeElement;
              return Boolean(
                element &&
                  ((element.tagName === "TEXTAREA" &&
                    !element.disabled &&
                    !element.readOnly) ||
                    element.isContentEditable),
              );
            });
            if (!editable)
              failure(
                400,
                "Uzak tarayıcıda önce gönderi metni alanına tıklayın. Giriş ve şifre alanlarına metin aktarılmaz.",
              );
            await page.keyboard.insertText(text);
            return Response.json({ inserted: true, published: false });
          } finally {
            await disconnect(browser);
          }
        }
        if (action === "save")
          return Response.json(await this.finish(active, true));
        if (action === "close")
          return Response.json(await this.finish(active, false));
        failure(400, "Bilinmeyen tarayıcı işlemi.");
      } catch (error) {
        // Browser errors can contain signed URLs. Never log or return them.
        return Response.json(
          {
            error:
              error.public || error.status === 429
                ? error.message
                : "Tarayıcı işlemi tamamlanamadı. Oturum süresi dolmuş olabilir.",
          },
          { status: error.status || 502 },
        );
      }
    });
  }
  async view(active, connected) {
    const browser =
      connected ||
      (await this.driver.connect(this.env.BROWSER, active.sessionId));
    try {
      const pages = await browser.pages();
      const config = browserPlatforms[active.account.platform];
      const page =
        pages.find((p) => {
          try {
            return domainMatches(new URL(p.url()).hostname, config.roots);
          } catch {
            return false;
          }
        }) || pages[0];
      if (!page)
        failure(410, "Tarayıcı sayfası kapandı. Oturumu kapatıp yeniden açın.");
      const cdp = await page.createCDPSession();
      try {
        const live = await cdp.send("Cloudflare.getLiveView", {
          mode: "tab",
          expiresInMs: 60000,
        });
        const url = new URL(live.devtoolsFrontendUrl);
        if (url.protocol !== "https:" || url.hostname !== "live.browser.run")
          throw new Error("Canlı görünüm adresi doğrulanamadı.");
        return {
          accountId: active.account.id,
          expiresAt: active.expiresAt,
          viewUrl: url.toString(),
        };
      } finally {
        await cdp.detach();
      }
    } finally {
      if (!connected) await disconnect(browser);
    }
  }
  async finish(active, save) {
    let browser,
      closed = !active.sessionId,
      saved = false,
      hasSession = false;
    try {
      if (active.sessionId) {
        browser = await this.driver.connect(this.env.BROWSER, active.sessionId);
        if (save) {
          const page = (await browser.pages())[0] || (await browser.newPage());
          const cdp = await page.createCDPSession();
          let allCookies;
          try {
            allCookies = (await cdp.send("Storage.getCookies")).cookies;
          } finally {
            await cdp.detach();
          }
          const cookies = accountCookies(allCookies, active.account.platform);
          hasSession = cookies.some(
            (c) => c.name === browserPlatforms[active.account.platform].cookie,
          );
          if (hasSession) {
            const encrypted = await sealCookies(
              cookies,
              active.account,
              this.env.BROWSER_STATE_KEY,
            );
            const result = await this.env.DB.prepare(
              "UPDATE social_accounts SET encrypted_cookies=?, saved_at=? WHERE id=? AND company_id=? AND platform=?",
            )
              .bind(
                encrypted,
                new Date().toISOString(),
                active.account.id,
                active.account.companyId,
                active.account.platform,
              )
              .run();
            saved = result.meta.changes > 0;
          }
        }
      }
    } catch {
      /* Keep the previous encrypted session when the browser expired. */
    } finally {
      if (browser) {
        try {
          const page = (await browser.pages())[0] || (await browser.newPage());
          const cdp = await page.createCDPSession();
          try {
            await cdp.send("Browser.close");
          } finally {
            await cdp.detach().catch(() => {});
          }
        } catch {
          /* Closure is verified below, never inferred from a disconnect. */
        } finally {
          await disconnect(browser);
        }
      }
      if (!closed) {
        try {
          closed = !(await this.driver.sessions(this.env.BROWSER)).some(
            (session) => session.sessionId === active.sessionId,
          );
        } catch {
          /* Never free a lease when closure cannot be confirmed. */
        }
      }
      const budget = await this.ctx.storage.get("budget");
      if (closed)
        await this.ctx.storage.put("budget", settleBrowserTime(budget, active));
      if (closed) {
        await this.ctx.storage.delete("active");
        await this.ctx.storage.deleteAlarm();
      } else {
        await this.ctx.storage.put("active", {
          ...active,
          expiresAt: Date.now(),
        });
        await this.ctx.storage.setAlarm(Date.now() + 5000);
      }
    }
    return { saved, hasSession, closed };
  }
  async alarm() {
    await this.exclusive(async () => {
      const active = await this.ctx.storage.get("active");
      if (active) await this.finish(active, true);
    });
  }
}
