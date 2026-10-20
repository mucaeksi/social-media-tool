import { readFile, writeFile, mkdir, rename, rm, lstat } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";

const files = ["manifest.json", "managed.js", "policy.js", "background.js", "panel-bridge.js", "page-agent.js", "popup.html", "popup.css", "popup.js"];
export async function prepareFirefoxExtension(directory, { bundleURL = new URL("./extension-sources.json", import.meta.url), profile = false } = {}) {
  const bundle = JSON.parse(await readFile(bundleURL, "utf8"));
  if (bundle.format !== 1 || !bundle.files || Object.keys(bundle.files).length !== files.length || files.some((f) => typeof bundle.files[f] !== "string" || Buffer.byteLength(bundle.files[f]) > 100000)) throw new Error("Firefox eklenti paketi doğrulanamadı.");
  const manifest = JSON.parse(bundle.files["manifest.json"]);
  if (manifest.browser_specific_settings?.gecko?.id !== "firefox@sosyal-studio.local" || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Firefox eklenti bildirimi doğrulanamadı.");
  bundle.files["managed.js"] = "globalThis.StudioManagedInstallation = true;\n";
  const hash = createHash("sha256").update(JSON.stringify(bundle.files)).digest("hex");
  const target = profile ? join(directory, "FirefoxProfil", "extensions", "firefox@sosyal-studio.local") : join(directory, "FirefoxEklentisi"), manifestPath = join(target, "manifest.json");
  await mkdir(directory, { recursive: true });
  let exists = false;
  try {
    const info = await lstat(target); exists = true;
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Eklenti klasörü normal bir klasör olmalı.");
  } catch (e) { if (e.code !== "ENOENT") throw e; }
  try {
    const marker = JSON.parse(await readFile(join(target, ".sosyal-studio.json"), "utf8"));
    if (marker.hash === hash && await Promise.all(files.map(async (f) => {
      const path = join(target, f), info = await lstat(path);
      return info.isFile() && !info.isSymbolicLink() && await readFile(path, "utf8") === bundle.files[f];
    })).then((checks) => checks.every(Boolean))) return { changed: false, first: false, version: manifest.version, manifestPath };
  } catch { /* Missing/partial files are repaired from the verified helper bundle. */ }
  if (exists) {
    try { await readFile(join(target, ".sosyal-studio.json")); }
    catch { throw new Error("FirefoxEklentisi klasörü yardımcıya ait değil. Bu klasöre kişisel dosya koymayın."); }
  }
  const stage = join(directory, `.firefox-extension-${randomUUID()}`), backup = join(directory, `.firefox-extension-backup-${randomUUID()}`);
  await mkdir(stage);
  let moved = false;
  try {
    for (const f of files) await writeFile(join(stage, f), bundle.files[f], { mode: 0o600 });
    await writeFile(join(stage, ".sosyal-studio.json"), JSON.stringify({ hash, version: manifest.version }));
    if (exists) { await rename(target, backup); moved = true; }
    try { await rename(stage, target); }
    catch (e) { if (moved) { await rename(backup, target); moved = false; } throw e; }
    if (moved) await rm(backup, { recursive: true, force: true });
  } finally { await rm(stage, { recursive: true, force: true }); }
  return { changed: true, first: !exists, version: manifest.version, manifestPath };
}
export async function openFirefoxExtensionSetup(executablePath) {
  // Normal Firefox: no profile copying, WebDriver, signing preference or policy changes.
  await new Promise((resolve) => {
    const child = spawn(executablePath, ["about:debugging#/runtime/this-firefox"], { detached: true, stdio: "ignore", windowsHide: true });
    child.once("error", resolve); child.once("spawn", () => { child.unref(); resolve(); });
  });
}
