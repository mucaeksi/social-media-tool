(() => {
  if (globalThis.__studioPageAgent) return;
  globalThis.__studioPageAgent = true;
  let snapshot;
  const p = StudioPolicy;
  const norm = (v) =>
    String(v || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("tr-TR");
  const visible = (el) => {
    const s = getComputedStyle(el);
    return (
      el.isConnected &&
      el.getClientRects().length > 0 &&
      s.display !== "none" &&
      s.visibility !== "hidden" &&
      !el.closest("[hidden],[aria-hidden=true]")
    );
  };
  function allowed(target) {
    if (
      !p.clean(location.href, target.platform) ||
      [
        ...document.querySelectorAll(
          'input[type=password],input[autocomplete=one-time-code],input[autocomplete^="cc-"]',
        ),
      ].some(visible)
    )
      throw new Error(
        "Giriş, ödeme, doğrulama ve özel mesaj ekranları okunmaz.",
      );
  }
  const privateSelector =
    "script,style,noscript,input,textarea,[contenteditable],iframe,[data-private],[role=navigation],[role=log],form:has(input[type=password]),[hidden],[aria-hidden=true],[data-pagelet*=ChatTab],[data-testid*=conversation],.msg-overlay-list-bubble,.msg-conversations-container,[aria-label*=Messenger]";
  function text() {
    const source = document.querySelector("main,[role=main]") || document.body;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        return n.parentElement &&
          !n.parentElement.closest(privateSelector) &&
          visible(n.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    let output = "",
      n;
    while (output.length < 3500 && (n = walker.nextNode()))
      output += " " + n.textContent;
    return output.replace(/\s+/g, " ").trim().slice(0, 3000);
  }
  function proof(target) {
    const dialogs = [
      ...document.querySelectorAll("[role=dialog],dialog[open]"),
    ].filter(visible);
    const candidates = [];
    for (const dialog of dialogs) {
      // A company link inside the composer is required. A page heading behind
      // a personal composer is never proof of who will publish the draft.
      const actors = [...dialog.querySelectorAll("a[href]")].filter(
        (a) =>
          visible(a) &&
          p.canonical(a.href, target.platform) ===
            p.canonical(target.profileUrl, target.platform) &&
          norm(a.innerText || a.getAttribute("aria-label")) ===
            norm(target.identityLabel || target.label),
      );
      if (!actors.length) continue;
      const fields = [
        ...dialog.querySelectorAll(
          "textarea,[role=textbox][contenteditable=true]",
        ),
      ].filter(
        (el) =>
          visible(el) &&
          !el.disabled &&
          !el.readOnly &&
          !el.closest("[data-private]") &&
          !/search|ara(?:ma)?|comment|yorum|reply|yanıt|message|mesaj/i.test(
            el.getAttribute("aria-label") ||
              el.getAttribute("placeholder") ||
              "",
          ),
      );
      if (fields.length === 1) candidates.push(fields[0]);
    }
    return candidates.length === 1 ? candidates[0] : null;
  }
  function adIdentity(target) {
    const content = norm(document.body.innerText),
      id = norm(target.identityId).replace(/-/g, "");
    return Boolean(
      target.identityLabel &&
      id &&
      content.includes(norm(target.identityLabel)) &&
      content.replace(/-/g, "").includes(id),
    );
  }
  function adFields(target) {
    if (!adIdentity(target)) return [];
    return [
      ...document.querySelectorAll(
        "textarea,input[type=text],input:not([type]),[role=textbox][contenteditable=true]",
      ),
    ]
      .filter((el) => {
        const label =
          el.getAttribute("aria-label") ||
          el.labels?.[0]?.innerText ||
          el.getAttribute("placeholder") ||
          "";
        const region = el.closest("form,[role=dialog],main,[role=main]");
        const headings = region
          ? [...region.querySelectorAll("h1,h2,h3,[role=heading],legend")]
              .filter(visible)
              .map((h) => h.innerText)
              .join(" ")
          : "";
        return (
          visible(el) &&
          !el.disabled &&
          !el.readOnly &&
          !el.closest("[data-private]") &&
          /create (?:ad|campaign)|new ad|ad draft|draft|reklam oluştur|kampanya oluştur|yeni reklam|reklam taslağı|taslak/i.test(
            headings,
          ) &&
          /^(?:ad name|campaign name|ad group name|headline(?: \d+)?|description(?: \d+)?|primary text|ad text|caption|reklam adı|kampanya adı|başlık(?: \d+)?|açıklama(?: \d+)?|ana metin|reklam metni)$/i.test(
            label.trim(),
          )
        );
      })
      .slice(0, 20);
  }
  browser.runtime.onMessage.addListener((m, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      m?.source !== "studio-extension-agent"
    )
      return;
    try {
      const target = p.target(m.target);
      allowed(target);
      if (m.action === "read") {
        if (p.advertising(target.platform)) {
          const fields = adFields(target).map((el) => ({
            id: crypto.randomUUID(),
            el,
            original: el.value ?? el.innerText,
            label: (
              el.getAttribute("aria-label") ||
              el.labels?.[0]?.innerText ||
              el.getAttribute("placeholder") ||
              ""
            ).slice(0, 100),
          }));
          snapshot = {
            id: crypto.randomUUID(),
            at: Date.now(),
            href: location.href,
            target: JSON.stringify(target),
            fields,
          };
          return Promise.resolve({
            ok: true,
            page: {
              id: snapshot.id,
              url: p.clean(location.href, target.platform),
              title: document.title.slice(0, 160),
              text: text(),
              canPrepare: fields.some((f) => !f.original.trim()),
              fields: fields.map(({ id, label, original }) => ({
                id,
                label,
                empty: !original.trim(),
              })),
              reason: adIdentity(target)
                ? "Reklam hesabı adı ve kimliği görünür. Yalnız doğrulanan taslak metin alanları doldurulur; yayın, bütçe ve ödeme Firefox'ta elle tamamlanır."
                : "Reklam hesabı adı/kimliği doğrulanamadı; ekran okunabilir, alanlara yazılmaz. Doğru hesabı seçip yeniden bağlayın.",
            },
          });
        }
        const field = proof(target);
        snapshot = {
          id: crypto.randomUUID(),
          at: Date.now(),
          href: location.href,
          target: JSON.stringify(target),
          field,
          original: field ? (field.value ?? field.innerText) : null,
        };
        return Promise.resolve({
          ok: true,
          page: {
            id: snapshot.id,
            url: p.clean(location.href, target.platform),
            title: document.title.slice(0, 160),
            text: text(),
            canPrepare: Boolean(field),
            target: { label: target.label, profileUrl: target.profileUrl },
            reason: field
              ? "Gönderi penceresinde kayıtlı hedefin bağlantısı ve tam adı bulundu. Son yayın Firefox'ta elle yapılır."
              : "Taslak yerleştirmek için hedef şirket adına gönderi penceresini açın. Pencere içinde kayıtlı hedefin tam adı ve profil bağlantısı doğrulanmalı.",
          },
        });
      }
      if (
        m.action !== "fill" ||
        typeof m.text !== "string" ||
        !m.text.trim() ||
        m.text.length > 10000
      )
        throw new Error("Desteklenmeyen sayfa işlemi.");
      if (
        !snapshot ||
        snapshot.id !== m.snapshotId ||
        Date.now() - snapshot.at > 60000 ||
        snapshot.href !== location.href ||
        snapshot.target !== JSON.stringify(target)
      )
        throw new Error(
          "Sayfa değişti veya okuma süresi doldu. Panelde sekmeyi yeniden okuyun.",
        );
      const ad = p.advertising(target.platform),
        selected = ad
          ? snapshot.fields?.find((f) => f.id === m.elementId)
          : null;
      const field = ad ? selected?.el : proof(target),
        original = ad ? selected?.original : snapshot.original;
      if (
        !field ||
        (ad ? !adFields(target).includes(field) : field !== snapshot.field) ||
        (field.value ?? field.innerText) !== original
      )
        throw new Error(
          "Etkin şirket kimliği veya gönderi alanı değişti. Taslak yerleştirilmedi.",
        );
      if (String(original || "").trim())
        throw new Error(
          "Gönderi alanında metin var. Mevcut yazınızı elle temizleyip yeniden okuyun.",
        );
      const approved = m.text;
      snapshot = null; // One write per approved snapshot; no retry on uncertainty.
      field.focus();
      if (field.tagName === "TEXTAREA" || field.tagName === "INPUT") {
        Object.getOwnPropertyDescriptor(
          field.tagName === "INPUT"
            ? HTMLInputElement.prototype
            : HTMLTextAreaElement.prototype,
          "value",
        ).set.call(field, approved);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const range = document.createRange();
        range.selectNodeContents(field);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        if (!document.execCommand("insertText", false, approved))
          throw new Error(
            "Platform metin girişini kabul etmedi. Taslağı panelden kopyalayabilirsiniz.",
          );
      }
      if (
        (ad ? !adFields(target).includes(field) : proof(target) !== field) ||
        norm(field.value ?? field.innerText) !== norm(approved)
      )
        throw new Error(
          "Metin veya hedef doğrulanamadı; Firefox'taki taslağı kontrol edin. Yayın yapılmadı.",
        );
      return Promise.resolve({ ok: true, prepared: true, published: false });
    } catch (e) {
      snapshot = null;
      return Promise.resolve({
        ok: false,
        error: e.message || "Sayfa okunamadı.",
      });
    }
  });
})();
