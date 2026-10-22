const encoder = new TextEncoder(),
  decoder = new TextDecoder();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}
const safePath = (name) =>
  typeof name === "string" &&
  name.length < 250 &&
  !name.startsWith("/") &&
  !name.includes("\\") &&
  !name.split("/").some((p) => !p || p === "." || p === "..") &&
  !/[\x00-\x1f]/.test(name);
export function createZip(entries) {
  if (entries.length > 1000) throw new Error("Paket dosya sınırı aşıldı.");
  const parts = [],
    directory = [];
  let offset = 0;
  for (const entry of entries) {
    if (!safePath(entry.name)) throw new Error("Paket yolu geçersiz.");
    const name = encoder.encode(entry.name),
      bytes =
        typeof entry.bytes === "string"
          ? encoder.encode(entry.bytes)
          : entry.bytes,
      crc = crc32(bytes),
      head = new Uint8Array(30),
      h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, name.length, true);
    parts.push(head, name, bytes);
    const dir = new Uint8Array(46),
      d = new DataView(dir.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x800, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, bytes.length, true);
    d.setUint32(24, bytes.length, true);
    d.setUint16(28, name.length, true);
    d.setUint32(42, offset, true);
    directory.push(dir, name);
    offset += 30 + name.length + bytes.length;
  }
  const dirs = concat(directory),
    end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, dirs.length, true);
  e.setUint32(16, offset, true);
  return concat([...parts, dirs, end]);
}
export function readZip(bytes) {
  if (bytes.length > 24 * 1024 * 1024 || bytes.length < 22)
    throw new Error("Yedek parçası en fazla 24 MB olabilir.");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    entries = [],
    seen = new Set();
  let pos = 0;
  while (pos + 30 <= bytes.length && v.getUint32(pos, true) === 0x04034b50) {
    const flags = v.getUint16(pos + 6, true),
      method = v.getUint16(pos + 8, true),
      crc = v.getUint32(pos + 14, true),
      size = v.getUint32(pos + 18, true),
      raw = v.getUint32(pos + 22, true),
      n = v.getUint16(pos + 26, true),
      extra = v.getUint16(pos + 28, true),
      start = pos + 30 + n + extra,
      name = decoder.decode(bytes.subarray(pos + 30, pos + 30 + n));
    if (
      !safePath(name) ||
      seen.has(name) ||
      method !== 0 ||
      (flags & ~0x800) !== 0 ||
      size !== raw ||
      start + size > bytes.length ||
      size > 8 * 1024 * 1024 ||
      entries.length >= 1000
    )
      throw new Error(
        "Yedek dosyası geçersiz veya desteklenmeyen ZIP biçiminde.",
      );
    const content = bytes.subarray(start, start + size);
    if (crc32(content) !== crc)
      throw new Error("Yedek dosyası bütünlük denetiminden geçmedi.");
    seen.add(name);
    entries.push({ name, bytes: content });
    pos = start + size;
  }
  if (
    !entries.length ||
    v.getUint32(pos, true) !== 0x02014b50 ||
    v.getUint32(bytes.length - 22, true) !== 0x06054b50
  )
    throw new Error("Sosyal Studio yedek ZIP'i gerekli.");
  return entries;
}
