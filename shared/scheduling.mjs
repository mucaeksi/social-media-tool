export function zonedTime(value, timeZone = "Asia/Famagusta") {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Geçerli tarih ve saat seçin.");
  const guess = Date.parse(value + ":00Z");
  if (!Number.isFinite(guess)) throw new Error("Tarih geçersiz.");
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const at = guess - offset * 60000;
    const p = Object.fromEntries(
      fmt.formatToParts(at).map((p) => [p.type, p.value]),
    );
    if (`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value)
      matches.push(at);
  }
  if (matches.length !== 1)
    throw new Error(
      "Bu saat yaz/kış saati geçişinde belirsiz veya geçersiz. Başka bir saat seçin.",
    );
  return new Date(matches[0]).toISOString();
}
export function publicationURL(value, platform) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    if (platform !== "facebook" || !/(^|\.)facebook\.com$/.test(u.hostname))
      return null;
    if (
      !/\/(?:[^/]+\/posts\/[^/]+|permalink\.php|photo(?:\.php)?)(?:\/|$)/.test(
        u.pathname,
      )
    )
      return null;
    const safe = new URL(u.origin + u.pathname);
    for (const k of ["id", "story_fbid", "fbid"])
      if (u.searchParams.has(k))
        safe.searchParams.set(k, u.searchParams.get(k));
    return safe.href;
  } catch {
    return null;
  }
}
export function publicationBelongsTo(value, profileUrl) {
  try {
    const u = new URL(value),
      p = new URL(profileUrl),
      path = p.pathname.replace(/\/$/, "");
    if (u.hostname.replace(/^www\./, "") !== p.hostname.replace(/^www\./, ""))
      return false;
    const id = p.searchParams.get("id");
    if (id)
      return (
        u.searchParams.get("id") === id ||
        u.pathname.startsWith(`/${id}/posts/`)
      );
    return path !== "" && u.pathname.startsWith(path + "/posts/");
  } catch {
    return false;
  }
}
