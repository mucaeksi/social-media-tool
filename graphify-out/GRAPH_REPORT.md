# Graph Report - social-media-tool  (2026-10-23)

## Corpus Check
- 236 files · ~185,530 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1421 nodes · 3432 edges · 102 communities (64 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fa60520`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- zip.mjs
- App.tsx
- manifest.json
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve veri yerleşimi
- social-accounts.test.mjs
- ref_node_crypto
- ai-install.mjs
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- worker/editorial.mjs
- SocialAccounts.tsx
- update.test.mjs
- check-ai.mjs
- CompanyAccounts.tsx
- companies
- Windows ve Firefox ile kalıcı sosyal hesap girişleri
- README.md
- META_KURULUM.md
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- api
- AdvertisingWorkspace.tsx
- setup-firefox.sh
- release-v1.1.mjs
- dependencies
- devDependencies
- api
- App.tsx
- publications.mjs
- ref_node_path
- publisher.js
- social-ai.mjs
- computerError
- media.mjs
- ref_node_fs
- KKTC uzman çalışma alanı — mevcut programa yama
- app.mjs
- portable-data.test.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- advertising.d.mts
- page-agent.js
- ref_node_child_process
- worker/index.mjs
- ContentWorkspace.tsx
- AD_GUIDE_VERSION
- YEREL_MODEL_SECIMI.md
- r2-budget.test.mjs
- Sosyal Studio 1.8 kullanımı
- Gece araştırması ve yerel hafıza — 1.7
- main.tsx
- 0003_r2_budget.sql
- adProviderIds
- editorialKinds
- initialChannels
- reviewStates
- LOCAL_MODEL
- LOCAL_MODEL_LABEL
- STUDIO_VERSION
- PLATFORM_CATALOG_VERSION
- platformGuidance
- platformIds
- platformMap
- platforms
- browser-tools.mjs
- Firefox bağlantısı ve gerçek Qwen testi — 1.11
- company-computer.test.mjs
- adProviders
- advertisingRules
- Aynı Firefox penceresinde otomatik yayın · 1.10
- KKTC reklam çalışma alanı · 1.9
- shared/local-ai.mjs
- tests/firefox-extension.test.mjs
- admin-provision.test.mjs
- tab-publishing.d.mts
- publication-policy.js
- createTabPublishingPolicy
- tabPublishing
- Projeye eklenen beceriler
- Sosyal Studio
- localErrors

## God Nodes (most connected - your core abstractions)
1. `App()` - 48 edges
2. `api()` - 48 edges
3. `LocalMemory` - 25 edges
4. `react` - 23 edges
5. `registerSocialAI()` - 23 edges
6. `companies` - 21 edges
7. `AdvertisingWorkspace()` - 21 edges
8. `LocalAI` - 20 edges
9. `@playwright/test` - 20 edges
10. `scripts` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Projeye özgü geliştirme notları` --references--> `FirefoxConnection()`  [INFERRED]
  AGENTS.md → src/FirefoxConnection.tsx
- `Dağıtımın yaptığı işlemler` --references--> `main()`  [INFERRED]
  docs/CLOUDFLARE.md → scripts/install-test-firefox.mjs
- `Kodda doğrulanan mevcut durum` --references--> `main()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → scripts/install-test-firefox.mjs
- `Kodda doğrulanan mevcut durum` --references--> `computerCommand()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/computer-protocol.mjs
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx

## Import Cycles
- None detected.

## Communities (102 total, 38 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.08
Nodes (24): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı (+16 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "zip.mjs"
Cohesion: 0.19
Nodes (18): concat(), crc32(), createZip(), decoder, encoder, readZip(), safePath(), BackupManager() (+10 more)

### Community 3 - "App.tsx"
Cohesion: 0.08
Nodes (36): App(), applyAI(), brief(), changeCompany(), changed(), exportDraft(), generatePrompt(), guard() (+28 more)

### Community 4 - "manifest.json"
Cohesion: 0.09
Nodes (21): background, persistent, scripts, browser_action, default_popup, default_title, browser_specific_settings, gecko (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+11 more)

### Community 7 - "companion/package.json"
Cohesion: 0.17
Nodes (11): dependencies, puppeteer-core, engines, node, puppeteer-core, name, private, scripts (+3 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve veri yerleşimi"
Cohesion: 0.25
Nodes (7): AI bağlamı ve değerlendirme, Bileşenler, İçerik kayıtları, Mimari ve veri yerleşimi, Taslak ve medya, Yayınlama ve sınırlar, Yedek ve geri yükleme

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.11
Nodes (31): companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState(), accountCookies() (+23 more)

### Community 12 - "ref_node_crypto"
Cohesion: 0.12
Nodes (3): @playwright/test, ids, ids

### Community 13 - "ai-install.mjs"
Cohesion: 0.19
Nodes (13): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+5 more)

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "worker/editorial.mjs"
Cohesion: 0.14
Nodes (24): zod, adProviderIds, conflict(), date, draftAssetIds(), editorialKinds, id, initialChannels (+16 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "update.test.mjs"
Cohesion: 0.12
Nodes (24): installBundle(), bundleRoot, lock, directory, legacyDirectory, production, updateDirectory, archiveFiles (+16 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.06
Nodes (54): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http(), report (+46 more)

### Community 20 - "CompanyAccounts.tsx"
Cohesion: 0.17
Nodes (17): BrowserTab, BrowserTools(), PageRead, Account, CompanyAccounts(), close(), control(), open() (+9 more)

### Community 21 - "companies"
Cohesion: 0.06
Nodes (51): companies, drafts, drafts_company_updated, media, media_company, media_chunks, media_objects, media_objects_company (+43 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

### Community 23 - "README.md"
Cohesion: 0.19
Nodes (5): Korunan sınırlar, Sosyal Studio 1.8 — inceleme önerilerinin uygulanması, Sosyal Studio 1.10 doğrulaması, Sosyal Studio 1.8 doğrulaması, Sosyal Studio 1.9 doğrulaması

### Community 24 - "META_KURULUM.md"
Cohesion: 0.16
Nodes (10): Hesap tarafındaki hazırlık, Meta hesabında yapılacak işlem, Uygulama kimliğinden sonraki akış, Ücret sınırı, Ücretsiz resmi API bağlantısı için ilk kurulum, Doğrulanan kaynaklar, Geliştirici hesabında gereken hazırlık, Hangi yöntem kullanılabilir? (+2 more)

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.29
Nodes (7): Canlı kontrol durumu, Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

### Community 26 - "Sosyal hesaplara normal giriş"
Cohesion: 0.25
Nodes (8): Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, MCP ve sürekli açık tarayıcı, Oturum verisinin korunması, Sosyal hesaplara normal giriş, Wood Mood hazırlığı, Ücretsiz kullanım ve oturum ömrü

### Community 27 - "api"
Cohesion: 0.17
Nodes (15): ActivityFeed(), labels, refresh(), api(), ApiError, Job, LocalAIJobs(), Learning (+7 more)

### Community 28 - "AdvertisingWorkspace.tsx"
Cohesion: 0.10
Nodes (36): Account, advertisingContext(), AdvertisingWorkspace(), analyze(), refreshFirefox(), run(), store(), bindingKey() (+28 more)

### Community 30 - "release-v1.1.mjs"
Cohesion: 0.29
Nodes (9): archiveFiles, archivePath, crc32(), extractRelease(), manifestPath, releaseFiles, sha256(), sourceVersion() (+1 more)

### Community 31 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+2 more)

### Community 32 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, miniflare, @playwright/test, puppeteer-core, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 33 - "api"
Cohesion: 0.12
Nodes (25): date(), EditorialMetrics, Evaluation, Fact, Job, json(), Knowledge, MetricsWorkspace() (+17 more)

### Community 34 - "App.tsx"
Cohesion: 0.13
Nodes (23): lucide-react, react, AdvertisingWorkspace, blankCompany, ContentWorkspace, initialPlatforms, platformColors, ClaimReview() (+15 more)

### Community 35 - "publications.mjs"
Cohesion: 0.17
Nodes (18): computerCommand(), KKTC_EXPERT_VERSION, regionalFields, selectEvidence(), publicationBelongsTo(), computerAccount(), computerBroker(), computerPublicPaths (+10 more)

### Community 37 - "ref_node_path"
Cohesion: 0.11
Nodes (10): ProfileBrowsers, sharp, manifest, adProviders, advertisingKPIs(), sample, input, model (+2 more)

### Community 38 - "publisher.js"
Cohesion: 0.26
Nodes (16): allowed(), attachmentProof(), author(), busy(), button(), fields(), filesFor(), identity() (+8 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.12
Nodes (33): hono, selectedSchema, companies, fail(), observeImage(), VISION_LIMITS, VISION_MODEL, VISION_RATES (+25 more)

### Community 40 - "computerError"
Cohesion: 0.22
Nodes (6): COMPUTER_KEYS, COMPUTER_LIMITS, computerError(), validComputerResult(), CompanyComputer, call()

### Community 41 - "media.mjs"
Cohesion: 0.27
Nodes (12): fail(), jpegDimensions(), mediaTargets, objectKey(), parseMediaForm(), removeCompanyObjects(), transferMedia(), body() (+4 more)

### Community 42 - "ref_node_fs"
Cohesion: 0.14
Nodes (15): baseFiles, prepareFirefoxExtension(), configPath, configuration(), connect(), localAI, safeOrigin(), stop() (+7 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.14
Nodes (11): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler (+3 more)

### Community 45 - "app.mjs"
Cohesion: 0.10
Nodes (28): { app, store }, server, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), d1Compat() (+20 more)

### Community 46 - "portable-data.test.mjs"
Cohesion: 0.36
Nodes (5): dataDirectory(), copyTree(), exists(), migratePortableData(), names

### Community 47 - "Ana Firefox ile Sosyal Studio"
Cohesion: 0.25
Nodes (8): Ana Firefox ile Sosyal Studio, Doğrulama, İlk yükleme — normal Firefox, Kalıcı kullanım — Mozilla imzası veya ESR, Kapsam ve bağlantıyı kesme, Sekmeyi bağlama ve AI, Taslağı forma yerleştirme, Windows'ta tam otomatik kurulum — yardımcı 1.11 / eklenti 1.4

### Community 48 - "popup.js"
Cohesion: 0.48
Nodes (6): act(), call(), container, node(), refresh(), state

### Community 49 - "background.js"
Cohesion: 0.26
Nodes (8): cancelPreparation(), drainPublications(), expire(), publicationAPI(), publisher(), queue(), validBinding(), validWindow()

### Community 50 - "policy.js"
Cohesion: 0.60
Nodes (3): canonical(), clean(), target()

### Community 54 - "ref_node_child_process"
Cohesion: 0.09
Nodes (12): normalFirefox(), children, child, run, root, executable, version, child (+4 more)

### Community 56 - "worker/index.mjs"
Cohesion: 0.17
Nodes (18): LOCAL_EXPERT_VERSION, qualityCases, briefSchema, companySchema, postSchema, regionalSchema, app, company() (+10 more)

### Community 57 - "ContentWorkspace.tsx"
Cohesion: 0.17
Nodes (15): campaignUrl(), latestMeasurements(), zonedTime(), ContentWorkspace(), refresh(), run(), save(), fields (+7 more)

### Community 61 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (9): bytes, delete(), get(), createR2Media(), reserve(), periodAt(), quotaError(), R2_LIMITS (+1 more)

### Community 62 - "Sosyal Studio 1.8 kullanımı"
Cohesion: 0.20
Nodes (10): Gece araştırması ve kaynak kontrolü, Gerçek ölçüm ve deneyler, Güncelleme ve doğrulama sınırı, Kampanya, ürün ve içerik onayı, Medya, slaytlar ve kırpma, Sosyal Studio 1.8 kullanımı, Takvim ve video hazırlığı, Tam içerik yedeği (+2 more)

### Community 63 - "Gece araştırması ve yerel hafıza — 1.7"
Cohesion: 0.40
Nodes (4): Doğrulama, Gece araştırması ve yerel hafıza — 1.7, Kaynaklar ve sınırlar, Kullanım

### Community 84 - "browser-tools.mjs"
Cohesion: 0.35
Nodes (9): browserTool(), readPage(), safeReadURL(), uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity() (+1 more)

### Community 85 - "Firefox bağlantısı ve gerçek Qwen testi — 1.11"
Cohesion: 0.40
Nodes (5): Firefox bağlantısı ve gerçek Qwen testi — 1.11, Hesap sekmelerini birlikte bağlama, İstekle sekme bulma ve inceleme, Qwen'in gerçekten yanıt verdiğini kontrol etme, Taslaktan otomatik yayına geçiş

### Community 86 - "company-computer.test.mjs"
Cohesion: 0.11
Nodes (22): jose, miniflare, LOCAL_MODEL, accountId, command(), companyId, otherAccount, otherCompany (+14 more)

### Community 89 - "Aynı Firefox penceresinde otomatik yayın · 1.10"
Cohesion: 0.33
Nodes (6): Aynı Firefox penceresinde otomatik yayın · 1.11, Doğrulamanın sınırı, Gönderimi başlatma, İlk hazırlık, İzleme, zamanlama ve kesinti, Platform biçimleri

### Community 90 - "KKTC reklam çalışma alanı · 1.9"
Cohesion: 0.50
Nodes (4): Aynı Firefox penceresi, KKTC reklam çalışma alanı · 1.9, Plan ve ölçüm, Reklam konusunda gelişmesi

### Community 91 - "shared/local-ai.mjs"
Cohesion: 0.05
Nodes (42): LocalAI, LocalMemory, validCompany(), NightLearning, aiRoot, [executable, models], exited, runtimeHome (+34 more)

### Community 92 - "tests/firefox-extension.test.mjs"
Cohesion: 0.12
Nodes (18): crc32(), releaseFiles, central, contents, directory, end, extensionSources, parts (+10 more)

### Community 93 - "admin-provision.test.mjs"
Cohesion: 0.50
Nodes (4): fixture(), database(), migration(), seed

### Community 95 - "publication-policy.js"
Cohesion: 0.80
Nodes (4): canonical(), ownedURL(), postURL(), profile()

### Community 96 - "createTabPublishingPolicy"
Cohesion: 0.80
Nodes (5): createTabPublishingPolicy(), canonical(), ownedURL(), postURL(), profile()

### Community 99 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 104 - "Sosyal Studio"
Cohesion: 0.33
Nodes (6): Başvuru, Günlük çalışma, Sosyal Studio, Yedek, Yerel geliştirme, Çalışan altyapı ve sınırlar

## Knowledge Gaps
- **28 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 513 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `GitHub ve Cloudflare dağıtımı` to `shared/local-ai.mjs`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub ve Cloudflare dağıtımı` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._
- **Why does `GitHub ve Cloudflare dağıtımı` connect `GitHub ve Cloudflare dağıtımı` to `META_KURULUM.md`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `Kodda doğrulanan mevcut durum` connect `shared/local-ai.mjs` to `GitHub ve Cloudflare dağıtımı`, `publications.mjs`, `social-ai.mjs`, `social-accounts.test.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08019323671497584 - nodes in this community are weakly interconnected._