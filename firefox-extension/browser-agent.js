(() => {
  if (globalThis.__studioBrowserAgent) return;
  globalThis.__studioBrowserAgent = true;
  const p = StudioPolicy, a = StudioAgentPolicy;
  let snapshot = null;
  const privateSelector = '[data-private],[role="log"],iframe,[data-pagelet*="ChatTab"],[data-testid*="conversation"],.msg-overlay-list-bubble,.msg-conversations-container,[aria-label*="Messenger"]';
  const sensitive = 'input[type="password"],input[autocomplete="one-time-code"],input[autocomplete^="cc-"]';
  function visible(el) {
    if (!el?.isConnected || el.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility === "visible" && Number(s.opacity) !== 0 &&
      r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  }
  const label = (el) => (el.getAttribute("aria-label") || el.labels?.[0]?.innerText ||
    el.getAttribute("placeholder") || el.innerText || el.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const value = (el) => el.isContentEditable ? el.innerText : el.value;
  function interactable(el) {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    const x = (Math.max(0, r.left) + Math.min(innerWidth, r.right)) / 2;
    const y = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
    const front = document.elementFromPoint(x, y);
    return Boolean(front && (front === el || el.contains(front)));
  }
  const canClick = (el, name, kind) => a.clickable(name, kind) && !(el.tagName === "BUTTON" && el.type === "submit" && el.form);
  function allowed(target) {
    if (!a.safeURL(location.href, target.platform) || !p.clean(location.href, target.platform) ||
      [...document.querySelectorAll(sensitive)].some(visible))
      throw new Error("Giriş, doğrulama, özel mesaj, hesap ayarı ve ödeme ekranları bu görevin dışında.");
  }
  function actor(target, el) {
    if (target.platform.startsWith("ads-")) {
      const text = a.norm(document.body.innerText);
      return Boolean(target.identityId && target.identityLabel && text.includes(a.norm(target.identityLabel)) &&
        text.replace(/-/g, "").includes(a.norm(target.identityId).replace(/-/g, "")));
    }
    const region = el.closest('[role="dialog"],dialog[open],form');
    const selector = StudioPublishing.platforms[target.platform]?.actor;
    const candidates = region ? region.querySelectorAll("a[href]") : selector ? document.querySelectorAll(selector) : [];
    return [...candidates].some((link) => visible(link) &&
      p.canonical(link.href, target.platform) === p.canonical(target.profileUrl, target.platform) &&
      a.norm(link.innerText || link.getAttribute("aria-label")) === a.norm(target.identityLabel));
  }
  function writable(el, target, empty = true) {
    if (!interactable(el) || el.disabled || el.readOnly || el.closest(privateSelector) || (empty && value(el)?.trim())) return false;
    const name = a.norm(label(el)), type = el.getAttribute("type") || "text";
    if (el.tagName === "INPUT" && !["text", "search"].includes(type)) return false;
    if (/password|şifre|email|e-posta|phone|telefon|address|adres|budget|bütçe|bid|teklif|card|kart|payment|ödeme|customer|müşteri|audience|hedef kitle|comment|yorum|reply|yanıt|message|mesaj/.test(name)) return false;
    if (type === "search" || /^(?:search|ara|arama)(?:\s|$)/.test(name)) return true;
    if (target.platform.startsWith("ads-")) {
      const region = el.closest('form,[role="dialog"],main,[role="main"]');
      return actor(target, el) && /^(?:primary text|headline|description|ana metin|birincil metin|başlık|açıklama)$/.test(name) &&
        [...(region?.querySelectorAll('h1,h2,h3,[role="heading"],legend') || [])].some((h) => visible(h) && /draft|taslak|new ad|yeni reklam|create ad|reklam oluştur/i.test(h.innerText));
    }
    return actor(target, el) && Boolean(el.tagName === "TEXTAREA" || el.isContentEditable || /title|başlık/.test(name));
  }
  function redactions(target) {
    const fields = [...document.querySelectorAll('input,textarea,[contenteditable="true"]')]
      .filter((el) => !writable(el, target, false));
    const hidden = [...document.querySelectorAll(privateSelector), ...fields].filter(visible);
    if (hidden.length > 150) throw new Error("Bu sayfada çok fazla özel alan var. Pencereleri kapatıp tekrar deneyin.");
    return hidden.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)),
        width: Math.ceil(Math.min(innerWidth, r.right) - Math.max(0, r.left)),
        height: Math.ceil(Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) };
    });
  }
  function pageText() {
    const root = document.querySelector('main,[role="main"]') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) {
      return n.parentElement && visible(n.parentElement) && !n.parentElement.closest(
        privateSelector + ',script,style,noscript,input,textarea,[contenteditable],nav,[role="navigation"]',
      ) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    } });
    let text = "", node;
    while (text.length < 2000 && (node = walker.nextNode())) text += " " + node.textContent;
    return text.replace(/\s+/g, " ").trim().slice(0, 2000);
  }
  function observe(target) {
    allowed(target);
    const nodes = new Map(), controls = [];
    const candidates = new Set([
      ...document.querySelectorAll('textarea,input,[contenteditable="true"]'),
      ...document.querySelectorAll('button,[role="button"],[role="tab"]'),
      ...document.querySelectorAll('a[href]'),
    ]);
    for (const el of candidates) {
      if (controls.length >= 40) break;
      if (!interactable(el) || el.disabled || el.closest(privateSelector)) continue;
      const name = label(el);
      if (!name) continue;
      const kind = el.tagName === "A" ? "link" : el.matches('input,textarea,[contenteditable="true"]') ? "field" : el.getAttribute("role") === "tab" ? "tab" : "button";
      const href = kind === "link" && !a.sideEffectLabel(name) ? a.safeURL(el.href, target.platform) : null;
      const clickable = kind === "link" ? Boolean(href) : kind !== "field" && canClick(el, name, kind);
      const canWrite = kind === "field" && writable(el, target);
      if (!clickable && !canWrite) continue;
      const id = crypto.randomUUID();
      controls.push({ id, label: name, kind, clickable, writable: canWrite });
      nodes.set(id, { el, label: name, href, kind });
    }
    const id = crypto.randomUUID(), masks = redactions(target);
    snapshot = { id, rawURL: location.href, at: Date.now(), nodes, target: JSON.stringify(target),
      width: innerWidth, height: innerHeight, x: scrollX, y: scrollY, masks };
    return { id, url: a.safeURL(location.href, target.platform), title: document.title.slice(0, 160), text: pageText(), controls,
      width: innerWidth, height: innerHeight, redactions: masks };
  }
  function current(target, id) {
    allowed(target);
    if (!snapshot || snapshot.id !== id || Date.now() - snapshot.at > 120000 || snapshot.rawURL !== location.href ||
      snapshot.target !== JSON.stringify(target) || snapshot.width !== innerWidth || snapshot.height !== innerHeight || snapshot.x !== scrollX || snapshot.y !== scrollY)
      throw new Error("Sayfa görüntüsü değişti veya süresi doldu. Görevi güncel sayfayla yeniden başlatın.");
    return snapshot;
  }
  browser.runtime.onMessage.addListener((m, sender) => {
    if (sender.id !== browser.runtime.id || m?.source !== "studio-browser-agent") return;
    return (async () => {
      if (m.action === "observe") return { observation: observe(m.target) };
      const s = current(m.target, m.snapshotId);
      if (m.action === "capture-check") {
        if (JSON.stringify(s.masks) !== JSON.stringify(redactions(m.target))) throw new Error("Ekrandaki özel alanlar değişti; görüntü kullanılmadı.");
        return { current: true };
      }
      if (m.action !== "act") throw new Error("Geçersiz Firefox sayfa işlemi.");
      const choice = a.decision(m.decision, { controls: [...s.nodes].map(([id, n]) => ({ id,
        clickable: n.kind === "link" ? Boolean(n.href) : n.kind !== "field" && canClick(n.el, n.label, n.kind),
        writable: n.kind === "field" && writable(n.el, m.target) })) }, []);
      const field = s.nodes.get(choice.elementId);
      if (field && (!interactable(field.el) || label(field.el) !== field.label ||
        (field.kind === "link" && a.safeURL(field.el.href, m.target.platform) !== field.href))) throw new Error("Seçilen alan değişti; işlem yapılmadı.");
      snapshot = null; // Consume before any side effect. Never replay a stale decision.
      if (choice.action === "type") {
        const el = field.el;
        if (!writable(el, m.target)) throw new Error("Alan boş değil veya etkin şirket hesabı doğrulanamadı.");
        if (choice.text.length > (StudioPublishing.platforms[m.target.platform]?.limit || 4000) ||
          (el.maxLength > 0 && choice.text.length > el.maxLength)) throw new Error("Metin bu alanın sınırını aşıyor.");
        el.focus();
        if (el.isContentEditable) el.textContent = choice.text;
        else Object.getOwnPropertyDescriptor(el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value").set.call(el, choice.text);
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: choice.text }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 250));
        if (value(el) !== choice.text) throw new Error("Metin alanında yazma sonucu doğrulanamadı. Alanı kontrol edin; otomatik tekrar yapılmadı.");
        return { applied: true, detail: "Metin alana yazıldı ve alan değeri doğrulandı." };
      }
      if (choice.action === "click") {
        if (field.kind === "link") return { navigate: field.href };
        if (!canClick(field.el, label(field.el), field.kind)) throw new Error("Bu düğme genel Firefox görevinden çalıştırılamaz.");
        field.el.click();
        return { applied: true, detail: "Düğme tıklandı; sonuç sonraki görüntüde kontrol edilecek." };
      }
      if (["scroll-up", "scroll-down"].includes(choice.action)) {
        window.scrollBy({ top: choice.action === "scroll-up" ? -550 : 550, behavior: "instant" });
        return { applied: true, detail: "Sayfa kaydırıldı." };
      }
      throw new Error("Bu işlem sayfa komutu değil.");
    })().then((value) => ({ ok: true, ...value })).catch((e) => ({ ok: false, error: e.message }));
  });
})();
