import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { LOCAL_MODEL } from "../shared/local-ai.mjs";

// A detached local owner outlives a closed terminal just long enough to release
// its model and stop its own process tree. IPC disconnect also handles a killed helper.
const [executable, models] = process.argv.slice(2);
if (!process.send || !executable || !models) process.exit(1);
let stopping = false;
const aiRoot = dirname(models), runtimeHome = join(aiRoot, "home"), temporary = join(aiRoot, "tmp");
for (const folder of [runtimeHome, temporary, join(runtimeHome, "AppData", "Local"), join(runtimeHome, "AppData", "Roaming"), join(aiRoot, "cache")])
  await mkdir(folder, { recursive: true });
const server = spawn(executable, ["serve"], {
  stdio: "ignore", windowsHide: true,
  env: { ...process.env, OLLAMA_HOST: "127.0.0.1:11435", OLLAMA_MODELS: models,
    OLLAMA_NO_CLOUD: "1", OLLAMA_MAX_LOADED_MODELS: "1", OLLAMA_NUM_PARALLEL: "1",
    // Reserve 6 GiB on the user's 16 GiB GPU; keep KV cache compact.
    OLLAMA_GPU_OVERHEAD: String(6 * 1024 ** 3), OLLAMA_FLASH_ATTENTION: "1", OLLAMA_KV_CACHE_TYPE: "q8_0",
    TEMP: temporary, TMP: temporary, TMPDIR: temporary,
    XDG_CACHE_HOME: join(aiRoot, "cache"), CUDA_CACHE_PATH: join(aiRoot, "cache", "cuda"),
    ...(process.platform === "win32" ? { USERPROFILE: runtimeHome,
      LOCALAPPDATA: join(runtimeHome, "AppData", "Local"), APPDATA: join(runtimeHome, "AppData", "Roaming") } : {}),
  },
});
const exited = new Promise((resolve) => {
  server.once("exit", resolve);
  server.once("error", () => resolve(1));
});
server.once("spawn", () => { if (process.connected) process.send({ type: "runtime-started", pid: server.pid }); });
server.once("error", () => void stop());
server.once("exit", () => { if (!stopping) void stop(); });
async function stop() {
  if (stopping) return;
  stopping = true;
  if (server.exitCode === null && server.signalCode === null && server.pid) {
    await fetch("http://127.0.0.1:11435/api/generate", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(1500),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: LOCAL_MODEL, keep_alive: 0 }),
    }).then((response) => response.body?.cancel()).catch(() => {});
    if (process.platform === "win32") {
      await new Promise((resolve) => {
        // The PID belongs to the process spawned above, never a supplied panel PID.
        const kill = spawn(join(process.env.SystemRoot, "System32", "taskkill.exe"),
          ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        kill.once("error", resolve); kill.once("exit", resolve);
      });
    } else server.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
  if (process.connected) process.disconnect();
  process.exit(0);
}
process.on("message", (message) => { if (message?.type === "stop") void stop(); });
process.on("disconnect", () => void stop());
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => void stop());
