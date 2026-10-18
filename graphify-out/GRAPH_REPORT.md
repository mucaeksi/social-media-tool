# Graph Report - social-media-tool  (2026-10-18)

## Corpus Check
- 43 files · ~19,190 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 277 nodes · 458 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8dd86b41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.mjs
- package.json
- ref_node_fs
- App
- e2e-server.mjs
- compilerOptions
- scripts
- dependencies
- setup.sh
- Mimari ve kapsam
- worker/index.mjs
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 31 edges
2. `scripts` - 16 edges
3. `createApp()` - 13 edges
4. `compilerOptions` - 11 edges
5. `saveDraft()` - 9 edges
6. `run()` - 8 edges
7. `cfApi()` - 7 edges
8. `postWarnings()` - 7 edges
9. `Sosyal Studio` - 7 edges
10. `sharp` - 6 edges

## Surprising Connections (you probably didn't know these)
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `brief()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs
- `draftInput()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs
- `createApp()` --calls--> `createStore()`  [EXTRACTED]
  server/app.mjs → server/store.mjs
- `smokeCloudflare()` --calls--> `protectSecret()`  [EXTRACTED]
  scripts/smoke-cloudflare.mjs → scripts/cloudflare-api.mjs

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.12
Nodes (24): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+16 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (26): devDependencies, miniflare, @playwright/test, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+18 more)

### Community 2 - "ref_node_fs"
Cohesion: 0.08
Nodes (18): miniflare, @playwright/test, sharp, cfApi(), listAll(), protectSecret(), safeMessage(), secrets (+10 more)

### Community 3 - "App"
Cohesion: 0.08
Nodes (42): text(), api(), App(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+34 more)

### Community 4 - "e2e-server.mjs"
Cohesion: 0.12
Nodes (7): child, run, { app, store }, server, manifest, child, createStore()

### Community 5 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 6 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+8 more)

### Community 7 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, express, hono, jose, lucide-react, react, react-dom, sharp (+1 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.06
Nodes (27): Mevcut durum, Sonra gerekirse eğitim, Sosyal medya uzmanı AI, Önce marka bilgisini kullanma, Bileşenler, Dağıtımın yaptığı işlemler, GitHub ve Cloudflare dağıtımı, Secret kullanımı (+19 more)

### Community 11 - "worker/index.mjs"
Cohesion: 0.17
Nodes (19): jose, authenticate(), keySets, app, company(), fail(), json(), media() (+11 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 126 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sharp` connect `ref_node_fs` to `app.mjs`, `package.json`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `App` to `package.json`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07126436781609195 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `ref_node_fs` be split into smaller, more focused modules?**
  _Cohesion score 0.08461538461538462 - nodes in this community are weakly interconnected._