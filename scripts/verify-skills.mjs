import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = await realpath(new URL("..", import.meta.url).pathname);
const manifest = JSON.parse(
  await readFile(path.join(root, "skills-lock.json"), "utf8"),
);
let total = 0;
for (const source of manifest.sources) {
  const base = path.resolve(root, source.path);
  if (!base.startsWith(`${root}${path.sep}`))
    throw new Error("Geçersiz beceri dizini.");
  for (const [name, expected] of Object.entries(source.files)) {
    const file = await realpath(path.resolve(base, name));
    if (!file.startsWith(`${base}${path.sep}`))
      throw new Error("Beceri dosyası kendi dizininin dışında.");
    const hash = createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
    if (hash !== expected)
      throw new Error(`Beceri dosyası değişmiş: ${source.name}/${name}`);
    total++;
  }
  console.log(`Doğrulandı: ${source.name} (${source.commit.slice(0, 12)})`);
}
console.log(
  `${manifest.sources.length} beceri/ajan kaynağı, ${total} dosya: SHA-256 doğrulaması başarılı.`,
);
