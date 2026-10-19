// Stable bootstrap: updated supervisors and applications live in versioned folders.
import { fork } from "node:child_process";
import { createServer } from "node:net";
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { updateDirectory } from "./locations.mjs";
import { validVersion } from "./release.mjs";

if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("Node.js 24 veya üzeri LTS kurun.");
  process.exit(1);
}
const bundleRoot = dirname(dirname(fileURLToPath(import.meta.url)));
// A single local loopback listener prevents two updaters/profile owners running.
// It accepts no commands or HTTP requests and is never bound to a LAN interface.
const lock = createServer((socket) => socket.destroy());
try {
  await new Promise((resolve, reject) => {
    lock.once("error", reject);
    lock.listen(43975, "127.0.0.1", resolve);
  });
  let child,
    stopped = false,
    args = process.argv.slice(2);
  function stop() {
    stopped = true;
    if (child?.connected) child.send({ type: "stop" });
    else lock.close();
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  do {
    let root = bundleRoot;
    try {
      const state = JSON.parse(
        await readFile(join(updateDirectory, "current.json"), "utf8"),
      );
      if (state.version !== null && !validVersion(state.version))
        throw new Error();
      if (state.version)
        root = join(updateDirectory, "releases", state.version);
    } catch (error) {
      if (error.code !== "ENOENT")
        throw new Error(
          "Güncelleme kaydı okunamadı; hesap profilleri korundu.",
        );
    }
    let code = await new Promise((resolve, reject) => {
      child = fork(join(root, "companion/supervisor.mjs"), args, {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      });
      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });
    child = null;
    args = args.filter((arg) => arg !== "--reset");
    // Also recover a syntax/import error in a candidate supervisor, before its
    // own recovery code could run. Only an unconfirmed candidate is rolled back.
    if (code !== 75 && !stopped) {
      const path = join(updateDirectory, "current.json");
      const state = await readFile(path, "utf8")
        .then(JSON.parse)
        .catch(() => null);
      if (
        state?.pending &&
        validVersion(state.version) &&
        (state.previous === null || validVersion(state.previous))
      ) {
        const temp = `${path}.rollback.tmp`;
        await writeFile(
          temp,
          JSON.stringify({
            version: state.previous,
            previous: null,
            failedVersion: state.version,
            pending: false,
          }),
          { mode: 0o600 },
        );
        await rename(temp, path);
        console.log("Yeni sürüm yüklenemedi. Önceki sürüme dönülüyor.");
        code = 75;
      }
    }
    if (code !== 75 || stopped) {
      process.exitCode = stopped ? 0 : code;
      break;
    }
  } while (!stopped);
} catch {
  console.error(
    "Yardımcı başlatılamadı. Başka yardımcı açıksa kapatın; ardından tekrar deneyin.",
  );
  process.exitCode = 1;
} finally {
  lock.close();
}
