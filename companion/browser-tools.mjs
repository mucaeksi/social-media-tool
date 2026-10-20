import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const blockedPath =
  /\/(?:messages|messaging|direct|inbox|login|signin|password|accounts\/login|i\/chat|account\/access)(?:\/|$)/i;
export function safeReadURL(value) {
  const u = new URL(value);
  return !blockedPath.test(u.pathname);
}
export async function readPage(entry, page, allowed) {
  if (!allowed(page.url()) || !safeReadURL(page.url()))
    throw new Error("Giriş ve özel mesaj ekranları AI için okunamaz.");
  const handles = await page.$$(
    "textarea,[contenteditable=true],button,[role=button],a[href],input:not([type=password]):not([type=hidden])",
  );
  const elements = [],
    map = new Map();
  for (const handle of handles.slice(0, 180)) {
    const info = await handle.evaluate((el) => {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (
        el.closest(
          "[data-private],form:has(input[type=password]),[autocomplete*=password],[autocomplete=one-time-code]",
        ) ||
        ["email", "password", "tel"].includes(type) ||
        el.disabled
      )
        return null;
      const rect = el.getBoundingClientRect();
      if ((rect.width < 1 || rect.height < 1) && type !== "file") return null;
      const tag = el.tagName.toLowerCase();
      const kind =
        type === "file"
          ? "file"
          : tag === "textarea" || tag === "input" || el.isContentEditable
            ? "field"
            : tag === "a"
              ? "link"
              : "button";
      return {
        kind,
        label: (
          el.getAttribute("aria-label") ||
          el.getAttribute("placeholder") ||
          el.innerText ||
          el.getAttribute("title") ||
          kind
        )
          .trim()
          .slice(0, 100),
      };
    });
    if (!info) {
      await handle.dispose();
      continue;
    }
    if (info.kind === "link") {
      const url = await handle.evaluate((e) => e.href);
      if (!allowed(url)) {
        await handle.dispose();
        continue;
      }
    }
    const id = randomUUID();
    map.set(id, { handle, ...info });
    elements.push({ id, ...info });
    if (elements.length >= 40) break;
  }
  const text = await page.evaluate(() => {
    let source = document.querySelector("main,[role=main]") || document.body;
    if (!source.innerText.trim()) source = document.body;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (
          !p ||
          p.closest(
            "script,style,noscript,input,textarea,[contenteditable],[data-private],form:has(input[type=password]),[role=navigation],[hidden],[aria-hidden=true]",
          )
        )
          return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(p);
        return style.display !== "none" &&
          style.visibility !== "hidden" &&
          p.getClientRects().length
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    let output = "",
      node;
    while ((node = walker.nextNode()) && output.length < 6000)
      output += " " + node.textContent;
    return output.replace(/\s+/g, " ").trim().slice(0, 6000);
  });
  const kept = new Set([...map.values()].map((i) => i.handle));
  for (const handle of handles)
    if (!kept.has(handle)) void handle.dispose().catch(() => {});
  const id = randomUUID();
  for (const old of entry.snapshot?.elements.values() || [])
    void old.handle.dispose().catch(() => {});
  entry.snapshot = { id, url: page.url(), page, at: Date.now(), elements: map };
  const url = new URL(page.url());
  return {
    id,
    url: url.origin + url.pathname,
    title: (await page.title()).slice(0, 200),
    text,
    elements,
  };
}
export async function uploadJPEG(handle, base64) {
  const bytes = Buffer.from(base64 || "", "base64");
  if (
    bytes.length < 4 ||
    bytes.length > 600000 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    throw new Error("JPEG aktarımı doğrulanamadı.");
  const dir = await mkdtemp(join(tmpdir(), "studio-media-"));
  try {
    const path = join(dir, "gorsel.jpg");
    await writeFile(path, bytes, { mode: 0o600 });
    await handle.uploadFile(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export async function browserTool({ entry, page, command, account, allowed }) {
  const pages = (await entry.browser.pages()).filter((p) => allowed(p.url()));
  if (command.action === "tab") {
    page = pages[command.index];
    if (!page) throw new Error("Sekme bulunamadı.");
    entry.selectedPage = page;
    await page.bringToFront();
  }
  if (command.action === "navigate") {
    if (!allowed(command.url))
      throw new Error("Yalnız seçili sosyal ağda gezinilebilir.");
    await page.goto(command.url, {
      waitUntil: "domcontentloaded",
      timeout: 18000,
    });
  }
  if (command.action === "back")
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 18000 });
  if (command.action === "forward")
    await page.goForward({ waitUntil: "domcontentloaded", timeout: 18000 });
  if (command.action === "reload")
    await page.reload({ waitUntil: "domcontentloaded", timeout: 18000 });
  if (["fill", "activate", "upload"].includes(command.action)) {
    const snap = entry.snapshot,
      item = snap?.elements.get(command.elementId);
    if (
      !snap ||
      snap.id !== command.snapshotId ||
      snap.page !== page ||
      snap.url !== page.url() ||
      Date.now() - snap.at > 60000 ||
      !item ||
      !(await item.handle.evaluate(
        (e, label) =>
          e.isConnected &&
          (
            e.getAttribute("aria-label") ||
            e.getAttribute("placeholder") ||
            e.innerText ||
            e.getAttribute("title") ||
            label
          )
            .trim()
            .slice(0, 100) === label,
        item.label,
      ))
    )
      throw new Error("Sayfa değişti; yeniden okuyun.");
    if (command.action === "fill") {
      if (item.kind !== "field") throw new Error("Yazı alanı seçin.");
      await item.handle.focus();
      const success = await item.handle.evaluate((el, text) => {
        if (
          el.matches("input[type=password],[autocomplete=one-time-code]") ||
          el.disabled ||
          el.readOnly
        )
          return false;
        if (el.isContentEditable) {
          document.getSelection()?.selectAllChildren(el);
          return document.execCommand("insertText", false, text);
        }
        if (!el.matches("textarea,input")) return false;
        el.select();
        return document.execCommand("insertText", false, text);
      }, command.text);
      if (!success) throw new Error("Metin alanı değişti.");
    }
    if (command.action === "activate") {
      if (!["button", "link"].includes(item.kind))
        throw new Error("Düğme veya bağlantı seçin.");
      await item.handle.click();
    }
    if (command.action === "upload") {
      if (item.kind !== "file") throw new Error("Dosya alanı seçin.");
      await uploadJPEG(item.handle, command.media);
    }
  }
  if (!allowed(page.url()))
    throw new Error("Sosyal ağ dışındaki sayfa okunamaz.");
  const extra = {
    tabs: await Promise.all(
      pages
        .slice(0, 10)
        .map(async (p, index) => ({
          index,
          title: (await p.title()).slice(0, 100),
          selected: p === page,
        })),
    ),
    page: await readPage(entry, page, allowed),
  };
  return { page, extra };
}
