CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('fact','rule','example')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_memory_company ON ai_memory(company_id,created_at,id);

CREATE TABLE IF NOT EXISTS ai_budget (
  day TEXT PRIMARY KEY,
  reserved_neurons INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ai_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reserved_neurons INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_requests_user ON ai_requests(user_id,created_at);

CREATE TABLE IF NOT EXISTS ai_turns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  posts TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_turns_company_user ON ai_turns(company_id,user_id,created_at,id);
