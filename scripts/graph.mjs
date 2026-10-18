import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const command = existsSync("/workspace/.tools/bin/graphify")
  ? "/workspace/.tools/bin/graphify"
  : "graphify";
const root = new URL("..", import.meta.url);
for (const args of [
  ["extract", ".", "--code-only", "--max-workers", "2"],
  ["cluster-only", ".", "--no-label"],
]) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, GRAPHIFY_BACKEND: "none" },
  });
  if (result.error) {
    console.error(
      "Graphify çalıştırılamadı. Önce bash scripts/setup.sh komutunu çalıştırın.",
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
