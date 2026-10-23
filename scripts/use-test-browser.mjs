import { existsSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
// Ubuntu 24.04 runners already include Chrome/Chromium and native Firefox
// dependencies. Avoid repeating apt installation during every validation job.
const executable = [
  process.env.CHROMIUM_EXECUTABLE,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path));
if (!executable)
  throw new Error(
    "Test çalıştırıcısında Chrome/Chromium bulunamadı. Runner imajını kontrol edin.",
  );
const version = execFileSync(executable, ["--version"], {
  encoding: "utf8",
  timeout: 15000,
}).trim();
if (!/(?:Chromium|Google Chrome)\s+\d+\./.test(version))
  throw new Error("Test tarayıcısı doğrulanamadı.");
if (process.env.GITHUB_ENV)
  await appendFile(
    process.env.GITHUB_ENV,
    `CHROMIUM_EXECUTABLE=${executable}\n`,
  );
console.log(`Arayüz test tarayıcısı: ${version}`);
