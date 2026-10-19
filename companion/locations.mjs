import { homedir } from "node:os";
import { join } from "node:path";

export const production =
  "https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev";
export const directory = join(
  process.env.LOCALAPPDATA || join(homedir(), ".local", "share"),
  "SosyalStudio",
);
export const updateDirectory = join(directory, "updates");
