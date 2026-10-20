import { spawn } from "node:child_process";

// This process has no WebDriver/BiDi/Marionette connection. Login and window
// closure belong to the person at the computer; no credentials are inspected.
export async function normalFirefox({
  executablePath,
  userDataDir,
  url,
  headless = false,
  env = process.env,
}) {
  const child = spawn(
    executablePath,
    [
      "--no-remote",
      ...(process.platform === "win32" ? ["--wait-for-browser"] : []),
      "--profile", userDataDir,
      ...(headless ? ["--headless"] : []),
      url,
    ],
    { stdio: "ignore", env },
  );
  const exited = new Promise((resolve) => {
    child.once("exit", (code) => resolve(code));
    child.once("error", () => resolve(1));
  });
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  return { child, exited };
}
