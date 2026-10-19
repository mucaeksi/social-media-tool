import { fork } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Updater, installDependencies } from "./updater.mjs";

export async function supervise({
  root,
  updater = new Updater(),
  spawnApp,
  ensureDependencies = installDependencies,
  interval = 600_000,
  retryInterval = 30_000,
  readyTimeout = 30_000,
  log = console.log,
}) {
  await ensureDependencies(root);
  const release = JSON.parse(
    await readFile(join(root, "companion/release.json"), "utf8"),
  );
  const state = await updater.state();
  log(
    `Sosyal Studio · sürüm ${release.version.slice(0, 12)} · otomatik güncelleme etkin`,
  );
  const child = spawnApp
    ? spawnApp()
    : fork(join(root, "companion/start.mjs"), process.argv.slice(2), {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      });
  let ready = false,
    candidate = null,
    accepted = false,
    checking = false,
    stopping = false,
    updateTimer,
    retryTimer,
    healthTimer;
  const askToUpdate = () => {
    if (candidate && child.connected && !stopping)
      child.send({ type: "prepare-update" });
  };
  const check = async () => {
    if (checking || candidate || stopping) return;
    checking = true;
    try {
      candidate = await updater.prepare(release.version);
      if (candidate && !stopping) {
        log(
          "Yeni sürüm hazır. Açık hesap ekranlarını kapattığınızda otomatik uygulanacak; girişler korunacak.",
        );
        askToUpdate();
        retryTimer = setInterval(askToUpdate, retryInterval);
      }
    } catch {
      log(
        "Güncelleme kontrolü tamamlanamadı; mevcut sürümle devam ediliyor. Sonra tekrar denenecek.",
      );
    } finally {
      checking = false;
    }
  };
  const stop = () => {
    stopping = true;
    clearInterval(updateTimer);
    clearInterval(retryTimer);
    if (child.connected) child.send({ type: "stop" });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const parentMessage = (message) => {
    if (message?.type === "stop") stop();
  };
  process.on("message", parentMessage);
  try {
    return await new Promise((resolve, reject) => {
      healthTimer = setTimeout(() => {
        log("Yardımcı başlangıcı tamamlanamadı.");
        stop();
      }, readyTimeout);
      child.on("message", async (message) => {
        if (message?.type === "pairing") clearTimeout(healthTimer);
        if (message?.type === "ready" && !ready) {
          ready = true;
          clearTimeout(healthTimer);
          try {
            if (state.pending) await updater.confirm();
            if (!stopping) {
              void check();
              updateTimer = setInterval(check, interval);
            }
          } catch {
            stop();
          }
        }
        if (message?.type === "update-ready" && candidate && !stopping)
          accepted = true;
      });
      child.once("error", reject);
      child.once("exit", async (code) => {
        stopping = true;
        clearTimeout(healthTimer);
        clearInterval(updateTimer);
        clearInterval(retryTimer);
        try {
          if (!ready && state.pending) {
            await updater.rollback();
            log(
              "Yeni sürüm başlayamadı. Önceki sürüme dönülüyor; hesap profilleri korundu.",
            );
            resolve(75);
          } else if (code === 75 && accepted && candidate) {
            await updater.activate(candidate);
            log("Güncelleme uygulanıyor; yardımcı yeniden bağlanacak.");
            resolve(75);
          } else resolve(code ?? 1);
        } catch (error) {
          reject(error);
        }
      });
    });
  } finally {
    clearTimeout(healthTimer);
    clearInterval(updateTimer);
    clearInterval(retryTimer);
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    process.off("message", parentMessage);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = await supervise({
      root: dirname(dirname(fileURLToPath(import.meta.url))),
    });
  } catch {
    // Includes a candidate whose imports/dependency startup failed before ready.
    const updater = new Updater();
    if (await updater.rollback().catch(() => false)) {
      console.error("Yeni sürüm başlatılamadı. Önceki sürüm geri yükleniyor.");
      process.exitCode = 75;
    } else {
      console.error(
        "Yardımcı başlatılamadı. Node.js, Firefox ve internet bağlantısını kontrol edin.",
      );
      process.exitCode = 1;
    }
  }
  process.disconnect?.();
}
