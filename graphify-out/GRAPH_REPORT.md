# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 89 files · ~50,571 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 517 nodes · 1099 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19b41abf`
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
- @playwright/test
- AuthRoot.tsx
- dependencies
- devDependencies
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
4. `cfApi()` - 16 edges
5. `createApp()` - 13 edges
6. `SocialAccounts()` - 13 edges
7. `protectSecret()` - 12 edges
8. `hashPassword()` - 12 edges
9. `compilerOptions` - 12 edges
10. `databaseQuery()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `diagnoseObservation()` --calls--> `observeImage()`  [EXTRACTED]
  scripts/check-ai.mjs → worker/ai-vision.mjs
- `smokeCloudflare()` --calls--> `tokenDigest()`  [EXTRACTED]
  scripts/smoke-cloudflare.mjs → shared/passwords.mjs
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): engines, node, name, private, type, version, @cloudflare/puppeteer, express (+7 more)

### Community 2 - "social-ai.mjs"
Cohesion: 0.08
Nodes (50): createPrompt(), SOCIAL_EXPERT_RULES, SOCIAL_EXPERT_VERSION, companies, image(), fail(), observeImage(), VISION_LIMITS (+42 more)

### Community 3 - "App"
Cohesion: 0.16
Nodes (22): text(), App(), applyAI(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+14 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.06
Nodes (31): zod, children, child, run, { app, store }, server, root, child (+23 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "provision.test.mjs"
Cohesion: 0.07
Nodes (44): miniflare, applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), diagnoseObservation(), report (+36 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.33
Nodes (6): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.14
Nodes (24): companyId, controller(), otherId, secret, tokens, accountCookies(), BROWSER_LIMITS, browserPlatforms (+16 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "password-auth.mjs"
Cohesion: 0.29
Nodes (12): jose, tokenDigest(), authenticate(), keySets, authenticatePassword(), checkLoginRate(), cookieName(), cookieToken() (+4 more)

### Community 15 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (9): bytes, delete(), get(), put(), reserve(), periodAt(), quotaError(), R2_LIMITS (+1 more)

### Community 16 - "App.tsx"
Cohesion: 0.19
Nodes (16): blankCompany, initialPlatforms, platformColors, PlatformIcon(), Instagram(), Linkedin(), Youtube(), AuthUser (+8 more)

### Community 17 - "SocialAccounts.tsx"
Cohesion: 0.15
Nodes (18): lucide-react, Modal(), Account, caption(), savedDate(), seconds(), SocialAccounts(), close() (+10 more)

### Community 18 - "SocialAI.tsx"
Cohesion: 0.18
Nodes (14): api(), initialize(), encode(), prepareCloudMedia(), AITurn, date(), kinds, Memory (+6 more)

### Community 19 - "@playwright/test"
Cohesion: 0.24
Nodes (3): @playwright/test, sharp, ids

### Community 20 - "AuthRoot.tsx"
Cohesion: 0.28
Nodes (3): react, react-dom, AuthRoot()

### Community 21 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+2 more)

### Community 22 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, miniflare, @playwright/test, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+1 more)

### Community 23 - "Sosyal Studio"
Cohesion: 0.29
Nodes (7): Beceriler ve mimari, Cloudflare üzerinde yayın, Kontroller, Kullanım, Kurulum, Neler çalışıyor?, Sosyal Studio

### Community 25 - "Sosyal medya uzmanı AI"
Cohesion: 0.33
Nodes (6): Kullanım ve şirket hafızası, Resmi kaynaklar, Sosyal medya uzmanı AI, Sınırlar ve doğrulama, Veri ve yetkiler, Ücretsiz kullanım

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 208 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AuthRoot.tsx` to `App.tsx`, `package.json`, `SocialAI.tsx`, `SocialAccounts.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `registerSocialAI()` (e.g. with `memoryView()` and `turnView()`) actually correct?**
  _`registerSocialAI()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `SocialAccounts.tsx` to `App.tsx`, `package.json`, `SocialAI.tsx`, `AuthRoot.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `social-ai.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08038075092543628 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `@playwright/test` to `package.json`, `social-ai.mjs`, `worker/index.mjs`, `provision.test.mjs`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._