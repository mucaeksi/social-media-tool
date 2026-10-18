import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/app.mjs";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "sosyal-browser-"));
const { app, store } = createApp({ dataDir });
const server = app.listen(3002, "127.0.0.1", () =>
  console.log("Tarayıcı test sunucusu hazır."),
);
function stop() {
  server.close(async () => {
    store.close();
    await rm(dataDir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
