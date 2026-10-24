# ECC: seçilen beceriler ve projeye uygulanışı

Kullanıcı 23 Ekim 2026'da ECC'nin kurulmasını ve aktif kullanımını istedi. Kaynak: https://github.com/affaan-m/ECC, sabit commit `90606c8315ee09cafc303515c5f33024db6b9882`. MIT lisansı her becerinin yanında korunur. `skills-lock.json` kaynak sürümünü ve bütün dosyaların SHA-256 özetlerini tutar; `npm run skills:verify` doğrular.

Yalnız bu ürünün içerik ve doğrulama işlerine uygun beş beceri `.agents/skills/ecc-*` altında kuruldu:

| Beceri | Bu projede kullanım |
| --- | --- |
| content-engine | Kaynak görsel/özetten tek ana mesaj, platforma uygun anlatım ve somut fayda |
| brand-voice | Şirketin seçtiği ton ve onaylı örnekleri; örnek yokken marka sesi keşfi iddiası yok |
| crosspost | Ayrı platform açılışları, anlamı koruma, kopya metin ve etiket kontrolü |
| verification-loop | Derleme/tip kontrolü, mevcut testler, sır ve diff incelemesi, gerçek dağıtım kaydı |
| e2e-testing | Kısmi hata, tekrar, iptal, gerçek D1 kayıtları, mobil ve kullanıcı akışı testleri |

Orijinal SKILL.md dosyaları değiştirilmedi. Yabancı API/ücretli servis kurulmadı, ECC install.sh/npm/hook/daemon çalıştırılmadı. SocialClaw/X API gerektiren `social-publisher` ve `x-api` eklenmedi. ECC'nin başka framework, kişisel hafıza veya ödeme modülleri alınmadı.

Bu uyarlamada `.agents/product-marketing.md` ve AGENTS.md ürün bağlamıdır. Kullanıcı oturumları, şifreleri, kişisel marka sesi örnekleri ve müşteri verisi beceri dosyalarına yazılmaz. Eksik araçlar, örnek şablon komutlar veya isteğe bağlı üçüncü servisler kurulmuş kabul edilmez. Mevcut main/Cloudflare yayını, Türkçe arayüz, ücretsiz plan ve şirket ayrımı kuralları geçerlidir. Beceri örneklerindeki test atlama veya PR önerileri mevcut depo talimatlarının yerine geçmez.

Qwen bütün ECC deposunu otomatik okumaz. `shared/social-expert.mjs` içindeki kısa Türkçe kaynak/marka/platform/kalite rehberi bu üç içerik becerisinden uyarlanır; mevcut `localSystem` üzerinden yerel Qwen'e verilir. Orijinaller ve lisanslar burada sürümlenir. Şirket profili, güncel onaylı hafıza ve incelenmiş gece notları gerçek bağlamı sağlar. Bu uygulama model ağırlığı eğitimi veya doğrulanmış sosyal medya uzmanlığı garantisi değildir.

Geliştirmede becerileri aktif kullanırken önce ilgili SKILL.md okunur; içerik işi için content-engine → brand-voice → crosspost, değişiklik sonrası verification-loop ve kullanıcı akışında e2e-testing uygulanır. Bu sürümde bu yöntem, Qwen hazırlığı → ayrı taslak → yayın önizlemeleri → eklenti onayı akışını ve yeniden deneme testlerini şekillendirdi.

## Seçilmiş ajan rolleri

Kullanıcının ek isteğiyle architect, code-reviewer, marketing-agent ve e2e-runner tanımları `.agents/ecc/agents/` altında orijinalleri ve MIT lisansıyla eklendi; aynı commit ve SHA-256 kilidinde doğrulanır. `.codex/config.toml` ve `.codex/agents/ecc-*.toml` projeye özel dört rolü kaydeder. Üst model/sağlayıcı, izin veya proxy ayarları değiştirilmez; upstream sonnet/opus ve araç isimleri orijinal belgelerde tarihsel ipucu olarak kalır, mevcut oturumun araçları ve varsayılan modeli kullanılır. Yapılandırmanın yeni bir Codex oturumunda yüklenmesi sürüm ve güvenilen proje ayarlarına bağlıdır; bu sohbette rol belgeleri doğrudan görev talimatına katıldı.

Bu geliştirmede üç bağımsız ajan mimari, kod ve pazarlama incelemesi yaptı; ana ajan e2e-runner rolüyle mevcut Playwright/Firefox doğrulamasını yürüttü. Kaynak platformunun seçilmemesi halinde metnin kaybolması, kaynak kanıtlarının üretim sonunda yeniden doğrulanması, YouTube biçim çelişkisi, caption/etiket tekrarı, depolama hatasında tekrar kimliği, kripto beklemesi sırasında iptal ve aynı işin eski iptalinin yeni denemeyi kesmesi bulguları düzeltildi. Üretim denemesine ayrı attemptId, kaynak kanıtı birleşimi ve açık sınır hatası eklendi.

Gelecekte mimari değişiklikte ecc_architect, kod değişikliğinden sonra ecc_code_reviewer, KKTC içerik/ürün değerlendirmesinde ecc_marketing_agent, kritik kullanıcı yolunda ecc_e2e_runner kullanılabilir. Çoklu ajanlar yalnız kullanıcı veya geçerli talimatlar yetki verdiğinde başlatılır; bu kullanıcı bu oturumda açıkça istedi. Bütün ajanlar için graphify sorgusu ve gerçek başarı kanıtı kuralları korunur. Ajan dosyaları Qwen modeline ayrı süreçler kurmaz; yerel modelin uzman rehberi uygulamada ayrıca bulunur.

## 1.14 Qwen dosya paketi ve arayüz

Qwen için ayrı, görevle seçilen 17 SKILL.md dosyası artık portable ai/skills altında oluşturulur. Önceki 1.13 ortak istem uyarlaması bu sürümde modüler dosya yüklemeye dönüştürüldü; doküman: QWEN_BECERILERI_1_14.md. Panel yenilemesinde Impeccable ve kurulu frontend-design belgeleri kullanıldı; kaynaklar ve uyarlama PANEL_TASARIM_1_14.md içindedir. ECC/Impeccable geliştirme becerileri ile Qwen'in çalışma anında okuduğu paket farklı amaçlara sahiptir.
