ALTER TABLE social_accounts ADD COLUMN profile_url TEXT NOT NULL DEFAULT '';
ALTER TABLE social_accounts ADD COLUMN auth_detected INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_profile ON social_accounts(company_id,platform,profile_url) WHERE profile_url <> '';
