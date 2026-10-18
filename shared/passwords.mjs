export const PASSWORD_ITERATIONS = 100_000;
const encode = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
const decode = (value) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
export function validPasswordHash(value) {
  return (
    typeof value === "string" &&
    /^pbkdf2-sha256\$100000\$[A-Za-z0-9_-]{43}\$[A-Za-z0-9_-]{43}$/.test(value)
  );
}
async function derive(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: PASSWORD_ITERATIONS,
        salt,
      },
      key,
      256,
    ),
  );
}
export async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 256
  )
    throw new Error("Şifre 10–256 karakter olmalı.");
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${encode(salt)}$${encode(await derive(password, salt))}`;
}
export async function verifyPassword(password, hash) {
  const valid = validPasswordHash(hash);
  const parts = valid ? hash.split("$") : null;
  const salt = parts ? decode(parts[2]) : new Uint8Array(32);
  const expected = parts ? decode(parts[3]) : new Uint8Array(32);
  const actual = await derive(password, salt);
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual[i] ^ expected[i];
  return valid && mismatch === 0;
}
export async function tokenDigest(value) {
  return encode(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}
export function randomToken() {
  return encode(crypto.getRandomValues(new Uint8Array(32)));
}
