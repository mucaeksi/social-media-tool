import { DatabaseSync } from "node:sqlite";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { webUrl, validResearchResult } from "../shared/research-protocol.mjs";
import { OFFICIAL_GUIDES, AD_GUIDES } from "../shared/night-learning.mjs";

const validCompany = (id) => {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      id || "",
    )
  )
    throw new Error("Yerel hafıza için şirket kimliği gerekli.");
};
export class LocalMemory {
  constructor(directory) {
    this.directory = join(directory, "ai");
    this.path = join(this.directory, "knowledge.sqlite");
  }
  use(action) {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(this.path);
    try {
      db.exec(`PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON; PRAGMA max_page_count=65536;
        CREATE TABLE IF NOT EXISTS contexts(company_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sources(company_id TEXT NOT NULL,url TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(company_id,url));
        CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS generation_company ON generations(company_id,created_at);
        CREATE TABLE IF NOT EXISTS night_plans(company_id TEXT PRIMARY KEY,data TEXT NOT NULL,enabled INTEGER NOT NULL,synced_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS night_attempts(day TEXT NOT NULL,company_id TEXT NOT NULL,url TEXT NOT NULL,state TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(day,company_id,url));
        CREATE TABLE IF NOT EXISTS night_notes(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,url TEXT NOT NULL,request_url TEXT NOT NULL,hash TEXT NOT NULL,summary TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL,valid_until TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS night_job_notes(job_id TEXT PRIMARY KEY,company_id TEXT NOT NULL,fingerprint TEXT NOT NULL,created_at TEXT NOT NULL);`);
      if (
        !db
          .prepare("PRAGMA table_info(night_attempts)")
          .all()
          .some((c) => c.name === "reason")
      )
        db.exec(
          "ALTER TABLE night_attempts ADD COLUMN reason TEXT NOT NULL DEFAULT ''",
        );
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = action(db);
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    } finally {
      db.close();
    }
  }
  initialize() {
    this.use(() => {});
  }
  current(companyId) {
    validCompany(companyId);
    return this.use((db) =>
      JSON.parse(
        db
          .prepare("SELECT data FROM contexts WHERE company_id=?")
          .get(companyId)?.data || "null",
      ),
    );
  }
  context(input) {
    validCompany(input.companyId);
    // Current server-approved context replaces the snapshot; old/deleted facts
    // are never silently added back into a generation prompt.
    const data = JSON.stringify({
      profile: input.profile,
      entries: input.entries,
    });
    if (Buffer.byteLength(data) > 100000)
      throw new Error("Yerel bağlam sınırı aşıldı.");
    this.use((db) => {
      if (
        !db
          .prepare("SELECT 1 FROM contexts WHERE company_id=?")
          .get(input.companyId) &&
        db.prepare("SELECT COUNT(*) AS n FROM contexts").get().n >= 50
      )
        throw new Error("Yerel şirket sınırı doldu.");
      db.prepare(
        "INSERT INTO contexts VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      ).run(input.companyId, data, new Date().toISOString());
    });
  }
  research(companyId, result) {
    validCompany(companyId);
    if (!validResearchResult(result) || !result.ok)
      throw new Error("Araştırma sonucu geçersiz.");
    this.use((db) => {
      if (
        !db.prepare("SELECT 1 FROM contexts WHERE company_id=?").get(companyId)
      ) {
        if (db.prepare("SELECT COUNT(*) AS n FROM contexts").get().n >= 50)
          throw new Error("Yerel şirket sınırı doldu.");
        db.prepare("INSERT INTO contexts VALUES(?,?,?)").run(
          companyId,
          JSON.stringify({ profile: null, entries: [] }),
          new Date().toISOString(),
        );
      }
      for (const page of result.pages) {
        const url = webUrl(page.url),
          finalUrl = webUrl(page.finalUrl);
        const data = JSON.stringify({
          ...page,
          url,
          finalUrl,
          state: "unreviewed",
          hash: createHash("sha256").update(page.text).digest("hex"),
        });
        db.prepare(
          "INSERT INTO sources VALUES(?,?,?,?) ON CONFLICT(company_id,url) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
        ).run(companyId, url, data, new Date().toISOString());
      }
      db.prepare(
        "DELETE FROM sources WHERE company_id=? AND url NOT IN(SELECT url FROM sources WHERE company_id=? ORDER BY updated_at DESC,rowid DESC LIMIT 100)",
      ).run(companyId, companyId);
    });
  }
  generated(companyId, input, result) {
    validCompany(companyId);
    const data = JSON.stringify({
      question: input.question,
      mode: input.mode,
      answer: result.answer,
      posts: result.posts,
      observation: result.observation || null,
      state: "draft",
      published: false,
    });
    if (Buffer.byteLength(data) > 80000)
      throw new Error("Yerel sonuç sınırı aşıldı.");
    this.use((db) => {
      db.prepare("INSERT INTO generations VALUES(?,?,?,?)").run(
        randomUUID(),
        companyId,
        data,
        new Date().toISOString(),
      );
      db.prepare(
        "DELETE FROM generations WHERE company_id=? AND id NOT IN(SELECT id FROM generations WHERE company_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100)",
      ).run(companyId, companyId);
      db.exec(
        "DELETE FROM generations WHERE id NOT IN(SELECT id FROM generations ORDER BY created_at DESC,rowid DESC LIMIT 1000)",
      );
    });
  }
  stats() {
    return this.use((db) => ({
      sources: db.prepare("SELECT COUNT(*) AS n FROM sources").get().n,
      generations: db.prepare("SELECT COUNT(*) AS n FROM generations").get().n,
      bytes: statSync(this.path).size,
    }));
  }
  nightSync(input, now = new Date()) {
    validCompany(input.companyId);
    this.use((db) => {
      const old = db
        .prepare("SELECT enabled FROM night_plans WHERE company_id=?")
        .get(input.companyId);
      if (
        !old &&
        db.prepare("SELECT COUNT(*) n FROM night_plans").get().n >= 50
      )
        throw new Error("Gece planı şirket sınırı doldu.");
      db.prepare(
        "INSERT INTO night_plans VALUES(?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET data=excluded.data,enabled=excluded.enabled,synced_at=excluded.synced_at",
      ).run(
        input.companyId,
        JSON.stringify({
          companyName: input.companyName,
          ...(input.adContext === undefined
            ? {}
            : { adContext: input.adContext }),
          sources: input.sources,
          ...(input.platforms ? { platforms: input.platforms } : {}),
          ...(input.advertising === undefined
            ? {}
            : {
                advertising: input.advertising,
                adProviders: input.adProviders,
              }),
        }),
        Number(input.enabled ?? Boolean(old ? old.enabled : true)),
        now.toISOString(),
      );
    });
  }
  nightPlans(now = new Date()) {
    return this.use((db) =>
      db
        .prepare(
          "SELECT * FROM night_plans WHERE enabled=1 AND synced_at>? ORDER BY company_id",
        )
        .all(new Date(+now - 7 * 86400000).toISOString())
        .map((r) => ({ companyId: r.company_id, ...JSON.parse(r.data) })),
    );
  }
  nightClaim(day, companyId, url, now = new Date()) {
    validCompany(companyId);
    webUrl(url);
    return this.use((db) => {
      db.prepare("DELETE FROM night_attempts WHERE at<?").run(
        new Date(+now - 30 * 86400000).toISOString(),
      );
      if (
        db.prepare("SELECT COUNT(*) n FROM night_attempts WHERE day=?").get(day)
          .n >= 20
      )
        return false;
      return (
        db
          .prepare(
            "INSERT OR IGNORE INTO night_attempts(day,company_id,url,state,at) SELECT ?,?,?,'running',? WHERE NOT EXISTS(SELECT 1 FROM night_attempts WHERE day=? AND url=?)",
          )
          .run(day, companyId, url, now.toISOString(), day, url).changes === 1
      );
    });
  }
  nightFinish(day, companyId, url, state, now = new Date(), reason = "") {
    this.use((db) =>
      db
        .prepare(
          "UPDATE night_attempts SET state=?,at=?,reason=? WHERE day=? AND company_id=? AND url=?",
        )
        .run(
          state,
          now.toISOString(),
          String(reason).slice(0, 100),
          day,
          companyId,
          url,
        ),
    );
  }
  nightLatest(companyId, url, now = new Date()) {
    validCompany(companyId);
    return this.use(
      (db) =>
        db
          .prepare(
            "SELECT hash FROM night_notes WHERE company_id=? AND url=? AND valid_until>? ORDER BY created_at DESC,rowid DESC LIMIT 1",
          )
          .get(companyId, url, now.toISOString())?.hash,
    );
  }
  nightNote(companyId, page, summary, validUntil, now = new Date()) {
    validCompany(companyId);
    webUrl(page.finalUrl);
    if (typeof summary !== "string" || !summary.trim() || summary.length > 4000)
      throw new Error("Gece özeti geçersiz.");
    this.use((db) => {
      db.prepare("DELETE FROM night_notes WHERE valid_until<=?").run(
        now.toISOString(),
      );
      db.prepare(
        "UPDATE night_notes SET state='rejected' WHERE company_id=? AND request_url=?",
      ).run(companyId, page.url);
      db.prepare(
        "INSERT INTO night_notes VALUES(?,?,?,?,?,?,'pending',?,?)",
      ).run(
        randomUUID(),
        companyId,
        page.finalUrl,
        page.url,
        createHash("sha256").update(page.text).digest("hex"),
        summary,
        now.toISOString(),
        validUntil,
      );
      db.prepare(
        "DELETE FROM night_notes WHERE company_id=? AND id NOT IN(SELECT id FROM night_notes WHERE company_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100)",
      ).run(companyId, companyId);
    });
  }
  nightReview(companyId, noteId, state) {
    validCompany(companyId);
    if (!["approved", "rejected"].includes(state))
      throw new Error("Not durumu geçersiz.");
    this.use((db) => {
      if (
        !db
          .prepare(
            "UPDATE night_notes SET state=? WHERE id=? AND company_id=? AND valid_until>? RETURNING id",
          )
          .get(state, noteId, companyId, new Date().toISOString())
      )
        throw new Error("Not bulunamadı veya süresi doldu.");
    });
  }
  nightStatus(companyId, now = new Date()) {
    validCompany(companyId);
    return this.use((db) => {
      const plan = db
        .prepare("SELECT * FROM night_plans WHERE company_id=?")
        .get(companyId);
      return {
        enabled: Boolean(plan?.enabled),
        advertisingEnabled: Boolean(plan && JSON.parse(plan.data).advertising),
        syncedAt: plan?.synced_at || "",
        running: false,
        expired: Boolean(
          plan && Date.parse(plan.synced_at) <= +now - 7 * 86400000,
        ),
        pendingCount: db
          .prepare(
            "SELECT COUNT(*) n FROM night_notes WHERE company_id=? AND state='pending' AND valid_until>?",
          )
          .get(companyId, now.toISOString()).n,
        notes: db
          .prepare(
            "SELECT n.id,n.url,n.summary,n.state,n.created_at AS createdAt,n.valid_until AS validUntil,(SELECT substr(previous.summary,1,700) FROM night_notes previous WHERE previous.company_id=n.company_id AND previous.request_url=n.request_url AND previous.rowid<n.rowid ORDER BY previous.rowid DESC LIMIT 1) AS previousSummary FROM night_notes n WHERE company_id=? AND valid_until>? ORDER BY (state='pending') DESC,created_at DESC,rowid DESC LIMIT 10",
          )
          .all(companyId, now.toISOString()),
        attempts: db
          .prepare(
            "SELECT url,state,at,reason FROM night_attempts WHERE company_id=? ORDER BY at DESC LIMIT 5",
          )
          .all(companyId),
      };
    });
  }
  learned(companyId, now = new Date()) {
    validCompany(companyId);
    return this.use((db) => {
      const plan = db
        .prepare("SELECT * FROM night_plans WHERE company_id=?")
        .get(companyId);
      const sources =
        plan && Date.parse(plan.synced_at) > +now - 7 * 86400000
          ? JSON.parse(plan.data).sources.filter(
              (s) => Date.parse(s.validUntil) > +now,
            )
          : [];
      const allowed = new Set(
        [
          ...OFFICIAL_GUIDES,
          ...(plan &&
          Date.parse(plan.synced_at) > +now - 7 * 86400000 &&
          JSON.parse(plan.data).advertising
            ? AD_GUIDES.filter(
                (g) =>
                  !JSON.parse(plan.data).adProviders ||
                  JSON.parse(plan.data).adProviders.includes(g.provider),
              )
            : []),
          ...sources,
        ].map((s) => s.url),
      );
      return db
        .prepare(
          "SELECT request_url,url,summary,created_at AS fetchedAt FROM night_notes WHERE company_id=? AND state='approved' AND valid_until>? ORDER BY created_at DESC,rowid DESC LIMIT 100",
        )
        .all(companyId, now.toISOString())
        .filter((n) => allowed.has(n.request_url))
        .slice(0, 3)
        .map(({ request_url, ...note }) => note);
    });
  }
  generationNotes(input) {
    const notes = this.learned(input.companyId)
      .slice(0, 2)
      .map((n) => ({ ...n, summary: n.summary.slice(0, 700) }));
    if (!input.jobId) return notes;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(notes))
      .digest("hex");
    this.use((db) => {
      const old = db
        .prepare("SELECT * FROM night_job_notes WHERE job_id=?")
        .get(input.jobId);
      if (
        input.resume &&
        ((old &&
          (old.company_id !== input.companyId ||
            old.fingerprint !== fingerprint)) ||
          (!old && notes.length))
      )
        throw Object.assign(new Error("Gece notları değişti."), {
          code: "CONTEXT_CHANGED",
        });
      db.prepare("INSERT OR REPLACE INTO night_job_notes VALUES(?,?,?,?)").run(
        input.jobId,
        input.companyId,
        fingerprint,
        new Date().toISOString(),
      );
      db.exec(
        "DELETE FROM night_job_notes WHERE job_id NOT IN(SELECT job_id FROM night_job_notes ORDER BY created_at DESC,rowid DESC LIMIT 1000)",
      );
    });
    return notes;
  }
}
