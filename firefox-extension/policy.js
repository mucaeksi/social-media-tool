/* Shared only inside the extension; no remote code or page-supplied selectors. */
(() => {
  const panelOrigin = "https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev";
  const roots = {
    facebook: ["facebook.com"], instagram: ["instagram.com"], linkedin: ["linkedin.com"],
    x: ["x.com"], threads: ["threads.com", "threads.net"], pinterest: ["pinterest.com"],
    youtube: ["youtube.com"], tiktok: ["tiktok.com"], tumblr: ["tumblr.com"],
  };
  const blocked = /\/(?:messages|messaging|direct|inbox|login|signin|password|accounts|i\/chat|account\/access|oauth|checkpoint)(?:\/|$)/i;
  function clean(value, platform) {
    try {
      const u = new URL(value);
      if (u.protocol !== "https:" || u.username || u.password || u.port || !roots[platform]?.some((h) => u.hostname === h || u.hostname.endsWith("." + h)) || blocked.test(u.pathname)) return null;
      const out = new URL(u.origin + u.pathname);
      if (platform === "facebook" && u.pathname === "/profile.php" && /^\d{1,30}$/.test(u.searchParams.get("id") || "")) out.searchParams.set("id", u.searchParams.get("id"));
      return out.href;
    } catch { return null; }
  }
  function canonical(value, platform) {
    const safe = clean(value, platform);
    if (!safe) return null;
    const u = new URL(safe);
    return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "") + u.search;
  }
  function target(input) {
    if (!input || !/^[a-f0-9-]{36}$/i.test(input.companyId || "") || !/^[a-f0-9-]{36}$/i.test(input.accountId || "") ||
        typeof input.label !== "string" || !input.label.trim() || input.label.length > 100 || typeof input.companyName !== "string" || input.companyName.length > 150) throw new Error("Şirket ve kayıtlı hesap seçin.");
    const profileUrl = clean(input.profileUrl, input.platform);
    if (!profileUrl || new URL(profileUrl).pathname === "/") throw new Error("Hesap bağlantılarına şirketin hedef profil/sayfa adresini kaydedin.");
    if (input.platform === "linkedin" && !/^\/company\/[^/]+\/?$/.test(new URL(profileUrl).pathname)) throw new Error("LinkedIn hedefi kişisel profil değil, /company/ adresli şirket sayfası olmalı.");
    const identityLabel = typeof input.identityLabel === "string" ? input.identityLabel.trim() : "";
    if (identityLabel.length > 100) throw new Error("Hedef sayfa adı çok uzun.");
    return { companyId: input.companyId, accountId: input.accountId, platform: input.platform, label: input.label.trim(), companyName: input.companyName, profileUrl, ...(identityLabel ? { identityLabel } : {}) };
  }
  function panel(sender) {
    try { return sender.frameId === 0 && Number.isInteger(sender.tab?.id) && !sender.tab.incognito && new URL(sender.url).origin === panelOrigin && new URL(sender.tab.url).origin === panelOrigin; }
    catch { return false; }
  }
  globalThis.StudioPolicy = { panelOrigin, roots, clean, canonical, target, panel };
})();
