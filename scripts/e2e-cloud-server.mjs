import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { hashPassword } from "../shared/passwords.mjs";
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
if (process.env.STUDIO_AUTH === "password") {
  const file = path.join(stateDir, "auth-seed.sql"),
    hash = await hashPassword("Tarayici.Deneme.2026!");
  await writeFile(
    file,
    `INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES('browser-admin','yonetici@example.test','yonetici@example.test','Tarayıcı yöneticisi','${hash}','admin','2026-10-18');`,
  );
  const seeded = spawnSync(
    process.execPath,
    [
      "scripts/wrangler.mjs",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      stateDir,
      "--file",
      file,
    ],
    { stdio: "inherit" },
  );
  await rm(file, { force: true });
  if (seeded.status !== 0) {
    await rm(stateDir, { recursive: true, force: true });
    process.exit(seeded.status ?? 1);
  }
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
    ...(process.env.STUDIO_AUTH === "password"
      ? ["--var", "AUTH_MODE:password"]
      : []),
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
