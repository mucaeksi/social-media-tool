# Graph Report - social-media-tool  (2026-10-18)

## Corpus Check
- 24 files · ~12,044 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 193 nodes · 279 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- app.mjs
- package.json
- App.tsx
- App
- e2e-server.mjs
- compilerOptions
- scripts
- dependencies
- setup.sh
- Mimari ve kapsam
- index.mjs
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 30 edges
2. `createApp()` - 13 edges
3. `compilerOptions` - 11 edges
4. `scripts` - 10 edges
5. `run()` - 8 edges
6. `postWarnings()` - 6 edges
7. `Sosyal Studio` - 6 edges
8. `Mimari ve kapsam` - 6 edges
9. `fail()` - 5 edges
10. `PlatformIcon()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `brief()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → server/app.mjs
- `draftInput()` --indirect_call--> `text()`  [INFERRED]
  src/App.tsx → server/app.mjs
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `App()` --calls--> `Instagram()`  [EXTRACTED]
  src/App.tsx → src/platformMarks.tsx
- `App()` --calls--> `Linkedin()`  [EXTRACTED]
  src/App.tsx → src/platformMarks.tsx

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.12
Nodes (22): briefSchema, companySchema, createApp(), draftSchema, fail(), postSchema, requireCompany(), requireMedia() (+14 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (26): devDependencies, @playwright/test, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react, engines (+18 more)

### Community 2 - "App.tsx"
Cohesion: 0.16
Nodes (17): blankCompany, CompanyForm(), initialPlatforms, Modal(), platformColors, PlatformIcon(), Instagram(), Linkedin() (+9 more)

### Community 3 - "App"
Cohesion: 0.14
Nodes (23): text(), api(), App(), brief(), changeCompany(), changed(), draftInput(), exportDraft() (+15 more)

### Community 4 - "e2e-server.mjs"
Cohesion: 0.13
Nodes (5): children, { app, store }, server, root, manifest

### Community 5 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 6 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, dev:client, dev:server, graph, skills:verify, start (+2 more)

### Community 7 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, express, lucide-react, react, react-dom, sharp, zod

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.11
Nodes (16): Bileşenler, Doğrulama, Gerçek yayınlama için sonraki geliştirme, Mevcut sınırlar, Mimari ve kapsam, Veri akışı, Bu projede nasıl kullanıldı?, Graphify (+8 more)

### Community 11 - "index.mjs"
Cohesion: 0.40
Nodes (3): { app, store }, port, server

## Knowledge Gaps
- **8 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `npm_config_cache`, `UV_CACHE_DIR` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 95 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `package.json`, `App.tsx`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11827956989247312 - nodes in this community are weakly interconnected._
- **Why does `text()` connect `App` to `app.mjs`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06854838709677419 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `package.json` to `app.mjs`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._