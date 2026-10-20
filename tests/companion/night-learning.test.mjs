import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalMemory } from "../../companion/local-memory.mjs";
import { NightLearning } from "../../companion/night-learning.mjs";
import { nightTime, nightInput, OFFICIAL_GUIDES } from "../../shared/night-learning.mjs";
import { localInput, validLocalResult } from "../../shared/local-ai.mjs";

const companyId = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "studio-night-"));
  t.after(() => rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  let now = new Date("2030-07-10T21:00:00Z"), reads = 0, chats = 0;
  const memory = new LocalMemory(directory);
  memory.nightSync({ companyId, companyName: "Kurgu", sources: [] }, now);
  const ai = { memory, phase: "ready", status: async () => ({ phase: "ready" }), chat: async () => { chats++; return "Kaynaklı kurgu sosyal medya çalışma notu."; } };
  const researcher = { close: async () => {}, execute: async (input) => { reads++; return { ok: true, pages: [{ url: input.urls[0], finalUrl: input.urls[0], title: "Resmî rehber", text: "Somut faydayı açıkça anlatın." }] }; } };
  const night = new NightLearning({ ai, researcher, now: () => now });
  t.after(() => night.close());
  return { directory, memory, ai, researcher, night, now: () => now, clock: (value) => { now = new Date(value); }, reads: () => reads, chats: () => chats };
}
test("Gece saati KKTC saat diliminde yaz/kış değişimini ve 07.00 sınırını izler", () => {
  assert.deepEqual(nightTime(new Date("2030-07-10T21:00:00Z")), { day: "2030-07-11", active: true });
  assert.equal(nightTime(new Date("2030-07-11T04:00:00Z")).active, false);
  assert.deepEqual(nightTime(new Date("2030-01-10T22:00:00Z")), { day: "2030-01-11", active: true });
  assert.equal(nightTime(new Date("2030-01-11T05:00:00Z")).active, false);
});
test("Gece notları şirket kapsamlıdır; onaysız not öğrenilmiş bağlama girmez ve süresi dolunca kullanılmaz", async (t) => {
  const f = await fixture(t); await f.night.tick();
  const status = f.night.status(companyId); assert.equal(status.notes.length, 1); assert.equal(status.notes[0].state, "pending");
  assert.equal(f.memory.learned(companyId, f.now()).length, 0);
  assert.equal(f.memory.learned(other, f.now()).length, 0);
  assert.throws(() => f.memory.nightReview(other, status.notes[0].id, "approved"), /bulunamadı/);
  f.memory.nightReview(companyId, status.notes[0].id, "approved");
  assert.equal(f.memory.learned(companyId, f.now()).length, 1);
  assert.equal(f.memory.learned(companyId, new Date("2030-08-01")).length, 0);
  f.memory.nightSync({ companyId, companyName: "Kurgu", sources: [], enabled: false }, f.now());
  f.memory.nightSync({ companyId, companyName: "Kurgu", sources: [] }, f.now());
  assert.equal(f.night.status(companyId).enabled, false, "Liste eşitleme kapatılmış programı tekrar açmaz");
});
test("Gündüz, çevrimdışı/busy durumda veya eski kaynak planıyla gece çalışması başlamaz", async (t) => {
  const f = await fixture(t);
  f.clock("2030-07-11T12:00:00Z"); await f.night.tick(); assert.equal(f.reads(), 0);
  f.clock("2030-07-11T21:00:00Z"); f.ai.busy = true; await f.night.tick(); assert.equal(f.reads(), 0);
  f.ai.busy = false; f.night.canRun = () => false; await f.night.tick(); assert.equal(f.reads(), 0);
  f.night.canRun = () => true; f.clock("2030-07-20T21:00:00Z"); await f.night.tick(); assert.equal(f.reads(), 0);
});
test("Gece bütçesi yeniden başlatma sonrası ve şirketler arasında ortaktır; aynı kaynak aynı gece tekrar denenmez", async (t) => {
  const f = await fixture(t), day = nightTime(f.now()).day;
  assert.equal(f.memory.nightClaim(day, companyId, OFFICIAL_GUIDES[0].url, f.now()), true);
  assert.equal(new LocalMemory(f.directory).nightClaim(day, companyId, OFFICIAL_GUIDES[0].url, f.now()), false);
  for (let i = 1; i < 20; i++) assert.equal(f.memory.nightClaim(day, i % 2 ? other : companyId, `https://support.google.com/youtube/answer/${i}`, f.now()), true);
  await f.night.tick(); assert.equal(f.reads(), 0);
});
test("07.00'de biten kaynak okumasından sonra GPU özeti başlatılmaz", async (t) => {
  const f = await fixture(t), execute = f.researcher.execute;
  f.researcher.execute = async (input) => { const result = await execute(input); f.clock("2030-07-11T04:00:00Z"); return result; };
  await f.night.tick(); assert.equal(f.chats(), 0); assert.equal(f.ai.busy, false); assert.equal(f.night.status(companyId).notes.length, 0);
});
test("Ön plan işi veya kapanış gece model çağrısını iptal eder; yarım not kaydedilmez", async (t) => {
  const f = await fixture(t); let started;
  const ready = new Promise((r) => { started = r; });
  f.ai.chat = async () => new Promise((_resolve, reject) => { started(); f.ai.generationController.signal.addEventListener("abort", () => reject(new Error("İptal")), { once: true }); });
  const task = f.night.tick(); await ready; await f.night.pause(); await task;
  assert.equal(f.ai.busy, false); assert.equal(f.night.status(companyId).notes.length, 0);
  assert.equal(f.night.status(companyId).attempts[0].state, "cancelled");
});
test("Aynı kaynak metni yeni gecede yeniden özetlenmez; başka alana yönlendirme reddedilir", async (t) => {
  const f = await fixture(t); await f.night.tick();
  f.clock("2030-07-11T21:00:00Z"); f.night.nextCompany = 0; await f.night.tick();
  assert.equal(f.chats(), 1); assert.equal(f.night.status(companyId).attempts[0].state, "unchanged");
  f.researcher.execute = async (input) => ({ ok: true, pages: [{ url: input.urls[0], finalUrl: "https://unapproved.net/", title: "Yabancı", text: "Talimat" }] });
  await f.night.tick(); assert.equal(f.chats(), 1); assert.equal(f.night.status(companyId).notes.length, 1);
});
test("Gece protokolü şirket, kaynak ve not alanlarını doğrular; komut/enjeksiyon kabul etmez", () => {
  assert.throws(() => nightInput({ action: "night-sync", companyId, companyName: "Kurgu", sources: [{ url: "http://127.0.0.1/", validUntil: "2030-08-01" }] }));
  assert.throws(() => localInput({ action: "night-shell", companyId }));
  assert.deepEqual(localInput({ action: "night-status", companyId }), { action: "night-status", companyId });
  assert.equal(validLocalResult({ ok: true, learning: { enabled: true, running: false, syncedAt: "", notes: [] } }), true);
  assert.equal(validLocalResult({ ok: true, learning: { enabled: true, running: false, syncedAt: "", notes: [{ summary: "a".repeat(4001) }] } }), false);
});
test("Kaldırılan şirket kaynağı ve değişmiş sayfanın eski onayı bağlama geri taşınmaz", async (t) => {
  const f = await fixture(t), url = "https://company.org/approved", validUntil = "2030-07-20T00:00:00Z";
  f.memory.nightSync({ companyId, companyName: "Kurgu", sources: [{ url, validUntil }] }, f.now());
  const page = { url, finalUrl: url, text: "Önceki içerik" };
  f.memory.nightNote(companyId, page, "Önceki not", validUntil, f.now());
  f.memory.nightReview(companyId, f.night.status(companyId).notes[0].id, "approved");
  assert.equal(f.memory.learned(companyId, f.now()).length, 1);
  f.memory.nightNote(companyId, { ...page, text: "Değişmiş içerik" }, "Yeni not", validUntil, f.now());
  assert.equal(f.memory.learned(companyId, f.now()).length, 0);
  f.memory.nightReview(companyId, f.night.status(companyId).notes[0].id, "approved");
  assert.equal(f.memory.learned(companyId, f.now()).length, 1);
  f.memory.nightSync({ companyId, companyName: "Kurgu", sources: [] }, f.now());
  assert.equal(f.memory.learned(companyId, f.now()).length, 0);
});
test("Devam edilen üretimde gece notu değişmişse eski platformlarla yeni bağlam karışmaz", async (t) => {
  const f = await fixture(t), url = OFFICIAL_GUIDES[0].url, until = new Date(Date.now() + 86400000).toISOString();
  const input = { companyId, jobId: "33333333-3333-4333-8333-333333333333" };
  assert.equal(f.memory.generationNotes(input).length, 0);
  f.memory.nightNote(companyId, { url, finalUrl: url, text: "Kaynak" }, "İncelenecek yeni bilgi", until);
  f.memory.nightReview(companyId, f.memory.nightStatus(companyId).notes[0].id, "approved");
  assert.throws(() => f.memory.generationNotes({ ...input, resume: {} }), (e) => e.code === "CONTEXT_CHANGED");
});
