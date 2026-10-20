# Graph Report - social-media-tool  (2026-10-20)

## Corpus Check
- 159 files · ~107,436 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 1)

## Summary
- 922 nodes · 2267 edges · 46 communities (40 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `142685cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- social-ai.mjs
- App
- CloudAccounts
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- social-expert.mjs
- start.mjs
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
- company-computer.test.mjs
- expert-workspace.test.mjs
- ai-vision.mjs
- KKTC uzman çalışma alanı — mevcut programa yama
- worker/index.mjs
- r2-budget.test.mjs
- company-computer.test.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 38 edges
2. `api()` - 28 edges
3. `registerSocialAI()` - 21 edges
4. `scripts` - 19 edges
5. `LocalAI` - 18 edges
6. `cfApi()` - 18 edges
7. `@playwright/test` - 16 edges
8. `computerError()` - 16 edges
9. `hashPassword()` - 16 edges
10. `ProfileBrowsers` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Kodda doğrulanan mevcut durum` --references--> `computerCommand()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/computer-protocol.mjs
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `GitHub ve Cloudflare` --references--> `CompanyComputer`  [INFERRED]
  AGENTS.md → worker/computer-relay.mjs
- `Kodda doğrulanan mevcut durum` --references--> `aiMessages()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → worker/social-ai.mjs
- `Kodda doğrulanan mevcut durum` --references--> `localInput()`  [INFERRED]
  docs/KKTC_GELISTIRME_INCELEMESI.md → shared/local-ai.mjs

## Import Cycles
- None detected.

## Communities (46 total, 6 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.17
Nodes (23): hono, companies, VISION_MODEL, visionReservation(), AI_LIMITS, AI_MODEL, aiCost(), aiMessages() (+15 more)

### Community 3 - "App"
Cohesion: 0.15
Nodes (23): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+15 more)

### Community 4 - "CloudAccounts"
Cohesion: 0.31
Nodes (11): caption(), CloudAccounts(), close(), open(), refresh(), run(), show(), savedDate() (+3 more)

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
Cohesion: 0.12
Nodes (31): companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState(), accountCookies() (+23 more)

### Community 12 - "social-expert.mjs"
Cohesion: 0.25
Nodes (7): KKTC_EXPERT_VERSION, KKTC_RULES, regionalFields, selectEvidence(), SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, evidenceFor()

### Community 13 - "start.mjs"
Cohesion: 0.07
Nodes (38): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+30 more)

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
Cohesion: 0.08
Nodes (35): installBundle(), bundleRoot, lock, directory, production, updateDirectory, archiveFiles, archivePath (+27 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

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
Cohesion: 0.05
Nodes (25): ProfileBrowsers, browserTool(), readPage(), safeReadURL(), normalFirefox(), @playwright/test, sharp, child (+17 more)

### Community 38 - "company-computer.test.mjs"
Cohesion: 0.07
Nodes (38): uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity(), extractVisiblePage(), publicAddress(), publicHTML() (+30 more)

### Community 39 - "expert-workspace.test.mjs"
Cohesion: 0.39
Nodes (7): expectJSON(), newJob(), post(), request(), tokens, createCloudStore(), decode()

### Community 41 - "ai-vision.mjs"
Cohesion: 0.22
Nodes (14): image(), fail(), observeImage(), VISION_LIMITS, VISION_RATES, visionImage(), createD1Media(), fail() (+6 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "worker/index.mjs"
Cohesion: 0.09
Nodes (41): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+33 more)

### Community 46 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (10): bytes, delete(), get(), put(), createR2Media(), reserve(), periodAt(), quotaError() (+2 more)

### Community 48 - "company-computer.test.mjs"
Cohesion: 0.18
Nodes (11): miniflare, accountId, command(), companyId, otherAccount, otherCompany, request(), send() (+3 more)

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 334 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `start.mjs` to `social-ai.mjs`, `ref_node_fs`, `company-computer.test.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `start.mjs`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `api`, `App.tsx`, `SocialAccounts.tsx`, `SocialAI.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._