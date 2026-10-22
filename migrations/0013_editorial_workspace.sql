CREATE TABLE IF NOT EXISTS draft_versions (
  draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data)),
  created_at TEXT NOT NULL,
  PRIMARY KEY(draft_id,revision)
);
CREATE INDEX IF NOT EXISTS draft_versions_company ON draft_versions(company_id,created_at);
CREATE TABLE IF NOT EXISTS editorial_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('campaign','product','idea','experiment','correction','metric','benchmark','plan')),
  data TEXT NOT NULL CHECK(json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS editorial_company_kind ON editorial_records(company_id,kind,updated_at DESC);
CREATE TABLE IF NOT EXISTS editorial_preferences (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data)),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS editorial_archives (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS editorial_restores (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_generation_trace (
  turn_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE TABLE IF NOT EXISTS media_usage_leases (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_usage_active ON media_usage_leases(media_id,expires_at);
