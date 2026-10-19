import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Small, deterministic, uncompressed ZIP of an explicit public-source allowlist.
// Device credentials and user profiles are never read by this build.
const files = [
  "companion/package.json",
  "companion/package-lock.json",
  "companion/start.mjs",
  "companion/browser.mjs",
  "companion/Kur-ve-Baslat.cmd",
  "companion/Baslat.cmd",
  "shared/computer-protocol.mjs",
  "worker/browser-state.mjs",
  "docs/SIRKET_BILGISAYARI.md",
];
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const parts = [],
  central = [];
let offset = 0;
for (const path of files) {
  const name = Buffer.from(`SosyalStudio-Bilgisayar/${path}`),
    bytes = await readFile(path),
    crc = crc32(bytes);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(bytes.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  parts.push(header, name, bytes);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50);
  dir.writeUInt16LE(20, 4);
  dir.writeUInt16LE(20, 6);
  dir.writeUInt16LE(0x800, 8);
  dir.writeUInt16LE(33, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(bytes.length, 20);
  dir.writeUInt32LE(bytes.length, 24);
  dir.writeUInt16LE(name.length, 28);
  dir.writeUInt32LE(offset, 42);
  central.push(dir, name);
  offset += header.length + name.length + bytes.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...parts, directory, end]);
await mkdir("dist/indir", { recursive: true });
await writeFile("dist/indir/sosyal-studio-bilgisayar.zip", zip);
await writeFile(
  "dist/indir/sosyal-studio-bilgisayar.sha256",
  `${createHash("sha256").update(zip).digest("hex")}  sosyal-studio-bilgisayar.zip\n`,
);
console.log("Windows Firefox yardımcısı kaynak paketi hazırlandı.");
