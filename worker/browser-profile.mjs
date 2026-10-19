import {
  accountCookies,
  browserPlatforms,
  domainMatches,
  PROFILE_LIMITS,
} from "./browser-state.mjs";

export async function captureBrowserState(browser, platform) {
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  const cdp = await page.createCDPSession();
  let cookies;
  try {
    cookies = (await cdp.send("Storage.getCookies")).cookies;
  } finally {
    await cdp.detach();
  }
  if (!Array.isArray(cookies)) throw new Error("Tarayıcı çerezleri okunamadı.");
  const origins = new Map();
  let storageComplete = true;
  for (const p of pages) {
    for (const frame of p.frames()) {
      let url;
      try {
        url = new URL(frame.url());
      } catch {
        continue;
      }
      if (
        url.protocol !== "https:" ||
        !domainMatches(url.hostname, browserPlatforms[platform].roots) ||
        origins.has(url.origin)
      )
        continue;
      if (origins.size >= PROFILE_LIMITS.origins)
        throw new Error("Giriş profilinin alan adı sınırı aşıldı.");
      try {
        const items = await frame.evaluate(() => Object.entries(localStorage));
        origins.set(url.origin, { origin: url.origin, items });
      } catch {
        storageComplete = false;
      }
    }
  }
  return {
    state: {
      cookies: accountCookies(cookies, platform),
      origins: [...origins.values()],
    },
    storageComplete,
  };
}

export async function restoreBrowserState(page, state) {
  if (state.cookies.length) {
    const cdp = await page.createCDPSession();
    try {
      await cdp.send("Storage.setCookies", { cookies: state.cookies });
    } finally {
      await cdp.detach();
    }
  }
  if (state.origins.length)
    await page.evaluateOnNewDocument(
      (origins, marker) => {
        const entry = origins.find((item) => item.origin === location.origin);
        if (!entry) return;
        try {
          if (sessionStorage.getItem(marker)) return;
          for (const [name, value] of entry.items)
            if (localStorage.getItem(name) === null)
              localStorage.setItem(name, value);
          sessionStorage.setItem(marker, "1");
        } catch {
          /* The social site may block storage in an embedded frame. */
        }
      },
      state.origins,
      `__sosyal_studio_restore_${crypto.randomUUID()}`,
    );
}
