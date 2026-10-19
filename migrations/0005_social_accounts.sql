CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  label TEXT NOT NULL,
  encrypted_cookies TEXT,
  saved_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS social_accounts_company ON social_accounts(company_id);
