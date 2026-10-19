CREATE TABLE computer_pairings (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE company_computers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  pairing_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);
CREATE TABLE computer_profiles (
  account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES company_computers(id) ON DELETE CASCADE,
  last_opened_at TEXT NOT NULL,
  auth_detected INTEGER,
  PRIMARY KEY(account_id,device_id)
);
