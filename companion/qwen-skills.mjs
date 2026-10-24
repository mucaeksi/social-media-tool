import { createHash, randomUUID } from "node:crypto";
import { mkdir, lstat, realpath, open, readdir, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { QWEN_SKILLS_VERSION, QWEN_SKILLS_PROTOCOL, QWEN_SKILLS_PROMPT_BYTES, QWEN_SKILLS_LICENSE,
  qwenSkills, qwenSkillFile, selectQwenSkills } from "../shared/qwen-skills.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const fail = () => { throw Object.assign(new Error("Qwen beceri dosyaları doğrulanamadı. Beceri paketini onarın."), { code: "SKILLS_INVALID" }); };
const files = Object.fromEntries([...qwenSkills.map((s) => [`${s.id}/SKILL.md`, qwenSkillFile(s)]), ["LICENSE", QWEN_SKILLS_LICENSE]]);
const entries = Object.fromEntries(Object.entries(files).map(([name, text]) => [name, hash(text)]));
const manifest = JSON.stringify({ protocol: QWEN_SKILLS_PROTOCOL, version: QWEN_SKILLS_VERSION, files: entries });
export const qwenSkillsDigest = hash(manifest);
export class QwenSkills {
  constructor(directory) { this.directory = directory; this.queue = Promise.resolve(); this.lastUse = null; }
  serial(fn) { const next = this.queue.then(fn); this.queue = next.catch(() => {}); return next; }
  async folder(path, create = false) {
    if (create) { try { await mkdir(path, { mode: 0o700 }); } catch (e) { if (e.code !== "EEXIST") throw e; } }
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isDirectory()) fail();
    return realpath(path);
  }
  async roots() {
    const base = await this.folder(this.directory, true);
    const ai = await this.folder(join(base, "ai"), true);
    const root = await this.folder(join(ai, "skills"), true);
    const packs = await this.folder(join(root, "packs"), true);
    return { root, packs };
  }
  async read(path, limit = 5000) {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isFile() || info.size > limit) fail();
    const f = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
      const meta = await f.stat(); if (!meta.isFile() || meta.size > limit) fail();
      const bytes = Buffer.alloc(limit + 1); const { bytesRead } = await f.read(bytes, 0, bytes.length, 0);
      if (bytesRead > limit) fail(); return bytes.subarray(0, bytesRead).toString("utf8");
    } finally { await f.close(); }
  }
  async verify(path) {
    await this.folder(path);
    if (await this.read(join(path, "manifest.json"), 6000) !== manifest) fail();
    const loaded = {};
    for (const [name, expected] of Object.entries(entries)) {
      const [parent] = name.split("/");
      if (name.includes("/")) await this.folder(join(path, parent));
      const content = await this.read(join(path, name));
      if (hash(content) !== expected) fail(); loaded[name] = content;
    }
    return loaded;
  }
  async write(path, text) {
    const f = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try { await f.writeFile(text, "utf8"); await f.sync(); } finally { await f.close(); }
  }
  async managed(path) {
    try {
      await this.folder(path);
      if (await this.read(join(path, "manifest.json"), 6000) !== manifest) return false;
      const expected = ["manifest.json", "LICENSE", ...qwenSkills.map((s) => s.id)].sort();
      if (JSON.stringify((await readdir(path)).sort()) !== JSON.stringify(expected)) return false;
      for (const skill of qwenSkills) {
        const folder = join(path, skill.id); await this.folder(folder);
        if (JSON.stringify(await readdir(folder)) !== '["SKILL.md"]') return false;
        await this.read(join(folder, "SKILL.md"));
      }
      return await this.read(join(path, "LICENSE")) === QWEN_SKILLS_LICENSE;
    } catch { return false; }
  }
  async install({ root, packs }) {
    const id = randomUUID(), path = join(packs, id), pointer = join(root, `.active-${id}.json`);
    await this.folder(path, true);
    try {
      for (const [name, text] of Object.entries(files)) {
        if (name.includes("/")) await this.folder(join(path, name.split("/")[0]), true);
        await this.write(join(path, name), text);
      }
      await this.write(join(path, "manifest.json"), manifest);
      await this.verify(path);
      await this.write(pointer, JSON.stringify({ version: QWEN_SKILLS_VERSION, id }));
      try { const current = await lstat(join(root, "active.json")); if (current.isSymbolicLink() || !current.isFile()) fail(); }
      catch (e) { if (e.code !== "ENOENT") throw e; }
      await rename(pointer, join(root, "active.json"));
    } catch (e) {
      await rm(pointer, { force: true }).catch(() => {});
      await rm(path, { recursive: true, force: true }).catch(() => {}); throw e;
    }
    // Keep at most two managed snapshots; never remove unknown user folders.
    const old = [];
    for (const name of await readdir(packs)) if (name !== id && /^[a-f0-9-]{36}$/.test(name)) {
      const info = await lstat(join(packs, name));
      if (!info.isSymbolicLink() && info.isDirectory() && await this.managed(join(packs, name))) old.push({ name, time: info.mtimeMs });
    }
    old.sort((a, b) => b.time - a.time);
    for (const item of old.slice(1)) await rm(join(packs, item.name), { recursive: true, force: true });
  }
  async snapshot(repair = false) {
    try {
      const roots = await this.roots();
      if (repair) await this.install(roots);
      let pointer;
      try { pointer = JSON.parse(await this.read(join(roots.root, "active.json"), 200)); }
      catch (e) {
        if (e.code !== "ENOENT" || (await readdir(roots.packs)).length) throw e;
        await this.install(roots); pointer = JSON.parse(await this.read(join(roots.root, "active.json"), 200));
      }
      if (Object.keys(pointer).length !== 2 || pointer.version !== QWEN_SKILLS_VERSION || !/^[a-f0-9-]{36}$/.test(pointer.id)) fail();
      const loaded = await this.verify(join(roots.packs, pointer.id));
      return { loaded, info: { protocol: QWEN_SKILLS_PROTOCOL, version: QWEN_SKILLS_VERSION, state: "ready", checkedAt: new Date().toISOString(),
        digest: qwenSkillsDigest, skills: qwenSkills.map((s) => ({ id: s.id, title: s.title, sha256: entries[`${s.id}/SKILL.md`] })), lastUse: this.lastUse } };
    } catch { fail(); }
  }
  async status() {
    return this.serial(async () => {
      try { return (await this.snapshot()).info; }
      catch { return { protocol: QWEN_SKILLS_PROTOCOL, version: QWEN_SKILLS_VERSION, state: "invalid", checkedAt: new Date().toISOString(), digest: null, skills: [], lastUse: this.lastUse }; }
    });
  }
  async repair() { return this.serial(async () => (await this.snapshot(true)).info); }
  async prompt(task, options) {
    return this.serial(async () => {
      const { loaded } = await this.snapshot(); const ids = selectQwenSkills(task, options);
      const text = `DOĞRULANMIŞ QWEN BECERİLERİ · ${QWEN_SKILLS_VERSION}\n` + ids.map((id) => loaded[`${id}/SKILL.md`]).join("\n");
      if (Buffer.byteLength(text) > QWEN_SKILLS_PROMPT_BYTES) fail();
      return { text, task, ids, version: QWEN_SKILLS_VERSION, digest: qwenSkillsDigest };
    });
  }
  used(selection) { const { task, ids, version, digest } = selection; this.lastUse = { task, ids, version, digest, at: new Date().toISOString() }; }
}
