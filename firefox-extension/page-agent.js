(() => {
  if (globalThis.__studioPageAgent) return;
  globalThis.__studioPageAgent = true;
  let snapshot;
  const p = StudioPolicy;
  const norm = (v) => String(v || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
  const visible = (el) => {
    const s = getComputedStyle(el);
    return el.isConnected && el.getClientRects().length > 0 && s.display !== "none" && s.visibility !== "hidden" && !el.closest('[hidden],[aria-hidden=true]');
  };
  function allowed(target) {
    if (!p.clean(location.href, target.platform) || [...document.querySelectorAll('input[type=password],input[autocomplete=one-time-code]')].some(visible)) throw new Error("Giriş, doğrulama ve özel mesaj ekranları okunmaz.");
  }
  const privateSelector = 'script,style,noscript,input,textarea,[contenteditable],iframe,[data-private],[role=navigation],[role=log],form:has(input[type=password]),[hidden],[aria-hidden=true],[data-pagelet*=ChatTab],[data-testid*=conversation],.msg-overlay-list-bubble,.msg-conversations-container,[aria-label*=Messenger]';
  function text() {
    const source = document.querySelector('main,[role=main]') || document.body;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT, { acceptNode(n) {
      return n.parentElement && !n.parentElement.closest(privateSelector) && visible(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    let output = "", n;
    while (output.length < 3500 && (n = walker.nextNode())) output += " " + n.textContent;
    return output.replace(/\s+/g, " ").trim().slice(0, 3000);
  }
  function proof(target) {
    const dialogs = [...document.querySelectorAll('[role=dialog],dialog[open]')].filter(visible);
    const candidates = [];
    for (const dialog of dialogs) {
      // A company link inside the composer is required. A page heading behind
      // a personal composer is never proof of who will publish the draft.
      const actors = [...dialog.querySelectorAll('a[href]')].filter((a) => visible(a) &&
        p.canonical(a.href, target.platform) === p.canonical(target.profileUrl, target.platform) && norm(a.innerText || a.getAttribute("aria-label")) === norm(target.identityLabel || target.label));
      if (!actors.length) continue;
      const fields = [...dialog.querySelectorAll('textarea,[role=textbox][contenteditable=true]')].filter((el) => visible(el) && !el.disabled && !el.readOnly && !el.closest('[data-private]') &&
        !/search|ara(?:ma)?|comment|yorum|reply|yanıt|message|mesaj/i.test(el.getAttribute("aria-label") || el.getAttribute("placeholder") || ""));
      if (fields.length === 1) candidates.push(fields[0]);
    }
    return candidates.length === 1 ? candidates[0] : null;
  }
  browser.runtime.onMessage.addListener((m, sender) => {
    if (sender.id !== browser.runtime.id || m?.source !== "studio-extension-agent") return;
    try {
      const target = p.target(m.target);
      allowed(target);
      if (m.action === "read") {
        const field = proof(target);
        snapshot = { id: crypto.randomUUID(), at: Date.now(), href: location.href, target: JSON.stringify(target), field,
          original: field ? (field.value ?? field.innerText) : null };
        return Promise.resolve({ ok: true, page: { id: snapshot.id, url: p.clean(location.href, target.platform), title: document.title.slice(0, 160), text: text(),
          canPrepare: Boolean(field), target: { label: target.label, profileUrl: target.profileUrl },
          reason: field ? "Gönderi penceresinde kayıtlı hedefin bağlantısı ve tam adı bulundu. Son yayın Firefox'ta elle yapılır." : "Taslak yerleştirmek için hedef şirket adına gönderi penceresini açın. Pencere içinde kayıtlı hedefin tam adı ve profil bağlantısı doğrulanmalı." } });
      }
      if (m.action !== "fill" || typeof m.text !== "string" || !m.text.trim() || m.text.length > 10000) throw new Error("Desteklenmeyen sayfa işlemi.");
      if (!snapshot || snapshot.id !== m.snapshotId || Date.now() - snapshot.at > 60000 || snapshot.href !== location.href || snapshot.target !== JSON.stringify(target)) throw new Error("Sayfa değişti veya okuma süresi doldu. Panelde sekmeyi yeniden okuyun.");
      const field = proof(target);
      if (!field || field !== snapshot.field || (field.value ?? field.innerText) !== snapshot.original) throw new Error("Etkin şirket kimliği veya gönderi alanı değişti. Taslak yerleştirilmedi.");
      if (String(snapshot.original || "").trim()) throw new Error("Gönderi alanında metin var. Mevcut yazınızı elle temizleyip yeniden okuyun.");
      const approved = m.text;
      snapshot = null; // One write per approved snapshot; no retry on uncertainty.
      field.focus();
      if (field.tagName === "TEXTAREA") {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(field, approved);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        const range = document.createRange(); range.selectNodeContents(field);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        if (!document.execCommand("insertText", false, approved)) throw new Error("Platform metin girişini kabul etmedi. Taslağı panelden kopyalayabilirsiniz.");
      }
      if (proof(target) !== field || norm(field.value ?? field.innerText) !== norm(approved)) throw new Error("Metin veya hedef doğrulanamadı; Firefox'taki taslağı kontrol edin. Yayın yapılmadı.");
      return Promise.resolve({ ok: true, prepared: true, published: false });
    } catch (e) { snapshot = null; return Promise.resolve({ ok: false, error: e.message || "Sayfa okunamadı." }); }
  });
})();
