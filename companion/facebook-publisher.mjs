import { publicationURL } from "../shared/scheduling.mjs";
import { uploadJPEG } from "./browser-tools.mjs";
const normalize = (v) =>
  v.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
export async function verifyFacebookIdentity(
  page,
  profileUrl,
  label,
  testing = false,
) {
  return page.evaluate(
    ({ profileUrl, label, testing }) => {
      const norm = (v) =>
        v
          .normalize("NFKC")
          .replace(/\s+/g, " ")
          .trim()
          .toLocaleLowerCase("tr-TR");
      const canonical = (v) => {
        const u = new URL(v, location.href);
        return (
          u.hostname.replace(/^www\./, "") +
          u.pathname.replace(/\/$/, "") +
          (u.searchParams.get("id") ? "?id=" + u.searchParams.get("id") : "")
        );
      };
      const headings = [...document.querySelectorAll("h1")].filter(
        (e) => e.getBoundingClientRect().width > 0,
      );
      const name = headings.some((e) => norm(e.innerText) === norm(label));
      const own = [
        ...document.querySelectorAll(
          'a[aria-label="Your profile"],a[aria-label="Profiliniz"],a[aria-label="Profilin"]',
        ),
      ].some((e) => canonical(e.href) === canonical(profileUrl));
      return name && own && (testing || location.protocol === "https:");
    },
    { profileUrl, label, testing },
  );
}
async function exactButton(page, labels, root = "body") {
  const buttons = await page.$$(`${root} button,${root} [role=button]`),
    matches = [];
  for (const b of buttons) {
    const info = await b.evaluate((e) => ({
      text: e.getAttribute("aria-label") || e.innerText,
      visible:
        e.getBoundingClientRect().width > 0 &&
        !e.disabled &&
        e.getAttribute("aria-disabled") !== "true",
    }));
    if (info.visible && labels.includes(normalize(info.text))) matches.push(b);
    else await b.dispose();
  }
  if (matches.length !== 1)
    throw new Error("Paylaşım düğmesi tekil olarak doğrulanamadı.");
  return matches[0];
}
export async function facebookPublish({
  entry,
  page,
  command,
  account,
  testing = false,
}) {
  if (account.platform !== "facebook")
    throw new Error("Otomatik yayın pilotu yalnız Facebook içindir.");
  if (
    !(await verifyFacebookIdentity(
      page,
      account.profileUrl,
      command.identityLabel,
      testing,
    ))
  )
    throw new Error(
      "Etkin Facebook kimliği kayıtlı hedef sayfayla eşleşmiyor.",
    );
  if (command.action === "prepare") {
    const existing = new Set(
      await page.$$eval("a[href]", (items) => items.map((e) => e.href)),
    );
    const create = await exactButton(page, [
      "gönderi oluştur",
      "create post",
      "ne düşünüyorsun?",
      "what's on your mind?",
    ]);
    await create.click();
    const selector = "[role=dialog] [role=textbox][contenteditable=true]";
    await page.waitForSelector(selector, { timeout: 10000 });
    const boxes = await page.$$(selector);
    if (boxes.length !== 1) throw new Error("Gönderi alanı doğrulanamadı.");
    await boxes[0].focus();
    const inserted = await boxes[0].evaluate((el, text) => {
      document.getSelection()?.selectAllChildren(el);
      return document.execCommand("insertText", false, text);
    }, command.text);
    if (!inserted) throw new Error("Gönderi metni yerleştirilemedi.");
    let mediaProof = false;
    if (command.media) {
      const inputs = await page.$$("input[type=file]");
      const images = [];
      for (const input of inputs)
        if (await input.evaluate((e) => /image/i.test(e.accept)))
          images.push(input);
      if (images.length !== 1)
        throw new Error("Görsel yükleme alanı doğrulanamadı.");
      await uploadJPEG(images[0], command.media);
      await page.waitForFunction(
        () => document.querySelector('[role=dialog] img[src^="blob:"]'),
        { timeout: 15000 },
      );
      mediaProof = true;
    }
    entry.prepared = {
      jobId: command.jobId,
      fingerprint: command.fingerprint,
      text: command.text,
      url: page.url(),
      at: Date.now(),
      existing,
      mediaProof,
      hasMedia: Boolean(command.media),
      submitted: false,
    };
    return { publication: { state: "ready", jobId: command.jobId } };
  }
  const p = entry.prepared;
  if (
    !p ||
    p.jobId !== command.jobId ||
    p.fingerprint !== command.fingerprint ||
    p.submitted ||
    Date.now() - p.at > 120000 ||
    page.url() !== p.url
  )
    throw new Error("Yayın önizlemesi değişti; yeniden hazırlanmalı.");
  const text = await page.$eval(
    "[role=dialog] [role=textbox][contenteditable=true]",
    (e) => e.innerText,
  );
  if (normalize(text) !== normalize(p.text) || (p.hasMedia && !p.mediaProof))
    throw new Error("Metin veya görsel önizlemesi eşleşmiyor.");
  const post = await exactButton(
    page,
    ["paylaş", "post", "publish", "yayınla"],
    "[role=dialog]",
  );
  p.submitted = true;
  try {
    await post.click();
    await page.waitForFunction(
      ({ text, existing }) =>
        [...document.querySelectorAll("a[href]")].some(
          (a) =>
            !existing.includes(a.href) &&
            /\/posts\/|\/permalink\.php/.test(a.href) &&
            (a.closest("[role=article],article")?.innerText || "").includes(
              text,
            ),
        ),
      { timeout: 18000 },
      { text: p.text, existing: [...p.existing] },
    );
    const candidates = await page.$$eval(
      "a[href]",
      (items, { text, existing }) =>
        items
          .filter(
            (a) =>
              !existing.includes(a.href) &&
              (a.closest("[role=article],article")?.innerText || "").includes(
                text,
              ),
          )
          .map((a) => a.href),
      { text: p.text, existing: [...p.existing] },
    );
    const links = [
      ...new Set(
        candidates.map((u) => publicationURL(u, "facebook")).filter(Boolean),
      ),
    ];
    if (links.length !== 1)
      throw new Error("Gönderi bağlantısı doğrulanamadı.");
    return {
      publication: { state: "verified", jobId: command.jobId, url: links[0] },
    };
  } catch {
    return { publication: { state: "unknown", jobId: command.jobId } };
  }
}
