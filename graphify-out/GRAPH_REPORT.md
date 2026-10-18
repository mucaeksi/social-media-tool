# Graph Report - social-media-tool  (2026-10-18)

## Corpus Check
- 45 files · ~20,355 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 282 nodes · 468 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `562609ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.mjs
- package.json
- ref_node_fs
- App
- e2e-cloud-server.mjs
- compilerOptions
- scripts
- setup.sh
- Mimari ve kapsam
- worker/index.mjs
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 31 edges
2. `scripts` - 17 edges
3. `createApp()` - 13 edges
4. `compilerOptions` - 11 edges
5. `saveDraft()` - 9 edges
6. `run()` - 8 edges
7. `cfApi()` - 7 edges
8. `postWarnings()` - 7 edges
9. `fail()` - 7 edges
10. `Sosyal Studio` - 7 edges

## Surprising Connections (you probably didn't know these)
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `brief()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs
- `draftInput()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → shared/schemas.mjs
- `smokeCloudflare()` --calls--> `protectSecret()`  [EXTRACTED]
  scripts/smoke-cloudflare.mjs → scripts/cloudflare-api.mjs
- `provisionCloudflare()` --calls--> `cfApi()`  [EXTRACTED]
  scripts/provision-cloudflare.mjs → scripts/cloudflare-api.mjs

## Import Cycles
- None detected.

## Communities (12 total, 1 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.10
Nodes (22): { app, store }, server, manifest, createApp(), fail(), requireCompany(), requireMedia(), validatePosts() (+14 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, express, hono, jose, lucide-react, react, react-dom, sharp (+27 more)

### Community 2 - "ref_node_fs"
Cohesion: 0.09
Nodes (19): jose, miniflare, @playwright/test, sharp, cfApi(), listAll(), protectSecret(), safeMessage() (+11 more)

### Community 3 - "App"
Cohesion: 0.08
Nodes (42): text(), api(), App(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+34 more)

### Community 4 - "e2e-cloud-server.mjs"
Cohesion: 0.15
Nodes (5): children, child, run, root, child

### Community 5 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 6 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+9 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.06
Nodes (27): Mevcut durum, Sonra gerekirse eğitim, Sosyal medya uzmanı AI, Önce marka bilgisini kullanma, Bileşenler, Dağıtımın yaptığı işlemler, GitHub ve Cloudflare dağıtımı, Secret kullanımı (+19 more)

### Community 11 - "worker/index.mjs"
Cohesion: 0.13
Nodes (24): zod, briefSchema, companySchema, draftSchema, postSchema, selectedSchema, createD1Media(), app (+16 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sharp` connect `ref_node_fs` to `app.mjs`, `package.json`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09815078236130868 - nodes in this community are weakly interconnected._
- **Why does `App()` connect `App` to `package.json`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `ref_node_fs` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._