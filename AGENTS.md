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
- Kullanıcı manuel ChatGPT aktarımını korurken 19 Ekim 2026'da entegre Cloudflare AI asistanını seçti. Workers AI binding, Gemma 4 ve şirkete özel D1 hafızası kullanılır. ChatGPT hesabına giriş/model ağırlığı eğitimi yapılmaz. Uydurma sonuç/SEO başarısı/yayın iddiası üretilmez.
- Gerçek OAuth bağlantısı ve yayınlama servisi henüz yoktur. Şifreleri veya erişim belirteçlerini koda, test verisine ya da becerilere eklemeyin.
- Kullanıcı sosyal hesaplar için geliştirici uygulaması yerine normal giriş ve yalnızca web panelini seçti; eklenti istemiyor. Cloudflare Browser Run + Live View deneyseldir. Instagram giriş formu doğrulandı; X ilk Cloudflare erişimlerini reddetti. Gerçek kullanıcı girişi ve otomatik yayın doğrulanmış değildir. Detaylar `docs/HESAP_GIRISI.md` içinde.
- 19 Ekim 2026 güncellemesi: kullanıcı ücretsiz resmi API kullanımını da kabul etti. Meta uygulaması henüz yok; hesap sahibi sıfırdan oluşturacak. İlk hedef Facebook Sayfası + profesyonel Instagram'dır. `docs/META_KURULUM.md` uygulanır. X'in resmi güncel API'si ücretlidir; X API çağrısı, kredi satın alma, otomatik bakiye yükleme veya ücretli aracı servis açmayın. Diğer sağlayıcıların güncel erişim/kota koşulları doğrulanmadan ücretsiz çalışıyor iddiasında bulunmayın. OAuth ve API yayını henüz uygulanmadı; yer tutucu başarı üretmeyin.
- Diğer platformlar da incelendi: `docs/PLATFORM_BAGLANTILARI.md`, `deployment/platform-research.json`, `deployment/browser-check.json`. Facebook/Instagram/Threads/Pinterest/Google giriş alanları açıldı; X erişimi reddedildi; TikTok/LinkedIn sayfaları açıldı ancak giriş alanları doğrulanamadı. Hiçbirinde gerçek hesap girişi denenmedi. TikTok Direct Post kuralları yalnızca kullanıcının/ekibinin yönettiği hesaplara yükleyen şirket içi araçları kabul etmiyor; API onayı varsaymayın. Hesap kartları derleme sırasında giriş kontrol kaydını okur; formun açılması bağlı hesap anlamına gelmez.
- `BROWSER_STATE_KEY` mevcut Worker secret'ıdır; yeniden üretmeyin veya değerini çıkarmayın. D1 sosyal hesap çerezleri bu anahtarla şifrelidir. İmzalı Live View URL'leri, çerezler ve kodlar loglara/Git'e yazılmaz. Günlük 600 saniye bütçesi, tek tarayıcı ve 3 dakika alarm sınırı korunur. Kapanışı belirsiz oturum varken yeni hesap açılamaz.
- Mevcut checkout'u kullanın; kullanıcı açıkça istemedikçe yeni Git worktree oluşturmayın.
- Bulut ortamında Graphify: `/workspace/.tools/bin/graphify`. `export PATH="/workspace/.tools/bin:$PATH"` ile etkinleştirin. Yerel kod analizi için `GRAPHIFY_BACKEND=none` kullanın.
- Kaynak beceri kopyaları `skills-lock.json` ile sabittir. İlgili beceriyi uygulamadan önce kendi `SKILL.md` dosyasını ve gerekli başvuru dosyalarını okuyun. Kurulu liste `docs/SKILLER.md` içindedir.
- `npm test`, `npm run build`, `npm run test:e2e` ve `npm run skills:verify` doğrulama komutlarıdır. Tarayıcı testleri ayrı geçici SQLite verisi kullanır; kullanıcının `data/` dizini testlerde kullanılmamalıdır.


## GitHub ve Cloudflare

- Kullanıcı tüm geliştirme güncellemelerinin `main` dalına commit edilip pushlanmasını açıkça istedi. PR veya başka dal üzerinden yayın önermeyin; force push yapmayın.
- Üretim yalnızca GitHub Actions + Cloudflare Workers/D1/R2 ve D1 üzerinde şifreli kullanıcı oturumları kullanır. Mevcut `CLOUDFLARE_API` GitHub repository secret'ını dağıtım iş akışı okur; değeri ortamdan çıkarmaya, sohbette istemeye veya koda yazmaya çalışmayın.
- Üretimde kullanıcı adı/e-posta ve şifreyle giriş yapılır. Açık kayıt yoktur. Yönetici ve editör rolleri vardır; kullanıcı yönetimi admin yetkisi ister. Şirket bazında kullanıcı yetkisi ve davet e-postası henüz yoktur.
- Asistan üzerinden hesap oluşturma için `deployment/auth-bootstrap.json` açık anahtarını ve şifreli `.github/admin-request.json` kanalını kullanın. Gerçek şifre, şifre özeti veya özel anahtar Git’e eklenmez. D1’deki özel aktarım anahtarı bir işlemden sonra tüketilir; tekrarlanan istek mevcut kullanıcıyı sıfırlamaz. `docs/CLOUDFLARE.md` akışını izleyin.
- Zero Trust Free planı ve sıfır tutar dağıtım öncesi doğrulanır. Access/Gateway kullanan hesaplarda 50 aktif koltuk Cloudflare tarafından uygulanır; bu panelin şifreli girişi Access koltuğu tüketmez. D1 kullanıcı sayısı ayrıca 50 ile sınırlıdır; ücretli abonelik veya koltuk satın almayın. Kaynak sınırlarını atlamayın.
- Worker giriş doğrulaması kapatılamaz. Üretim `AUTH_MODE=password` kullanır; eski Access uygulaması yalnızca yeni Worker ve etkin yönetici doğrulandıktan sonra kaldırılır. Yerel bypass yalnızca development + localhost için geçerlidir; üretim yapılandırması ayrı oluşturulur.
- `npm run test:cloud`, `npm run test:deploy`, `npm run test:e2e:cloud` ve `npm run test:e2e:d1` ve `npm run test:e2e:auth` Cloudflare denetimleridir. D1/R2 emulator testleri canlı hesaba bağlanmaz.
- Canlı yayın için `deployment/cloudflare.json` ve Actions sonucunu inceleyin. Yerel testleri veya başarısız dağıtımı canlı başarı olarak raporlamayın.
- AI ayrıntıları `docs/AI_YOL_HARITASI.md` ve `worker/social-ai.mjs` içindedir. Yerelde binding eklemeyin; emulator testleri gerçek modeli çağırmaz. Workers Free/günlük 10.000 Neuron sağlayıcı sınırı, uygulamada 9.000 Neuron atomik ve geri verilmeyen rezervasyon, kullanıcı başına saatte 20 istek korunur. Model/fiyat değişiminde bayt/token üst sınırını ve rezervasyonu yeniden doğrulayın; ücretli modele/AI Gateway kredisine geçmeyin. Gerçek model denetimi `ai-check.yml`, sonuç `deployment/ai-check.json` içindedir. Sohbet kullanıcı + şirket, hafıza şirket kapsamındadır; hafızayı admin düzenler. Stüdyoya aktarım kullanıcı eylemidir; otomatik yayın yapmaz.
- Görsel + özet akışı `worker/ai-vision.mjs` ve `shared/social-expert.mjs` içindedir. Görsel Gemma 4'e yalnızca şirket ilişkisi doğrulanmış özel depodan verilir. Görsel ve metin çağrılarının toplam bütçesi ilk çağrıdan önce ayrılır; gözlem başarısızsa metin üretimi durur. Görsel gözlemi istemciden kabul edilmez, veri URI'leri loglanmaz. Aynı görsel metinlerle stüdyoya taşınır. Uzman rehberi model ağırlığı eğitimi değildir. API yayınlayıcıları/izinleri olmadan gönderildi denmez.

- Metin ve görsel için Gemma 4 kullanılır; 9.091/27.273 Neuron/milyon token fiyatı, iç düşünce kapalı ve 4.096 görsel token payı korunur. `caption_probe` tam görsel doğrulaması değildir. Tam canlı kontrol 20 Ekim 2026 00.05 UTC için tek tarih kapısıyla planlandı; `deployment/ai-check.json` sonucu kontrol edilmelidir.
