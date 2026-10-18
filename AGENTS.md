## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.


## Projeye özgü geliştirme notları

- Kullanıcı arayüzü, bildirimler ve yeni kullanım dokümanı tamamen Türkçe olmalıdır. Dış kaynak becerilerin asıllarını ve lisanslarını koruyun.
- Kullanıcı ChatGPT için API yerine manuel kopyala–yapıştır yöntemini seçti. Model oturumu, API kullanımı veya sosyal medya paylaşımı gerçekleşmiş gibi gösterilmemelidir.
- Gerçek OAuth bağlantısı ve yayınlama servisi henüz yoktur. Şifreleri veya erişim belirteçlerini koda, test verisine ya da becerilere eklemeyin.
- Mevcut checkout'u kullanın; kullanıcı açıkça istemedikçe yeni Git worktree oluşturmayın.
- Bulut ortamında Graphify: `/workspace/.tools/bin/graphify`. `export PATH="/workspace/.tools/bin:$PATH"` ile etkinleştirin. Yerel kod analizi için `GRAPHIFY_BACKEND=none` kullanın.
- Kaynak beceri kopyaları `skills-lock.json` ile sabittir. İlgili beceriyi uygulamadan önce kendi `SKILL.md` dosyasını ve gerekli başvuru dosyalarını okuyun. Kurulu liste `docs/SKILLER.md` içindedir.
- `npm test`, `npm run build`, `npm run test:e2e` ve `npm run skills:verify` doğrulama komutlarıdır. Tarayıcı testleri ayrı geçici SQLite verisi kullanır; kullanıcının `data/` dizini testlerde kullanılmamalıdır.
