import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const stateDir = await mkdtemp(path.join(os.tmpdir(), "studio-cloud-e2e-"));
const run = spawnSync(
  process.execPath,
  [
    "scripts/wrangler.mjs",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--persist-to",
    stateDir,
  ],
  { stdio: "inherit" },
);
if (run.status !== 0) {
  await rm(stateDir, { recursive: true, force: true });
  process.exit(run.status ?? 1);
}
const child = spawn(
  process.execPath,
  [
    "scripts/wrangler.mjs",
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    "8788",
    "--persist-to",
    stateDir,
    ...(process.env.STUDIO_MEDIA_STORAGE === "d1"
      ? ["--var", "MEDIA_STORAGE:d1"]
      : []),
  ],
  { stdio: "inherit" },
);
let stopping = false;
function stop() {
  if (!stopping) {
    stopping = true;
    child.kill("SIGTERM");
  }
}
child.on("exit", async (code) => {
  await rm(stateDir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
