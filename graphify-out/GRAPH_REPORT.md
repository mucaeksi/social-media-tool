# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 89 files · ~51,038 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 519 nodes · 1115 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `156a9318`
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
- provision.test.mjs
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- AGENTS.md
- password-auth.mjs
- research-platforms.py
- r2-budget.test.mjs
- App.tsx
- SocialAccounts.tsx
- SocialAI.tsx
- e2e-cloud-server.mjs
- AuthRoot.tsx
- Sosyal Studio
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- Ücretsiz resmi API bağlantısı için ilk kurulum
- Sosyal platform bağlantıları
- Projeye eklenen beceriler
- Modal

## God Nodes (most connected - your core abstractions)
1. `App()` - 35 edges
2. `registerSocialAI()` - 20 edges
3. `scripts` - 18 edges
4. `cfApi()` - 17 edges
5. `protectSecret()` - 13 edges
6. `createApp()` - 13 edges
7. `hashPassword()` - 13 edges
8. `SocialAccounts()` - 13 edges
9. `databaseQuery()` - 12 edges
10. `listAll()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `diagnoseObservation()` --calls--> `observeImage()`  [EXTRACTED]
  scripts/check-ai.mjs → worker/ai-vision.mjs
- `runCheck()` --calls--> `aiPosts()`  [EXTRACTED]
  scripts/check-ai.mjs → worker/social-ai.mjs
- `smokeCloudflare()` --calls--> `tokenDigest()`  [EXTRACTED]
  scripts/smoke-cloudflare.mjs → shared/passwords.mjs

## Import Cycles
- None detected.

## Communities (29 total, 4 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+28 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.11
Nodes (34): SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, companies, image(), fail(), observeImage(), VISION_LIMITS, VISION_MODEL (+26 more)

### Community 3 - "App"
Cohesion: 0.16
Nodes (22): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+14 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.07
Nodes (46): zod, { app, store }, server, createApp(), fail(), requireCompany(), requireMedia(), validatePosts() (+38 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "provision.test.mjs"
Cohesion: 0.07
Nodes (42): miniflare, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), http() (+34 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.33
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.13
Nodes (24): @cloudflare/puppeteer, report, startedAt, targets, companyId, controller(), otherId, secret (+16 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "password-auth.mjs"
Cohesion: 0.29
Nodes (12): jose, tokenDigest(), authenticate(), keySets, authenticatePassword(), checkLoginRate(), cookieName(), cookieToken() (+4 more)

### Community 15 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (10): bytes, delete(), get(), put(), createR2Media(), reserve(), periodAt(), quotaError() (+2 more)

### Community 16 - "App.tsx"
Cohesion: 0.19
Nodes (16): blankCompany, initialPlatforms, platformColors, PlatformIcon(), Instagram(), Linkedin(), Youtube(), AuthUser (+8 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.15
Nodes (18): lucide-react, Modal(), Account, caption(), savedDate(), seconds(), SocialAccounts(), close() (+10 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.18
Nodes (14): api(), initialize(), encode(), prepareCloudMedia(), AITurn, date(), kinds, Memory (+6 more)

### Community 19 - "e2e-cloud-server.mjs"
Cohesion: 0.17
Nodes (5): children, child, run, root, child

### Community 20 - "AuthRoot.tsx"
Cohesion: 0.28
Nodes (3): react, react-dom, AuthRoot()

### Community 23 - "Sosyal Studio"
Cohesion: 0.29
Nodes (7): Beceriler ve mimari, Cloudflare üzerinde yayın, Kontroller, Kullanım, Kurulum, Neler çalışıyor?, Sosyal Studio

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.29
Nodes (7): Canlı kontrol durumu, Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

### Community 26 - "Sosyal hesaplara normal giriş"
Cohesion: 0.33
Nodes (6): Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, Oturum verisinin korunması, Sosyal hesaplara normal giriş, Ücretsiz kullanım ve oturum ömrü

### Community 27 - "Ücretsiz resmi API bağlantısı için ilk kurulum"
Cohesion: 0.40
Nodes (5): Hesap tarafındaki hazırlık, Meta hesabında yapılacak işlem, Uygulama kimliğinden sonraki akış, Ücret sınırı, Ücretsiz resmi API bağlantısı için ilk kurulum

### Community 28 - "Sosyal platform bağlantıları"
Cohesion: 0.40
Nodes (5): Doğrulanan kaynaklar, Geliştirici hesabında gereken hazırlık, Hangi yöntem kullanılabilir?, Oturumun kayıtlı kalması, Sosyal platform bağlantıları

### Community 29 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AuthRoot.tsx` to `App.tsx`, `package.json`, `SocialAI.tsx`, `SocialAccounts.tsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `registerSocialAI()` (e.g. with `memoryView()` and `turnView()`) actually correct?**
  _`registerSocialAI()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04830917874396135 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `SocialAccounts.tsx` to `App.tsx`, `package.json`, `SocialAI.tsx`, `AuthRoot.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10741971207087486 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `package.json` to `social-ai.mjs`, `worker/index.mjs`, `provision.test.mjs`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._