import { lookup } from "node:dns/promises";
import { isIP, connect } from "node:net";
import https from "node:https";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import puppeteer from "puppeteer-core";
import {
  researchInput,
  webUrl,
  RESEARCH_LIMITS,
} from "../shared/research-protocol.mjs";

export function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0)
    );
  }
  // Accept only global-unicast IPv6; mapped IPv4, ULA, link-local and multicast
  // are rejected. Documentation/transition ranges cannot be used as a tunnel.
  return (
    isIP(address) === 6 &&
    /^2[0-9a-f]{3}:/i.test(address) &&
    !/^(?:2001:(?:0:|db8:|10:|20:)|2002:)/i.test(address)
  );
}
export async function publicTarget(host, resolver = lookup) {
  const addresses = await resolver(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Adres herkese açık değil.");
  return addresses[0];
}
export async function publicHTML(
  value,
  hosts,
  { resolve = publicTarget, request = https.request } = {},
) {
  let url = webUrl(value, hosts);
  for (let hop = 0; hop < 5; hop++) {
    const u = new URL(url),
      target = await resolve(u.hostname);
    const r = await new Promise((accept, reject) => {
      const req = request(
        u,
        {
          method: "GET",
          agent: false,
          headers: {
            Accept: "text/html,text/plain",
            "User-Agent": "SosyalStudio/1.3 (company website research)",
            "Accept-Encoding": "identity",
          },
          lookup: (_host, options, callback) =>
            options.all
              ? callback(null, [target])
              : callback(null, target.address, target.family),
          timeout: 15000,
        },
        (res) => accept(res),
      );
      req.on("timeout", () => req.destroy(new Error("Sayfa zaman aşımı.")));
      req.on("error", reject);
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(r.statusCode)) {
      r.destroy();
      url = webUrl(new URL(r.headers.location || "", url).href, hosts);
      continue;
    }
    if (
      r.statusCode !== 200 ||
      !/^(?:text\/html|text\/plain|application\/xhtml\+xml)/i.test(
        r.headers["content-type"] || "",
      ) ||
      /attachment/i.test(r.headers["content-disposition"] || "")
    ) {
      r.destroy();
      throw Object.assign(new Error("Sayfa okunamadı."), {
        status: r.statusCode,
      });
    }
    let size = 0;
    const chunks = [];
    try {
      for await (const chunk of r) {
        size += chunk.length;
        if (size > RESEARCH_LIMITS.bytes) throw new Error("Sayfa çok büyük.");
        chunks.push(chunk);
      }
    } finally {
      r.destroy();
    }
    let bytes = Buffer.concat(chunks);
    const encoding = r.headers["content-encoding"];
    const decompress = {
      gzip: gunzipSync,
      deflate: inflateSync,
      br: brotliDecompressSync,
    }[encoding];
    if (decompress)
      bytes = decompress(bytes, { maxOutputLength: RESEARCH_LIMITS.bytes });
    else if (encoding && encoding !== "identity")
      throw new Error("Sayfa kodlaması desteklenmiyor.");
    const charset =
      (r.headers["content-type"] || "").match(
        /charset\s*=\s*["']?([\w-]+)/i,
      )?.[1] || "utf-8";
    return {
      url,
      html: new TextDecoder(charset, { fatal: true }).decode(bytes),
    };
  }
  throw new Error("Çok fazla yönlendirme.");
}
export async function researchProxy(hosts) {
  const sockets = new Set();
  let transferred = 0;
  const server = http.createServer((_req, res) => {
    res.writeHead(403);
    res.end();
  });
  server.on("connect", async (req, client, head) => {
    sockets.add(client);
    client.on("close", () => sockets.delete(client));
    client.on("error", () => {});
    try {
      const u = new URL(`https://${req.url}`);
      if (u.port && u.port !== "443") throw new Error();
      webUrl(u.href, hosts);
      const target = await publicTarget(u.hostname);
      if (sockets.size > 12) throw new Error("Bağlantı sınırı.");
      if (client.destroyed) return;
      const upstream = connect({
        host: target.address,
        port: 443,
        family: target.family,
      });
      sockets.add(upstream);
      const timer = setTimeout(() => {
        client.destroy();
        upstream.destroy();
      }, 30000);
      upstream.on("error", () => client.destroy());
      upstream.on("data", (data) => {
        transferred += data.length;
        if (transferred > 8000000) {
          for (const s of sockets) s.destroy();
        }
      });
      upstream.on("close", () => {
        clearTimeout(timer);
        sockets.delete(upstream);
        client.destroy();
      });
      client.on("close", () => upstream.destroy());
      upstream.on("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
    } catch {
      client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    port: server.address().port,
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(r));
    },
  };
}
// Runs only fixed local extraction code. No page script, browser credentials,
// cookies or executable code is returned to the panel/model.
export function extractVisiblePage() {
  document
    .querySelectorAll(
      "script,style,noscript,iframe,form,input,textarea,[contenteditable],nav,footer",
    )
    .forEach((e) => e.remove());
  const root =
    document.querySelector("main,article,[role=main]") || document.body;
  return {
    title: document.title.trim().slice(0, 300),
    text: (root?.innerText || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 12000),
  };
}
export class WebsiteResearch {
  constructor({
    executablePath,
    launch = puppeteer.launch.bind(puppeteer),
    readHTML = publicHTML,
  }) {
    this.executablePath = executablePath;
    this.launch = launch;
    this.readHTML = readHTML;
    this.busy = false;
  }
  async close() {
    this.cancelled = true;
    await this.activeBrowser?.close().catch(() => {});
    await this.activeProxy?.close().catch(() => {});
    if (this.activeDirectory)
      await rm(this.activeDirectory, { recursive: true, force: true });
  }
  async execute(value) {
    const input = researchInput(value);
    if (this.busy) throw new Error("Araştırma sürüyor.");
    // Do not bypass an inherited managed/corporate proxy. DNS-pinned research
    // requires a direct public connection and fails closed in that setup.
    if (
      this.readHTML === publicHTML &&
      (process.env.HTTPS_PROXY ||
        process.env.HTTP_PROXY ||
        process.env.ALL_PROXY)
    )
      throw new Error("Ağ proxy yapılandırması araştırmayı desteklemiyor.");
    this.busy = true;
    this.cancelled = false;
    let browser, proxy;
    let deadline;
    let directory;
    try {
      directory = await mkdtemp(join(tmpdir(), "studio-research-"));
      this.activeDirectory = directory;
      if (input.mode === "firefox") proxy = await researchProxy(input.hosts);
      this.activeProxy = proxy;
      browser = await this.launch({
        browser: "firefox",
        executablePath: this.executablePath,
        userDataDir: directory,
        headless: true,
        defaultViewport: { width: 1280, height: 800 },
        protocolTimeout: 12000,
        extraPrefsFirefox: {
          "javascript.enabled": input.mode === "firefox",
          "media.peerconnection.enabled": false,
          "network.prefetch-next": false,
          "network.dns.disablePrefetch": true,
          "network.http.http3.enable": false,
          "browser.download.folderList": 2,
          "browser.download.dir": directory,
          "browser.download.useDownloadDir": true,
          "browser.download.always_ask_before_handling_new_types": true,
          ...(proxy
            ? {
                "network.proxy.type": 1,
                "network.proxy.http": "127.0.0.1",
                "network.proxy.http_port": proxy.port,
                "network.proxy.ssl": "127.0.0.1",
                "network.proxy.ssl_port": proxy.port,
                "network.proxy.no_proxies_on": "",
                "network.proxy.allow_hijacking_localhost": true,
                "network.proxy.failover_direct": false,
              }
            : {}),
        },
      });
      this.activeBrowser = browser;
      deadline = setTimeout(() => {
        void browser?.close().catch(() => {});
      }, 150000);
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (r) => {
        let permitted = false;
        try {
          webUrl(r.url(), input.hosts);
          permitted =
            input.mode === "firefox" &&
            ["GET", "HEAD"].includes(r.method()) &&
            ["document", "script", "stylesheet", "xhr", "fetch"].includes(
              r.resourceType(),
            );
        } catch {}
        void (permitted ? r.continue() : r.abort()).catch(() => {});
      });
      page.on("popup", (p) => void p.close());
      const pages = [];
      for (const url of input.urls) {
        if (this.cancelled) throw new Error("Araştırma iptal edildi.");
        // A site can opt out of this research agent. Read robots through the
        // same DNS-pinned transport; unavailable robots does not bypass errors.
        const robotUrl = new URL("/robots.txt", url).href;
        let robots = "";
        try {
          robots = (await this.readHTML(robotUrl, input.hosts)).html;
        } catch (e) {
          if (![404, 410].includes(e.status)) throw e;
        }
        if (
          robotsDisallows(robots, new URL(url).pathname + new URL(url).search)
        )
          throw new Error("Site bu sayfanın taranmasına izin vermiyor.");
        let finalUrl;
        if (input.mode === "static") {
          const source = await this.readHTML(url, input.hosts);
          finalUrl = source.url;
          await page.setContent(source.html, {
            waitUntil: "domcontentloaded",
            timeout: 12000,
          });
        } else {
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 18000,
          });
          finalUrl = webUrl(page.url(), input.hosts);
          if (
            !response ||
            response.status() !== 200 ||
            !/text\/html/i.test(response.headers()["content-type"] || "")
          )
            throw new Error("Sayfa okunamadı.");
        }
        const data = await page.evaluate(extractVisiblePage);
        if (!data.text) throw new Error("Sayfa metni bulunamadı.");
        pages.push({ url, finalUrl, ...data });
      }
      return { ok: true, pages };
    } finally {
      clearTimeout(deadline);
      await browser?.close().catch(() => {});
      await proxy?.close();
      if (directory) await rm(directory, { recursive: true, force: true });
      this.activeBrowser = null;
      this.activeProxy = null;
      this.activeDirectory = null;
      this.busy = false;
    }
  }
}
export function robotsDisallows(text, path) {
  const groups = [];
  let group = { agents: [], rules: [] };
  for (const line of text.split(/\r?\n/)) {
    const m = line
      .replace(/#.*/, "")
      .match(/^\s*(user-agent|disallow|allow)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    if (m[1].toLowerCase() === "user-agent") {
      if (group.rules.length) {
        groups.push(group);
        group = { agents: [], rules: [] };
      }
      group.agents.push(m[2].toLowerCase());
      continue;
    }
    group.rules.push({ allow: m[1].toLowerCase() === "allow", pattern: m[2] });
  }
  groups.push(group);
  const specific = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && "sosyalstudio".startsWith(a)),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable
    .flatMap((g) => g.rules)
    .filter((r) => {
      if (!r.pattern) return false;
      const end = r.pattern.endsWith("$");
      const pattern = (end ? r.pattern.slice(0, -1) : r.pattern)
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp("^" + pattern + (end ? "$" : "")).test(path);
    })
    .map((r) => ({ ...r, length: r.pattern.replace(/[*$]/g, "").length }));
  rules.sort(
    (a, b) => b.length - a.length || Number(b.allow) - Number(a.allow),
  );
  return rules[0]?.allow === false;
}
