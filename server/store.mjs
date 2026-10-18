import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function createStore(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`);
  const decode = (row) => (row ? JSON.parse(row.data) : null);
  return {
    db,
    companies: () =>
      db
        .prepare("SELECT data FROM companies ORDER BY created_at")
        .all()
        .map(decode),
    company: (id) =>
      decode(db.prepare("SELECT data FROM companies WHERE id=?").get(id)),
    saveCompany: (data, id = randomUUID()) => {
      const company = { ...data, id };
      db.prepare(
        "INSERT INTO companies (id,data,created_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      ).run(id, JSON.stringify(company), new Date().toISOString());
      return company;
    },
    deleteCompany: (id) =>
      db.prepare("DELETE FROM companies WHERE id=?").run(id),
    saveMedia: (data) => {
      const media = { ...data, id: randomUUID() };
      db.prepare("INSERT INTO media (id,company_id,data) VALUES (?,?,?)").run(
        media.id,
        media.companyId,
        JSON.stringify(media),
      );
      return media;
    },
    media: (id) =>
      decode(db.prepare("SELECT data FROM media WHERE id=?").get(id)),
    companyMedia: (id) =>
      db
        .prepare("SELECT data FROM media WHERE company_id=?")
        .all(id)
        .map(decode),
    drafts: (companyId) =>
      db
        .prepare(
          "SELECT data FROM drafts WHERE company_id=? ORDER BY updated_at DESC",
        )
        .all(companyId)
        .map(decode),
    draft: (id) =>
      decode(db.prepare("SELECT data FROM drafts WHERE id=?").get(id)),
    saveDraft: (data, id = randomUUID()) => {
      const old = decode(
        db.prepare("SELECT data FROM drafts WHERE id=?").get(id),
      );
      const now = new Date().toISOString();
      const draft = {
        ...data,
        id,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      db.prepare(
        "INSERT INTO drafts (id,company_id,data,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      ).run(id, data.companyId, JSON.stringify(draft), draft.createdAt, now);
      return draft;
    },
    deleteDraft: (id) => db.prepare("DELETE FROM drafts WHERE id=?").run(id),
    close: () => db.close(),
  };
}
