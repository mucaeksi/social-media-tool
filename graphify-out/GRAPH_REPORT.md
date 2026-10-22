# Graph Report - social-media-tool  (2026-10-22)

## Corpus Check
- 214 files · ~153,522 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1284 nodes · 3113 edges · 95 communities (65 shown, 30 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `50ba76ef`
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
- dev.mjs
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- worker/editorial.mjs
- SocialAccounts.tsx
- SocialAI.tsx
- check-ai.mjs
- CompanyAccounts.tsx
- companies
- Windows ve Firefox ile kalıcı sosyal hesap girişleri
- Sosyal Studio
- README.md
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- Ücretsiz resmi API bağlantısı için ilk kurulum
- Sosyal platform bağlantıları
- setup-firefox.sh
- release-v1.1.mjs
- dependencies
- devDependencies
- api
- App.tsx
- Projeye eklenen beceriler
- ref_node_path
- research.mjs
- social-ai.mjs
- LocalMemory
- worker/local-ai.mjs
- ref_node_fs
- KKTC uzman çalışma alanı — mevcut programa yama
- app.mjs
- platforms.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- shared/local-ai.mjs
- launch.mjs
- update.test.mjs
- worker/index.mjs
- ContentWorkspace.tsx
- draftRecovery.ts
- YEREL_MODEL_SECIMI.md
- r2-budget.test.mjs
- Sosyal Studio 1.8 kullanımı
- Gece araştırması ve yerel hafıza — 1.7
- browser-tools.mjs
- 0003_r2_budget.sql
- social-profiles.test.mjs
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
- night-learning.test.mjs
- Updater
- company-computer.mjs
- company-computer.test.mjs
- release.mjs
- ollama-host.mjs
- local-ai.test.mjs
- tests/firefox-extension.test.mjs
- build-companion.mjs
- DOGRULAMA_1_8.md
- DEGISIKLIKLER_1_8.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 47 edges
2. `api()` - 42 edges
3. `LocalMemory` - 25 edges
4. `registerSocialAI()` - 23 edges
5. `companies` - 21 edges
6. `react` - 21 edges
7. `LocalAI` - 19 edges
8. `scripts` - 19 edges
9. `SocialAI()` - 19 edges
10. `@playwright/test` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Kodda doğrulanan mevcut durum` --references--> `computerCommand()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/computer-protocol.mjs
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `Projeye özgü geliştirme notları` --references--> `FirefoxConnection()`  [INFERRED]
  AGENTS.md → src/FirefoxConnection.tsx
- `GitHub ve Cloudflare` --references--> `CompanyComputer`  [INFERRED]
  AGENTS.md → worker/computer-relay.mjs
- `Kodda doğrulanan mevcut durum` --references--> `aiMessages()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → worker/social-ai.mjs

## Import Cycles
- None detected.

## Communities (95 total, 30 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "zip.mjs"
Cohesion: 0.18
Nodes (16): concat(), crc32(), createZip(), decoder, encoder, readZip(), safePath(), backup() (+8 more)

### Community 3 - "App.tsx"
Cohesion: 0.12
Nodes (27): App(), applyAI(), brief(), changeCompany(), changed(), exportDraft(), generatePrompt(), guard() (+19 more)

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
Nodes (28): ProfileBrowsers, companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState() (+20 more)

### Community 12 - "ref_node_crypto"
Cohesion: 0.14
Nodes (4): @playwright/test, sharp, ids, ids

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "worker/editorial.mjs"
Cohesion: 0.13
Nodes (24): conflict(), date, editorialKinds, id, initialChannels, platforms, preferencesSchema, recordSchemas (+16 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.09
Nodes (30): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, FirefoxBinding, FirefoxPage, firefoxQuestion(), firefoxRequest(), firefoxTabChoice() (+22 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.06
Nodes (55): jose, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+47 more)

### Community 20 - "CompanyAccounts.tsx"
Cohesion: 0.18
Nodes (16): BrowserTab, BrowserTools(), PageRead, Account, CompanyAccounts(), close(), control(), open() (+8 more)

### Community 21 - "companies"
Cohesion: 0.06
Nodes (51): companies, drafts, drafts_company_updated, media, media_company, media_chunks, media_objects, media_objects_company (+43 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

### Community 23 - "Sosyal Studio"
Cohesion: 0.33
Nodes (6): Başvuru, Günlük çalışma, Sosyal Studio, Yedek, Yerel geliştirme, Çalışan altyapı ve sınırlar

### Community 24 - "README.md"
Cohesion: 0.24
Nodes (3): 1.6 güncellemesi: otomatik Firefox ve daha güçlü AI, 1.7.1: ilk Firefox kurulumunun yarıda kesilmesi düzeltildi, 1.7 güncellemesi: gece araştırması ve yerel hafıza

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.29
Nodes (7): Canlı kontrol durumu, Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

### Community 26 - "Sosyal hesaplara normal giriş"
Cohesion: 0.25
Nodes (8): Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, MCP ve sürekli açık tarayıcı, Oturum verisinin korunması, Sosyal hesaplara normal giriş, Wood Mood hazırlığı, Ücretsiz kullanım ve oturum ömrü

### Community 27 - "Ücretsiz resmi API bağlantısı için ilk kurulum"
Cohesion: 0.40
Nodes (5): Hesap tarafındaki hazırlık, Meta hesabında yapılacak işlem, Uygulama kimliğinden sonraki akış, Ücret sınırı, Ücretsiz resmi API bağlantısı için ilk kurulum

### Community 28 - "Sosyal platform bağlantıları"
Cohesion: 0.40
Nodes (5): Doğrulanan kaynaklar, Geliştirici hesabında gereken hazırlık, Hangi yöntem kullanılabilir?, Oturumun kayıtlı kalması, Sosyal platform bağlantıları

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
Cohesion: 0.13
Nodes (25): ActivityFeed(), labels, api(), ApiError, date(), EditorialMetrics, Evaluation, Fact (+17 more)

### Community 34 - "App.tsx"
Cohesion: 0.12
Nodes (24): react, blankCompany, CompanyForm(), initialPlatforms, platformColors, Index, Resource, ClaimReview() (+16 more)

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_path"
Cohesion: 0.12
Nodes (14): files, prepareFirefoxExtension(), normalFirefox(), downloadFirefoxInstaller(), child, run, pairedRequire, manifest (+6 more)

### Community 38 - "research.mjs"
Cohesion: 0.23
Nodes (10): extractVisiblePage(), publicAddress(), publicHTML(), publicTarget(), researchProxy(), robotsDisallows(), WebsiteResearch, RESEARCH_LIMITS (+2 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.13
Nodes (29): hono, createPrompt(), companies, fail(), observeImage(), VISION_LIMITS, VISION_MODEL, VISION_RATES (+21 more)

### Community 40 - "LocalMemory"
Cohesion: 0.10
Nodes (17): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+9 more)

### Community 41 - "worker/local-ai.mjs"
Cohesion: 0.13
Nodes (24): zod, qualityCases, publicationBelongsTo(), computerAccount(), computerBroker(), fail(), registerKnowledge(), call() (+16 more)

### Community 42 - "ref_node_fs"
Cohesion: 0.17
Nodes (12): configPath, configuration(), connect(), localAI, safeOrigin(), stop(), ensureStudioFirefox(), hosts (+4 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "app.mjs"
Cohesion: 0.12
Nodes (18): { app, store }, server, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), d1Compat() (+10 more)

### Community 46 - "platforms.mjs"
Cohesion: 0.20
Nodes (13): adaptWithRules(), captionFor(), characterCount(), postWarnings(), tagsFrom(), PLATFORM_CATALOG_VERSION, platformMap, platforms (+5 more)

### Community 47 - "Ana Firefox ile Sosyal Studio"
Cohesion: 0.22
Nodes (8): Ana Firefox ile Sosyal Studio, Doğrulama, İlk yükleme — normal Firefox, Kalıcı kullanım — Mozilla imzası veya ESR, Kapsam ve bağlantıyı kesme, Sekmeyi bağlama ve AI, Taslağı forma yerleştirme, Windows'ta tam otomatik kurulum — yardımcı 1.6 / eklenti 1.1

### Community 48 - "popup.js"
Cohesion: 0.48
Nodes (6): act(), call(), container, node(), refresh(), state

### Community 49 - "background.js"
Cohesion: 0.36
Nodes (5): cancelPreparation(), expire(), queue(), validBinding(), validWindow()

### Community 50 - "policy.js"
Cohesion: 0.60
Nodes (3): canonical(), clean(), target()

### Community 51 - "shared/local-ai.mjs"
Cohesion: 0.16
Nodes (18): Kodda doğrulanan mevcut durum, LOCAL_MODEL, LOCAL_AI_LIMITS, LOCAL_EXPERT_VERSION, localErrors, localInput(), localPost(), platformGuidance (+10 more)

### Community 54 - "launch.mjs"
Cohesion: 0.18
Nodes (10): bundleRoot, lock, dataDirectory(), directory, legacyDirectory, updateDirectory, copyTree(), exists() (+2 more)

### Community 55 - "update.test.mjs"
Cohesion: 0.17
Nodes (11): production, archivePath, manifestPath, sha256(), installDependencies(), root, child, manifest (+3 more)

### Community 56 - "worker/index.mjs"
Cohesion: 0.17
Nodes (19): briefSchema, postSchema, regionalSchema, selectedSchema, app, company(), fail(), json() (+11 more)

### Community 57 - "ContentWorkspace.tsx"
Cohesion: 0.15
Nodes (16): campaignUrl(), latestMeasurements(), zonedTime(), BackupManager(), ContentWorkspace(), refresh(), run(), save() (+8 more)

### Community 58 - "draftRecovery.ts"
Cohesion: 0.20
Nodes (10): lucide-react, react-dom, AuthRoot(), logout(), forgetDraft(), forgetUser(), key(), recoverDraft() (+2 more)

### Community 61 - "r2-budget.test.mjs"
Cohesion: 0.14
Nodes (6): miniflare, tokens, bytes, delete(), get(), put()

### Community 62 - "Sosyal Studio 1.8 kullanımı"
Cohesion: 0.20
Nodes (10): Gece araştırması ve kaynak kontrolü, Gerçek ölçüm ve deneyler, Güncelleme ve doğrulama sınırı, Kampanya, ürün ve içerik onayı, Medya, slaytlar ve kırpma, Sosyal Studio 1.8 kullanımı, Takvim ve video hazırlığı, Tam içerik yedeği (+2 more)

### Community 63 - "Gece araştırması ve yerel hafıza — 1.7"
Cohesion: 0.40
Nodes (4): Doğrulama, Gece araştırması ve yerel hafıza — 1.7, Kaynaklar ve sınırlar, Kullanım

### Community 64 - "browser-tools.mjs"
Cohesion: 0.35
Nodes (9): browserTool(), readPage(), safeReadURL(), uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity() (+1 more)

### Community 66 - "social-profiles.test.mjs"
Cohesion: 0.40
Nodes (4): fixture(), database(), migration(), seed

### Community 84 - "night-learning.test.mjs"
Cohesion: 0.19
Nodes (10): NightLearning, validLocalResult(), clock, NIGHT_LIMITS, nightInput(), nightTime(), OFFICIAL_GUIDES, validNightStatus() (+2 more)

### Community 85 - "Updater"
Cohesion: 0.36
Nodes (5): supervise(), atomicJson(), boundedResponse(), Updater, fixture()

### Community 86 - "company-computer.mjs"
Cohesion: 0.20
Nodes (9): COMPUTER_KEYS, COMPUTER_LIMITS, computerCommand(), computerError(), validComputerResult(), computerPublicPaths, registerCompanyComputer(), CompanyComputer (+1 more)

### Community 87 - "company-computer.test.mjs"
Cohesion: 0.15
Nodes (15): accountId, command(), companyId, otherAccount, otherCompany, request(), send(), tokens (+7 more)

### Community 88 - "release.mjs"
Cohesion: 0.62
Nodes (5): installBundle(), archiveFiles, extractRelease(), sourceVersion(), validVersion()

### Community 89 - "ollama-host.mjs"
Cohesion: 0.25
Nodes (6): aiRoot, [executable, models], exited, runtimeHome, server, temporary

### Community 90 - "local-ai.test.mjs"
Cohesion: 0.33
Nodes (3): fixture(), input, model

### Community 91 - "tests/firefox-extension.test.mjs"
Cohesion: 0.29
Nodes (7): crc32(), buildFirefoxExtension(), extensionFiles, fixture(), connect(), target, value()

### Community 92 - "build-companion.mjs"
Cohesion: 0.15
Nodes (13): releaseFiles, central, contents, directory, end, extensionSources, parts, version (+5 more)

## Knowledge Gaps
- **22 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 465 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `shared/local-ai.mjs` to `social-ai.mjs`, `LocalMemory`, `social-accounts.test.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`, `company-computer.mjs`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `shared/local-ai.mjs`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._
- **Why does `platforms` connect `platforms.mjs` to `api`, `app.mjs`, `worker/editorial.mjs`, `shared/local-ai.mjs`, `check-ai.mjs`, `worker/index.mjs`, `r2-budget.test.mjs`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._