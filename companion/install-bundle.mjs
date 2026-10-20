import { readFile, mkdir, writeFile, rename, access, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { archiveFiles, sourceVersion, validVersion } from "./release.mjs";

export async function installBundle(source, directory) {
  const files = new Map(await Promise.all(archiveFiles.map(async (path) => [path, await readFile(join(source, path))])));
  const release = JSON.parse(files.get("companion/release.json"));
  if (release.protocol !== 1 || !validVersion(release.version) || sourceVersion(files) !== release.version)
    throw new Error("Kurulum dosyaları doğrulanamadı.");
  const destination = join(directory, "apps", release.version);
  try {
    if (await readFile(join(destination, ".installed"), "utf8") === release.version) {
      await access(join(destination, "companion/supervisor.mjs"));
      return destination;
    }
  } catch {}
  const stage = join(directory, "apps", `.install-${randomUUID()}`);
  try {
    for (const [path, bytes] of files) {
      const output = join(stage, path);
      await mkdir(dirname(output), { recursive: true, mode: 0o700 });
      await writeFile(output, bytes, { mode: 0o600 });
    }
    await writeFile(join(stage, ".installed"), release.version);
    await rm(destination, { recursive: true, force: true });
    await rename(stage, destination);
    return destination;
  } finally { await rm(stage, { recursive: true, force: true }); }
}
