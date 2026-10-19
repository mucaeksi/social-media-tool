# Graph Report - social-media-tool  (2026-10-19)

## Corpus Check
- 76 files · ~36,881 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 1, .jsonc 1)

## Summary
- 420 nodes · 854 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `213733ae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.mjs
- package.json
- ref_node_child_process
- App
- r2-budget.test.mjs
- compilerOptions
- scripts
- provision.test.mjs
- setup.sh
- Mimari ve kapsam
- social-accounts.test.mjs
- AGENTS.md
- password-auth.mjs

## God Nodes (most connected - your core abstractions)
1. `App()` - 33 edges
2. `scripts` - 18 edges
3. `cfApi()` - 14 edges
4. `createApp()` - 13 edges
5. `protectSecret()` - 11 edges
6. `hashPassword()` - 11 edges
7. `SocialAccounts()` - 11 edges
8. `compilerOptions` - 11 edges
9. `databaseQuery()` - 10 edges
10. `verifyPassword()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `put()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `get()` --indirect_call--> `key()`  [INFERRED]
  tests/cloud/r2-budget.test.mjs → worker/browser-state.mjs
- `smokeCloudflare()` --calls--> `tokenDigest()`  [EXTRACTED]
  scripts/smoke-cloudflare.mjs → shared/passwords.mjs
- `start()` --calls--> `createApp()`  [EXTRACTED]
  tests/api.test.mjs → server/app.mjs
- `registerPasswordRoutes()` --calls--> `hashPassword()`  [EXTRACTED]
  worker/password-auth.mjs → shared/passwords.mjs

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.08
Nodes (42): zod, createApp(), fail(), requireCompany(), requireMedia(), validatePosts(), { app, store }, port (+34 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (37): dependencies, @cloudflare/puppeteer, express, hono, jose, lucide-react, react, react-dom (+29 more)

### Community 2 - "ref_node_child_process"
Cohesion: 0.25
Nodes (3): children, root, child

### Community 3 - "App"
Cohesion: 0.06
Nodes (57): lucide-react, react, react-dom, text(), api(), App(), brief(), changeCompany() (+49 more)

### Community 4 - "r2-budget.test.mjs"
Cohesion: 0.09
Nodes (17): miniflare, login(), request(), bytes, delete(), get(), put(), deployment (+9 more)

### Community 5 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 6 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, cf:build, cf:dev, cf:migrate:local, dev, dev:client, dev:server (+10 more)

### Community 7 - "provision.test.mjs"
Cohesion: 0.07
Nodes (38): applyAdminRequest(), databaseQuery(), keyId(), prepareAdminKey(), ensureBrowserSecret(), report, targets, report (+30 more)

### Community 8 - "setup.sh"
Cohesion: 0.29
Nodes (6): npm_config_cache, PATH, setup.sh script, UV_CACHE_DIR, UV_TOOL_BIN_DIR, UV_TOOL_DIR

### Community 10 - "Mimari ve kapsam"
Cohesion: 0.05
Nodes (37): Mevcut durum, Sonra gerekirse eğitim, Sosyal medya uzmanı AI, Önce marka bilgisini kullanma, Asistan üzerinden hesap oluşturma, Bileşenler, Dağıtımın yaptığı işlemler, Giriş, yönetici hesabı ve kullanıcı oluşturma (+29 more)

### Community 11 - "social-accounts.test.mjs"
Cohesion: 0.14
Nodes (24): companyId, controller(), otherId, secret, tokens, accountCookies(), BROWSER_LIMITS, browserPlatforms (+16 more)

### Community 12 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): GitHub ve Cloudflare, graphify, Projeye özgü geliştirme notları

### Community 13 - "password-auth.mjs"
Cohesion: 0.29
Nodes (12): jose, tokenDigest(), authenticate(), keySets, authenticatePassword(), checkLoginRate(), cookieName(), cookieToken() (+4 more)

## Knowledge Gaps
- **9 isolated node(s):** `@types/react`, `@types/react-dom`, `typescript`, `wrangler`, `npm_config_cache` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 167 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App` to `package.json`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `typescript` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07987012987012987 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App` to `package.json`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.048484848484848485 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.058496853017400964 - nodes in this community are weakly interconnected._