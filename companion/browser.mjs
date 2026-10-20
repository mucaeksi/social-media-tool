import puppeteer from "puppeteer-core";
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import {
  browserPlatforms,
  accountProfileUrl,
  domainMatches,
} from "../worker/browser-state.mjs";
import { computerCommand } from "../shared/computer-protocol.mjs";
import { browserTool } from "./browser-tools.mjs";
import { facebookPublish } from "./facebook-publisher.mjs";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ProfileBrowsers {
  constructor({
    directory,
    executablePath,
    headless = false,
    launch = puppeteer.launch.bind(puppeteer),
    platforms = browserPlatforms,
    testing = false,
    browser = "firefox",
  }) {
    Object.assign(this, {
      directory,
      executablePath,
      headless,
      launch,
      platforms,
      testing,
      browser,
    });
    this.opened = new Map();
    this.queue = Promise.resolve();
  }
  execute(account, value) {
    const run = this.queue.then(() =>
      this.perform(account, computerCommand(value)),
    );
    this.queue = run.catch(() => {});
    return run;
  }
  async perform(account, command) {
    if (
      !uuid.test(account.id) ||
      !uuid.test(account.companyId) ||
      !this.platforms[account.platform]
    )
      throw new Error("Hesap kimliği geçersiz.");
    const config = this.platforms[account.platform],
      shared = account.profileScope === "company",
      key = shared ? `company-${account.companyId}` : `${account.companyId}-${account.id}`;
    const opening = ["open", "workspace"].includes(command.action);
    let entry = this.opened.get(key);
    if (command.action === "close") {
      const authDetected = entry
        ? await this.authHint(entry.browser, config)
        : null;
      if (entry) {
        await entry.browser.close();
        this.opened.delete(key);
      }
      return {
        closed: true,
        profilePresent: true,
        loginVerified: false,
        authDetected,
      };
    }
    if (!entry) {
      if (!opening)
        throw new Error("Önce hesap ekranını açın.");
      // Keep a bounded number of browser processes. Closed profiles keep their
      // complete local browser data, including IndexedDB and persistent cookies.
      if (this.opened.size >= 3) {
        const [oldKey, old] = this.opened.entries().next().value;
        await old.browser.close();
        this.opened.delete(oldKey);
      }
      const userDataDir = join(this.directory, key);
      let existing = true;
      try {
        await access(
          join(
            userDataDir,
            this.browser === "firefox" ? "prefs.js" : "Default",
          ),
        );
      } catch {
        existing = false;
      }
      await mkdir(userDataDir, { recursive: true, mode: 0o700 });
      const browser = await this.launch({
        executablePath: this.executablePath,
        userDataDir,
        headless: this.headless,
        browser: this.browser,
        ...(this.browser === "chrome" ? { pipe: true } : {}),
        defaultViewport: { width: 1280, height: 800 },
        protocolTimeout: 12000,
        ...(this.testing
          ? {
              env: {
                ...process.env,
                MOZ_DISABLE_CONTENT_SANDBOX: "1",
                MOZ_CRASHREPORTER_DISABLE: "1",
                XDG_CACHE_HOME: join(this.directory, "cache"),
              },
            }
          : {}),
        ...(this.browser === "firefox"
          ? {
              extraPrefsFirefox: {
                "browser.startup.page": 3,
                "browser.sessionstore.resume_from_crash": true,
                "security.fileuri.strict_origin_policy": true,
                "signon.rememberSignons": true,
                "signon.autofillForms": true,
                "browser.link.open_newwindow": 3,
              },
            }
          : {}),
        args:
          this.browser === "firefox"
            ? []
            : [
                "--restore-last-session",
                ...(this.testing ? ["--no-sandbox"] : []),
              ],
      });
      entry = { browser, existing, accountPages: new Map() };
      this.opened.set(key, entry);
      browser.on("disconnected", () => {
        if (this.opened.get(key) === entry) this.opened.delete(key);
      });
    }
    const pages = await entry.browser.pages();
    const remembered = shared ? entry.accountPages.get(account.id) : entry.selectedPage;
    let page =
      (remembered &&
      pages.includes(remembered) &&
      this.allowed(remembered.url(), config)
        ? remembered
        : null) ||
      pages.find((p) => this.platformPage(p.url(), config)) ||
      pages.find((p) => p.url() === "about:blank") ||
      (await this.newTab(entry.browser));
    await page.setViewport({ width: 1280, height: 800 });
    let extra = {};
    if (["prepare", "publish"].includes(command.action))
      extra = await facebookPublish({
        entry,
        page,
        command,
        account,
        testing: this.testing,
      });
    if (
      [
        "read",
        "navigate",
        "back",
        "forward",
        "reload",
        "tabs",
        "tab",
        "fill",
        "activate",
        "upload",
      ].includes(command.action)
    ) {
      const result = await browserTool({
        entry,
        page,
        command,
        account,
        allowed: (url) => this.allowed(url, config),
      });
      page = result.page;
      extra = result.extra;
    }
    // A dedicated app profile only. Its debugging transport stays on this computer;
    // no public debugging port, arbitrary URL, script or local file is exposed.
    if (
      opening ||
      command.action === "login" ||
      command.action === "profile"
    ) {
      const profile = this.testing
        ? account.profileUrl
        : accountProfileUrl(account.profileUrl, account.platform);
      const target =
        command.action === "login" ||
        (opening && !entry.existing)
          ? config.login
          : profile || config.home;
      if (!this.allowed(target, config))
        throw new Error("Sosyal ağ dışındaki adres açılamaz.");
      if (!opening || !this.allowed(page.url(), config))
        await page
          .goto(target, { waitUntil: "domcontentloaded", timeout: 18000 })
          .catch(() => {});
    }
    if (command.action === "workspace") {
      if (!shared || !Array.isArray(account.workspaceAccounts) ||
          account.workspaceAccounts.length > 9)
        throw new Error("Şirket sekmeleri doğrulanamadı.");
      const seen = new Set();
      const targets = account.workspaceAccounts.map((target) => {
        if (!uuid.test(target.id) || target.companyId !== account.companyId ||
            !this.platforms[target.platform] || seen.has(target.platform))
          throw new Error("Şirket sekmeleri doğrulanamadı.");
        seen.add(target.platform);
        return target;
      });
      await Promise.all(targets.map(async (target) => {
        const cfg = this.platforms[target.platform];
        const current = await entry.browser.pages();
        const saved = entry.accountPages.get(target.id);
        let tab = saved && current.includes(saved) && this.allowed(saved.url(), cfg)
          ? saved : current.find((p) => this.platformPage(p.url(), cfg));
        if (!tab) {
          tab = await this.newTab(entry.browser);
          await tab.goto(cfg.login, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
        }
        entry.accountPages.set(target.id, tab);
      }));
    }
    if (!opening && command.action !== "screen") {
      if (!this.allowed(page.url(), config))
        throw new Error("İşlem yalnızca bu sosyal ağın ekranında yapılabilir.");
      await page.bringToFront();
      if (command.action === "click")
        await page.mouse.click(command.x, command.y);
      if (command.action === "type") {
        // Insert the whole string without synthesizing Enter for line breaks.
        // The fixed function is local code; remote messages supply text only.
        const frame = await page.focusedFrame();
        const inserted = await frame.evaluate((value) => {
          const element = document.activeElement;
          if (
            !element ||
            !(element.matches("input,textarea") || element.isContentEditable) ||
            element.disabled ||
            element.readOnly
          )
            return false;
          return document.execCommand("insertText", false, value);
        }, command.text);
        if (!inserted)
          throw new Error("Önce sosyal ağdaki yazı alanını seçin.");
      }
      if (command.action === "key")
        await page.keyboard.press(
          command.key === "SelectAll"
            ? process.platform === "darwin"
              ? "Meta+A"
              : "Control+A"
            : command.key,
        );
      if (command.action === "scroll")
        await page.mouse.wheel({ deltaY: command.deltaY });
    }
    if (!this.allowed(page.url(), config))
      throw new Error("Sosyal ağ dışındaki ekran iletilemez.");
    entry.accountPages.set(account.id, page);
    if (opening) await page.bringToFront();
    if (command.noFrame)
      return {
        ...extra,
        noFrame: true,
        profilePresent: true,
        loginVerified: false,
        authDetected: await this.authHint(entry.browser, config),
      };
    const frame = await page.screenshot({
      type: "jpeg",
      quality: 55,
      encoding: "base64",
      captureBeyondViewport: false,
    });
    if (frame.length > 800000)
      throw new Error("Ekran görüntüsü sınırı aşıldı.");
    return {
      ...extra,
      frame,
      width: 1280,
      height: 800,
      profilePresent: true,
      loginVerified: false,
      authDetected: await this.authHint(entry.browser, config),
    };
  }
  async authHint(browser, config) {
    if (!config.cookie) return null;
    try {
      return (await browser.cookies()).some(
        (c) =>
          c.name === config.cookie && domainMatches(c.domain, config.roots),
      );
    } catch {
      return null;
    }
  }
  allowed(value, config) {
    try {
      const u = new URL(value);
      return (
        (u.protocol === "https:" ||
          (this.testing &&
            u.protocol === "http:" &&
            /^127\.\d+\.\d+\.\d+$/.test(u.hostname))) &&
        !u.username &&
        !u.password &&
        (this.testing || !u.port || u.port === "443") &&
        domainMatches(u.hostname, config.roots)
      );
    } catch {
      return false;
    }
  }
  async closeAll() {
    await Promise.allSettled(
      [...this.opened.values()].map((e) => e.browser.close()),
    );
    this.opened.clear();
  }
  platformPage(value, config) {
    if (!this.allowed(value, config)) return false;
    return domainMatches(new URL(value).hostname, [new URL(config.home).hostname.replace(/^www\./, "")]);
  }
  newTab(browser) {
    return browser.newPage({ type: "tab", background: true });
  }
}
