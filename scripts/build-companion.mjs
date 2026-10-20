import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extensionFiles } from "./build-firefox-extension.mjs";

// Keep the old helper's strict ZIP path format: the new extension sources are
// data inside a companion JSON file, not new executable archive path types.
const extensionSources = Object.fromEntries(await Promise.all(extensionFiles.map(async (file) => [file, await readFile(`firefox-extension/${file}`, "utf8")])));
await writeFile("companion/extension-sources.json", JSON.stringify({ format: 1, files: extensionSources }));

// Small, deterministic, uncompressed ZIP of an explicit public-source allowlist.
// Device credentials and user profiles are never read by this build.
import {
  releaseFiles,
  archiveFiles,
  crc32,
  sha256,
  sourceVersion,
  archivePath,
  manifestPath,
} from "../companion/release.mjs";
const contents = new Map(
  await Promise.all(
    releaseFiles.map(async (path) => {
      const bytes = await readFile(path);
      // Linux builds must ship the same Windows batch bytes as Windows builds.
      // Normalize before hashing so the updater verifies the packaged bytes.
      return [
        path,
        path.endsWith(".cmd")
          ? Buffer.from(bytes.toString("utf8").replace(/\r\n|\r|\n/g, "\r\n"))
          : bytes,
      ];
    }),
  ),
);
const version = sourceVersion(contents);
contents.set(
  "companion/release.json",
  Buffer.from(JSON.stringify({ protocol: 1, version })),
);
const files = archiveFiles;
const parts = [],
  central = [];
let offset = 0;
for (const path of files) {
  const name = Buffer.from(`SosyalStudio-Bilgisayar/${path}`),
    bytes = contents.get(path),
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
  `${sha256(zip)}  sosyal-studio-bilgisayar.zip\n`,
);
await writeFile(
  `dist${manifestPath}`,
  JSON.stringify({
    protocol: 1,
    version,
    archive: archivePath,
    sha256: sha256(zip),
    bytes: zip.length,
    nodeMajor: 24,
  }),
);
console.log("Windows Firefox yardımcısı kaynak paketi hazırlandı.");
