# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 93 files · ~54,869 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 541 nodes · 1180 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `951203ca`
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
- admin-provision.mjs
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
- ref_node_fs
- AuthRoot.tsx
- check-ai.mjs
- passwords.mjs
- Sosyal Studio
- Sosyal medya uzmanı AI
- Sosyal hesaplara normal giriş
- Ücretsiz resmi API bağlantısı için ilk kurulum
- Sosyal platform bağlantıları
- Projeye eklenen beceriler
- Modal
- ref_node_assert
- check-browser-login.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 35 edges
2. `registerSocialAI()` - 20 edges
3. `scripts` - 18 edges
4. `cfApi()` - 17 edges
5. `SocialAccounts()` - 15 edges
6. `protectSecret()` - 13 edges
7. `createApp()` - 13 edges
8. `hashPassword()` - 13 edges
9. `databaseQuery()` - 12 edges
10. `listAll()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `applyAdminRequest()` --calls--> `validPasswordHash()`  [EXTRACTED]
  scripts/admin-provision.mjs → shared/passwords.mjs
- `applyAdminRequest()` --calls--> `verifyPassword()`  [EXTRACTED]
  scripts/admin-provision.mjs → shared/passwords.mjs
- `diagnoseObservation()` --calls--> `observeImage()`  [EXTRACTED]
  scripts/check-ai.mjs → worker/ai-vision.mjs

## Import Cycles
- None detected.

## Communities (33 total, 4 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+28 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.08
Nodes (41): hono, miniflare, SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, companies, image(), fail(), observeImage() (+33 more)

### Community 3 - "App"
Cohesion: 0.16
Nodes (22): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+14 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.10
Nodes (34): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+26 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "admin-provision.mjs"
Cohesion: 0.21
Nodes (14): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), protectSecret(), safeMessage(), secrets (+6 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.33
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.12
Nodes (31): companyId, controller(), otherId, secret, tokens, captureBrowserState(), restoreBrowserState(), accountCookies() (+23 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "password-auth.mjs"
Cohesion: 0.29
Nodes (12): jose, tokenDigest(), authenticate(), keySets, authenticatePassword(), checkLoginRate(), cookieName(), cookieToken() (+4 more)

### Community 15 - "r2-budget.test.mjs"
Cohesion: 0.20
Nodes (11): bytes, delete(), get(), put(), mediaStore(), createR2Media(), reserve(), periodAt() (+3 more)

### Community 16 - "App.tsx"
Cohesion: 0.17
Nodes (20): blankCompany, initialPlatforms, platformColors, PlatformIcon(), Instagram(), Linkedin(), Youtube(), AITurn (+12 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.14
Nodes (21): Account, AccountPlatform, caption(), Saved, savedDate(), saveOnLeave(), seconds(), SocialAccounts() (+13 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.23
Nodes (10): api(), initialize(), encode(), prepareCloudMedia(), date(), SocialAI(), ask(), refresh() (+2 more)

### Community 19 - "ref_node_fs"
Cohesion: 0.11
Nodes (9): children, child, run, { app, store }, server, root, manifest, child (+1 more)

### Community 20 - "AuthRoot.tsx"
Cohesion: 0.24
Nodes (4): lucide-react, react, react-dom, AuthRoot()

### Community 21 - "check-ai.mjs"
Cohesion: 0.25
Nodes (13): diagnoseObservation(), http(), report, runCheck(), cfApi(), listAll(), requireCapacity(), verifyWorkersAIFree() (+5 more)

### Community 22 - "passwords.mjs"
Cohesion: 0.25
Nodes (10): report, decode(), derive(), encode(), hashPassword(), PASSWORD_ITERATIONS, validPasswordHash(), verifyPassword() (+2 more)

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

### Community 29 - "Projeye eklenen beceriler"
Cohesion: 0.40
Nodes (4): Bu projede nasıl kullanıldı?, Graphify, Güncelleme, Projeye eklenen beceriler

### Community 31 - "ref_node_assert"
Cohesion: 0.19
Nodes (6): fixture(), deployment, deployment, database(), migration(), seed

### Community 32 - "check-browser-login.mjs"
Cohesion: 0.50
Nodes (3): report, startedAt, targets

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AuthRoot.tsx` to `App.tsx`, `package.json`, `SocialAccounts.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `registerSocialAI()` (e.g. with `memoryView()` and `turnView()`) actually correct?**
  _`registerSocialAI()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04830917874396135 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `AuthRoot.tsx` to `App.tsx`, `package.json`, `SocialAccounts.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08245981830887492 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `package.json` to `social-ai.mjs`, `worker/index.mjs`, `check-ai.mjs`, `admin-provision.mjs`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._