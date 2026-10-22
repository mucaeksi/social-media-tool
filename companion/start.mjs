import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { hostname } from "node:os";
import { createInterface } from "node:readline/promises";
import { ProfileBrowsers } from "./browser.mjs";
import { COMPUTER_LIMITS } from "../shared/computer-protocol.mjs";

import { LocalAI } from "./local-ai.mjs";
import { prepareFirefoxExtension } from "./firefox-extension.mjs";
import {
  ensureStudioFirefox,
  prepareStudioFirefoxProfile,
  openStudioFirefox,
} from "./studio-firefox.mjs";
import { WebsiteResearch } from "./research.mjs";
import { NightLearning } from "./night-learning.mjs";
import { localErrors, LOCAL_AI_LIMITS } from "../shared/local-ai.mjs";
import { production, directory } from "./locations.mjs";

const localAI = new LocalAI();
const configPath = join(directory, "device.json");
let socket,
  pool,
  researcher,
  stopping = false,
  reconnect,
  heartbeat,
  commandsInFlight = 0;
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
    process.send?.({ type: "pairing" });
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
    socket.send(
      JSON.stringify({
        type: "hello",
        capabilities: [
          "local-ai-v1",
          "advertising-v1",
          "research-v1",
          "browser-tasks-v1",
          "company-tabs-v1",
          "normal-login-v1",
        ],
      }),
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
      event.data.length > LOCAL_AI_LIMITS.wireChars
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
    if (!message || typeof message !== "object" || Array.isArray(message))
      return;
    if (message.type === "research-command") {
      if (stopping || typeof message.id !== "string") return;
      commandsInFlight++;
      try {
        const result = await researcher.execute(message.input);
        if (message.input.companyId)
          localAI.memory.research(message.input.companyId, result);
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({ type: "research-result", id: message.id, result }),
          );
      } catch {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({
              type: "research-result",
              id: message.id,
              result: { ok: false, code: "RESEARCH_FAILED" },
            }),
          );
      } finally {
        commandsInFlight--;
      }
      return;
    }
    if (message.type === "ai-command") {
      if (stopping || typeof message.id !== "string") return;
      try {
        const result = await localAI.execute(message.input, (progress) => {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({ type: "ai-progress", id: message.id, progress }),
            );
        });
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({ type: "ai-result", id: message.id, result }),
          );
      } catch (error) {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(
            JSON.stringify({
              type: "ai-result",
              id: message.id,
              result: {
                ok: false,
                code: Object.hasOwn(localErrors, error.code)
                  ? error.code
                  : "FAILED",
              },
            }),
          );
      }
      return;
    }
    if (message.type === "pong") {
      lastPong = Date.now();
      return;
    }
    if (message.type === "revoked") {
      console.log(
        "Panelden cihaz bağlantısı kaldırıldı. Yeniden eşleme için Baslat.cmd --reset kullanın.",
      );
      await stop();
      return;
    }
    if (
      message.type !== "command" ||
      typeof message.id !== "string" ||
      stopping
    )
      return;
    commandsInFlight++;
    try {
      const result = await pool.execute(message.account, message.command);
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "result", id: message.id, result }));
    } catch {
      // Never log provider errors, URLs, typed text, screenshots or tokens.
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "error", id: message.id }));
    } finally {
      commandsInFlight--;
    }
  });
  socket.addEventListener("error", () => {});
  socket.addEventListener("close", (event) => {
    clearInterval(heartbeat);
    if (event.code === 4000) {
      console.log(
        "Başka bir yardımcı bağlantısı açıldı. Bu pencereyi kapatabilirsiniz.",
      );
      void stop();
    }
    if (!stopping) {
      console.log(
        "Panel bağlantısı kesildi; yeniden bağlanılacak. Firefox profilleri korunuyor.",
      );
      reconnect = setTimeout(() => connect(config), 15000);
    }
  });
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(reconnect);
  clearInterval(heartbeat);
  socket?.close();
  await localAI.night?.close();
  localAI.generationController?.abort();
  await localAI.close();
  await researcher?.close();
  await pool?.queue;
  await pool?.closeAll();
  if (code === 75 && process.connected)
    await new Promise((resolve) =>
      process.send({ type: "update-ready" }, resolve),
    );
  process.exit(code);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
process.on("SIGHUP", () => void stop());
// Only the local supervisor can request a restart. Cloud commands cannot update
// or run code. Never interrupt an open login or an in-flight/queued operation.
process.on("message", (message) => {
  if (message?.type === "stop") void stop();
  if (
    message?.type === "prepare-update" &&
    !stopping &&
    pool &&
    commandsInFlight === 0 &&
    pool.opened.size === 0 &&
    pool.manualOpened.size === 0 &&
    !localAI.busy
  )
    void stop(75);
});
try {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node.js 24 veya üzerini kurun.");
  let executablePath, studioProfile;
  if (process.platform === "win32") {
    process.send?.({ type: "initializing", stage: "firefox" });
    console.log(
      "Firefox Developer Edition aynı BAT klasörüne otomatik hazırlanıyor; Mozilla'nın Windows imzası doğrulanır.",
    );
    let lastStage,
      lastProgress = 0;
    executablePath = await ensureStudioFirefox(directory, {
      progress: (value) => {
        if (value.stage === "download" && value.bytes) {
          if (
            Date.now() - lastProgress >= 2000 ||
            value.bytes === value.total
          ) {
            const mb = (bytes) => (bytes / 1024 ** 2).toFixed(1);
            console.log(
              `Firefox indiriliyor: ${mb(value.bytes)}${value.total ? " / " + mb(value.total) : ""} MB`,
            );
            lastProgress = Date.now();
          }
        } else if (value.stage !== lastStage) {
          const labels = {
            download:
              "Firefox kurucusu Mozilla'dan indiriliyor; ilk indirme birkaç dakika sürebilir.",
            "verify-installer":
              "İndirilen Firefox kurucusunun Mozilla imzası doğrulanıyor.",
            install:
              "Firefox aynı klasöre kuruluyor; Windows izin penceresi açılırsa kurulum için onaylayın.",
            "verify-installed":
              "Kurulu Firefox'un Mozilla imzası kontrol ediliyor.",
          };
          if (labels[value.stage]) console.log(labels[value.stage]);
        }
        lastStage = value.stage;
      },
    });
    studioProfile = await prepareStudioFirefoxProfile(directory);
  } else executablePath = await firefoxPath();
  try {
    const extension = await prepareFirefoxExtension(directory, {
      profile: Boolean(studioProfile),
    });
    console.log(
      `Firefox eklentisi ${extension.version} hazır: ${extension.manifestPath}`,
    );
    console.log(
      studioProfile
        ? "Eklenti özel Firefox profiline otomatik kuruldu. Mevcut kişisel Firefox profiliniz değiştirilmedi. Sosyal hesaplara bu Firefox'ta bir kez giriş yapın."
        : "Normal Firefox ilk yüklemeyi onaylamanızı ister. Geçici eklenti yükle adımında yukarıdaki manifest.json dosyasını seçin.",
    );
    if (studioProfile)
      await openStudioFirefox(directory, executablePath, studioProfile);
  } catch {
    console.log(
      "Firefox eklentisi hazırlanamadı. Klasör izinlerini kontrol edin; paneldeki eklenti paketini elle yükleyebilirsiniz.",
    );
  }
  researcher = new WebsiteResearch({ executablePath });
  localAI.night = new NightLearning({
    ai: localAI,
    researcher: new WebsiteResearch({ executablePath }),
    canRun: () =>
      !stopping &&
      socket?.readyState === WebSocket.OPEN &&
      commandsInFlight === 0 &&
      !pool?.opened.size &&
      !pool?.manualOpened.size,
  });
  localAI.night.start();
  if (process.platform === "win32") {
    console.log(
      "Yerel AI otomatik hazırlanıyor. Veriler BAT dosyasının bulunduğu klasörde tutulur; eşleştirme ve hesap girişlerine devam edebilirsiniz.",
    );
    localAI.setup({ automatic: true });
  }
  const config = await configuration();
  pool = new ProfileBrowsers({
    directory: join(directory, "profiles"),
    executablePath,
  });
  connect(config);
  process.send?.({ type: "ready" });
} catch (error) {
  await localAI.close();
  console.error(error.message);
  process.exitCode = 1;
  process.disconnect?.();
}
