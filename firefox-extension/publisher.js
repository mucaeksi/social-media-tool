// Only fixed, reviewed DOM operations. No selectors or executable code from AI.
(() => {
  if (globalThis.__studioPublisher) return;
  globalThis.__studioPublisher = true;
  const policy = StudioPublishing,
    social = StudioPolicy;
  let prepared = null;
  const norm = (v) =>
    String(v || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("tr-TR");
  const visible = (el) =>
    el?.isConnected &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden" &&
    getComputedStyle(el).display !== "none" &&
    !el.closest("[hidden],[aria-hidden=true]");
  const enabled = (el) =>
    visible(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true";
  const label = (el) =>
    el.getAttribute("aria-label") ||
    el.innerText ||
    el.getAttribute("title") ||
    "";
  const content = (el) => el.value ?? el.innerText;
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  function allowed(target) {
    const current = new URL(location.href);
    if (
      /^(?:ads|adsmanager|business)\./.test(current.hostname) ||
      /\/(?:ads|adsmanager|campaignmanager|promotions|blaze|billing|checkout)(?:\/|$)/i.test(
        current.pathname,
      ) ||
      social.advertising(target.platform) ||
      !social.clean(location.href, target.platform) ||
      [
        ...document.querySelectorAll(
          'input[type=password],input[autocomplete=one-time-code],input[autocomplete^="cc-"]',
        ),
      ].some(visible)
    )
      throw new Error(
        "Yalnız sosyal gönderi formunda işlem yapılır; giriş, reklam ve ödeme ekranları kullanılamaz.",
      );
  }
  function author(root, target) {
    return [...root.querySelectorAll("a[href]")].some(
      (a) =>
        visible(a) &&
        policy.canonical(a.href, target.platform) ===
          policy.canonical(target.profileUrl, target.platform),
    );
  }
  function identity(region, target, config) {
    const expected = policy.canonical(target.profileUrl, target.platform);
    const actors = [...document.querySelectorAll(config.actor)].filter(
      (a) =>
        visible(a) &&
        !a.closest(
          '[contenteditable=true],article,[role=article],[data-testid*="preview"]',
        ),
    );
    return (
      expected &&
      actors.some(
        (a) =>
          policy.canonical(a.href, target.platform) === expected &&
          (norm(label(a)) === norm(target.identityLabel) ||
            norm(label(a)) ===
              norm(
                new URL(target.profileUrl).pathname
                  .split("/")
                  .filter(Boolean)
                  .at(-1),
              ) ||
            a.querySelector("img")),
      ) &&
      ((target.platform !== "facebook" && target.platform !== "linkedin") ||
        author(region, target))
    );
  }
  function regionFor(field) {
    return (
      field.closest(
        '[role=dialog],dialog[open],[data-testid="post-form"],ytd-backstage-post-dialog-renderer,form',
      ) || field.closest("main,[role=main]")
    );
  }
  function fields(config) {
    return [...new Set(document.querySelectorAll(config.fields))].filter(
      (el) =>
        enabled(el) &&
        !el.readOnly &&
        !el.closest("[data-private]") &&
        !/comment|reply|search|yorum|yanıt|ara(?:ma)?|message|mesaj/i.test(
          el.getAttribute("aria-label") || el.getAttribute("placeholder") || "",
        ),
    );
  }
  function button(root, names) {
    const matches = [
      ...root.querySelectorAll("button,[role=button],input[type=submit]"),
    ].filter(
      (el) =>
        enabled(el) &&
        names.some((n) => norm(label(el) || el.value) === norm(n)),
    );
    if (matches.length > 1)
      throw new Error(
        "Birden fazla uygun düğme var. Doğru gönderi formunu tek başına açık bırakın.",
      );
    return matches[0];
  }
  function busy(root) {
    return [
      ...root.querySelectorAll("[aria-busy=true],[role=progressbar]"),
    ].some(visible);
  }
  function write(field, value) {
    if (norm(content(field)))
      throw new Error(
        "Formda mevcut yazı var; üzerine yazılmadı. Boş bir gönderi formu açın.",
      );
    field.focus();
    if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
      Object.getOwnPropertyDescriptor(
        field.tagName === "INPUT"
          ? HTMLInputElement.prototype
          : HTMLTextAreaElement.prototype,
        "value",
      ).set.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(field);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand("insertText", false, value))
        throw new Error("Platform metin girişini kabul etmedi.");
    }
    if (norm(content(field)) !== norm(value))
      throw new Error("Gönderi metni doğrulanamadı.");
  }
  async function until(read, ms = 12000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const result = read();
      if (result) return result;
      await pause(150);
    }
    return null;
  }
  function selectField(config) {
    const all = fields(config);
    if (all.length > 1)
      throw new Error(
        "Birden fazla gönderi alanı açık; diğer taslakları kapatın.",
      );
    return all[0];
  }
  function filesFor(items) {
    if (!Array.isArray(items) || items.length > 10)
      throw new Error("Görsel sayısı geçersiz.");
    const data = new DataTransfer();
    for (const [index, item] of items.entries()) {
      if (
        item.type !== "image/jpeg" ||
        typeof item.data !== "string" ||
        item.data.length > 800000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(item.data)
      )
        throw new Error("Onaylı JPEG aktarımı doğrulanamadı.");
      const bytes = Uint8Array.from(atob(item.data), (c) => c.charCodeAt(0));
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
        throw new Error("JPEG dosyası doğrulanamadı.");
      data.items.add(
        new File([bytes], `studio-${index + 1}.jpg`, { type: "image/jpeg" }),
      );
    }
    return data.files;
  }
  function imageInput(root) {
    const inputs = [...root.querySelectorAll("input[type=file]")].filter(
      (el) =>
        !el.disabled &&
        !el.files?.length &&
        (!el.accept || /image|jpe?g|\.png|\.webp/i.test(el.accept)),
    );
    return inputs.length === 1 ? inputs[0] : null;
  }
  function attachmentProof(region, input, count, previous) {
    if (input?.isConnected && input.files.length === count)
      return { input, files: [...input.files] };
    const images = [...region.querySelectorAll("img")].filter(
      (el) =>
        visible(el) &&
        el.naturalWidth >= 64 &&
        el.naturalHeight >= 64 &&
        !previous.has(el.src),
    );
    if (images.length < count) return null;
    return { images: images.map((el) => ({ el, src: el.src })) };
  }
  function unchangedAttachments(proof) {
    if (!proof) return true;
    if (proof.input)
      return (
        proof.input.isConnected &&
        proof.files.length === proof.input.files.length &&
        proof.files.every((file, i) => proof.input.files[i] === file)
      );
    return proof.images.every(
      ({ el, src }) => visible(el) && el.src === src && el.naturalWidth >= 64,
    );
  }
  async function prepare(target, job, images) {
    allowed(target);
    const config = policy.platforms[target.platform],
      s = job.snapshot;
    if (
      !config ||
      s.transport !== "firefox-tabs" ||
      s.platform !== target.platform ||
      s.profileUrl !== target.profileUrl ||
      norm(s.identityLabel) !== norm(target.identityLabel) ||
      !s.text?.trim() ||
      s.text.length > config.limit ||
      images.length !== s.media.length ||
      images.length > config.images
    )
      throw new Error("Onaylı iş ve bağlı hedef hesap eşleşmiyor.");
    prepared = null;
    let field = selectField(config),
      region = field && regionFor(field);
    if (field && norm(content(field)))
      throw new Error(
        "Gönderi alanında mevcut yazı var. Boş bir taslak açın; fotoğraf eklenmedi.",
      );
    if (!field) {
      if (
        [...document.querySelectorAll('[role="dialog"],dialog[open]')].some(
          visible,
        )
      )
        throw new Error(
          "Açık form tanınamadı. Mevcut taslakta işlem yapılmadı.",
        );
      // Creation opens a draft only. It never submits or follows arbitrary links.
      const create =
        target.platform === "x"
          ? [
              ...document.querySelectorAll(
                'a[data-testid="SideNav_NewTweet_Button"],a[href="/compose/post"],a[href="/compose/tweet"]',
              ),
            ].find(enabled)
          : button(document, config.create);
      if (create?.closest('form,[role="dialog"]'))
        throw new Error(
          "Oluşturma düğmesi mevcut bir formda; yayın başlatılmadı.",
        );
      if (!create)
        throw new Error(
          "Gönderi oluştur düğmesi bulunamadı. İlgili hesapta boş gönderi oluşturma ekranını açın.",
        );
      create.click();
      await pause(250);
      field = selectField(config);
      region = field && regionFor(field);
    }
    let uploaded = null;
    const previousImages = new Set([...document.images].map((el) => el.src));
    if (images.length) {
      if (!imageInput(region || document)) {
        const add = button(region || document, [
          "Photo/video",
          "Fotoğraf/video",
          "Add photos/videos",
          "Fotoğraf/video ekle",
          "Photos",
          "Fotoğraflar",
        ]);
        if (add) {
          add.click();
          await pause(250);
        }
      }
      uploaded = await until(() => imageInput(region || document));
      if (!uploaded)
        throw new Error(
          target.platform === "tiktok"
            ? "TikTok web ekranı fotoğraf yüklemesini sunmuyor. Bu hesaptaki desteklenen fotoğraf formunu açın; video yerine JPEG gönderilmedi."
            : "Boş fotoğraf yükleme alanı bulunamadı. Doğru hesabın fotoğraflı gönderi formunu açın.",
        );
      if (images.length > 1 && !uploaded.multiple)
        throw new Error(
          "Bu form çoklu fotoğraf kabul etmiyor; tek fotoğraflı taslak hazırlayın.",
        );
      const beforeRegion =
        uploaded.closest("[role=dialog],form,main,[role=main]") || region;
      if (beforeRegion && !identity(beforeRegion, target, config))
        throw new Error(
          "Fotoğraf yüklemeden önce etkin yayıncı hesabı doğrulanamadı.",
        );
      // Account selectors must remain visible even in image-first editors.
      if (!beforeRegion && !identity(document, target, config))
        throw new Error("Etkin yayıncı hesabını formda görünür bırakın.");
      uploaded.files = filesFor(images);
      uploaded.dispatchEvent(new Event("input", { bubbles: true }));
      uploaded.dispatchEvent(new Event("change", { bubbles: true }));
      await pause(300);
      // Image-first native editors (Instagram) have a bounded crop/filter flow.
      for (let step = 0; step < 3 && !selectField(config); step++) {
        const next = await until(
          () =>
            button(document.querySelector("[role=dialog]") || document, [
              "Next",
              "İleri",
            ]),
          4000,
        );
        if (!next) break;
        next.click();
        await pause(300);
      }
      field = await until(() => selectField(config));
      region = field && regionFor(field);
    }
    if (!field || !region || !identity(region, target, config))
      throw new Error(
        "Gönderi formunda etkin hesap/sayfa doğrulanamadı. Hesap seçicisini görünür bırakın.",
      );
    if (busy(region)) await until(() => !busy(region), 30000);
    write(field, s.text);
    const additional = [];
    if (["pinterest", "tumblr"].includes(target.platform) && s.post.title) {
      const titleFields = [
        ...region.querySelectorAll(
          "input[type=text],textarea,[contenteditable=true]",
        ),
      ].filter(
        (el) =>
          el !== field &&
          enabled(el) &&
          /^(?:title|başlık|add your title|başlık ekle)$/i.test(
            el.getAttribute("aria-label") ||
              el.getAttribute("placeholder") ||
              "",
          ),
      );
      if (titleFields.length !== 1)
        throw new Error("Tek bir başlık alanı bulunamadı.");
      write(titleFields[0], s.post.title);
      additional.push([titleFields[0], s.post.title]);
    }
    let boardProof = null;
    if (target.platform === "pinterest") {
      // A real board must be selected by the user, never guessed by AI.
      const board = region.querySelector(
        '[data-test-id="board-dropdown-select-button"],[aria-label*="board" i],[aria-label*="pano" i]',
      );
      if (!board || /choose|select|seç/i.test(label(board)))
        throw new Error("Pinterest panosunu formda seçin.");
      boardProof = { el: board, label: label(board) };
    }
    const publish = await until(
      () => !busy(region) && button(region, config.publish),
      30000,
    );
    if (!publish || !identity(region, target, config))
      throw new Error("Yayın düğmesi veya yükleme tamamlanması doğrulanamadı.");
    const attachments = images.length
      ? attachmentProof(region, uploaded, images.length, previousImages)
      : null;
    if (images.length && !attachments)
      throw new Error("Yüklenen fotoğraflar doğrulanamadı.");
    const before = new Set(
      [...document.querySelectorAll("a[href]")]
        .map((a) => policy.postURL(a.href, target.platform))
        .filter(Boolean),
    );
    const id = crypto.randomUUID();
    prepared = {
      id,
      jobId: job.id,
      fingerprint: job.fingerprint,
      target: JSON.stringify(target),
      href: location.href,
      at: Date.now(),
      field,
      region,
      publish,
      additional,
      attachments,
      boardProof,
      text: s.text,
      before,
    };
    return { ready: true, sessionId: id };
  }
  async function publish(target, job, sessionId) {
    allowed(target);
    const s = prepared,
      config = policy.platforms[target.platform];
    if (
      !s ||
      s.id !== sessionId ||
      s.jobId !== job.id ||
      s.fingerprint !== job.fingerprint ||
      s.target !== JSON.stringify(target) ||
      s.href !== location.href ||
      Date.now() - s.at > 120000 ||
      !identity(s.region, target, config) ||
      !enabled(s.publish) ||
      busy(s.region) ||
      norm(content(s.field)) !== norm(s.text) ||
      s.additional.some(
        ([el, value]) => !enabled(el) || norm(content(el)) !== norm(value),
      ) ||
      (s.boardProof &&
        (!enabled(s.boardProof.el) ||
          label(s.boardProof.el) !== s.boardProof.label)) ||
      !unchangedAttachments(s.attachments)
    )
      throw new Error(
        "Hesap, metin, görsel veya form değişti. Gönderim başlatılmadı.",
      );
    prepared = null; // Consume before the irreversible click. Never replay this ID.
    s.publish.click();
    const result = await until(() => {
      allowed(target);
      for (const a of document.querySelectorAll("a[href]")) {
        const url = policy.postURL(a.href, target.platform);
        if (
          !url ||
          s.before.has(url) ||
          !policy.ownedURL(url, target.profileUrl, target.platform)
        )
          continue;
        const article = a.closest(
          'article,[role=article],[data-testid="tweet"],ytd-backstage-post-renderer,[data-test-id="pin"]',
        );
        if (
          !article ||
          !visible(article) ||
          !author(article, target) ||
          !norm(article.innerText).includes(norm(s.text).slice(0, 120))
        )
          continue;
        return { state: "verified", url };
      }
      return null;
    }, 30000);
    return result || { state: "unknown" };
  }
  browser.runtime.onMessage.addListener((m, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      m?.source !== "studio-publisher-agent"
    )
      return;
    return (async () => {
      const target = social.target(m.target);
      if (m.action === "prepare") return prepare(target, m.job, m.images || []);
      if (m.action === "publish") return publish(target, m.job, m.sessionId);
      throw new Error("Desteklenmeyen yayın adımı.");
    })()
      .then((result) => ({ ok: true, ...result }))
      .catch((e) => {
        prepared = null;
        return { ok: false, error: e.message || "Yayın adımı tamamlanamadı." };
      });
  });
})();
