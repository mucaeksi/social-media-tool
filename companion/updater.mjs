import {
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  access,
  readdir,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  archivePath,
  manifestPath,
  sha256,
  validVersion,
  extractRelease,
} from "./release.mjs";
import { production, updateDirectory } from "./locations.mjs";

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function installDependencies(root) {
  const lockBytes = await readFile(join(root, "companion/package-lock.json"));
  const lock = JSON.parse(lockBytes);
  if (lock.lockfileVersion !== 3)
    throw new Error("Bağımlılık kilidi geçersiz.");
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name) continue;
    const url = new URL(entry.resolved);
    if (
      !name.startsWith("node_modules/") ||
      entry.link ||
      url.origin !== "https://registry.npmjs.org" ||
      url.username ||
      url.password ||
      !/^sha512-[A-Za-z0-9+/]+=*$/.test(entry.integrity)
    )
      throw new Error("Bağımlılık kaynağı doğrulanamadı.");
  }
  const marker = join(root, "companion/.dependencies-ready"),
    digest = sha256(lockBytes);
  try {
    if ((await readFile(marker, "utf8")) === digest) {
      await access(
        join(root, "companion/node_modules/puppeteer-core/package.json"),
      );
      return;
    }
  } catch {}
  const candidates = [
    join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
    "/usr/share/nodejs/npm/bin/npm-cli.js",
  ];
  let npm;
  for (const path of candidates) {
    try {
      await access(path);
      npm = path;
      break;
    } catch {}
  }
  if (!npm) throw new Error("npm bulunamadı. Node.js LTS kurulumunu onarın.");
  await new Promise((resolve, reject) => {
    // No shell or package lifecycle scripts. npm checks lockfile integrity.
    const child = spawn(
      process.execPath,
      [
        npm,
        "ci",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org",
      ],
      {
        cwd: join(root, "companion"),
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      },
    );
    let diagnostic = "";
    child.stderr?.on("data", (chunk) => {
      diagnostic = (diagnostic + chunk.toString("utf8")).slice(-8192);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Bağımlılık kurulumu zaman aşımına uğradı."));
    }, 180_000);
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("npm başlatılamadı."));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve()
        : reject(
            new Error(
              /EACCES|EPERM/.test(diagnostic)
                ? "Bağımlılıklar kurulamadı: klasör veya önbellek yazma izni yok (NPM_PERMISSION)."
                : /ENOSPC/.test(diagnostic)
                  ? "Bağımlılıklar kurulamadı: diskte boş alan yok (NPM_DISK_FULL)."
                  : /CERT|certificate/i.test(diagnostic)
                    ? "Bağımlılıklar kurulamadı: güvenli bağlantı sertifikası doğrulanamadı (NPM_TLS)."
                    : /ECONN|ENOTFOUND|ETIMEDOUT|network/i.test(diagnostic)
                      ? "Bağımlılıklar kurulamadı: ağ bağlantısını kontrol edin (NPM_NETWORK)."
                      : `Bağımlılıklar kurulamadı (NPM_EXIT_${code}). Kurulum klasörünü ve Node.js sürümünü kontrol edin.`,
            ),
          );
    });
  });
  await writeFile(marker, digest, { mode: 0o600 });
}

async function boundedResponse(response, limit) {
  if (!response.ok || response.redirected)
    throw new Error("Güncelleme indirilemedi.");
  const length = Number(response.headers.get("content-length"));
  if (length > limit) throw new Error("Güncelleme boyutu sınırı aşıldı.");
  const parts = [];
  let size = 0;
  for await (const part of response.body) {
    size += part.length;
    if (size > limit) throw new Error("Güncelleme boyutu sınırı aşıldı.");
    parts.push(Buffer.from(part));
  }
  return Buffer.concat(parts);
}

export class Updater {
  constructor({
    directory = updateDirectory,
    fetcher = fetch,
    installer = installDependencies,
  } = {}) {
    Object.assign(this, { directory, fetcher, installer });
    this.statePath = join(directory, "current.json");
  }
  async state() {
    try {
      const state = JSON.parse(await readFile(this.statePath, "utf8"));
      if (
        ![state.version, state.previous, state.failedVersion].every(
          (v) => v === null || validVersion(v),
        ) ||
        typeof state.pending !== "boolean"
      )
        throw new Error();
      return state;
    } catch (error) {
      if (error.code !== "ENOENT")
        throw new Error("Güncelleme kaydı okunamadı.");
      return {
        version: null,
        previous: null,
        failedVersion: null,
        pending: false,
      };
    }
  }
  root(version) {
    if (!validVersion(version)) throw new Error("Sürüm kimliği geçersiz.");
    return join(this.directory, "releases", version);
  }
  async prepare(currentVersion) {
    // This origin/path is compiled in, never supplied by the pairing service.
    const options = () => ({
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const manifest = JSON.parse(
      await boundedResponse(
        await this.fetcher(`${production}${manifestPath}`, options()),
        4096,
      ),
    );
    if (
      manifest.protocol !== 1 ||
      !validVersion(manifest.version) ||
      !validVersion(manifest.sha256) ||
      manifest.archive !== archivePath ||
      manifest.nodeMajor !== 24 ||
      !Number.isSafeInteger(manifest.bytes) ||
      manifest.bytes < 100 ||
      manifest.bytes > 8_000_000
    )
      throw new Error("Güncelleme bildirimi geçersiz.");
    const state = await this.state();
    if (
      manifest.version === currentVersion ||
      manifest.version === state.failedVersion
    )
      return null;
    const zip = await boundedResponse(
      await this.fetcher(`${production}${archivePath}`, options()),
      manifest.bytes,
    );
    if (zip.length !== manifest.bytes || sha256(zip) !== manifest.sha256)
      throw new Error("Güncelleme özeti eşleşmiyor.");
    const files = extractRelease(zip, manifest.version);
    await mkdir(join(this.directory, "releases"), {
      recursive: true,
      mode: 0o700,
    });
    const stage = join(this.directory, `stage-${randomUUID()}`),
      target = this.root(manifest.version);
    try {
      for (const [path, bytes] of files) {
        const output = join(stage, path);
        await mkdir(dirname(output), { recursive: true, mode: 0o700 });
        await writeFile(output, bytes, { mode: 0o600 });
      }
      await this.installer(stage);
      // The app still runs from its old folder. Only a fully installed candidate
      // is moved into place; activation happens after it has safely stopped.
      await rm(target, { recursive: true, force: true });
      await rename(stage, target);
      return manifest.version;
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }
  async activate(version) {
    const state = await this.state();
    await access(join(this.root(version), "companion/supervisor.mjs"));
    await atomicJson(this.statePath, {
      version,
      previous: state.version,
      failedVersion: state.failedVersion,
      pending: true,
    });
  }
  async confirm() {
    const state = await this.state();
    await atomicJson(this.statePath, { ...state, pending: false });
    // Bound disk use to current + previous versions. Never touch device/profiles.
    const keep = new Set([state.version, state.previous]);
    for (const name of await readdir(join(this.directory, "releases")).catch(
      () => [],
    ))
      if (validVersion(name) && !keep.has(name))
        await rm(this.root(name), { recursive: true, force: true }).catch(
          () => {},
        );
  }
  async rollback() {
    const state = await this.state();
    if (!state.pending) return false;
    await atomicJson(this.statePath, {
      version: state.previous,
      previous: null,
      failedVersion: state.version,
      pending: false,
    });
    return true;
  }
}
