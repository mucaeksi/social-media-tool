// Shared allowlist. Never accept JavaScript, shell commands, filesystem paths or raw CDP.
export const COMPUTER_LIMITS = Object.freeze({
  dailyCommands: 20000,
  messageBytes: 900000,
  frameChars: 800000,
  leaseMs: 900000,
});
export const COMPUTER_KEYS = [
  "Tab",
  "Shift+Tab",
  "Enter",
  "Backspace",
  "Delete",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "SelectAll",
];
export function computerError(status, message) {
  return Object.assign(new Error(message), { status, public: true });
}
export function computerCommand(value) {
  if (
    !value ||
    ![
      "open",
      "workspace",
      "screen",
      "click",
      "type",
      "key",
      "scroll",
      "login",
      "profile",
      "close",
      "read",
      "navigate",
      "back",
      "forward",
      "reload",
      "tabs",
      "tab",
      "fill",
      "activate",
      "upload",
      "prepare",
      "publish",
    ].includes(value.action)
  )
    throw computerError(400, "Geçersiz bilgisayar işlemi.");
  const result = { action: value.action };
  if (value.noFrame === true) result.noFrame = true;
  if (value.action === "navigate") {
    if (typeof value.url !== "string" || value.url.length > 2048)
      throw computerError(400, "Adres geçersiz.");
    result.url = value.url;
  }
  if (value.action === "tab") {
    if (!Number.isInteger(value.index) || value.index < 0 || value.index > 9)
      throw computerError(400, "Sekme geçersiz.");
    result.index = value.index;
  }
  if (["fill", "activate", "upload"].includes(value.action)) {
    for (const key of ["snapshotId", "elementId"]) {
      if (
        typeof value[key] !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(value[key])
      )
        throw computerError(400, "Önce sayfayı yeniden okuyun.");
      result[key] = value[key];
    }
  }
  if (["fill", "prepare"].includes(value.action)) {
    if (
      typeof value.text !== "string" ||
      !value.text.trim() ||
      value.text.length > 10000
    )
      throw computerError(400, "Metin en fazla 10.000 karakter olmalı.");
    result.text = value.text;
  }
  if (["prepare", "publish"].includes(value.action)) {
    if (
      typeof value.jobId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(value.jobId) ||
      !/^[a-f0-9]{64}$/.test(value.fingerprint || "")
    )
      throw computerError(400, "Yayın işi doğrulanamadı.");
    result.jobId = value.jobId;
    result.fingerprint = value.fingerprint;
    if (
      typeof value.identityLabel !== "string" ||
      !value.identityLabel.trim() ||
      value.identityLabel.length > 100
    )
      throw computerError(400, "Hedef hesap adı gerekli.");
    result.identityLabel = value.identityLabel;
  }
  if (["upload", "prepare"].includes(value.action)) {
    if (value.mediaId !== undefined) {
      if (
        typeof value.mediaId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(value.mediaId)
      )
        throw computerError(400, "Görsel kimliği geçersiz.");
      result.mediaId = value.mediaId;
    }
    if (value.media !== undefined) {
      if (
        typeof value.media !== "string" ||
        value.media.length > 800000 ||
        !/^[A-Za-z0-9+/]+=*$/.test(value.media)
      )
        throw computerError(400, "Görsel aktarım sınırı aşıldı.");
      result.media = value.media;
    }
  }
  if (value.action === "click") {
    if (
      ![value.x, value.y].every((n) => Number.isInteger(n) && n >= 0) ||
      value.x >= 1280 ||
      value.y >= 800
    )
      throw computerError(400, "Ekran konumu geçersiz.");
    result.x = value.x;
    result.y = value.y;
  }
  if (value.action === "type") {
    if (
      typeof value.text !== "string" ||
      !value.text.length ||
      value.text.length > 10000
    )
      throw computerError(400, "Metin en fazla 10.000 karakter olmalıdır.");
    result.text = value.text;
  }
  if (value.action === "key") {
    if (!COMPUTER_KEYS.includes(value.key))
      throw computerError(400, "Bu tuş desteklenmiyor.");
    result.key = value.key;
  }
  if (value.action === "scroll") {
    if (!Number.isInteger(value.deltaY) || Math.abs(value.deltaY) > 1600)
      throw computerError(400, "Kaydırma miktarı geçersiz.");
    result.deltaY = value.deltaY;
  }
  return result;
}
export function validComputerResult(value) {
  if (value?.page) {
    const p = value.page;
    if (
      typeof p.id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(p.id) ||
      typeof p.url !== "string" ||
      p.url.length > 2048 ||
      typeof p.title !== "string" ||
      p.title.length > 200 ||
      typeof p.text !== "string" ||
      p.text.length > 6000 ||
      !Array.isArray(p.elements) ||
      p.elements.length > 40 ||
      p.elements.some(
        (e) =>
          !e ||
          typeof e.id !== "string" ||
          !/^[a-f0-9-]{36}$/i.test(e.id) ||
          !["field", "file", "button", "link"].includes(e.kind) ||
          typeof e.label !== "string" ||
          e.label.length > 100,
      )
    )
      return false;
  }
  if (
    value?.tabs &&
    (!Array.isArray(value.tabs) ||
      value.tabs.length > 10 ||
      value.tabs.some(
        (t) =>
          !Number.isInteger(t.index) ||
          t.index < 0 ||
          t.index > 9 ||
          typeof t.title !== "string" ||
          t.title.length > 100 ||
          typeof t.selected !== "boolean",
      ))
  )
    return false;
  if (
    value?.publication &&
    (!["ready", "verified", "unknown"].includes(value.publication.state) ||
      typeof value.publication.jobId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(value.publication.jobId))
  )
    return false;
  return (
    value &&
    typeof value === "object" &&
    value.loginVerified === false &&
    (value.closed === true ||
      value.noFrame === true ||
      (typeof value.frame === "string" &&
        value.frame.length <= COMPUTER_LIMITS.frameChars &&
        /^[A-Za-z0-9+/]+=*$/.test(value.frame)))
  );
}
