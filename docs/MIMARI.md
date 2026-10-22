# Mimari ve veri yerleşimi

Sosyal Studio 1.8, dokuz platform için Türkçe içerik hazırlayan, şirket erişimleriyle ayrılmış bir paneldir. Üretim Cloudflare Workers, D1 ve R2 kullanır. Node/SQLite sürümü yerel geliştirme ve geçici testler içindir.

## Bileşenler

| Bileşen | Sorumluluk |
| --- | --- |
| `src/App.tsx`, `src/draftRecovery.ts` | Stüdyo, otomatik kayıt, sürüm çakışması ve kullanıcı/şirket kapsamlı kurtarma |
| `src/DraftLibrary.tsx` | Arama, platform filtresi, sayfalama, arşiv, çöp kutusu ve sürüm geçmişi |
| `src/StudioDetails.tsx` | Galeri, ürün/kampanya bağlantısı, içerik onayı ve platform kırpması |
| `src/ContentWorkspace.tsx` | Kampanya, ürün, takvim, ölçüm, deney ve kalite karşılaştırması |
| `src/BackupManager.tsx`, `shared/zip.mjs` | Bounded ZIP parçaları, bütünlük denetimi ve geri yükleme |
| `src/media-worker.ts`, `src/prepareMedia.ts` | Tarayıcı işçisinde metadata temiz JPEG boyutları ve ilerleme |
| `worker/draft-store.mjs` | D1/SQLite için ortak atomik sürüm kontrolü ve sınırlı geçmiş |
| `worker/editorial.mjs`, `worker/content-backup.mjs` | Şirket kapsamlı içerik/medya işlemleri ve yedek akışı |
| `worker/workspace-access.mjs` | Yönetici/editör ve şirket erişimi |
| `worker/knowledge.mjs` | Kaynak toplama ve kanıtlı bilgi onayı |
| `worker/social-ai.mjs`, `worker/local-ai.mjs` | Bulut ve şirket bilgisayarındaki model yolu |
| `worker/generation-trace.mjs` | Gerçek istek süresi, model/rehber ve kaynak sürümü izi |
| `worker/publications.mjs` | Facebook pilotunun onay, tek yürütme ve sonuç doğrulaması |
| `companion/` | Taşınabilir Firefox/Ollama, cihaz bağlantısı ve güvenli yama |
| `shared/platform-catalog.mjs`, `shared/features.mjs` | Ortak platform düzenleme kuralları ve sürüm/model kaydı |

## Taslak ve medya

Taslak sürümü JSON içinde tutulur. Güncelleme, sunucudaki sürümle aynı sürüm numarasını gerektirir. SQL güncellemesi koşulludur; eşzamanlı eski yazma 409 olur. Son beş sürüm, şirket başına toplam 100 geçmiş kaydı korunur. Silme önce çöp kutusuna taşır; kalıcı silme yöneticiye aittir.

Stüdyo en fazla 10 görselli hazırlık paketi, platforma özgü medya/kırpma ve ayrı alt açıklamaları tutar. Medya şirketle ilişkilidir. Yeni taslak yazılırken görsel ilişkisinin geçerliliği SQL yazmasında da denetlenir. Taslaklar, geçmiş, içerik kayıtları, yayınlar ve AI kullanımı kaldırılmakta olan görsele bağlanamaz. Kısmi dosya silmede temizleme durumu korunur; tekrar silme temizliği tamamlayabilir.

R2/D1 medya akışı özgün JPEG ve dokuz platform için sığdırma/kırpma boyutlarını saklar. Node sürümü aynı görsel boyutlarını Sharp ile yerelde üretir. Dosya türü/boyut sınırları, metadata temizliği ve şirket sahipliği korunur.

## İçerik kayıtları

`0013_editorial_workspace.sql`, mevcut veriyi silmeden `draft_versions`, `editorial_records`, tercihler, inceleme arşivleri, geri yükleme kayıtları, üretim izleri ve kısa süreli medya kullanım kayıtlarını ekler. Üretim verisi aynı D1 veritabanında kalır.

İçerik türleri kampanya, ürün, fikir, deney, düzeltme, ölçüm, model değerlendirmesi ve editoryal plandır. Tür başına şirket sınırı 100, kayıt başına sınır 16 KB'tır. Şirket ilişkileri sunucuda doğrulanır. Ürün ve örnek onayı yöneticiye aittir; ürün için kanıt/kaynak ve geçerlilik tarihi gerekir.

Editoryal takvim manuel plan ile yayın işini ayrı tutar. Tarih düzenlemek onaylı yayın işini değiştirmez. Ölçümler platform/gönderi/kampanya/varyant ve ölçüm penceresine bağlıdır. Boş değer sıfır sayılmaz; kümülatif anlık görüntüler toplanmaz.

## AI bağlamı ve değerlendirme

Cloudflare Gemma 4 ve özel yerel Qwen3.5:9b yolları vardır. Yerel model 4-bit, 16K bağlam ve mevcut GPU bellek ölçümüyle çalışır. Model/rehber sürümleri ortak kayıttan gelir; yeni rehber eski ara işlerle karıştırılmaz.

Şirket hafızası, geçerli kaynak bilgileri ve geçerli onaylı ürün kartları referans verisidir. Şirket metni araç veya sistem talimatına dönüşmez. Görsel gözlemi yalnız şirkete ait medyadan hazırlanır. Onaylı editör örnekleri mevcut hafıza sınırları içinde kullanılabilir; model ağırlığı eğitimi yapılmaz.

Üretim izi, sunucudaki toplam istek süresini ve kaynak özetini kaydeder; GPU süre ölçümü değildir. Karşılaştırma ekranında gerçek yanıt, kaynak/rehber sürümü, insan puanı, düzeltme süresi ve uydurma bilgi işareti tutulur. Gerçek donanım kalitesi emülatör sonucundan çıkarılmaz.

Gece araştırması seçili platformları ve geçerliliği yaklaşan kaynakları önceliklendirir. İnsan onayı, toplam 20 deneme/gece, URL/gece tek deneme, 7 günlük plan ve 14 günlük not sınırları korunur. Site araştırmasındaki DNS/IP, yönlendirme, robots ve boyut/süre denetimleri değişmez.

## Yedek ve geri yükleme

İçerik yedeği manifest, kaynak paketleri ve JPEG'lerden oluşur; büyük indirme yaklaşık 12 MB içerikli parçalara ayrılır. ZIP yolları, boyutları, CRC ve SHA-256 denetlenir. Yedek alırken içerik düzenlemeleri durdurulmalıdır; parçalar ayrı isteklerle okunur.

Geri yükleme yalnız yeni şirket kopyasına yapılır. Medya kimlikleri yeniden eşlenir. Kaynak/ürün onayları yeniden inceleme ister. Eski yayın ve hafıza kayıtları inceleme arşividir; yürütülmez veya otomatik model bağlamına girmez. Geri yükleme kesilirse aynı yedekle devam edilir. Oturumlar, cihaz anahtarları, Firefox profilleri, özel sohbetler, model dosyaları ve çalışan süreçler içerik ZIP'ine girmez.

## Yayınlama ve sınırlar

İlk otomatik adaptör Facebook Firefox pilotudur. Açık onay, sabit içerik/hesap, atomik tek yürütme, geçerli kaynaklar ve yeni gönderi bağlantısı kanıtı gerekir. Çoklu görsel pilotta reddedilir. Değişen ürün/kaynak sürümü işi durdurur. Belirsiz sonuç otomatik tekrarlanmaz.

Resmî OAuth/API yayın servisi ve diğer platformların otomatik yayın adaptörleri bu yama kapsamında etkin değildir. Google İşletme Profili ve WhatsApp Business için manuel içerik planlanabilir. Kısa video alanı çekim/metin hazırlığıdır; video dosyası oluşturmaz.

Şirket/kullanıcı/medya sınırları, D1 400 MB güvenli yazma eşiği, R2 bütçeleri, bulut AI rezervasyonu ve yerel AI sınırları korunur. Yerel testler ve emülatör gerçek hesap yayını, model/GPU başarısı veya ücretsiz sağlayıcı onayı sayılmaz.
