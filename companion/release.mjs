import { createHash } from "node:crypto";

export const releaseFiles = [
  "companion/package.json",
  "companion/package-lock.json",
  "companion/start.mjs",
  "companion/browser.mjs",
  "companion/normal-firefox.mjs",
  "companion/browser-tools.mjs",
  "companion/facebook-publisher.mjs",
  "companion/locations.mjs",
  "companion/local-ai.mjs",
  "companion/ai-install.mjs",
  "companion/ollama-host.mjs",
  "companion/local-memory.mjs",
  "companion/install-bundle.mjs",
  "companion/research.mjs",
  "companion/launch.mjs",
  "companion/supervisor.mjs",
  "companion/updater.mjs",
  "companion/release.mjs",
  "companion/Kur-ve-Baslat.cmd",
  "companion/Baslat.cmd",
  "shared/computer-protocol.mjs",
  "shared/local-ai.mjs",
  "shared/social-expert.mjs",
  "shared/regional-expert.mjs",
  "shared/research-protocol.mjs",
  "shared/scheduling.mjs",
  "worker/browser-state.mjs",
  "docs/SIRKET_BILGISAYARI.md",
];
export const archiveFiles = [...releaseFiles, "companion/release.json"];
export const archivePath = "/indir/sosyal-studio-bilgisayar.zip";
export const manifestPath = "/indir/sosyal-studio-bilgisayar.json";
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const validVersion = (v) =>
  typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
export function sourceVersion(files) {
  return sha256(
    Buffer.concat(
      [...files.keys()]
        .filter((p) => p !== "companion/release.json")
        .flatMap((p) => [
          Buffer.from(`${p}\0${files.get(p).length}\0`),
          files.get(p),
        ]),
    ),
  );
}
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Only our small, deterministic stored ZIP format is accepted. No shell/unzip,
// symlinks, optional paths, compressed bombs, duplicates or trailing payloads.
export function extractRelease(zip, version) {
  if (zip.length < 22) throw new Error("Paket eksik.");
  const count = zip.readUInt16LE(zip.length - 12);
  if (count < archiveFiles.length || count > 64)
    throw new Error("Paket dosya sayısı geçersiz.");
  const files = new Map();
  let offset = 0;
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (offset + 30 > zip.length || zip.readUInt32LE(offset) !== 0x04034b50)
      throw new Error("Paket dosya başlığı geçersiz.");
    const h = zip.subarray(offset, offset + 30),
      size = h.readUInt32LE(18),
      nameSize = h.readUInt16LE(26),
      start = offset + 30 + nameSize,
      name = zip.subarray(offset + 30, start),
      fullPath = name.toString("utf8"),
      path = fullPath.slice("SosyalStudio-Bilgisayar/".length);
    if (
      !fullPath.startsWith("SosyalStudio-Bilgisayar/") ||
      !/^(companion\/[A-Za-z][A-Za-z0-9-]*\.(mjs|json|cmd)|shared\/[A-Za-z][A-Za-z0-9-]*\.mjs|worker\/[A-Za-z][A-Za-z0-9-]*\.mjs|docs\/SIRKET_BILGISAYARI\.md)$/.test(
        path,
      ) ||
      files.has(path)
    )
      throw new Error("Paket dosya yolu geçersiz.");
    if (
      h.readUInt16LE(6) !== 0x800 ||
      h.readUInt16LE(8) !== 0 ||
      h.readUInt16LE(28) !== 0 ||
      size !== h.readUInt32LE(22) ||
      size > 2_000_000 ||
      nameSize !== name.length ||
      !zip.subarray(offset + 30, start).equals(name) ||
      start + size > zip.length
    )
      throw new Error("Paket dosya yolu veya boyutu geçersiz.");
    const bytes = zip.subarray(start, start + size);
    if (crc32(bytes) !== h.readUInt32LE(14))
      throw new Error("Paket dosyası hasarlı.");
    files.set(path, bytes);
    entries.push({ offset, name, size, crc: h.readUInt32LE(14) });
    offset = start + size;
  }
  const centralStart = offset;
  for (const entry of entries) {
    if (offset + 46 > zip.length || zip.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("Paket dizini geçersiz.");
    const h = zip.subarray(offset, offset + 46);
    if (
      h.readUInt16LE(8) !== 0x800 ||
      h.readUInt16LE(10) !== 0 ||
      h.readUInt32LE(16) !== entry.crc ||
      h.readUInt32LE(20) !== entry.size ||
      h.readUInt32LE(24) !== entry.size ||
      h.readUInt16LE(28) !== entry.name.length ||
      h.readUInt16LE(30) !== 0 ||
      h.readUInt16LE(32) !== 0 ||
      h.readUInt16LE(34) !== 0 ||
      h.readUInt32LE(38) !== 0 ||
      h.readUInt32LE(42) !== entry.offset ||
      !zip
        .subarray(offset + 46, offset + 46 + entry.name.length)
        .equals(entry.name)
    )
      throw new Error("Paket dizini dosyayla eşleşmiyor.");
    offset += 46 + entry.name.length;
  }
  if (
    offset + 22 !== zip.length ||
    zip.readUInt32LE(offset) !== 0x06054b50 ||
    zip.readUInt16LE(offset + 4) !== 0 ||
    zip.readUInt16LE(offset + 6) !== 0 ||
    zip.readUInt16LE(offset + 8) !== count ||
    zip.readUInt16LE(offset + 10) !== count ||
    zip.readUInt32LE(offset + 12) !== offset - centralStart ||
    zip.readUInt32LE(offset + 16) !== centralStart ||
    zip.readUInt16LE(offset + 20) !== 0
  )
    throw new Error("Paket sonu geçersiz.");
  if (!archiveFiles.every((path) => files.has(path)))
    throw new Error("Paket dosyası eksik.");
  const release = JSON.parse(files.get("companion/release.json"));
  if (
    !validVersion(version) ||
    release.protocol !== 1 ||
    release.version !== version ||
    sourceVersion(files) !== version
  )
    throw new Error("Paket sürümü doğrulanamadı.");
  return files;
}
