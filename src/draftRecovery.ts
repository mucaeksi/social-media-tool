import type { DraftInput } from "./types.ts";
export type Recovery = {
  userId: string;
  companyId: string;
  draftId: string | null;
  input: DraftInput;
  savedAt: number;
};
const prefix = "studio:recovery:v1:";
const key = (userId: string, companyId: string) =>
  prefix + userId + ":" + companyId;
export function rememberDraft(
  userId: string,
  draftId: string | null,
  input: DraftInput,
) {
  try {
    const data = JSON.stringify({
      userId,
      companyId: input.companyId,
      draftId,
      input,
      savedAt: Date.now(),
    });
    if (data.length > 1_100_000) throw new Error();
    sessionStorage.setItem(key(userId, input.companyId), data);
    return true;
  } catch {
    return false;
  }
}
export function recoverDraft(
  userId: string,
  companyId: string,
): Recovery | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(key(userId, companyId)) || "null",
    );
    if (!value) return null;
    if (
      value.userId !== userId ||
      value.companyId !== companyId ||
      value.input?.companyId !== companyId ||
      !Number.isFinite(value.savedAt) ||
      value.savedAt > Date.now() + 60000 ||
      Date.now() - value.savedAt > 86400000 ||
      !Array.isArray(value.input?.selected) ||
      !Array.isArray(value.input?.posts)
    ) {
      forgetDraft(userId, companyId);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
export function forgetDraft(userId: string, companyId: string) {
  try {
    sessionStorage.removeItem(key(userId, companyId));
  } catch {}
}
export function forgetUser(userId: string) {
  try {
    for (const k of Object.keys(sessionStorage))
      if (k.startsWith(prefix + userId + ":")) sessionStorage.removeItem(k);
  } catch {}
}
export function workspacePreference(userId: string, companyId?: string) {
  try {
    if (companyId)
      localStorage.setItem("studio:last-company:" + userId, companyId);
    return localStorage.getItem("studio:last-company:" + userId) || "";
  } catch {
    return "";
  }
}
