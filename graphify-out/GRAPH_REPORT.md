# Graph Report - social-media-tool  (2026-10-18)

## Corpus Check
- 62 files · ~29,126 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 350 nodes · 668 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5208f745`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.mjs
- package.json
- ref_node_fs
- App
- r2-budget.test.mjs
- compilerOptions
- scripts
- provision.test.mjs
- setup.sh
- Mimari ve kapsam
- worker/index.mjs
- AGENTS.md
- password-auth.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 32 edges
2. `scripts` - 18 edges
3. `createApp()` - 13 edges
4. `compilerOptions` - 11 edges
5. `cfApi()` - 10 edges
6. `hashPassword()` - 10 edges
7. `verifyPassword()` - 10 edges
8. `registerPasswordRoutes()` - 10 edges
9. `databaseQuery()` - 9 edges
10. `tokenDigest()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `applyAdminRequest()` --calls--> `validPasswordHash()`  [EXTRACTED]
  scripts/admin-provision.mjs → shared/passwords.mjs
- `applyAdminRequest()` --calls--> `verifyPassword()`  [EXTRACTED]
  scripts/admin-provision.mjs → shared/passwords.mjs
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `brief()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs
- `draftInput()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.08
Nodes (29): zod, { app, store }, server, manifest, child, createApp(), fail(), requireCompany() (+21 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, express, hono, jose, lucide-react, react, react-dom, sharp (+27 more)

### Community 2 - "ref_node_fs"
Cohesion: 0.20
Nodes (4): children, child, run, root

### Community 3 - "App"
Cohesion: 0.06
Nodes (47): lucide-react, react, react-dom, text(), api(), App(), brief(), changeCompany() (+39 more)

### Community 4 - "r2-budget.test.mjs"
Cohesion: 0.22
Nodes (9): bytes, delete(), get(), createR2Media(), reserve(), periodAt(), quotaError(), R2_LIMITS (+1 more)

### Community 5 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "provision.test.mjs"
Cohesion: 0.12
Nodes (20): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), cfApi(), listAll(), protectSecret(), safeMessage() (+12 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.06
Nodes (30): Mevcut durum, Sonra gerekirse eğitim, Sosyal medya uzmanı AI, Önce marka bilgisini kullanma, Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma (+22 more)

### Community 11 - "worker/index.mjs"
Cohesion: 0.12
Nodes (23): jose, miniflare, platforms, authenticate(), keySets, createD1Media(), app, company() (+15 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "password-auth.mjs"
Cohesion: 0.20
Nodes (21): smokeCloudflare(), login(), decode(), derive(), encode(), hashPassword(), PASSWORD_ITERATIONS, randomToken() (+13 more)

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 144 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sharp` connect `package.json` to `app.mjs`, `worker/index.mjs`, `password-auth.mjs`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07568027210884354 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App` to `package.json`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05365853658536585 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.06448087431693988 - nodes in this community are weakly interconnected._