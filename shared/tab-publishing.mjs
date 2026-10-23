// This policy is also shipped, without imports or remote code, to Firefox.
export function createTabPublishingPolicy() {
  const platforms = {
    facebook: {
      name: "Facebook",
      hosts: ["facebook.com"],
      limit: 10000,
      images: 10,
      create: [
        "Create post",
        "Create a post",
        "What's on your mind?",
        "Gönderi oluştur",
        "Ne düşünüyorsun?",
        "Aklından neler geçiyor?",
      ],
      publish: ["Post", "Publish", "Paylaş", "Yayınla"],
      fields: '[role="textbox"][contenteditable="true"],textarea',
      actor: '[role="dialog"] a[href]',
    },
    instagram: {
      name: "Instagram",
      hosts: ["instagram.com"],
      limit: 2200,
      images: 10,
      create: ["New post", "Create", "Yeni gönderi", "Oluştur"],
      publish: ["Share", "Paylaş"],
      fields:
        'textarea[aria-label*="caption" i],textarea[aria-label*="açıklama" i],[contenteditable="true"][role="textbox"]',
      actor:
        'a[aria-label="Profile"],a[aria-label="Profil"],[role="dialog"] a[href]',
    },
    x: {
      name: "X",
      hosts: ["x.com"],
      limit: 280,
      images: 4,
      create: ["Post", "Gönder", "Gönderi yayınla"],
      publish: ["Post", "Gönder", "Yayınla"],
      fields:
        '[data-testid="tweetTextarea_0"],[role="dialog"] [role="textbox"][contenteditable="true"]',
      actor: 'a[data-testid="AppTabBar_Profile_Link"]',
    },
    threads: {
      name: "Threads",
      hosts: ["threads.com", "threads.net"],
      limit: 500,
      images: 10,
      create: ["Create", "New thread", "Oluştur", "Yeni konu"],
      publish: ["Post", "Paylaş", "Yayınla"],
      fields:
        '[role="dialog"] [role="textbox"][contenteditable="true"],textarea',
      actor:
        'a[aria-label="Profile"],a[aria-label="Profil"],[role="dialog"] a[href]',
    },
    pinterest: {
      name: "Pinterest",
      hosts: ["pinterest.com"],
      limit: 500,
      images: 1,
      create: ["Create Pin", "Create a Pin", "Pin oluştur"],
      publish: ["Publish", "Yayınla"],
      fields:
        'textarea[placeholder*="description" i],textarea[placeholder*="açıklama" i],[contenteditable="true"][role="textbox"]',
      actor: '[data-test-id="header-profile"] a[href],[role="dialog"] a[href]',
    },
    linkedin: {
      name: "LinkedIn",
      hosts: ["linkedin.com"],
      limit: 3000,
      images: 10,
      create: [
        "Start a post",
        "Create a post",
        "Gönderi başlat",
        "Gönderi oluştur",
      ],
      publish: ["Post", "Paylaş", "Yayınla"],
      fields:
        '.ql-editor[contenteditable="true"],[role="dialog"] [role="textbox"][contenteditable="true"]',
      actor: '[role="dialog"] a[href]',
    },
    youtube: {
      name: "YouTube topluluk gönderisi",
      hosts: ["youtube.com"],
      limit: 5000,
      images: 10,
      create: ["Create post", "Gönderi oluştur"],
      publish: ["Post", "Publish", "Yayınla", "Paylaş"],
      fields:
        '#contenteditable-root[contenteditable="true"],textarea[aria-label*="post" i],[role="dialog"] [role="textbox"][contenteditable="true"]',
      actor:
        '#channel-handle a[href],ytd-backstage-post-dialog-renderer a[href],[role="dialog"] a[href]',
    },
    tiktok: {
      name: "TikTok fotoğraf gönderisi",
      hosts: ["tiktok.com"],
      limit: 2200,
      images: 10,
      create: ["Upload", "Create post", "Yükle", "Gönderi oluştur"],
      publish: ["Post", "Publish", "Paylaş", "Yayınla"],
      fields:
        '[contenteditable="true"][role="textbox"],.public-DraftEditor-content[contenteditable="true"],textarea[aria-label*="caption" i]',
      actor: 'a[data-e2e="nav-profile"],[role="dialog"] a[href]',
    },
    tumblr: {
      name: "Tumblr",
      hosts: ["tumblr.com"],
      limit: 4000,
      images: 10,
      create: ["Photo", "Text", "Fotoğraf", "Metin"],
      publish: ["Post now", "Post", "Şimdi paylaş", "Paylaş", "Yayınla"],
      fields:
        '[role="dialog"] [contenteditable="true"],[role="textbox"][contenteditable="true"],textarea',
      actor: '[role="dialog"] a[href],[data-testid="post-form"] a[href]',
    },
  };
  function profile(value, platform, post = false) {
    try {
      const u = new URL(value),
        p = platforms[platform];
      if (
        !p ||
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        u.port ||
        /^(?:ads|adsmanager|business)\./.test(u.hostname) ||
        !p.hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))
      )
        return null;
      if (
        /\/(?:login|signin|accounts|messages|messaging|direct|inbox|settings|ads|adsmanager|campaignmanager|promotions|billing|checkout|blaze)(?:\/|$)/i.test(
          u.pathname,
        )
      )
        return null;
      const path = u.pathname.replace(/\/$/, "");
      if (!path) return null;
      if (!post && platform === "linkedin" && !/^\/company\/[^/]+$/.test(path))
        return null;
      const out = new URL(u.origin + path);
      if (
        platform === "facebook" &&
        path === "/profile.php" &&
        /^\d+$/.test(u.searchParams.get("id") || "")
      )
        out.searchParams.set("id", u.searchParams.get("id"));
      return out.href;
    } catch {
      return null;
    }
  }
  function canonical(value, platform) {
    const safe = profile(value, platform);
    if (!safe) return null;
    const u = new URL(safe);
    return u.hostname.replace(/^www\./, "") + u.pathname + u.search;
  }
  function postURL(value, platform) {
    try {
      const safe = profile(value, platform, true);
      if (!safe) return null;
      const u = new URL(value);
      const patterns = {
        facebook:
          /\/(?:[^/]+\/posts\/[^/]+|permalink\.php|photo(?:\.php)?)(?:\/|$)/,
        instagram: /^\/(?:p|reel)\/[\w-]+\/?$/,
        x: /^\/[^/]+\/status\/\d+\/?$/,
        threads: /^\/@[^/]+\/post\/[\w-]+\/?$/,
        pinterest: /^\/pin\/\d+\/?$/,
        linkedin:
          /^\/(?:feed\/update\/urn:li:(?:activity|share):\d+|posts\/[^/]+)\/?$/,
        youtube: /^\/post\/[\w-]+\/?$/,
        tiktok: /^\/@[^/]+\/(?:photo|video)\/\d+\/?$/,
        tumblr: /^\/(?:[^/]+\/)?(?:post\/)?\d+(?:\/[^/]+)?\/?$/,
      };
      if (!patterns[platform]?.test(u.pathname)) return null;
      if (
        platform === "facebook" &&
        /^\/(?:photo(?:\.php)?|permalink\.php)\/?$/.test(u.pathname) &&
        !["story_fbid", "fbid"].some((k) =>
          /^\d+$/.test(u.searchParams.get(k) || ""),
        )
      )
        return null;
      const out = new URL(u.origin + u.pathname);
      if (platform === "facebook")
        for (const k of ["id", "story_fbid", "fbid"])
          if (/^\d+$/.test(u.searchParams.get(k) || ""))
            out.searchParams.set(k, u.searchParams.get(k));
      return out.href;
    } catch {
      return null;
    }
  }
  function ownedURL(value, target, platform) {
    const safe = postURL(value, platform),
      normalized = profile(target, platform);
    if (!safe || !normalized) return false;
    const u = new URL(safe),
      p = new URL(normalized);
    if (["x", "threads", "tiktok"].includes(platform))
      return (
        u.pathname.split("/")[1].toLowerCase() ===
        p.pathname.split("/")[1].toLowerCase()
      );
    if (
      platform === "facebook" &&
      /^\/(?:photo(?:\.php)?|permalink\.php)\/?$/.test(u.pathname)
    )
      return (
        !p.searchParams.has("id") ||
        !u.searchParams.has("id") ||
        p.searchParams.get("id") === u.searchParams.get("id")
      );
    if (platform === "facebook")
      return p.searchParams.has("id")
        ? u.searchParams.get("id") === p.searchParams.get("id") ||
            u.pathname.startsWith("/" + p.searchParams.get("id") + "/posts/")
        : u.pathname.startsWith(p.pathname + "/posts/");
    if (platform === "tumblr")
      return (
        u.hostname === p.hostname &&
        (u.pathname.startsWith(p.pathname + "/") ||
          (p.hostname !== "www.tumblr.com" && p.hostname !== "tumblr.com"))
      );
    // These platforms use opaque post IDs; a matching author in the new DOM
    // result is additionally required by the publisher, not inferred from URL.
    return true;
  }
  return { platforms, profile, canonical, postURL, ownedURL };
}
export const tabPublishing = createTabPublishingPolicy();
export function tabPublishingExtensionSource() {
  return `/* Generated from shared/tab-publishing.mjs. */\nglobalThis.StudioPublishing = (${createTabPublishingPolicy.toString()})();\n`;
}
