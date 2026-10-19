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
      "screen",
      "click",
      "type",
      "key",
      "scroll",
      "login",
      "profile",
      "close",
    ].includes(value.action)
  )
    throw computerError(400, "Geçersiz bilgisayar işlemi.");
  const result = { action: value.action };
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
  return (
    value &&
    typeof value === "object" &&
    value.loginVerified === false &&
    (value.closed === true ||
      (typeof value.frame === "string" &&
        value.frame.length <= COMPUTER_LIMITS.frameChars &&
        /^[A-Za-z0-9+/]+=*$/.test(value.frame)))
  );
}
