import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, sha256 } from "../companion/release.mjs";
import { tabPublishingExtensionSource } from "../shared/tab-publishing.mjs";
import { advertisingExtensionSource } from "../shared/advertising.mjs";
import { firefoxAgentExtensionSource } from "../shared/firefox-agent.mjs";

export const extensionFiles = [
  "manifest.json",
  "managed.js",
  "advertising.js",
  "publication-policy.js",
  "publisher.js",
  "policy.js",
  "background.js",
  "panel-bridge.js",
  "page-agent.js",
  "agent-policy.js",
  "agent-background.js",
  "browser-agent.js",
  "popup.html",
  "popup.css",
  "popup.js",
];
export async function buildFirefoxExtension(destination = "dist/indir") {
  if (await readFile(new URL("../firefox-extension/agent-policy.js", import.meta.url), "utf8") !== firefoxAgentExtensionSource())
    throw new Error("Firefox görev politikası eşleşmiyor.");
  if (
    (await readFile(
      new URL("../firefox-extension/advertising.js", import.meta.url),
      "utf8",
    )) !== advertisingExtensionSource()
  )
    throw new Error("Reklam kataloğu eşleşmiyor.");
  if (
    (await readFile(
      new URL("../firefox-extension/publication-policy.js", import.meta.url),
      "utf8",
    )) !== tabPublishingExtensionSource()
  )
    throw new Error("Yayın kataloğu eşleşmiyor.");
  const parts = [],
    central = [];
  let offset = 0;
  for (const file of extensionFiles) {
    const name = Buffer.from(file),
      bytes = await readFile(
        new URL(`../firefox-extension/${file}`, import.meta.url),
      ),
      crc = crc32(bytes);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x800, 6);
    h.writeUInt16LE(33, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(bytes.length, 18);
    h.writeUInt32LE(bytes.length, 22);
    h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x800, 8);
    c.writeUInt16LE(33, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(bytes.length, 20);
    c.writeUInt32LE(bytes.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    parts.push(h, name, bytes);
    central.push(c, name);
    offset += h.length + name.length + bytes.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(extensionFiles.length, 8);
  end.writeUInt16LE(extensionFiles.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...parts, directory, end]);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "sosyal-studio-firefox.zip"), zip);
  const manifest = JSON.parse(
    await readFile(
      new URL("../firefox-extension/manifest.json", import.meta.url),
    ),
  );
  await writeFile(
    join(destination, "sosyal-studio-firefox.json"),
    JSON.stringify({
      version: manifest.version,
      signed: false,
      archive: "/indir/sosyal-studio-firefox.zip",
      sha256: sha256(zip),
      bytes: zip.length,
    }),
  );
  await writeFile(
    join(destination, "FIREFOX_EKLENTISI.md"),
    await readFile(new URL("../docs/FIREFOX_EKLENTISI.md", import.meta.url)),
  );
  await writeFile(join(destination, "FIREFOX_QWEN_1_11.md"),
    await readFile(new URL("../docs/FIREFOX_QWEN_1_11.md", import.meta.url)));
  await writeFile(join(destination, "FIREFOX_QWEN_1_12.md"),
    await readFile(new URL("../docs/FIREFOX_QWEN_1_12.md", import.meta.url)));
  await writeFile(join(destination, "OTOMATIK_YAYIN.md"),
    await readFile(new URL("../docs/OTOMATIK_YAYIN.md", import.meta.url)));
  return { bytes: zip.length, sha256: sha256(zip) };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await buildFirefoxExtension();
  console.log(
    "Firefox eklentisi kaynak paketi hazırlandı (Mozilla imzası bekliyor).",
  );
}
