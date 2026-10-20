# Graph Report - social-media-tool  (2026-10-20)

## Corpus Check
- 185 files · ~130,582 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .cmd 2, .css 2)

## Summary
- 1075 nodes · 2607 edges · 64 communities (54 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b9f14151`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- ollama-host.mjs
- App
- manifest.json
- compilerOptions
- scripts
- companion/package.json
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- @playwright/test
- LocalMemory
- research-platforms.py
- KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi
- social-profiles.test.mjs
- SocialAccounts.tsx
- SocialAI.tsx
- smoke-cloudflare.mjs
- CompanyAccounts
- passwords.mjs
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
- CompanyAccounts.tsx
- Projeye eklenen beceriler
- ref_node_fs
- update.test.mjs
- social-ai.mjs
- knowledge.mjs
- shared/local-ai.mjs
- start.mjs
- KKTC uzman çalışma alanı — mevcut programa yama
- worker/index.mjs
- check-ai.mjs
- Ana Firefox ile Sosyal Studio
- popup.js
- background.js
- policy.js
- admin-provision.mjs
- launch.mjs
- ref_node_path
- Updater
- worker.test.mjs
- e2e-cloud-server.mjs
- YEREL_MODEL_SECIMI.md
- browser-tools.mjs
- Gece araştırması ve yerel hafıza — 1.7
- companion/local-ai.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 38 edges
2. `api()` - 30 edges
3. `LocalMemory` - 25 edges
4. `registerSocialAI()` - 21 edges
5. `LocalAI` - 19 edges
6. `scripts` - 19 edges
7. `SocialAI()` - 19 edges
8. `cfApi()` - 18 edges
9. `webUrl()` - 18 edges
10. `@playwright/test` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Projeye özgü geliştirme notları` --references--> `FirefoxConnection()`  [INFERRED]
  AGENTS.md → src/FirefoxConnection.tsx
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

## Communities (64 total, 10 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, puppeteer-core, name, private, type, version, @cloudflare/puppeteer (+7 more)

### Community 2 - "ollama-host.mjs"
Cohesion: 0.25
Nodes (6): aiRoot, [executable, models], exited, runtimeHome, server, temporary

### Community 3 - "App"
Cohesion: 0.11
Nodes (31): App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft(), generatePrompt() (+23 more)

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
Nodes (32): ProfileBrowsers, companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState() (+24 more)

### Community 12 - "@playwright/test"
Cohesion: 0.11
Nodes (7): @playwright/test, sharp, report, startedAt, targets, report, ids

### Community 13 - "LocalMemory"
Cohesion: 0.16
Nodes (5): LocalAI, LocalMemory, validCompany(), localFail(), localReference()

### Community 15 - "KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi"
Cohesion: 0.20
Nodes (10): 1. KKTC için yapılandırılmış uzman profili, 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma, 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol, 4. Gerçek paylaşım ve zamanlama, 5. Küçük modelin kalitesi ve çalışma süresi, 6. Şifreli erişim ve işletme yönetimi, Değerlendirme, KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi (+2 more)

### Community 16 - "social-profiles.test.mjs"
Cohesion: 0.50
Nodes (4): fixture(), database(), migration(), seed

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (22): Account, AccountPlatform, caption(), CloudAccounts(), close(), open(), refresh(), run() (+14 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.09
Nodes (32): FirefoxBinding, FirefoxPage, firefoxQuestion(), firefoxRequest(), firefoxTabChoice(), firefoxTarget(), Account, FirefoxConnection() (+24 more)

### Community 19 - "smoke-cloudflare.mjs"
Cohesion: 0.15
Nodes (10): ensureBrowserSecret(), protectSecret(), safeMessage(), secrets, receipt, file, headers, smokeCloudflare() (+2 more)

### Community 20 - "CompanyAccounts"
Cohesion: 0.23
Nodes (12): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, CompanyAccounts(), close(), control(), open(), refresh() (+4 more)

### Community 21 - "passwords.mjs"
Cohesion: 0.24
Nodes (17): decode(), derive(), encode(), hashPassword(), PASSWORD_ITERATIONS, tokenDigest(), verifyPassword(), login() (+9 more)

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.18
Nodes (11): Doğrulama kapsamı, Google ve diğer ağlarda normal Firefox ile giriş (1.4.2), İlk kurulum, Küçük yerel sosyal medya AI’ı, Otomatik güncelleme, Sonraki açılış ve Windows başlangıcı, Tek klasör ve yerel SQLite hafızası (1.5), Tek pencereli şirket Firefox’u (1.4) (+3 more)

### Community 23 - "Sosyal Studio"
Cohesion: 0.29
Nodes (7): Beceriler ve mimari, Cloudflare üzerinde yayın, Kontroller, Kullanım, Kurulum, Neler çalışıyor?, Sosyal Studio

### Community 24 - "README.md"
Cohesion: 0.28
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
Cohesion: 0.12
Nodes (26): ActivityFeed(), labels, api(), date(), Evaluation, Fact, Job, json() (+18 more)

### Community 34 - "CompanyAccounts.tsx"
Cohesion: 0.10
Nodes (20): lucide-react, react, react-dom, AuthRoot(), BrowserTab, BrowserTools(), PageRead, Account (+12 more)

### Community 35 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 37 - "ref_node_fs"
Cohesion: 0.13
Nodes (12): normalFirefox(), { app, store }, server, files, launchers, manifest, fixture(), input (+4 more)

### Community 38 - "update.test.mjs"
Cohesion: 0.12
Nodes (24): installBundle(), production, archiveFiles, archivePath, crc32(), extractRelease(), manifestPath, releaseFiles (+16 more)

### Community 39 - "social-ai.mjs"
Cohesion: 0.07
Nodes (48): hono, SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, bytes, delete(), get(), put(), companies (+40 more)

### Community 40 - "knowledge.mjs"
Cohesion: 0.07
Nodes (30): exactButton(), facebookPublish(), normalize(), verifyFacebookIdentity(), NightLearning, extractVisiblePage(), publicAddress(), publicHTML() (+22 more)

### Community 41 - "shared/local-ai.mjs"
Cohesion: 0.07
Nodes (46): Kodda doğrulanan mevcut durum, COMPUTER_KEYS, COMPUTER_LIMITS, computerCommand(), computerError(), validComputerResult(), LOCAL_AI_LIMITS, LOCAL_EXPERT_VERSION (+38 more)

### Community 42 - "start.mjs"
Cohesion: 0.14
Nodes (15): files, prepareFirefoxExtension(), configPath, configuration(), connect(), localAI, safeOrigin(), stop() (+7 more)

### Community 43 - "KKTC uzman çalışma alanı — mevcut programa yama"
Cohesion: 0.25
Nodes (8): Firefox görevleri, İlk kullanım, KKTC uzman çalışma alanı — mevcut programa yama, Tek şirket penceresi, Veritabanı yerleşimi ve sınırlar, Yayın takvimi ve Facebook pilotu, Yerel AI ilerlemesi ve devam etme, Yetkiler, ölçümler ve yedekler

### Community 45 - "worker/index.mjs"
Cohesion: 0.08
Nodes (43): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+35 more)

### Community 46 - "check-ai.mjs"
Cohesion: 0.25
Nodes (13): diagnoseObservation(), http(), report, runCheck(), cfApi(), listAll(), requireCapacity(), verifyWorkersAIFree() (+5 more)

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

### Community 51 - "admin-provision.mjs"
Cohesion: 0.25
Nodes (8): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), detachLegacyAccess(), validPasswordHash(), deployment, deployment

### Community 54 - "launch.mjs"
Cohesion: 0.20
Nodes (10): bundleRoot, lock, dataDirectory(), directory, legacyDirectory, updateDirectory, copyTree(), exists() (+2 more)

### Community 55 - "ref_node_path"
Cohesion: 0.21
Nodes (4): extensionFiles, pairedRequire, manifest, child

### Community 56 - "Updater"
Cohesion: 0.36
Nodes (6): validVersion(), supervise(), atomicJson(), boundedResponse(), Updater, fixture()

### Community 57 - "worker.test.mjs"
Cohesion: 0.22
Nodes (5): jose, miniflare, platforms, authenticate(), keySets

### Community 62 - "browser-tools.mjs"
Cohesion: 0.70
Nodes (4): browserTool(), readPage(), safeReadURL(), uploadJPEG()

### Community 63 - "Gece araştırması ve yerel hafıza — 1.7"
Cohesion: 0.40
Nodes (4): Doğrulama, Gece araştırması ve yerel hafıza — 1.7, Kaynaklar ve sınırlar, Kullanım

### Community 66 - "companion/local-ai.mjs"
Cohesion: 0.14
Nodes (12): downloadVerified(), extractRuntime(), hashFile(), importLegacyModel(), installPortable(), modelDirectory(), OLLAMA_RELEASE, runtimeDirectory() (+4 more)

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 399 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Kodda doğrulanan mevcut durum` connect `shared/local-ai.mjs` to `social-ai.mjs`, `social-accounts.test.mjs`, `LocalMemory`, `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` connect `KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi` to `README.md`, `shared/local-ai.mjs`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.1066066066066066 - nodes in this community are weakly interconnected._
- **Why does `react` connect `CompanyAccounts.tsx` to `package.json`, `api`, `App`, `SocialAccounts.tsx`, `SocialAI.tsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._