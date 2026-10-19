# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 80 files · ~39,754 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 458 nodes · 904 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5dc4fc9d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub ve Cloudflare dağıtımı
- package.json
- ref_node_child_process
- App
- worker/index.mjs
- compilerOptions
- scripts
- provision.test.mjs
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- AGENTS.md
- passwords.mjs
- research-platforms.py
- r2-budget.test.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 33 edges
2. `scripts` - 18 edges
3. `cfApi()` - 14 edges
4. `createApp()` - 13 edges
5. `SocialAccounts()` - 13 edges
6. `compilerOptions` - 12 edges
7. `protectSecret()` - 11 edges
8. `hashPassword()` - 11 edges
9. `databaseQuery()` - 10 edges
10. `verifyPassword()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `registerPasswordRoutes()` --calls--> `verifyPassword()`  [EXTRACTED]
  worker/password-auth.mjs → shared/passwords.mjs
- `brief()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "GitHub ve Cloudflare dağıtımı"
Cohesion: 0.20
Nodes (10): Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma, GitHub ve Cloudflare dağıtımı, R2 kullanım sınırları, Secret kullanımı, Sosyal hesap tarayıcısı (+2 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (36): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+28 more)

### Community 2 - "ref_node_child_process"
Cohesion: 0.25
Nodes (3): children, root, child

### Community 3 - "App"
Cohesion: 0.05
Nodes (63): lucide-react, react, react-dom, text(), api(), App(), brief(), changeCompany() (+55 more)

### Community 4 - "worker/index.mjs"
Cohesion: 0.07
Nodes (48): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+40 more)

### Community 5 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "provision.test.mjs"
Cohesion: 0.08
Nodes (28): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), report, cfApi(), listAll() (+20 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.05
Nodes (37): Mevcut durum, Sonra gerekirse eğitim, Sosyal medya uzmanı AI, Önce marka bilgisini kullanma, Gerçek doğrulama ve sınırlar, Kaynaklar, Kullanım, Oturum verisinin korunması (+29 more)

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.13
Nodes (24): @cloudflare/puppeteer, report, startedAt, targets, companyId, controller(), otherId, secret (+16 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "passwords.mjs"
Cohesion: 0.13
Nodes (25): jose, miniflare, child, run, smokeCloudflare(), login(), decode(), derive() (+17 more)

### Community 15 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (10): bytes, delete(), get(), put(), createR2Media(), reserve(), periodAt(), quotaError() (+2 more)

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 192 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App` to `package.json`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.049682875264270614 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App` to `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.05209274314965372 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `package.json` to `worker/index.mjs`, `passwords.mjs`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `worker/index.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06558118498417007 - nodes in this community are weakly interconnected._