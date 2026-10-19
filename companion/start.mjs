import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir, hostname } from "node:os";
import { createInterface } from "node:readline/promises";
import { ProfileBrowsers } from "./browser.mjs";
import { COMPUTER_LIMITS } from "../shared/computer-protocol.mjs";

const production =
  "https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev";
const directory = join(
  process.env.LOCALAPPDATA || join(homedir(), ".local", "share"),
  "SosyalStudio",
);
const configPath = join(directory, "device.json");
let socket,
  pool,
  stopping = false,
  reconnect,
  heartbeat;
function safeOrigin(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw new Error("Panel adresi geçersiz.");
  return u.origin;
}
async function firefoxPath() {
  const paths = [
    process.env.STUDIO_FIREFOX,
    process.env.PROGRAMFILES &&
      join(process.env.PROGRAMFILES, "Mozilla Firefox", "firefox.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      join(process.env["PROGRAMFILES(X86)"], "Mozilla Firefox", "firefox.exe"),
    "/Applications/Firefox.app/Contents/MacOS/firefox",
    "/usr/bin/firefox",
    "/usr/bin/firefox-esr",
  ];
  for (const path of paths.filter(Boolean))
    try {
      await access(path);
      return path;
    } catch {}
  throw new Error(
    "Firefox bulunamadı. Mozilla Firefox'u kurup yardımcıyı yeniden başlatın.",
  );
}
async function configuration() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.argv.includes("--reset")) {
    await rm(configPath, { force: true });
    console.log(
      "Cihaz eşleştirmesi bu bilgisayardan kaldırıldı. Firefox profilleri korundu.",
    );
  }
  try {
    const c = JSON.parse(await readFile(configPath, "utf8"));
    c.origin = safeOrigin(c.origin);
    if (!/^[0-9a-f-]{36}$/.test(c.id) || !/^[-\w]{43}$/.test(c.token))
      throw new Error();
    return c;
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error(
        "Cihaz dosyası okunamadı. Yeniden eşlemek için Baslat.cmd --reset komutunu kullanın.",
      );
  }
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    console.log(
      "Sosyal Studio bilgisayar yardımcısı\nPanelde Hesap bağlantıları → Bilgisayarı eşleştir adımından kod oluşturun.",
    );
    const code = (
      await terminal.question("Tek kullanımlık eşleştirme kodu: ")
    ).trim();
    if (!/^[-\w]{43}$/.test(code))
      throw new Error("Eşleştirme kodunun tamamını girin.");
    const origin = production;
    const response = await fetch(`${origin}/api/computer/enroll`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ code, name: hostname().slice(0, 80) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        "Eşleştirme yapılamadı. Panelde yeni kod oluşturun; başka bilgisayar bağlıysa önce bağlantısını kaldırın.",
      );
    const data = await response.json(),
      config = { origin, id: data.id, token: data.token };
    await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
    return config;
  } finally {
    terminal.close();
  }
}
function connect(config) {
  if (stopping) return;
  const url = new URL("/api/computer/connect", config.origin);
  url.protocol = "wss:";
  socket = new WebSocket(url, [
    "sosyal-device-v1",
    `${config.id}.${config.token}`,
  ]);
  let lastPong = Date.now();
  socket.addEventListener("open", () => {
    console.log(
      "Panel bağlantısı kuruldu. Hesapları web panelinden açabilirsiniz. Bu pencere açık kalmalı.",
    );
    heartbeat = setInterval(() => {
      if (Date.now() - lastPong > 75000) {
        socket.close();
        return;
      }
      if (socket.readyState === WebSocket.OPEN) socket.send('{"type":"ping"}');
    }, 25000);
  });
  socket.addEventListener("message", async (event) => {
    if (
      typeof event.data !== "string" ||
      event.data.length > COMPUTER_LIMITS.messageBytes
    ) {
      socket.close();
      return;
    }
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "pong") {
      lastPong = Date.now();
      return;
    }
    if (message.type === "revoked") {
      stopping = true;
      console.log(
        "Panelden cihaz bağlantısı kaldırıldı. Yeniden eşleme için Baslat.cmd --reset kullanın.",
      );
      socket.close();
      await pool.closeAll();
      return;
    }
    if (message.type !== "command" || typeof message.id !== "string") return;
    try {
      const result = await pool.execute(message.account, message.command);
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "result", id: message.id, result }));
    } catch {
      // Never log provider errors, URLs, typed text, screenshots or tokens.
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "error", id: message.id }));
    }
  });
  socket.addEventListener("error", () => {});
  socket.addEventListener("close", (event) => {
    clearInterval(heartbeat);
    if (event.code === 4000) {
      stopping = true;
      console.log(
        "Başka bir yardımcı bağlantısı açıldı. Bu pencereyi kapatabilirsiniz.",
      );
      void pool.closeAll();
    }
    if (!stopping) {
      console.log(
        "Panel bağlantısı kesildi; yeniden bağlanılacak. Firefox profilleri korunuyor.",
      );
      reconnect = setTimeout(() => connect(config), 15000);
    }
  });
}
async function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(reconnect);
  clearInterval(heartbeat);
  socket?.close();
  await pool?.closeAll();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node.js 24 veya üzerini kurun.");
  const executablePath = await firefoxPath(),
    config = await configuration();
  pool = new ProfileBrowsers({
    directory: join(directory, "profiles"),
    executablePath,
  });
  connect(config);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
