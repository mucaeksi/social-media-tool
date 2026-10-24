# Graph Report - social-media-tool  (2026-10-24)

## Corpus Check
- 260 files · ~211,344 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1561 nodes · 3769 edges · 113 communities (72 shown, 41 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4aba266`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api
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
- company-computer.test.mjs
- ProfileBrowsers
- research-platforms.py
- ai-install.test.mjs
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
- Sosyal Studio panel tasarımı
- App.tsx
- AdvertisingWorkspace.tsx
- setup-firefox.sh
- research.mjs
- dependencies
- devDependencies
- ExpertWorkspace.tsx
- worker/index.mjs
- SIRKET_BILGISAYARI.md
- ref_node_fs
- publisher.js
- social-ai.mjs
- Ücretsiz resmi API bağlantısı için ilk kurulum
- sharp
- ref_node_fs
- KKTC uzman çalışma alanı — mevcut programa yama
- app.mjs
- portable-data.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- advertising.d.mts
- companion/local-ai.mjs
- platforms.mjs
- tab-publications.mjs
- ContentWorkspace.tsx
- AD_GUIDE_VERSION
- YEREL_MODEL_SECIMI.md
- r2-budget.test.mjs
- Sosyal Studio 1.8 kullanımı
- Gece araştırması ve yerel hafıza — 1.7
- AdvertisingWorkspace.tsx
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
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- LocalMemory
- LocalAIStatus.tsx
- adProviders
- advertisingRules
- Aynı Firefox penceresinde otomatik yayın · 1.10
- KKTC reklam çalışma alanı · 1.9
- ai-install.test.mjs
- ECC: seçilen beceriler ve projeye uygulanışı
- release-v1.1.mjs
- tab-publishing.d.mts
- publication-policy.js
- createTabPublishingPolicy
- publications.mjs
- tabPublishing
- ollama-host.mjs
- main.tsx
- agent-background.js
- advertising.mjs
- Firefox bağlantısı ve gerçek Qwen testi — 1.11
- Sosyal Studio
- localErrors
- firefox-agent.d.mts
- Qwen ile sosyal medya Firefox'unu kullanma · 1.12
- firefoxAgent
- PRODUCT.md
- Projeye eklenen beceriler

## God Nodes (most connected - your core abstractions)
1. `api()` - 54 edges
2. `App()` - 48 edges
3. `LocalMemory` - 25 edges
4. `react` - 25 edges
5. `@playwright/test` - 24 edges
6. `registerSocialAI()` - 23 edges
7. `companies` - 21 edges
8. `AdvertisingWorkspace()` - 21 edges
9. `LocalAI` - 20 edges
10. `QwenSkills` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Dağıtımın yaptığı işlemler` --references--> `main()`  [INFERRED]
  docs/CLOUDFLARE.md → scripts/install-test-firefox.mjs
- `Kodda doğrulanan mevcut durum` --references--> `main()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → scripts/install-test-firefox.mjs
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `Projeye özgü geliştirme notları` --references--> `FirefoxConnection()`  [INFERRED]
  AGENTS.md → src/FirefoxConnection.tsx
- `GitHub ve Cloudflare` --references--> `CompanyComputer`  [INFERRED]
  AGENTS.md → worker/computer-relay.mjs

## Import Cycles
- None detected.

## Communities (113 total, 41 thin omitted)

### Community 0 - "api"
Cohesion: 0.20
Nodes (13): ActivityFeed(), labels, api(), ApiError, Job, LocalAIJobs(), AITurn, mb() (+5 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "zip.mjs"
Cohesion: 0.16
Nodes (20): concat(), crc32(), createZip(), decoder, encoder, readZip(), safePath(), BackupManager() (+12 more)

### Community 3 - "App.tsx"
Cohesion: 0.08
Nodes (35): App(), applyAI(), brief(), changeCompany(), changed(), exportDraft(), generatePrompt(), guard() (+27 more)

### Community 4 - "manifest.json"
Cohesion: 0.09
Nodes (22): background, persistent, scripts, browser_action, default_popup, default_title, browser_specific_settings, gecko (+14 more)

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
Cohesion: 0.13
Nodes (31): companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState(), accountCookies() (+23 more)

### Community 12 - "company-computer.test.mjs"
Cohesion: 0.06
Nodes (24): entries, files, manifest, qwenSkillsDigest, @playwright/test, core, QWEN_SKILLS_LICENSE, QWEN_SKILLS_PROMPT_BYTES (+16 more)

### Community 15 - "ai-install.test.mjs"
Cohesion: 0.10
Nodes (28): installBundle(), bundleRoot, lock, archiveFiles, archivePath, crc32(), extractRelease(), manifestPath (+20 more)

### Community 16 - "worker/editorial.mjs"
Cohesion: 0.14
Nodes (24): zod, conflict(), date, draftAssetIds(), editorialKinds, id, initialChannels, platforms (+16 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "update.test.mjs"
Cohesion: 0.13
Nodes (14): dataDirectory(), legacyDirectory, production, updateDirectory, supervise(), atomicJson(), boundedResponse(), installDependencies() (+6 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.05
Nodes (62): jose, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+54 more)

### Community 20 - "CompanyAccounts.tsx"
Cohesion: 0.18
Nodes (16): BrowserTab, BrowserTools(), PageRead, Account, CompanyAccounts(), close(), control(), open() (+8 more)

### Community 21 - "companies"
Cohesion: 0.06
Nodes (51): companies, drafts, drafts_company_updated, media, media_company, media_chunks, media_objects, media_objects_company (+43 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

### Community 23 - "README.md"
Cohesion: 0.19
Nodes (5): Korunan sınırlar, Sosyal Studio 1.8 — inceleme önerilerinin uygulanması, Sosyal Studio 1.10 doğrulaması, Sosyal Studio 1.8 doğrulaması, Panel düzeni ve kullanılan UI kaynakları · 1.14

### Community 24 - "META_KURULUM.md"
Cohesion: 0.13
Nodes (13): Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, MCP ve sürekli açık tarayıcı, Oturum verisinin korunması, Sosyal hesaplara normal giriş, Wood Mood hazırlığı, Ücretsiz kullanım ve oturum ömrü (+5 more)

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.29
Nodes (7): Canlı kontrol durumu, Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

### Community 26 - "Sosyal Studio panel tasarımı"
Cohesion: 0.40
Nodes (4): Bilgi mimarisi, Dar ekran ve denetim, Görsel sistem, Sosyal Studio panel tasarımı

### Community 27 - "App.tsx"
Cohesion: 0.13
Nodes (25): lucide-react, react, blankCompany, initialPlatforms, platformColors, ClaimReview(), Account, body() (+17 more)

### Community 28 - "AdvertisingWorkspace.tsx"
Cohesion: 0.13
Nodes (28): FirefoxAgent(), revoke(), start(), stop(), post(), Run, View, FirefoxBinding (+20 more)

### Community 30 - "research.mjs"
Cohesion: 0.14
Nodes (19): extractVisiblePage(), publicAddress(), publicHTML(), publicTarget(), researchProxy(), robotsDisallows(), WebsiteResearch, AD_GUIDES (+11 more)

### Community 31 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+2 more)

### Community 32 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, miniflare, @playwright/test, puppeteer-core, @types/react, @types/react-dom, typescript, vite (+2 more)

### Community 33 - "ExpertWorkspace.tsx"
Cohesion: 0.12
Nodes (28): Projeye özgü geliştirme notları, DraftAutomation(), start(), stop(), post(), publicationId(), date(), EditorialMetrics (+20 more)

### Community 34 - "worker/index.mjs"
Cohesion: 0.17
Nodes (18): qualityCases, briefSchema, companySchema, postSchema, regionalSchema, selectedSchema, app, company() (+10 more)

### Community 35 - "SIRKET_BILGISAYARI.md"
Cohesion: 0.13
Nodes (12): Bozulma, özelleştirme ve bakım, Dosyalar ve gerçek kullanım, Nereden kontrol edilir?, Qwen'in kendi beceri dosyaları · 1.14, Qwen ile yayın hazırlığını birleştirme · 1.13, Tek hazırlık akışı, Tekrar, iptal ve sınırlar, Uzman rehberi ve doğrulama (+4 more)

### Community 37 - "ref_node_fs"
Cohesion: 0.11
Nodes (16): browserTool(), readPage(), safeReadURL(), normalFirefox(), child, run, diagnostic(), retry() (+8 more)

### Community 38 - "publisher.js"
Cohesion: 0.13
Nodes (29): actor(), allowed(), current(), interactable(), observe(), pageText(), redactions(), visible() (+21 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.11
Nodes (35): hono, LOCAL_EXPERT_VERSION, companies, image(), fail(), observeImage(), VISION_LIMITS, VISION_MODEL (+27 more)

### Community 40 - "Ücretsiz resmi API bağlantısı için ilk kurulum"
Cohesion: 0.40
Nodes (5): Hesap tarafındaki hazırlık, Meta hesabında yapılacak işlem, Uygulama kimliğinden sonraki akış, Ücret sınırı, Ücretsiz resmi API bağlantısı için ilk kurulum

### Community 41 - "sharp"
Cohesion: 0.20
Nodes (8): sharp, platforms, createD1Media(), fail(), jpegDimensions(), mediaTargets, parseMediaForm(), removeCompanyObjects()

### Community 42 - "ref_node_fs"
Cohesion: 0.08
Nodes (21): baseFiles, prepareFirefoxExtension(), directory, configPath, configuration(), connect(), localAI, safeOrigin() (+13 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.20
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "app.mjs"
Cohesion: 0.16
Nodes (14): { app, store }, server, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), d1Compat() (+6 more)

### Community 46 - "portable-data.mjs"
Cohesion: 0.60
Nodes (4): copyTree(), exists(), migratePortableData(), names

### Community 47 - "Ana Firefox ile Sosyal Studio"
Cohesion: 0.25
Nodes (8): Ana Firefox ile Sosyal Studio, Doğrulama, İlk yükleme — normal Firefox, Kalıcı kullanım — Mozilla imzası veya ESR, Kapsam ve bağlantıyı kesme, Sekmeyi bağlama ve AI, Taslağı forma yerleştirme, Windows'ta tam otomatik kurulum — yardımcı 1.12 / eklenti 1.5

### Community 48 - "popup.js"
Cohesion: 0.48
Nodes (6): act(), call(), container, node(), refresh(), state

### Community 49 - "background.js"
Cohesion: 0.26
Nodes (8): cancelPreparation(), drainPublications(), expire(), publicationAPI(), publisher(), queue(), validBinding(), validWindow()

### Community 50 - "policy.js"
Cohesion: 0.60
Nodes (3): canonical(), clean(), target()

### Community 52 - "companion/local-ai.mjs"
Cohesion: 0.10
Nodes (28): postFormat, Kodda doğrulanan mevcut durum, COMPUTER_KEYS, COMPUTER_LIMITS, computerCommand(), validComputerResult(), LOCAL_MODEL, bounded() (+20 more)

### Community 54 - "platforms.mjs"
Cohesion: 0.16
Nodes (14): adaptWithRules(), captionFor(), characterCount(), postWarnings(), tagsFrom(), PLATFORM_CATALOG_VERSION, platformGuidance, platformMap (+6 more)

### Community 56 - "tab-publications.mjs"
Cohesion: 0.27
Nodes (11): tabPublishing, tabPublishingExtensionSource(), fail(), registerDraftAutomation(), schema, validateDraftRelations(), body(), fail() (+3 more)

### Community 57 - "ContentWorkspace.tsx"
Cohesion: 0.14
Nodes (15): campaignUrl(), latestMeasurements(), ContentWorkspace, ContentWorkspace(), refresh(), run(), save(), fields (+7 more)

### Community 61 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (9): bytes, delete(), get(), createR2Media(), reserve(), periodAt(), quotaError(), R2_LIMITS (+1 more)

### Community 62 - "Sosyal Studio 1.8 kullanımı"
Cohesion: 0.20
Nodes (10): Gece araştırması ve kaynak kontrolü, Gerçek ölçüm ve deneyler, Güncelleme ve doğrulama sınırı, Kampanya, ürün ve içerik onayı, Medya, slaytlar ve kırpma, Sosyal Studio 1.8 kullanımı, Takvim ve video hazırlığı, Tam içerik yedeği (+2 more)

### Community 63 - "Gece araştırması ve yerel hafıza — 1.7"
Cohesion: 0.40
Nodes (4): Doğrulama, Gece araştırması ve yerel hafıza — 1.7, Kaynaklar ve sınırlar, Kullanım

### Community 64 - "AdvertisingWorkspace.tsx"
Cohesion: 0.12
Nodes (19): zonedTime(), Account, advertisingContext(), AdvertisingWorkspace(), analyze(), refresh(), refreshFirefox(), run() (+11 more)

### Community 84 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 85 - "LocalMemory"
Cohesion: 0.09
Nodes (10): LocalAI, LocalMemory, validCompany(), NightLearning, fail(), QwenSkills, localFail(), fixture() (+2 more)

### Community 86 - "LocalAIStatus.tsx"
Cohesion: 0.08
Nodes (22): GitHub ve Cloudflare, graphify, Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları (+14 more)

### Community 89 - "Aynı Firefox penceresinde otomatik yayın · 1.10"
Cohesion: 0.33
Nodes (6): Aynı Firefox penceresinde otomatik yayın · 1.11, Doğrulamanın sınırı, Gönderimi başlatma, İlk hazırlık, İzleme, zamanlama ve kesinti, Platform biçimleri

### Community 90 - "KKTC reklam çalışma alanı · 1.9"
Cohesion: 0.29
Nodes (5): Sosyal Studio 1.9 doğrulaması, Aynı Firefox penceresi, KKTC reklam çalışma alanı · 1.9, Plan ve ölçüm, Reklam konusunda gelişmesi

### Community 91 - "ai-install.test.mjs"
Cohesion: 0.25
Nodes (9): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+1 more)

### Community 92 - "ECC: seçilen beceriler ve projeye uygulanışı"
Cohesion: 0.50
Nodes (3): 1.14 Qwen dosya paketi ve arayüz, ECC: seçilen beceriler ve projeye uygulanışı, Seçilmiş ajan rolleri

### Community 93 - "release-v1.1.mjs"
Cohesion: 0.29
Nodes (9): archiveFiles, archivePath, crc32(), extractRelease(), manifestPath, releaseFiles, sha256(), sourceVersion() (+1 more)

### Community 95 - "publication-policy.js"
Cohesion: 0.80
Nodes (4): canonical(), ownedURL(), postURL(), profile()

### Community 96 - "createTabPublishingPolicy"
Cohesion: 0.80
Nodes (5): createTabPublishingPolicy(), canonical(), ownedURL(), postURL(), profile()

### Community 97 - "publications.mjs"
Cohesion: 0.09
Nodes (31): uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity(), miniflare, computerError(), publicationBelongsTo() (+23 more)

### Community 99 - "ollama-host.mjs"
Cohesion: 0.25
Nodes (6): aiRoot, [executable, models], exited, runtimeHome, server, temporary

### Community 101 - "agent-background.js"
Cohesion: 0.39
Nodes (5): bindingsFor(), handle(), page(), screenshot(), validate()

### Community 102 - "advertising.mjs"
Cohesion: 0.38
Nodes (4): adProviderIds, adProviders, advertisingKPIs(), advertisingRules

### Community 103 - "Firefox bağlantısı ve gerçek Qwen testi — 1.11"
Cohesion: 0.33
Nodes (6): Firefox bağlantısı ve gerçek Qwen testi — 1.11, Firefox'ta giriş açık, panel bağlı göstermiyorsa, Hesap sekmelerini birlikte bağlama, İstekle sekme bulma ve inceleme, Qwen'in gerçekten yanıt verdiğini kontrol etme, Taslaktan otomatik yayına geçiş

### Community 104 - "Sosyal Studio"
Cohesion: 0.33
Nodes (6): Başvuru, Günlük çalışma, Sosyal Studio, Yedek, Yerel geliştirme, Çalışan altyapı ve sınırlar

### Community 107 - "firefox-agent.d.mts"
Cohesion: 0.33
Nodes (3): AgentControl, AgentDecision, AgentObservation

### Community 108 - "Qwen ile sosyal medya Firefox'unu kullanma · 1.12"
Cohesion: 0.33
Nodes (6): Doğrulama, Görev başlatma, Güncelleme, Hesap ve sayfa kapsamı, Qwen ile sosyal medya Firefox'unu kullanma · 1.12, Veri ve teknik sınırlar

### Community 112 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

## Knowledge Gaps
- **29 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 562 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `LocalAIStatus.tsx` to `companion/local-ai.mjs`, `ref_node_fs`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `GitHub ve Cloudflare dağıtımı` connect `LocalAIStatus.tsx` to `META_KURULUM.md`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Why does `Kodda doğrulanan mevcut durum` connect `companion/local-ai.mjs` to `social-ai.mjs`, `ProfileBrowsers`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`, `LocalMemory`, `LocalAIStatus.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._