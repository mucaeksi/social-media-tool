/* Generated from shared/firefox-agent.mjs. */
globalThis.StudioAgentPolicy = (function createFirefoxAgentPolicy(providers = []) {
  const version = "firefox-agent-v1", maxSteps = 8, lifetime = 12 * 60000;
  const hosts = {
    facebook: ["facebook.com"], instagram: ["instagram.com"], x: ["x.com"],
    threads: ["threads.com", "threads.net"], linkedin: ["linkedin.com"],
    pinterest: ["pinterest.com"], youtube: ["youtube.com"], tiktok: ["tiktok.com"], tumblr: ["tumblr.com"],
  };
  const privatePath = /\/(?:login|signin|logout|signout|log_out|accounts|account|password|oauth|checkpoint|messages|messaging|direct|inbox|i\/chat|settings|billing|payment|payments|checkout|wallet|audiences|contacts|customers|export|delete|remove|deactivate|follow|unfollow|like|unlike|subscribe|unsubscribe)(?:\/|\.|$)/i;
  function safeURL(value, platform) {
    try {
      const u = new URL(value), ad = providers.find((p) => "ads-" + p.id === platform);
      if (u.protocol !== "https:" || u.username || u.password || u.port || privatePath.test(u.pathname)) return null;
      if (ad) {
        if (!ad.hosts.includes(u.hostname) || !ad.paths.some((p) => p === "/" || u.pathname === p || u.pathname.startsWith(p + "/"))) return null;
      } else if (!hosts[platform]?.some((h) => u.hostname === h || u.hostname.endsWith("." + h)) || /^(?:ads|adsmanager|business)\./i.test(u.hostname)) return null;
      const out = new URL(u.origin + u.pathname);
      for (const key of ad ? ["act", "act_id", "account_id", "advertiser_id", "ocid", "campaignId", "campaign_id", "adAccountId"] : platform === "facebook" ? ["id"] : []) {
        const id = u.searchParams.get(key);
        if (id && /^[a-z0-9_-]{1,60}$/i.test(id)) out.searchParams.set(key, id);
      }
      return out.href;
    } catch { return null; }
  }
  const norm = (v) => String(v || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
  const sideEffectLabel = (label) => /publish|paylaş|send|gönder|submit|save|kaydet|delete|sil\b|remove|kaldır|like|beğen|follow|takip|buy|satın|purchase|payment|ödeme|budget|bütçe|schedule|zamanla|boost|promote|sponsor|activate|deactivate|onayla|confirm|sign.?out|log.?out|çıkış|message|mesaj|inbox|direct|billing|password|şifre/.test(norm(label));
  function clickable(label, role) {
    const v = norm(label);
    // Starting an empty composer is reversible. Final publishing uses the
    // existing frozen-content publication queue, never this general executor.
    if (/^(?:create(?: a)? (?:post|pin|ad|campaign)|start a post|new (?:post|thread|pin)|gönderi (?:oluştur|başlat)|yeni (?:gönderi|konu|reklam)|pin oluştur|reklam oluştur|kampanya oluştur|what's on your mind\??|ne düşünüyorsun\??|aklından neler geçiyor\??)$/.test(v)) return true;
    if (sideEffectLabel(v)) return false;
    return Boolean(v && (role === "tab" || /^(?:more|daha fazla|menu|menü|next|ileri|back|geri|previous|önceki|close|kapat|cancel|iptal|search|ara|create|oluştur|photo|fotoğraf|text|metin|photos|fotoğraflar|add photo|fotoğraf ekle|home|ana sayfa|profile|profil|page|sayfa|pages|sayfalar|insights|istatistikler|analytics|analizler|notifications|bildirimler|show more|daha fazlasını göster|see all|tümünü gör)$/.test(v)));
  }
  function decision(value, observation, tabs) {
    const keys = ["action", "elementId", "accountId", "text", "message"];
    if (!value || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((k) => typeof value[k] !== "string") ||
      !["click", "type", "scroll-up", "scroll-down", "switch-tab", "profile", "done", "ask"].includes(value.action) ||
      value.text.length > 4000 || value.message.length > 300) throw new Error("Qwen işlem yanıtı doğrulanamadı.");
    const field = observation.controls.find((c) => c.id === value.elementId);
    if (["click", "type"].includes(value.action)) {
      if (!field || !(value.action === "click" ? field.clickable : field.writable) || value.accountId ||
        (value.action === "type" ? !value.text.trim() : value.text)) throw new Error("Qwen yalnız son görüntüde izin verilen alanları kullanabilir.");
    } else if (value.elementId || value.text || (value.action !== "switch-tab" && value.accountId)) throw new Error("Qwen işlem alanları geçersiz.");
    if (value.action === "switch-tab" && !tabs.some((t) => t.accountId === value.accountId)) throw new Error("Qwen yalnız bu görevin bağlı hesaplarına geçebilir.");
    return Object.fromEntries(keys.map((k) => [k, value[k]]));
  }
  return { version, maxSteps, lifetime, safeURL, norm, clickable, decision, sideEffectLabel };
})([{"id":"meta","name":"Meta · Facebook, Instagram, Threads","platforms":["facebook","instagram","threads"],"home":"https://adsmanager.facebook.com/adsmanager/","hosts":["adsmanager.facebook.com","business.facebook.com","www.facebook.com"],"paths":["/adsmanager","/latest/ads"],"guide":"https://www.facebook.com/business/ads"},{"id":"google","name":"Google · Arama ve YouTube","platforms":["youtube"],"home":"https://ads.google.com/aw/overview","hosts":["ads.google.com"],"paths":["/"],"guide":"https://support.google.com/google-ads/answer/6325025"},{"id":"tiktok","name":"TikTok Ads","platforms":["tiktok"],"home":"https://ads.tiktok.com/i18n/home/","hosts":["ads.tiktok.com"],"paths":["/"],"guide":"https://ads.tiktok.com/help/article/get-started-with-tiktok-ads-manager"},{"id":"pinterest","name":"Pinterest Ads","platforms":["pinterest"],"home":"https://ads.pinterest.com/","hosts":["ads.pinterest.com"],"paths":["/"],"guide":"https://help.pinterest.com/en/business/article/create-an-ad"},{"id":"linkedin","name":"LinkedIn Campaign Manager","platforms":["linkedin"],"home":"https://www.linkedin.com/campaignmanager/","hosts":["www.linkedin.com"],"paths":["/campaignmanager"],"guide":"https://www.linkedin.com/help/lms/answer/a427007"},{"id":"x","name":"X Ads","platforms":["x"],"home":"https://ads.x.com/","hosts":["ads.x.com","ads.twitter.com"],"paths":["/"],"guide":"https://business.x.com/en/advertising"},{"id":"tumblr","name":"Tumblr Blaze","platforms":["tumblr"],"home":"https://www.tumblr.com/blaze","hosts":["www.tumblr.com","tumblr.com"],"paths":["/blaze"],"guide":"https://help.tumblr.com/blaze/"}]);
