import { spawn } from "node:child_process";
import path from "node:path";

const child = spawn(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: path.resolve(".cloudflare/config"),
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
