# Graph Report - social-media-tool  (2026-10-20)

## Corpus Check
- 154 files · ~103,722 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 1)

## Summary
- 887 nodes · 2148 edges · 50 communities (43 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbf06b43`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- social-ai.mjs
- App
- ProfileBrowsers
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- app.mjs
- start.mjs
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- App.tsx
- SocialAccounts.tsx
- SocialAI
- check-ai.mjs
- CompanyAccounts.tsx
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
- company-computer.test.mjs
- ref_node_assert
- @playwright/test
- ai-vision.mjs
- social-profiles.test.mjs
- KKTC uzman çalışma alanı — mevcut programa yama
- worker/index.mjs
- r2-budget.test.mjs
- browser.mjs
- company-computer.test.mjs
- server/index.mjs

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
10. `ProfileBrowsers` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Kodda doğrulanan mevcut durum` --references--> `computerCommand()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/computer-protocol.mjs
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `GitHub ve Cloudflare` --references--> `LocalAIStatus()`  [INFERRED]
  AGENTS.md → src/LocalAIStatus.tsx
- `Kodda doğrulanan mevcut durum` --references--> `registerLocalAI()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → worker/local-ai.mjs
- `Kodda doğrulanan mevcut durum` --references--> `aiMessages()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → worker/social-ai.mjs

## Import Cycles
- None detected.

## Communities (50 total, 7 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, express (+7 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.13
Nodes (27): createPrompt(), SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, companies, VISION_LIMITS, VISION_MODEL, VISION_RATES, visionReservation() (+19 more)

### Community 3 - "App"
Cohesion: 0.12
Nodes (24): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+16 more)

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
Cohesion: 0.11
Nodes (34): @cloudflare/puppeteer, get(), put(), companyId, controller(), otherId, secret, tokens (+26 more)

### Community 12 - "app.mjs"
Cohesion: 0.18
Nodes (18): createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), adaptWithRules(), captionFor(), characterCount() (+10 more)

### Community 13 - "start.mjs"
Cohesion: 0.12
Nodes (22): LocalAI, postFormat, directory, configPath, configuration(), connect(), localAI, safeOrigin() (+14 more)

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "App.tsx"
Cohesion: 0.15
Nodes (23): blankCompany, initialPlatforms, platformColors, PlatformIcon(), Instagram(), Linkedin(), Youtube(), encode() (+15 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.12
Nodes (24): lucide-react, Modal(), Account, AccountPlatform, caption(), CloudAccounts(), close(), open() (+16 more)

### Community 18 - "SocialAI"
Cohesion: 0.24
Nodes (8): Job, LocalAIJobs(), date(), SocialAI(), ask(), refresh(), run(), upload()

### Community 19 - "check-ai.mjs"
Cohesion: 0.07
Nodes (50): jose, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+42 more)

### Community 20 - "CompanyAccounts.tsx"
Cohesion: 0.18
Nodes (16): BrowserTab, BrowserTools(), PageRead, Account, CompanyAccounts(), close(), control(), open() (+8 more)

### Community 21 - "update.test.mjs"
Cohesion: 0.08
Nodes (33): bundleRoot, lock, production, updateDirectory, archiveFiles, archivePath, crc32(), extractRelease() (+25 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.20
Nodes (10): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek pencereli şirket Firefox’u (1.4), Verilerin yeri ve erişim (+2 more)

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
Cohesion: 0.16
Nodes (6): react, react-dom, AuthRoot(), labels, LocalAIStatus(), Status

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_fs"
Cohesion: 0.10
Nodes (12): requireCapacity(), ZERO_TRUST_LIMITS, child, run, { app, store }, server, pairedRequire, manifest (+4 more)

### Community 38 - "company-computer.test.mjs"
Cohesion: 0.05
Nodes (56): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity(), extractVisiblePage() (+48 more)

### Community 39 - "ref_node_assert"
Cohesion: 0.17
Nodes (6): miniflare, sample, login(), request(), pause(), until()

### Community 40 - "@playwright/test"
Cohesion: 0.17
Nodes (3): @playwright/test, sharp, ids

### Community 41 - "ai-vision.mjs"
Cohesion: 0.23
Nodes (14): platforms, image(), fail(), observeImage(), visionImage(), createD1Media(), fail(), jpegDimensions() (+6 more)

### Community 42 - "social-profiles.test.mjs"
Cohesion: 0.50
Nodes (4): fixture(), database(), migration(), seed

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "worker/index.mjs"
Cohesion: 0.18
Nodes (19): zod, qualityCases, companySchema, draftSchema, app, company(), fail(), json() (+11 more)

### Community 46 - "r2-budget.test.mjs"
Cohesion: 0.27
Nodes (7): bytes, delete(), reserve(), periodAt(), quotaError(), R2_LIMITS, r2Usage()

### Community 47 - "browser.mjs"
Cohesion: 0.43
Nodes (5): browserTool(), readPage(), safeReadURL(), uploadJPEG(), normalFirefox()

### Community 48 - "company-computer.test.mjs"
Cohesion: 0.29
Nodes (7): accountId, command(), companyId, otherAccount, otherCompany, request(), tokens

### Community 49 - "server/index.mjs"
Cohesion: 0.40
Nodes (3): { app, store }, port, server

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 324 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `start.mjs` to `social-ai.mjs`, `ProfileBrowsers`, `company-computer.test.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `start.mjs`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1310483870967742 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `api`, `App.tsx`, `SocialAccounts.tsx`, `SocialAI`, `CompanyAccounts.tsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._