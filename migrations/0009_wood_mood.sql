-- Yalnızca kullanıcının verdiği herkese açık şirket ve sayfa bağlantıları.
INSERT INTO companies(id,data,created_at)
SELECT '83b41c22-7e54-4ec2-bd01-75e6c8bf396a','{"name": "Wood Mood Mobilya", "handle": "@mobilyawoodmood", "website": "https://woodmoodmobilya.com/tr", "tone": "Samimi ve profesyonel", "audience": "", "keywords": "Wood Mood Mobilya, mobilya", "color": "#326f61"}',strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE (lower(trim(json_extract(data,'$.name'))) IN ('wood mood','wood mood mobilya') OR lower(json_extract(data,'$.website')) LIKE 'https://woodmoodmobilya.com/%' OR lower(json_extract(data,'$.website')) = 'https://woodmoodmobilya.com'));

UPDATE companies SET data=json_set(data,'$.website','https://woodmoodmobilya.com/tr')
WHERE id=(SELECT id FROM companies WHERE (lower(trim(json_extract(data,'$.name'))) IN ('wood mood','wood mood mobilya') OR lower(json_extract(data,'$.website')) LIKE 'https://woodmoodmobilya.com/%' OR lower(json_extract(data,'$.website')) = 'https://woodmoodmobilya.com') ORDER BY created_at,id LIMIT 1) AND coalesce(json_extract(data,'$.website'),'')='';

-- Tek bir eski boş kayıt varsa şifreli oturumunu ve kimliğini koruyarak bağla.
WITH target(platform,label,url,id) AS (VALUES
  ('facebook','Wood Mood Mobilya — Facebook','https://www.facebook.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000001'),
  ('instagram','Wood Mood Mobilya — Instagram','https://www.instagram.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000002'),
  ('tumblr','Wood Mood Mobilya — Tumblr','https://www.tumblr.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000003'),
  ('x','Wood Mood Mobilya — X','https://x.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000004'),
  ('youtube','Wood Mood Mobilya — YouTube','https://www.youtube.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000005'),
  ('tiktok','Wood Mood Mobilya — TikTok','https://www.tiktok.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000006'),
  ('pinterest','Wood Mood Mobilya — Pinterest','https://tr.pinterest.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000007'),
  ('threads','Wood Mood Mobilya — Threads','https://www.threads.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000008'),
  ('linkedin','Wood Mood Mobilya — LinkedIn','https://www.linkedin.com/company/145273536','81f760a8-634b-4566-9bae-000000000009')
), owner AS (SELECT id FROM companies WHERE (lower(trim(json_extract(data,'$.name'))) IN ('wood mood','wood mood mobilya') OR lower(json_extract(data,'$.website')) LIKE 'https://woodmoodmobilya.com/%' OR lower(json_extract(data,'$.website')) = 'https://woodmoodmobilya.com') ORDER BY created_at,id LIMIT 1)
UPDATE social_accounts AS existing
SET profile_url=(SELECT url FROM target WHERE platform=existing.platform)
WHERE company_id=(SELECT id FROM owner) AND profile_url=''
  AND platform IN (SELECT platform FROM target)
  AND (SELECT count(*) FROM social_accounts AS same WHERE same.company_id=existing.company_id AND same.platform=existing.platform AND same.profile_url='')=1
  AND NOT EXISTS (SELECT 1 FROM social_accounts AS linked WHERE linked.company_id=existing.company_id AND linked.platform=existing.platform AND linked.profile_url=(SELECT url FROM target WHERE platform=existing.platform));

WITH target(platform,label,url,id) AS (VALUES
  ('facebook','Wood Mood Mobilya — Facebook','https://www.facebook.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000001'),
  ('instagram','Wood Mood Mobilya — Instagram','https://www.instagram.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000002'),
  ('tumblr','Wood Mood Mobilya — Tumblr','https://www.tumblr.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000003'),
  ('x','Wood Mood Mobilya — X','https://x.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000004'),
  ('youtube','Wood Mood Mobilya — YouTube','https://www.youtube.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000005'),
  ('tiktok','Wood Mood Mobilya — TikTok','https://www.tiktok.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000006'),
  ('pinterest','Wood Mood Mobilya — Pinterest','https://tr.pinterest.com/mobilyawoodmood','81f760a8-634b-4566-9bae-000000000007'),
  ('threads','Wood Mood Mobilya — Threads','https://www.threads.com/@mobilyawoodmood','81f760a8-634b-4566-9bae-000000000008'),
  ('linkedin','Wood Mood Mobilya — LinkedIn','https://www.linkedin.com/company/145273536','81f760a8-634b-4566-9bae-000000000009')
), owner AS (SELECT id FROM companies WHERE (lower(trim(json_extract(data,'$.name'))) IN ('wood mood','wood mood mobilya') OR lower(json_extract(data,'$.website')) LIKE 'https://woodmoodmobilya.com/%' OR lower(json_extract(data,'$.website')) = 'https://woodmoodmobilya.com') ORDER BY created_at,id LIMIT 1)
INSERT INTO social_accounts(id,company_id,platform,label,profile_url,created_at)
SELECT target.id,owner.id,target.platform,target.label,target.url,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM target CROSS JOIN owner
WHERE NOT EXISTS (SELECT 1 FROM social_accounts AS existing WHERE existing.company_id=owner.id AND existing.platform=target.platform AND existing.profile_url=target.url)
ORDER BY target.id
LIMIT max(0,25-(SELECT count(*) FROM social_accounts WHERE company_id=(SELECT id FROM owner)))
ON CONFLICT DO NOTHING;
