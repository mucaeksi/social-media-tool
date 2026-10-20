import { homedir } from "node:os";
import { join, dirname, resolve, basename, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const production =
  "https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev";
export const legacyDirectory = join(
  process.env.LOCALAPPDATA || join(homedir(), ".local", "share"),
  "SosyalStudio",
);
export function dataDirectory(moduleURL = import.meta.url, env = process.env) {
  if (env.STUDIO_DATA_DIR) {
    if (!isAbsolute(env.STUDIO_DATA_DIR)) throw new Error("Kurulum klasörü tam bir yol olmalıdır.");
    return resolve(env.STUDIO_DATA_DIR);
  }
  const folder = dirname(fileURLToPath(moduleURL));
  const release = dirname(folder), parent = dirname(release);
  // Old bootstraps may not pass the root yet. Resolve versioned code back to
  // its original data root so an automatic patch never nests a new installation.
  if (/^[a-f0-9]{64}$/.test(basename(release))) {
    if (basename(parent) === "apps") return dirname(parent);
    if (basename(parent) === "releases" && basename(dirname(parent)) === "updates")
      return dirname(dirname(parent));
  }
  return folder;
}
export const directory = dataDirectory();
export const updateDirectory = join(directory, "updates");
