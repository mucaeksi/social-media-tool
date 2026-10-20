import { access, mkdir, readFile, writeFile, rename, readdir, lstat, copyFile, link, rm } from "node:fs/promises";
import { join, resolve, relative, sep, isAbsolute } from "node:path";
import { constants } from "node:fs";

const names = ["device.json", "local-ai-model.json", "profiles", "ai"];
const exists = async (path) => { try { await access(path); return true; } catch (e) { if (e.code === "ENOENT") return false; throw e; } };
async function copyTree(source, destination, profile = false) {
  const entry = await lstat(source);
  if (profile && ["lock", ".parentlock", "parent.lock"].includes(source.split(sep).at(-1))) return;
  if (entry.isSymbolicLink()) throw new Error("Veri bağlantısı otomatik aktarılamadı.");
  if (entry.isDirectory()) {
    await mkdir(destination, { recursive: true, mode: 0o700 });
    for (const name of await readdir(source)) await copyTree(join(source, name), join(destination, name), profile);
  } else {
    // Immutable, content-addressed model blobs can share storage on one disk.
    // Mutable SQLite/Firefox/device files always get independent copies.
    if (source.includes(`${sep}ai${sep}models${sep}blobs${sep}`) && /^sha256-[a-f0-9]{64}$/.test(source.split(sep).at(-1))) {
      try { await link(source, destination); return; } catch {}
    }
    await copyFile(source, destination, constants.COPYFILE_FICLONE);
  }
}

export async function migratePortableData(source, destination) {
  source = resolve(source); destination = resolve(destination);
  if (source === destination) return;
  const inside = relative(source, destination);
  if (inside && !isAbsolute(inside) && !inside.startsWith(`..${sep}`) && inside !== "..")
    throw new Error("Yeni kurulum eski veri klasörünün içine yerleştirilemez.");
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const journal = join(destination, ".portable-migration.json"), stage = join(destination, ".legacy-import");
  let state;
  try { state = JSON.parse(await readFile(journal, "utf8")); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  if (state?.state === "complete" || state?.state === "local") return;
  const record = async (value) => {
    await writeFile(`${journal}.tmp`, JSON.stringify(value), { mode: 0o600 });
    await rename(`${journal}.tmp`, journal);
  };
  if (state && (state.source !== source || !["copying", "committing"].includes(state.state)))
    throw new Error("Önceki veri aktarımı kontrol edilmeli.");
  if (!state || state.state === "copying") {
    if ((await Promise.all(names.map((name) => exists(join(destination, name))))).some(Boolean)) {
      await record({ state: "local" });
      return; // Never mix a second installation's keys, database or profiles.
    }
    const present = [];
    for (const name of names) if (await exists(join(source, name))) present.push(name);
    await record({ source, names: present, state: "copying" });
    await rm(stage, { recursive: true, force: true });
    try {
      for (const name of present) {
        await mkdir(stage, { recursive: true, mode: 0o700 });
        await copyTree(join(source, name), join(stage, name), name === "profiles");
      }
    } catch {
      await rm(stage, { recursive: true, force: true }).catch(() => {});
      throw Object.assign(new Error("Eski veriler aktarılamadı. Eski yardımcıyı ve Firefox pencerelerini kapatıp tekrar deneyin; eski veriler korundu."), { public: true });
    }
    state = { source, names: present, state: "committing" };
    await record(state);
  }
  if (!Array.isArray(state.names) || state.names.some((name) => !names.includes(name)))
    throw new Error("Veri aktarım kaydı geçersiz.");
  for (const name of state.names) {
    if (await exists(join(stage, name))) {
      if (await exists(join(destination, name))) throw new Error("Mevcut verilerin üzerine yazılmaz.");
      await rename(join(stage, name), join(destination, name));
    } else if (!await exists(join(destination, name))) throw new Error("Veri aktarımı eksik.");
  }
  await record({ source, state: "complete" });
  await rm(stage, { recursive: true, force: true });
}
