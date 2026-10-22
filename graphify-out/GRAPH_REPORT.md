# Graph Report - social-media-tool  (2026-10-22)

## Corpus Check
- 222 files · ~163,845 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1329 nodes · 3229 edges · 95 communities (60 shown, 35 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d74c14a9`
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
- ai-install.test.mjs
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- worker/editorial.mjs
- SocialAccounts.tsx
- SocialAI.tsx
- check-ai.mjs
- CompanyAccounts
- companies
- Windows ve Firefox ile kalıcı sosyal hesap girişleri
- README.md
- META_KURULUM.md
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- company-computer.test.mjs
- Sosyal platform bağlantıları
- setup-firefox.sh
- release-v1.1.mjs
- dependencies
- devDependencies
- api
- App.tsx
- Projeye eklenen beceriler
- ref_node_assert
- CompanyAccounts.tsx
- social-ai.mjs
- LocalMemory
- api
- ref_node_fs
- KKTC uzman çalışma alanı — mevcut programa yama
- app.mjs
- shared/local-ai.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- advertising.d.mts
- page-agent.js
- launch.mjs
- worker/index.mjs
- ContentWorkspace.tsx
- AD_GUIDE_VERSION
- YEREL_MODEL_SECIMI.md
- r2-budget.test.mjs
- Sosyal Studio 1.8 kullanımı
- Gece araştırması ve yerel hafıza — 1.7
- browser-tools.mjs
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
- research.mjs
- update.test.mjs
- publications.mjs
- adProviders
- advertisingRules
- AuthUser
- ollama-host.mjs
- Sosyal Studio
- build-companion.mjs
- social-profiles.test.mjs
- editorial.spec.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 48 edges
2. `api()` - 46 edges
3. `LocalMemory` - 25 edges
4. `registerSocialAI()` - 23 edges
5. `react` - 22 edges
6. `companies` - 21 edges
7. `AdvertisingWorkspace()` - 21 edges
8. `LocalAI` - 19 edges
9. `scripts` - 19 edges
10. `@playwright/test` - 19 edges

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

## Communities (95 total, 35 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "zip.mjs"
Cohesion: 0.19
Nodes (18): concat(), crc32(), createZip(), decoder, encoder, readZip(), safePath(), BackupManager() (+10 more)

### Community 3 - "App.tsx"
Cohesion: 0.12
Nodes (28): AdvertisingWorkspace, App(), applyAI(), brief(), changeCompany(), changed(), exportDraft(), generatePrompt() (+20 more)

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

### Community 13 - "ai-install.test.mjs"
Cohesion: 0.14
Nodes (13): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+5 more)

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "worker/editorial.mjs"
Cohesion: 0.13
Nodes (25): zod, conflict(), date, draftAssetIds(), editorialKinds, id, initialChannels, platforms (+17 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.07
Nodes (37): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, zonedTime(), Account, advertisingContext(), AdvertisingWorkspace(), analyze() (+29 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.06
Nodes (59): jose, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+51 more)

### Community 20 - "CompanyAccounts"
Cohesion: 0.54
Nodes (8): CompanyAccounts(), close(), control(), open(), refresh(), run(), show(), sendClose()

### Community 21 - "companies"
Cohesion: 0.06
Nodes (51): companies, drafts, drafts_company_updated, media, media_company, media_chunks, media_objects, media_objects_company (+43 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

### Community 23 - "README.md"
Cohesion: 0.16
Nodes (8): Korunan sınırlar, Sosyal Studio 1.8 — inceleme önerilerinin uygulanması, Sosyal Studio 1.8 doğrulaması, Sosyal Studio 1.9 doğrulaması, Aynı Firefox penceresi, KKTC reklam çalışma alanı · 1.9, Plan ve ölçüm, Reklam konusunda gelişmesi

### Community 24 - "META_KURULUM.md"
Cohesion: 0.27
Nodes (5): Hesap tarafındaki hazırlık, Meta hesabında yapılacak işlem, Uygulama kimliğinden sonraki akış, Ücret sınırı, Ücretsiz resmi API bağlantısı için ilk kurulum

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.29
Nodes (7): Canlı kontrol durumu, Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

### Community 26 - "Sosyal hesaplara normal giriş"
Cohesion: 0.25
Nodes (8): Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, MCP ve sürekli açık tarayıcı, Oturum verisinin korunması, Sosyal hesaplara normal giriş, Wood Mood hazırlığı, Ücretsiz kullanım ve oturum ömrü

### Community 27 - "company-computer.test.mjs"
Cohesion: 0.19
Nodes (12): accountId, command(), companyId, otherAccount, otherCompany, request(), tokens, fail() (+4 more)

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
Cohesion: 0.19
Nodes (15): date(), EditorialMetrics, Evaluation, Fact, Job, json(), Knowledge, MetricsWorkspace() (+7 more)

### Community 34 - "App.tsx"
Cohesion: 0.13
Nodes (23): blankCompany, initialPlatforms, platformColors, PlatformIcon(), ClaimReview(), Instagram(), Linkedin(), Youtube() (+15 more)

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_assert"
Cohesion: 0.11
Nodes (14): normalFirefox(), child, run, { app, store }, server, pairedRequire, files, launchers (+6 more)

### Community 38 - "CompanyAccounts.tsx"
Cohesion: 0.13
Nodes (15): lucide-react, react, CompanyForm(), BrowserTab, BrowserTools(), PageRead, Account, ComputerStatus (+7 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.12
Nodes (32): hono, companies, image(), fail(), observeImage(), VISION_LIMITS, VISION_MODEL, VISION_RATES (+24 more)

### Community 40 - "LocalMemory"
Cohesion: 0.16
Nodes (5): LocalAI, LocalMemory, validCompany(), localFail(), fixture()

### Community 41 - "api"
Cohesion: 0.17
Nodes (15): ActivityFeed(), labels, api(), ApiError, Job, LocalAIJobs(), Learning, states (+7 more)

### Community 42 - "ref_node_fs"
Cohesion: 0.14
Nodes (15): baseFiles, prepareFirefoxExtension(), configPath, configuration(), connect(), localAI, safeOrigin(), stop() (+7 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.14
Nodes (11): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler (+3 more)

### Community 45 - "app.mjs"
Cohesion: 0.11
Nodes (24): sharp, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), d1Compat(), { app, store } (+16 more)

### Community 46 - "shared/local-ai.mjs"
Cohesion: 0.13
Nodes (22): Kodda doğrulanan mevcut durum, LOCAL_MODEL, LOCAL_AI_LIMITS, LOCAL_EXPERT_VERSION, localErrors, localInput(), localPlatforms, localPost() (+14 more)

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

### Community 54 - "launch.mjs"
Cohesion: 0.18
Nodes (10): bundleRoot, lock, dataDirectory(), directory, legacyDirectory, updateDirectory, copyTree(), exists() (+2 more)

### Community 56 - "worker/index.mjs"
Cohesion: 0.14
Nodes (22): qualityCases, briefSchema, companySchema, postSchema, regionalSchema, selectedSchema, app, company() (+14 more)

### Community 57 - "ContentWorkspace.tsx"
Cohesion: 0.14
Nodes (15): campaignUrl(), latestMeasurements(), ContentWorkspace, ContentWorkspace(), refresh(), run(), save(), fields (+7 more)

### Community 61 - "r2-budget.test.mjs"
Cohesion: 0.12
Nodes (16): miniflare, tokens, expectJSON(), newJob(), post(), request(), tokens, bytes (+8 more)

### Community 62 - "Sosyal Studio 1.8 kullanımı"
Cohesion: 0.20
Nodes (10): Gece araştırması ve kaynak kontrolü, Gerçek ölçüm ve deneyler, Güncelleme ve doğrulama sınırı, Kampanya, ürün ve içerik onayı, Medya, slaytlar ve kırpma, Sosyal Studio 1.8 kullanımı, Takvim ve video hazırlığı, Tam içerik yedeği (+2 more)

### Community 63 - "Gece araştırması ve yerel hafıza — 1.7"
Cohesion: 0.40
Nodes (4): Doğrulama, Gece araştırması ve yerel hafıza — 1.7, Kaynaklar ve sınırlar, Kullanım

### Community 64 - "browser-tools.mjs"
Cohesion: 0.38
Nodes (9): browserTool(), readPage(), safeReadURL(), uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity() (+1 more)

### Community 84 - "research.mjs"
Cohesion: 0.11
Nodes (21): NightLearning, extractVisiblePage(), publicAddress(), publicHTML(), publicTarget(), researchProxy(), robotsDisallows(), WebsiteResearch (+13 more)

### Community 85 - "update.test.mjs"
Cohesion: 0.16
Nodes (19): installBundle(), production, archiveFiles, archivePath, extractRelease(), manifestPath, sha256(), sourceVersion() (+11 more)

### Community 86 - "publications.mjs"
Cohesion: 0.13
Nodes (21): COMPUTER_KEYS, COMPUTER_LIMITS, computerCommand(), computerError(), validComputerResult(), publicationBelongsTo(), send(), computerAccount() (+13 more)

### Community 89 - "AuthUser"
Cohesion: 0.27
Nodes (5): react-dom, AuthRoot(), logout(), forgetUser(), AuthUser

### Community 90 - "ollama-host.mjs"
Cohesion: 0.25
Nodes (6): aiRoot, [executable, models], exited, runtimeHome, server, temporary

### Community 91 - "Sosyal Studio"
Cohesion: 0.33
Nodes (6): Başvuru, Günlük çalışma, Sosyal Studio, Yedek, Yerel geliştirme, Çalışan altyapı ve sınırlar

### Community 92 - "build-companion.mjs"
Cohesion: 0.09
Nodes (26): crc32(), releaseFiles, central, contents, directory, end, extensionSources, parts (+18 more)

### Community 93 - "social-profiles.test.mjs"
Cohesion: 0.40
Nodes (4): fixture(), database(), migration(), seed

## Knowledge Gaps
- **26 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 483 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `KKTC uzman çalışma alanı — mevcut programa yama`, `shared/local-ai.mjs`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `Kodda doğrulanan mevcut durum` connect `shared/local-ai.mjs` to `social-ai.mjs`, `LocalMemory`, `social-accounts.test.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`, `publications.mjs`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Why does `localInput()` connect `shared/local-ai.mjs` to `LocalMemory`, `research.mjs`, `ai-install.test.mjs`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._