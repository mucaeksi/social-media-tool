# Graph Report - social-media-tool  (2026-10-20)

## Corpus Check
- 150 files · ~101,021 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .cmd 2, .css 1)

## Summary
- 873 nodes · 2112 edges · 48 communities (41 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `900d1640`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- social-ai.mjs
- App
- worker/index.mjs
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- app.mjs
- LocalAI
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- App.tsx
- SocialAccounts.tsx
- SocialAI.tsx
- check-ai.mjs
- CompanyAccounts
- update.test.mjs
- Windows ve Firefox ile kalıcı sosyal hesap girişleri
- Sosyal Studio
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- Ücretsiz resmi API bağlantısı için ilk kurulum
- Sosyal platform bağlantıları
- setup-firefox.sh
- release-v1.1.mjs
- dependencies
- devDependencies
- api
- react
- Projeye eklenen beceriler
- ref_node_fs
- build-companion.mjs
- knowledge.mjs
- @playwright/test
- Updater
- admin-provision.test.mjs
- KKTC uzman çalışma alanı — mevcut programa yama
- CloudAccounts
- start.mjs
- dev.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 38 edges
2. `api()` - 28 edges
3. `registerSocialAI()` - 21 edges
4. `scripts` - 19 edges
5. `cfApi()` - 18 edges
6. `@playwright/test` - 16 edges
7. `computerError()` - 16 edges
8. `hashPassword()` - 16 edges
9. `LocalAI` - 15 edges
10. `react` - 14 edges

## Surprising Connections (you probably didn't know these)
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `GitHub ve Cloudflare` --references--> `CompanyComputer`  [INFERRED]
  AGENTS.md → worker/computer-relay.mjs
- `Kodda doğrulanan mevcut durum` --references--> `aiMessages()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → worker/social-ai.mjs
- `Kodda doğrulanan mevcut durum` --references--> `computerCommand()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/computer-protocol.mjs
- `Kodda doğrulanan mevcut durum` --references--> `localInput()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/local-ai.mjs

## Import Cycles
- None detected.

## Communities (48 total, 7 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.13
Nodes (14): engines, node, puppeteer-core, name, private, type, version, express (+6 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.05
Nodes (61): KKTC_EXPERT_VERSION, KKTC_RULES, regionalFields, selectEvidence(), SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, accountId, command() (+53 more)

### Community 3 - "App"
Cohesion: 0.15
Nodes (23): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+15 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.06
Nodes (63): postFormat, directory, Kodda doğrulanan mevcut durum, hono, zod, COMPUTER_KEYS, COMPUTER_LIMITS, computerCommand() (+55 more)

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

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.33
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.10
Nodes (33): ProfileBrowsers, @cloudflare/puppeteer, companyId, controller(), otherId, secret, tokens, captureBrowserState() (+25 more)

### Community 12 - "app.mjs"
Cohesion: 0.11
Nodes (22): miniflare, { app, store }, server, createApp(), fail(), requireCompany(), requireMedia(), validatePosts() (+14 more)

### Community 13 - "LocalAI"
Cohesion: 0.43
Nodes (3): LocalAI, localFail(), fixture()

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "App.tsx"
Cohesion: 0.18
Nodes (12): lucide-react, blankCompany, CompanyForm(), initialPlatforms, platformColors, PlatformIcon(), Modal(), Instagram() (+4 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.11
Nodes (25): BrowserTab, BrowserTools(), PageRead, Account, ComputerStatus, Pairing, Profile, Screen (+17 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.10
Nodes (22): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, Job, LocalAIJobs(), labels, LocalAIStatus(), Status (+14 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.07
Nodes (53): jose, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+45 more)

### Community 20 - "CompanyAccounts"
Cohesion: 0.54
Nodes (8): CompanyAccounts(), close(), control(), open(), refresh(), run(), show(), sendClose()

### Community 21 - "update.test.mjs"
Cohesion: 0.13
Nodes (14): bundleRoot, lock, production, updateDirectory, archivePath, manifestPath, sha256(), installDependencies() (+6 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.22
Nodes (9): Doğrulama kapsamı, İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek pencereli şirket Firefox’u (1.4), Verilerin yeri ve erişim, Windows ve Firefox ile kalıcı sosyal hesap girişleri (+1 more)

### Community 23 - "Sosyal Studio"
Cohesion: 0.29
Nodes (7): Beceriler ve mimari, Cloudflare üzerinde yayın, Kontroller, Kullanım, Kurulum, Neler çalışıyor?, Sosyal Studio

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
Cohesion: 0.15
Nodes (23): ActivityFeed(), labels, api(), date(), Evaluation, Fact, Job, json() (+15 more)

### Community 34 - "react"
Cohesion: 0.28
Nodes (3): react, react-dom, AuthRoot()

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_fs"
Cohesion: 0.12
Nodes (6): child, run, sample, input, model, account

### Community 38 - "build-companion.mjs"
Cohesion: 0.21
Nodes (12): archiveFiles, crc32(), extractRelease(), releaseFiles, sourceVersion(), central, contents, directory (+4 more)

### Community 39 - "knowledge.mjs"
Cohesion: 0.12
Nodes (23): browserTool(), readPage(), safeReadURL(), uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity() (+15 more)

### Community 40 - "@playwright/test"
Cohesion: 0.19
Nodes (3): @playwright/test, sharp, ids

### Community 41 - "Updater"
Cohesion: 0.36
Nodes (6): validVersion(), supervise(), atomicJson(), boundedResponse(), Updater, fixture()

### Community 42 - "admin-provision.test.mjs"
Cohesion: 0.20
Nodes (6): manifest, deployment, fixture(), database(), migration(), seed

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "CloudAccounts"
Cohesion: 0.31
Nodes (11): caption(), CloudAccounts(), close(), open(), refresh(), run(), show(), savedDate() (+3 more)

### Community 46 - "start.mjs"
Cohesion: 0.28
Nodes (6): configPath, configuration(), connect(), localAI, safeOrigin(), stop()

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `worker/index.mjs` to `social-ai.mjs`, `social-accounts.test.mjs`, `LocalAI`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `registerSocialAI()` (e.g. with `memoryView()` and `turnView()`) actually correct?**
  _`registerSocialAI()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `worker/index.mjs`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.053998632946001365 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `api`, `App.tsx`, `SocialAccounts.tsx`, `SocialAI.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._