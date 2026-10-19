ALTER TABLE ai_turns ADD COLUMN media_id TEXT REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE ai_turns ADD COLUMN image_observation TEXT;
ALTER TABLE ai_turns ADD COLUMN expert_version TEXT;
