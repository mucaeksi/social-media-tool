CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(json_valid(data)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS drafts_company_updated ON drafts(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS media_company ON media(company_id);
