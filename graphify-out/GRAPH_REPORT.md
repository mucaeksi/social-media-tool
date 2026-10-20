# Graph Report - social-media-tool  (2026-10-20)

## Corpus Check
- 180 files · ~124,526 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1035 nodes · 2493 edges · 61 communities (51 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a5d5683`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- ai-vision.mjs
- App
- manifest.json
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- research.mjs
- companion/local-ai.mjs
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- App.tsx
- SocialAccounts.tsx
- SocialAI.tsx
- check-ai.mjs
- CompanyAccounts.tsx
- update.test.mjs
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
- react
- Projeye eklenen beceriler
- ref_node_assert
- ai-install.test.mjs
- social-ai.mjs
- company-computer.test.mjs
- evidenceFor
- start.mjs
- KKTC uzman çalışma alanı — mevcut programa yama
- worker/index.mjs
- r2-budget.test.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- ref_node_crypto
- launch.mjs
- ref_node_path
- ref_node_fs
- social-ai.test.mjs
- expert-workspace.test.mjs
- YEREL_MODEL_SECIMI.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 38 edges
2. `api()` - 29 edges
3. `registerSocialAI()` - 21 edges
4. `LocalAI` - 19 edges
5. `scripts` - 19 edges
6. `cfApi()` - 18 edges
7. `SocialAI()` - 18 edges
8. `@playwright/test` - 17 edges
9. `computerError()` - 16 edges
10. `hashPassword()` - 16 edges

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

## Communities (61 total, 10 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, express (+7 more)

### Community 2 - "ai-vision.mjs"
Cohesion: 0.30
Nodes (11): image(), visionImage(), createD1Media(), fail(), jpegDimensions(), mediaTargets, objectKey(), parseMediaForm() (+3 more)

### Community 3 - "App"
Cohesion: 0.13
Nodes (23): App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft(), generatePrompt() (+15 more)

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

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.33
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.10
Nodes (33): ProfileBrowsers, @cloudflare/puppeteer, companyId, controller(), otherId, secret, tokens, captureBrowserState() (+25 more)

### Community 12 - "research.mjs"
Cohesion: 0.07
Nodes (35): uploadJPEG(), exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity(), extractVisiblePage(), publicAddress(), publicHTML() (+27 more)

### Community 13 - "companion/local-ai.mjs"
Cohesion: 0.07
Nodes (38): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+30 more)

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "App.tsx"
Cohesion: 0.20
Nodes (15): blankCompany, initialPlatforms, platformColors, PlatformIcon(), Instagram(), Linkedin(), Youtube(), encode() (+7 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.11
Nodes (27): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, FirefoxBinding, FirefoxPage, firefoxQuestion(), firefoxRequest(), firefoxTabChoice() (+19 more)

### Community 19 - "check-ai.mjs"
Cohesion: 0.05
Nodes (61): jose, miniflare, sharp, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret() (+53 more)

### Community 20 - "CompanyAccounts.tsx"
Cohesion: 0.15
Nodes (19): BrowserTab, BrowserTools(), PageRead, Account, CompanyAccounts(), close(), control(), open() (+11 more)

### Community 21 - "update.test.mjs"
Cohesion: 0.16
Nodes (13): sha256(), validVersion(), supervise(), atomicJson(), boundedResponse(), installDependencies(), Updater, children (+5 more)

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
Cohesion: 0.14
Nodes (24): ActivityFeed(), labels, api(), date(), Evaluation, Fact, Job, json() (+16 more)

### Community 34 - "react"
Cohesion: 0.18
Nodes (7): lucide-react, react, react-dom, AuthRoot(), labels, Status, AuthUser

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_assert"
Cohesion: 0.12
Nodes (11): normalFirefox(), { app, store }, server, pairedRequire, files, launchers, manifest, pause() (+3 more)

### Community 38 - "ai-install.test.mjs"
Cohesion: 0.14
Nodes (16): installBundle(), archiveFiles, archivePath, crc32(), extractRelease(), manifestPath, releaseFiles, sourceVersion() (+8 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.21
Nodes (19): SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, aiCost(), aiMessages(), aiPosts(), aiReservation(), aiText(), company() (+11 more)

### Community 40 - "company-computer.test.mjs"
Cohesion: 0.25
Nodes (8): accountId, command(), companyId, otherAccount, otherCompany, request(), send(), tokens

### Community 41 - "evidenceFor"
Cohesion: 0.33
Nodes (5): KKTC_EXPERT_VERSION, KKTC_RULES, regionalFields, selectEvidence(), evidenceFor()

### Community 42 - "start.mjs"
Cohesion: 0.16
Nodes (14): production, configPath, configuration(), connect(), localAI, safeOrigin(), stop(), downloadFirefoxInstaller() (+6 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "worker/index.mjs"
Cohesion: 0.09
Nodes (39): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+31 more)

### Community 46 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (9): bytes, delete(), get(), put(), reserve(), periodAt(), quotaError(), R2_LIMITS (+1 more)

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

### Community 51 - "ref_node_crypto"
Cohesion: 0.15
Nodes (5): browserTool(), readPage(), safeReadURL(), @playwright/test, manifest

### Community 54 - "launch.mjs"
Cohesion: 0.20
Nodes (10): bundleRoot, lock, dataDirectory(), directory, legacyDirectory, updateDirectory, copyTree(), exists() (+2 more)

### Community 55 - "ref_node_path"
Cohesion: 0.19
Nodes (8): files, prepareFirefoxExtension(), buildFirefoxExtension(), extensionFiles, child, fixture(), connect(), target

### Community 56 - "ref_node_fs"
Cohesion: 0.16
Nodes (7): child, run, root, fixture(), database(), migration(), seed

### Community 57 - "social-ai.test.mjs"
Cohesion: 0.18
Nodes (9): companies, fail(), observeImage(), VISION_LIMITS, VISION_MODEL, VISION_RATES, visionReservation(), AI_LIMITS (+1 more)

### Community 58 - "expert-workspace.test.mjs"
Cohesion: 0.39
Nodes (7): expectJSON(), newJob(), post(), request(), tokens, createCloudStore(), decode()

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 387 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `companion/local-ai.mjs` to `social-accounts.test.mjs`, `research.mjs`, `social-ai.mjs`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `companion/local-ai.mjs`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `package.json`, `api`, `App.tsx`, `SocialAccounts.tsx`, `SocialAI.tsx`, `CompanyAccounts.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._