CREATE TABLE company_access (
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(company_id,user_id)
);
INSERT INTO company_access(company_id,user_id)
SELECT c.id,u.id FROM companies c CROSS JOIN users u WHERE u.role='editor' AND u.enabled=1;
CREATE TABLE research_sources (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
  approved_by TEXT,
  approved_at TEXT,
  valid_until TEXT,
  UNIQUE(company_id,final_url,content_hash)
);
CREATE INDEX research_company ON research_sources(company_id,fetched_at DESC);
CREATE TABLE research_facts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  evidence TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  retired_at TEXT
);
CREATE INDEX research_fact_company ON research_facts(company_id,valid_until);
CREATE TABLE publication_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
  fingerprint TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  result_url TEXT,
  detail TEXT NOT NULL DEFAULT '',
  UNIQUE(account_id,fingerprint,scheduled_at)
);
CREATE INDEX publication_due ON publication_jobs(state,scheduled_at);
CREATE TABLE workspace_events (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE content_evaluations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  scenario TEXT NOT NULL,
  answer TEXT NOT NULL,
  scores TEXT NOT NULL CHECK(json_valid(scores)),
  created_at TEXT NOT NULL
);
CREATE TABLE content_metrics (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES publication_jobs(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  recorded_by TEXT NOT NULL
);
CREATE TABLE ai_evidence (
  turn_id TEXT PRIMARY KEY REFERENCES ai_turns(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE TABLE local_ai_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  state TEXT NOT NULL,
  request_json TEXT NOT NULL CHECK(json_valid(request_json)),
  context_hash TEXT NOT NULL,
  progress_json TEXT NOT NULL DEFAULT '{"posts":[],"observation":null}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX local_ai_job_scope ON local_ai_jobs(company_id,user_id,created_at DESC);
