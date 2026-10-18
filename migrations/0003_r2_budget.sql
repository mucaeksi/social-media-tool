CREATE TABLE r2_budget (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  period TEXT NOT NULL DEFAULT '',
  class_a INTEGER NOT NULL DEFAULT 0 CHECK(class_a>=0),
  class_b INTEGER NOT NULL DEFAULT 0 CHECK(class_b>=0),
  stored_bytes INTEGER NOT NULL DEFAULT 0 CHECK(stored_bytes>=0),
  reservation TEXT NOT NULL DEFAULT ''
);
CREATE TABLE r2_objects (
  object_key TEXT PRIMARY KEY,
  size INTEGER NOT NULL CHECK(size>=0),
  pending INTEGER NOT NULL DEFAULT 0 CHECK(pending IN (0,1))
);
-- Older images have no byte ledger. Reserve their maximum permitted size so
-- upgrading cannot silently make existing application images disappear from usage.
INSERT INTO r2_objects(object_key,size)
SELECT 'companies/' || m.company_id || '/' || m.id || '/' || t.value || '.jpg', 4194304
FROM media AS m
CROSS JOIN json_each('["original","facebook_contain","facebook_cover","instagram_contain","instagram_cover","x_contain","x_cover","threads_contain","threads_cover","pinterest_contain","pinterest_cover","youtube_contain","youtube_cover","tiktok_contain","tiktok_cover","linkedin_contain","linkedin_cover"]') AS t
WHERE COALESCE(json_extract(m.data,'$.storage'),'r2')='r2';
INSERT INTO r2_budget(singleton,stored_bytes)
VALUES(1,COALESCE((SELECT SUM(size) FROM r2_objects),0));
