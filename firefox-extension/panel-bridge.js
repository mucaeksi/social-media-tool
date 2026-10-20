(() => {
  if (window !== window.top) return;
  const source = "sosyal-studio-panel-v1", reply = "sosyal-studio-firefox-v1";
  let pending = 0;
  browser.runtime.onMessage.addListener((m, sender) => {
    if (sender.id !== browser.runtime.id || m?.source !== "studio-auth-check") return;
    return fetch(location.origin + "/api/auth/me", { credentials: "include", cache: "no-store", redirect: "error" })
      .then(async (r) => { const a = r.ok ? await r.json() : null; return { userId: a?.user?.role === "admin" ? a.user.id : null }; })
      .catch(() => ({ userId: null }));
  });
  window.addEventListener("message", async (event) => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.source !== source || typeof m.id !== "string" || m.id.length > 64 ||
        !["status", "connect", "connect-window", "tabs", "select-tab", "read", "focus", "prepare", "disconnect"].includes(m.action) || JSON.stringify(m).length > 16000 || pending >= 3) return;
    pending++;
    try {
      const response = await fetch(location.origin + "/api/auth/me", { credentials: "include", cache: "no-store", redirect: "error" });
      const auth = response.ok ? await response.json() : null;
      if (auth?.user?.role !== "admin" || typeof auth.user.id !== "string") {
        await browser.runtime.sendMessage({ action: "disconnect" }).catch(() => {});
        throw new Error("Firefox bağlantısı için panelde yönetici olarak giriş yapın.");
      }
      let target;
      if (m.action === "connect") {
        const params = new URLSearchParams({ companyId: m.target?.companyId || "" });
        const res = await fetch(location.origin + "/api/social/accounts?" + params, { credentials: "include", cache: "no-store", redirect: "error" });
        if (!res.ok) throw new Error("Şirket hesapları doğrulanamadı.");
        const accounts = await res.json();
        const account = accounts.find((a) => a.id === m.target?.accountId && a.companyId === m.target?.companyId);
        if (!account) throw new Error("Hesap seçili şirkete ait değil.");
        target = { ...account, accountId: account.id, companyName: String(m.target?.companyName || "").slice(0, 150) };
      }
      const result = await browser.runtime.sendMessage({ action: m.action, userId: auth.user.id, target, companyName: m.companyName, tabId: m.tabId, text: m.text, snapshotId: m.snapshotId, companyId: m.companyId, accountId: m.accountId });
      window.postMessage({ source: reply, id: m.id, ...result }, location.origin);
    } catch (e) {
      window.postMessage({ source: reply, id: m.id, ok: false, error: e.message || "Firefox eklentisiyle bağlantı kurulamadı." }, location.origin);
    } finally { pending--; }
  });
})();
