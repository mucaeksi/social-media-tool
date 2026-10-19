# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 107 files · ~63,466 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .cmd 2, .css 1)

## Summary
- 635 nodes · 1375 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d065291`
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
- CloudAccounts
- password-auth.mjs
- research-platforms.py
- r2-budget.test.mjs
- App.tsx
- SocialAccounts.tsx
- SocialAI.tsx
- ref_node_fs
- CompanyAccounts
- build-companion.mjs
- Windows ve Firefox ile kalıcı sosyal hesap girişleri
- Sosyal Studio
- README.md
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- Ücretsiz resmi API bağlantısı için ilk kurulum
- Sosyal platform bağlantıları
- setup-firefox.sh
- Modal

## God Nodes (most connected - your core abstractions)
1. `App()` - 35 edges
2. `registerSocialAI()` - 20 edges
3. `scripts` - 19 edges
4. `cfApi()` - 17 edges
5. `CloudAccounts()` - 14 edges
6. `api()` - 14 edges
7. `protectSecret()` - 13 edges
8. `createApp()` - 13 edges
9. `hashPassword()` - 13 edges
10. `tokenDigest()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `GitHub ve Cloudflare` --references--> `CompanyAccounts()`  [INFERRED]
  AGENTS.md → src/CompanyAccounts.tsx
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `GitHub ve Cloudflare` --references--> `CompanyComputer`  [INFERRED]
  AGENTS.md → worker/computer-relay.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `diagnoseObservation()` --calls--> `observeImage()`  [EXTRACTED]
  scripts/check-ai.mjs → worker/ai-vision.mjs

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (38): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+30 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.08
Nodes (41): hono, SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, companies, image(), fail(), observeImage(), VISION_LIMITS (+33 more)

### Community 3 - "App"
Cohesion: 0.21
Nodes (18): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+10 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.09
Nodes (39): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+31 more)

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
Cohesion: 0.29
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.11
Nodes (28): ProfileBrowsers, companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState() (+20 more)

### Community 12 - "CloudAccounts"
Cohesion: 0.36
Nodes (10): caption(), CloudAccounts(), close(), open(), refresh(), run(), show(), savedDate() (+2 more)

### Community 13 - "password-auth.mjs"
Cohesion: 0.06
Nodes (36): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları, configPath, configuration(), connect(), directory, safeOrigin() (+28 more)

### Community 15 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (10): bytes, delete(), get(), put(), createR2Media(), reserve(), periodAt(), quotaError() (+2 more)

### Community 16 - "App.tsx"
Cohesion: 0.13
Nodes (24): blankCompany, compactDate(), count(), fullCaption(), initialPlatforms, mediaPath(), platformColors, PlatformIcon() (+16 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.09
Nodes (22): lucide-react, react, react-dom, AuthRoot(), Account, ComputerStatus, Pairing, Profile (+14 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.31
Nodes (8): api(), initialize(), date(), SocialAI(), ask(), refresh(), run(), upload()

### Community 19 - "ref_node_fs"
Cohesion: 0.05
Nodes (55): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http(), report (+47 more)

### Community 20 - "CompanyAccounts"
Cohesion: 0.44
Nodes (9): CompanyAccounts(), close(), control(), open(), refresh(), run(), show(), sendClose() (+1 more)

### Community 21 - "build-companion.mjs"
Cohesion: 0.25
Nodes (6): central, directory, end, files, parts, zip

### Community 22 - "Windows ve Firefox ile kalıcı sosyal hesap girişleri"
Cohesion: 0.29
Nodes (6): Doğrulama kapsamı, İlk kurulum, Sonraki açılış ve Windows başlangıcı, Verilerin yeri ve erişim, Windows ve Firefox ile kalıcı sosyal hesap girişleri, Ücretsiz kullanım

### Community 23 - "Sosyal Studio"
Cohesion: 0.29
Nodes (7): Beceriler ve mimari, Cloudflare üzerinde yayın, Kontroller, Kullanım, Kurulum, Neler çalışıyor?, Sosyal Studio

### Community 24 - "README.md"
Cohesion: 0.29
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

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

## Knowledge Gaps
- **11 isolated node(s):** `puppeteer-core`, `@types/react`, `@types/react-dom`, `puppeteer-core`, `typescript` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 256 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SocialAccounts.tsx` to `App.tsx`, `package.json`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `registerSocialAI()` (e.g. with `memoryView()` and `turnView()`) actually correct?**
  _`registerSocialAI()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `puppeteer-core`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04591836734693878 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `SocialAccounts.tsx` to `App.tsx`, `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08176100628930817 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `package.json` to `social-ai.mjs`, `ref_node_fs`, `worker/index.mjs`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._