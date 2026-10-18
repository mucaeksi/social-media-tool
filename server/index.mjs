import { createApp } from "./app.mjs";

const { app, store } = createApp();
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`Sosyal Studio hazır. Yerel port: ${port}`),
);
function stop() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
