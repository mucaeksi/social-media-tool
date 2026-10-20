import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, open, readFile, writeFile, rename, rm, link, copyFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";

// Official portable release; hashes are published in its sha256sum.txt.
export const OLLAMA_RELEASE = Object.freeze({
  version: "0.40.6",
  x64: { file: "ollama-windows-amd64.zip", sha256: "e359637575302f288d76c0007c408a4be9c7376d59c4f28684d63b232a44b427" },
  arm64: { file: "ollama-windows-arm64.zip", sha256: "82cace1a134f88e7e7092dcf79304eff5950b88dbfabc03f19be09f8be20ee65" },
});
export const runtimeDirectory = (directory) => join(directory, "ai", "runtime", OLLAMA_RELEASE.version);
export const modelDirectory = (directory) => join(directory, "ai", "models");
export const runtimeExecutable = (directory) => join(runtimeDirectory(directory), "ollama.exe");

export async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function downloadVerified({ url, path, sha256, fetcher = fetch, signal, progress = () => {} }) {
  signal = AbortSignal.any([AbortSignal.timeout(3600000), ...(signal ? [signal] : [])]);
  let response;
  for (let redirects = 0; redirects < 5; redirects++) {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.username || target.password ||
        !["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(target.hostname))
      throw new Error("Kurulum kaynağı geçersiz.");
    response = await fetcher(url, { redirect: "manual", signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    url = new URL(response.headers.get("location"), url).href;
    await response.body?.cancel();
    response = null;
  }
  if (!response?.ok || response.redirected) throw new Error("AI çalıştırıcısı indirilemedi.");
  const total = Number(response.headers.get("content-length"));
  if (total > 2_500_000_000) throw new Error("Kurulum paketi boyutu geçersiz.");
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, "w", 0o600);
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      signal?.throwIfAborted();
      bytes += chunk.length;
      if (bytes > 2_500_000_000) throw new Error("Kurulum paketi boyutu geçersiz.");
      hash.update(chunk);
      await file.writeFile(chunk);
      progress(total > 0 ? Math.min(1, bytes / total) : null);
    }
    if (hash.digest("hex") !== sha256) throw new Error("AI kurulum paketi özeti eşleşmedi.");
  } finally {
    await file.close();
  }
}

export async function extractRuntime(archive, destination, { spawnProcess = spawn, signal } = {}) {
  // Fixed script and argument positions; paths never come from a panel command.
  const script = "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:STUDIO_AI_ARCHIVE,$env:STUDIO_AI_STAGE)";
  await new Promise((resolve, reject) => {
    const child = spawnProcess("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
      { stdio: "ignore", windowsHide: true, signal,
        env: { ...process.env, STUDIO_AI_ARCHIVE: archive, STUDIO_AI_STAGE: destination } });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("AI paketi açılamadı.")));
  });
}

export async function installPortable({ directory, platform = process.platform, arch = process.arch, fetcher = fetch,
  signal, progress, extract = extractRuntime }) {
  const spec = OLLAMA_RELEASE[arch];
  if (platform !== "win32" || !spec) throw new Error("Bu AI paketi Windows x64/ARM64 gerektirir.");
  const destination = runtimeDirectory(directory);
  try {
    const record = JSON.parse(await readFile(join(destination, "runtime.json"), "utf8"));
    if (record.sha256 === spec.sha256) { await access(runtimeExecutable(directory)); return; }
  } catch {}
  const stage = join(directory, "ai", `.runtime-${randomUUID()}`);
  const archive = `${stage}.zip`;
  try {
    await downloadVerified({ url: `https://github.com/ollama/ollama/releases/download/v${OLLAMA_RELEASE.version}/${spec.file}`,
      path: archive, sha256: spec.sha256, fetcher, signal, progress });
    await extract(archive, stage, { signal });
    await access(join(stage, "ollama.exe"));
    await writeFile(join(stage, "runtime.json"), JSON.stringify({ version: OLLAMA_RELEASE.version, sha256: spec.sha256 }));
    await mkdir(dirname(destination), { recursive: true });
    // Only an incomplete installation of this exact runtime version is replaced.
    await rm(destination, { recursive: true, force: true });
    await rename(stage, destination);
  } finally {
    await rm(archive, { force: true });
    await rm(stage, { recursive: true, force: true });
  }
}

// Reuse only the requested model's content-addressed blobs. Never remove the
// original store or import unrelated personal models.
export async function importLegacyModel(directory, legacy = process.env.OLLAMA_MODELS || join(homedir(), ".ollama", "models")) {
  const target = modelDirectory(directory);
  const manifestPath = join("manifests", "registry.ollama.ai", "library", "qwen3.5", "9b");
  try {
    await access(join(target, manifestPath));
    return;
  } catch {}
  try {
    const bytes = await readFile(join(legacy, manifestPath));
    if (bytes.length > 65536) return;
    const manifest = JSON.parse(bytes);
    const parts = [manifest.config, ...(manifest.layers || [])];
    if (parts.length > 64 || parts.some((p) => !/^sha256:[a-f0-9]{64}$/.test(p?.digest) ||
        !Number.isSafeInteger(p.size) || p.size < 0) || parts.reduce((n, p) => n + p.size, 0) > 8_000_000_000) return;
    for (const part of parts) {
      const name = part.digest.replace(":", "-");
      const source = join(legacy, "blobs", name), destination = join(target, "blobs", name);
      if ((await stat(source)).size !== part.size || await hashFile(source) !== part.digest.slice(7)) return;
      await mkdir(dirname(destination), { recursive: true });
      try {
        if ((await stat(destination)).size === part.size && await hashFile(destination) === part.digest.slice(7)) continue;
      } catch {}
      const temporary = `${destination}.${randomUUID()}.partial`;
      try {
        try { await link(source, temporary); } catch { await copyFile(source, temporary); }
        await rename(temporary, destination);
      } finally {
        await rm(temporary, { force: true });
      }
    }
    await mkdir(dirname(join(target, manifestPath)), { recursive: true });
    await writeFile(join(target, manifestPath), bytes, { mode: 0o600 });
  } catch { /* Missing/partial legacy data is left intact; pull resumes missing blobs. */ }
}
