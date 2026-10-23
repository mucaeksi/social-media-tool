(() => {
  if (window !== window.top) return;
  const source = "sosyal-studio-panel-v1",
    reply = "sosyal-studio-firefox-v1";
  let pending = 0;
  browser.runtime.onMessage.addListener((m, sender) => {
    if (sender.id !== browser.runtime.id || m?.source !== "studio-auth-check")
      return;
    return fetch(location.origin + "/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      redirect: "error",
    })
      .then(async (r) => {
        const a = r.ok ? await r.json() : null;
        return {
          userId: a?.user?.role === "admin" ? a.user.id : null,
          companyId: new URL(location.href).searchParams.get("company"),
        };
      })
      .catch(() => ({ userId: null }));
  });
  browser.runtime.onMessage.addListener((m, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      m?.source !== "studio-tab-publication"
    )
      return;
    return (async () => {
      if (
        !/^[a-f0-9-]{36}$/i.test(m.jobId || "") ||
        !["get", "media", "authorize", "claim", "sending", "result"].includes(
          m.action,
        )
      )
        throw new Error("Geçersiz yayın isteği.");
      let path = "/api/tab-publications/" + m.jobId;
      if (m.action === "media") {
        if (!Number.isInteger(m.index) || m.index < 0 || m.index > 9)
          throw new Error("Görsel sırası geçersiz.");
        path += "/media/" + m.index;
      } else if (m.action !== "get") path += "/" + m.action;
      const write = !["get", "media"].includes(m.action);
      const r = await fetch(location.origin + path, {
        credentials: "include",
        cache: "no-store",
        redirect: "error",
        ...(write
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                executor: m.executor,
                confirmed: true,
                state: m.state,
                url: m.url,
                detail: m.detail,
              }),
            }
          : {}),
      });
      const value = await r.json();
      if (!r.ok) throw new Error(value.error || "Yayın adımı reddedildi.");
      return { ok: true, value };
    })().catch((e) => ({ ok: false, error: e.message }));
  });
  window.addEventListener("message", async (event) => {
    const m = event.data;
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      m?.source !== source ||
      typeof m.id !== "string" ||
      m.id.length > 64 ||
      ![
        "status",
        "publish-batch",
        "connect",
        "open-ad-portal",
        "connect-window",
        "connect-workspace",
        "tabs",
        "select-tab",
        "select-target",
        "read",
        "focus",
        "prepare",
        "disconnect",
      ].includes(m.action) ||
      JSON.stringify(m).length > 16000 ||
      pending >= 3
    )
      return;
    pending++;
    try {
      const response = await fetch(location.origin + "/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        redirect: "error",
      });
      const auth = response.ok ? await response.json() : null;
      if (auth?.user?.role !== "admin" || typeof auth.user.id !== "string") {
        await browser.runtime
          .sendMessage({ action: "disconnect" })
          .catch(() => {});
        throw new Error(
          "Firefox bağlantısı için panelde yönetici olarak giriş yapın.",
        );
      }
      let jobs;
      if (m.action === "publish-batch") {
        if (
          !Array.isArray(m.jobIds) ||
          !m.jobIds.length ||
          m.jobIds.length > 20 ||
          m.jobIds.some((id) => !/^[a-f0-9-]{36}$/i.test(id))
        )
          throw new Error("Yayın işlerini seçin.");
        jobs = await Promise.all(
          m.jobIds.map(async (id) => {
            const r = await fetch(
              location.origin + "/api/tab-publications/" + id,
              { credentials: "include", cache: "no-store", redirect: "error" },
            );
            const value = await r.json();
            if (!r.ok)
              throw new Error(value.error || "Yayın önizlemesi doğrulanamadı.");
            return value;
          }),
        );
      }
      let target, targets;
      if (m.action === "connect-workspace") {
        const companyId = new URL(location.href).searchParams.get("company");
        if (companyId !== m.companyId)
          throw new Error("Paneldeki seçili şirket değişti. Yeniden deneyin.");
        const res = await fetch(
          location.origin + "/api/social/accounts?" + new URLSearchParams({ companyId }),
          { credentials: "include", cache: "no-store", redirect: "error" },
        );
        if (!res.ok) throw new Error("Şirket hesapları doğrulanamadı.");
        const accounts = await res.json();
        targets = accounts.filter((a) => a.companyId === companyId && a.profileUrl)
          .map((a) => ({ ...a, accountId: a.id, companyName: String(m.companyName || "").slice(0, 150) }));
      }
      if (m.action === "connect" || m.action === "open-ad-portal") {
        const params = new URLSearchParams({
          companyId: m.target?.companyId || "",
        });
        const res = await fetch(
          location.origin + "/api/social/accounts?" + params,
          { credentials: "include", cache: "no-store", redirect: "error" },
        );
        if (!res.ok) throw new Error("Şirket hesapları doğrulanamadı.");
        const accounts = await res.json();
        const account = accounts.find(
          (a) =>
            a.id === m.target?.accountId && a.companyId === m.target?.companyId,
        );
        if (!account) throw new Error("Hesap seçili şirkete ait değil.");
        target = {
          ...account,
          accountId: account.id,
          companyName: String(m.target?.companyName || "").slice(0, 150),
        };
        if (m.target?.adProvider) {
          const provider = (globalThis.StudioAdvertising || []).find(
            (p) =>
              p.id === m.target.adProvider &&
              p.platforms.includes(account.platform),
          );
          if (!provider)
            throw new Error(
              "Bu reklam paneli kayıtlı hesabın platformuyla eşleşmiyor.",
            );
          target = {
            ...target,
            platform: "ads-" + provider.id,
            profileUrl: provider.home,
          };
        }
      }
      const result = await browser.runtime.sendMessage({
        action: m.action,
        jobs,
        userId: auth.user.id,
        target,
        targets,
        companyName: m.companyName,
        tabId: m.tabId,
        text: m.text,
        snapshotId: m.snapshotId,
        companyId: m.companyId,
        accountId: m.accountId,
        platform: m.platform,
        elementId: m.elementId,
      });
      window.postMessage(
        { source: reply, id: m.id, ...result },
        location.origin,
      );
    } catch (e) {
      window.postMessage(
        {
          source: reply,
          id: m.id,
          ok: false,
          error: e.message || "Firefox eklentisiyle bağlantı kurulamadı.",
        },
        location.origin,
      );
    } finally {
      pending--;
    }
  });
})();
