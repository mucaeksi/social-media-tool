import { DatabaseSync } from "node:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { webUrl, validResearchResult } from "../shared/research-protocol.mjs";

const validCompany = (id) => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id || ""))
    throw new Error("Yerel hafıza için şirket kimliği gerekli.");
};
export class LocalMemory {
  constructor(directory) { this.directory = join(directory, "ai"); this.path = join(this.directory, "knowledge.sqlite"); }
  use(action) {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(this.path);
    try {
      db.exec(`PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON; PRAGMA max_page_count=65536;
        CREATE TABLE IF NOT EXISTS contexts(company_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sources(company_id TEXT NOT NULL,url TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(company_id,url));
        CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS generation_company ON generations(company_id,created_at);`);
      db.exec("BEGIN IMMEDIATE");
      try { const result = action(db); db.exec("COMMIT"); return result; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    } finally { db.close(); }
  }
  initialize() { this.use(() => {}); }
  current(companyId) {
    validCompany(companyId);
    return this.use((db) => JSON.parse(db.prepare("SELECT data FROM contexts WHERE company_id=?").get(companyId)?.data || "null"));
  }
  context(input) {
    validCompany(input.companyId);
    // Current server-approved context replaces the snapshot; old/deleted facts
    // are never silently added back into a generation prompt.
    const data = JSON.stringify({ profile: input.profile, entries: input.entries });
    if (Buffer.byteLength(data) > 100000) throw new Error("Yerel bağlam sınırı aşıldı.");
    this.use((db) => {
      if (!db.prepare("SELECT 1 FROM contexts WHERE company_id=?").get(input.companyId) &&
          db.prepare("SELECT COUNT(*) AS n FROM contexts").get().n >= 50) throw new Error("Yerel şirket sınırı doldu.");
      db.prepare("INSERT INTO contexts VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at")
        .run(input.companyId, data, new Date().toISOString());
    });
  }
  research(companyId, result) {
    validCompany(companyId);
    if (!validResearchResult(result) || !result.ok) throw new Error("Araştırma sonucu geçersiz.");
    this.use((db) => {
      if (!db.prepare("SELECT 1 FROM contexts WHERE company_id=?").get(companyId)) {
        if (db.prepare("SELECT COUNT(*) AS n FROM contexts").get().n >= 50) throw new Error("Yerel şirket sınırı doldu.");
        db.prepare("INSERT INTO contexts VALUES(?,?,?)").run(companyId, JSON.stringify({ profile: null, entries: [] }), new Date().toISOString());
      }
      for (const page of result.pages) {
        const url = webUrl(page.url), finalUrl = webUrl(page.finalUrl);
        const data = JSON.stringify({ ...page, url, finalUrl, state: "unreviewed",
          hash: createHash("sha256").update(page.text).digest("hex") });
        db.prepare("INSERT INTO sources VALUES(?,?,?,?) ON CONFLICT(company_id,url) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at")
          .run(companyId, url, data, new Date().toISOString());
      }
      db.prepare("DELETE FROM sources WHERE company_id=? AND url NOT IN(SELECT url FROM sources WHERE company_id=? ORDER BY updated_at DESC,rowid DESC LIMIT 100)").run(companyId, companyId);
    });
  }
  generated(companyId, input, result) {
    validCompany(companyId);
    const data = JSON.stringify({ question: input.question, mode: input.mode, answer: result.answer, posts: result.posts,
      observation: result.observation || null, state: "draft", published: false });
    if (Buffer.byteLength(data) > 80000) throw new Error("Yerel sonuç sınırı aşıldı.");
    this.use((db) => {
      db.prepare("INSERT INTO generations VALUES(?,?,?,?)").run(randomUUID(), companyId, data, new Date().toISOString());
      db.prepare("DELETE FROM generations WHERE company_id=? AND id NOT IN(SELECT id FROM generations WHERE company_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100)").run(companyId, companyId);
      db.exec("DELETE FROM generations WHERE id NOT IN(SELECT id FROM generations ORDER BY created_at DESC,rowid DESC LIMIT 1000)");
    });
  }
  stats() {
    return this.use((db) => ({ sources: db.prepare("SELECT COUNT(*) AS n FROM sources").get().n,
      generations: db.prepare("SELECT COUNT(*) AS n FROM generations").get().n, bytes: statSync(this.path).size }));
  }
}
