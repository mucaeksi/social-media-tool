import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { production } from "./locations.mjs";

const downloadURL = "https://download.mozilla.org/?product=firefox-devedition-latest-ssl&os=win64&lang=tr";
const hosts = new Set(["download.mozilla.org", "download-installer.cdn.mozilla.net", "download.cdn.mozilla.net", "archive.mozilla.org"]);
async function powershell(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, ...env } });
    let output = ""; child.stdout.on("data", (b) => { output = (output + b).slice(-2000); });
    child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve(output.trim()) : reject(new Error("Mozilla imza doğrulaması veya süreç kontrolü tamamlanamadı.")));
  });
}
export async function verifyMozillaSignature(path) {
  await powershell('$ErrorActionPreference="Stop"; $s=Get-AuthenticodeSignature -LiteralPath $env:STUDIO_FIREFOX_FILE; if($s.Status -ne "Valid" -or $s.SignerCertificate.Subject -notmatch "(?:^|,\\s*)O=Mozilla Corporation(?:,|$)"){exit 1}', { STUDIO_FIREFOX_FILE: path });
}
export async function downloadFirefoxInstaller(path, fetcher = fetch) {
  let url = downloadURL;
  for (let i = 0; i < 6; i++) {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port || !hosts.has(u.hostname)) throw new Error("Firefox indirme adresi Mozilla'ya ait değil.");
    const response = await fetcher(url, { redirect: "manual", signal: AbortSignal.timeout(900000) });
    if ([301,302,303,307,308].includes(response.status)) {
      const next = response.headers.get("location"); await response.body?.cancel();
      if (!next) throw new Error("Mozilla yönlendirmesi eksik."); url = new URL(next, u).href; continue;
    }
    if (!response.ok || !response.body) throw new Error("Firefox indirilemedi. İnternet bağlantısını kontrol edin.");
    const { open } = await import("node:fs/promises"), file = await open(path, "w", 0o600);
    let size = 0;
    try { for await (const bytes of response.body) { size += bytes.length; if (size > 250_000_000) throw new Error("Firefox kurucusu boyut sınırını aştı."); await file.writeFile(bytes); } }
    finally { await file.close(); }
    if (size < 100000) throw new Error("Firefox kurucusu eksik.");
    return;
  }
  throw new Error("Mozilla indirme yönlendirmesi tamamlanamadı.");
}
export async function ensureStudioFirefox(directory, { download = downloadFirefoxInstaller, verify = verifyMozillaSignature, runInstaller } = {}) {
  const folder = join(directory, "FirefoxDeveloper"), executablePath = join(folder, "firefox.exe"), marker = join(folder, ".sosyal-studio.json");
  await mkdir(directory, { recursive: true });
  try { await access(executablePath); await access(marker); await verify(executablePath); return executablePath; } catch { /* First install or repair. */ }
  const installer = join(directory, "firefox-developer-setup.exe");
  try {
    await download(installer); await verify(installer);
    const args = ["/S", `/InstallDirectoryPath=${folder}`, "/DesktopShortcut=false", "/TaskbarShortcut=false", "/StartMenuShortcuts=false", "/MaintenanceService=false", "/PreventRebootRequired=true"];
    if (runInstaller) await runInstaller(installer, args);
    else await new Promise((resolve, reject) => {
      const child = spawn(installer, args, { windowsHide: true, stdio: "ignore" });
      child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Firefox otomatik kurulumu tamamlanamadı.")));
    });
    await access(executablePath); await verify(executablePath);
    await writeFile(marker, JSON.stringify({ managed: true, edition: "developer", source: downloadURL }));
    return executablePath;
  } finally { await rm(installer, { force: true }); }
}
export async function prepareStudioFirefoxProfile(directory) {
  const profile = join(directory, "FirefoxProfil");
  await mkdir(join(profile, "extensions"), { recursive: true });
  const prefsPath = join(profile, "user.js");
  const old = await readFile(prefsPath, "utf8").catch((e) => { if (e.code === "ENOENT") return ""; throw e; });
  const block = `// SOSYAL STUDIO BEGIN\nuser_pref("xpinstall.signatures.required", false);\nuser_pref("extensions.autoDisableScopes", 0);\nuser_pref("extensions.startupScanScopes", 1);\nuser_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("browser.startup.page", 3);\nuser_pref("browser.startup.homepage", ${JSON.stringify(production)});\n// SOSYAL STUDIO END`;
  const next = old.includes("// SOSYAL STUDIO BEGIN") ? old.replace(/\/\/ SOSYAL STUDIO BEGIN[\s\S]*?\/\/ SOSYAL STUDIO END/, block) : old + "\n" + block + "\n";
  await writeFile(prefsPath, next, { mode: 0o600 });
  return profile;
}
export async function openStudioFirefox(directory, executablePath, profile) {
  const statePath = join(directory, "firefox-process.json");
  const old = JSON.parse(await readFile(statePath, "utf8").catch(() => "null"));
  if (Number.isInteger(old?.pid) && old.pid > 0) {
    const own = await powershell('$p=Get-CimInstance Win32_Process -Filter ("ProcessId="+$env:STUDIO_FIREFOX_PID); if($p -and $p.ExecutablePath -eq $env:STUDIO_FIREFOX_EXE -and $p.CommandLine.Contains($env:STUDIO_FIREFOX_PROFILE)){"owned"}', { STUDIO_FIREFOX_PID: String(old.pid), STUDIO_FIREFOX_EXE: executablePath, STUDIO_FIREFOX_PROFILE: profile }).catch(() => "");
    if (own === "owned") return;
  }
  const home = join(directory, "FirefoxVerileri"); await mkdir(home, { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn(executablePath, ["--wait-for-browser", "--no-remote", "--profile", profile, production], { detached: true, stdio: "ignore", windowsHide: true,
      env: { ...process.env, APPDATA: join(home, "Roaming"), LOCALAPPDATA: join(home, "Local"), MOZ_CRASHREPORTER_DISABLE: "1" } });
    child.once("error", reject); child.once("spawn", async () => { try { await writeFile(statePath, JSON.stringify({ pid: child.pid })); child.unref(); resolve(); } catch (e) { reject(e); } });
  });
}
