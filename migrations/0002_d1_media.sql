CREATE TABLE IF NOT EXISTS media_objects (
  object_key TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  first_bytes BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS media_objects_company ON media_objects(company_id);
CREATE TABLE IF NOT EXISTS media_chunks (
  object_key TEXT NOT NULL REFERENCES media_objects(object_key) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  bytes BLOB NOT NULL,
  PRIMARY KEY(object_key, chunk_index)
);
