# Mimari ve kapsam

Sosyal Studio, sekiz platform için içerik hazırlayan Türkçe bir web uygulamasıdır. Üretim Cloudflare Workers, D1 ve R2 üzerinde çalışacak şekilde hazırlanmıştır; eski Node/SQLite sürümü yerel geliştirme için korunur. R2 etkin olmayan hesaplarda görseller de D1 üzerinde saklanır. Cloudflare dağıtımı ve e-posta doğrulaması `docs/CLOUDFLARE.md` içinde açıklanır. Aşağıdaki yerel disk bilgileri Node sürümüne aittir. İlk geliştirme hedefi dört şirketi aynı panelden yönetebilmekti; mevcut sürüm 30 şirket profiline kadar izin verir. Her şirketin taslak listesi ve görselleri kendi kimliğiyle ilişkilidir. Bu ayrım çok kullanıcılı bir yetkilendirme sistemi değildir.

## Veri akışı

1. Kullanıcı şirketi seçer; marka adı, hedef kitle, anlatım dili ve anahtar kelimeler içerik hazırlığında kullanılır.
2. Ana metin ve isteğe bağlı görsel girilir. JPEG, PNG ve WebP dosyaları en fazla 15 MB / 40 megapiksel olarak kabul edilir. Sunucu dosyanın gerçek içeriğini okur, yönünü düzeltir, üstverisini temizleyip JPEG olarak saklar.
3. Temel hazırlama kaynak metni korur, şirketin anahtar kelimelerinden sınırlı sayıda etiket ekler. Bu işlem yapay zekâ değildir. ChatGPT seçeneği ise şirkete özel talimat oluşturur; kullanıcı kendi ChatGPT hesabında çalıştırıp JSON yanıtını panele yapıştırır.
4. İçe aktarılan JSON, seçili platformların her birini tam bir kez içermelidir. Hatalı yanıt mevcut taslağın üzerine yazılmaz. Kullanıcı başlıkları, metinleri, etiketleri ve görsel açıklamalarını düzenler.
5. SQLite taslakları kalıcı olarak saklar. Görseller platforma uygun boyutta JPEG; metinler JSON olarak indirilir. JSON içindeki görsel yolları bu uygulamaya aittir; görseller ayrıca indirilmelidir.

## Bileşenler

| Dosya | Görev |
| --- | --- |
| `src/App.tsx` | Türkçe şirket, içerik, taslak, ChatGPT aktarımı ve bağlantı bilgisi ekranları |
| `server/app.mjs` | İstek doğrulama, şirket ve taslak işlemleri, görsel dönüştürme, dışa aktarma |
| `server/store.mjs` | SQLite kalıcılığı ve şirket ilişkileri |
| `server/platforms.mjs` | Platform ayarları, temel şablon, ChatGPT talimatı ve dışa aktarma uyarıları |
| `scripts/dev.mjs` | Geliştirme sunucusu ile API sürecini birlikte çalıştırma |
| `scripts/graph.mjs` | Graphify ile yerel kod grafı çıkarma |

Node.js 24'ün yerleşik SQLite sürücüsü kullanılır. Veritabanı `data/studio.sqlite`; işlenmiş görseller `data/media/` altındadır. Başka bir veritabanı sunucusu, Docker, harici model ya da API anahtarı gerekmez. Veri dizini Git'e dahil edilmez. Yerel disk verileri şifreli bir sır kasası olarak tasarlanmamıştır; hesap şifresi ve belirteç kabul eden bir alan yoktur.

## Mevcut sınırlar

- Otomatik yayınlama, OAuth hesap bağlantıları, zamanlama ve analitik uygulanmadı. Bağlantılar ekranındaki sekiz sağlayıcı gereksinimi bir uygulama planıdır; aktif bir entegrasyon değildir.
- ChatGPT hesabına uygulama içinden giriş yapılmaz; iframe, oturum çerezi kopyalama veya tarayıcı otomasyonu kullanılmaz. API olmadan seçilen yöntem manuel aktarım olduğundan tüm işlem otomatik değildir.
- Görsel boyutlandırma, beyaz dolgu veya merkezden kırpmadır. Yapay zekâ rötuşu, video yükleme, video üretimi ve çok görselli gönderi bu sürümde yoktur. YouTube için metin ve kapak hazırlamak tek başına video yayını sağlamaz.
- Karakter sınırları düzenleme yardımcısıdır. X'in ağırlıklı Unicode ve bağlantı hesabı yaklaşık gösterilir. Gerçek yayınlama eklenince her sağlayıcının güncel doğrulaması ayrıca gerekir.
- Uygulama `127.0.0.1` üzerinde çalışır. Dış kaynak ve geçersiz Host başlıkları reddedilir. Cloudflare sürümünde HTTPS ve Access JWT doğrulaması vardır. Kullanıcının isteğiyle doğrulanmış tüm e-postalar aynı alanı kullanır; kullanıcı bazında üyelik ve şirket yetkileri sonraki aşamadır.

## Gerçek yayınlama için sonraki geliştirme

Her sağlayıcı için resmi geliştirici uygulaması ve gerekli inceleme/izinler alınmalıdır. Sunucuda OAuth başlatma ve callback, CSRF durum doğrulaması, şifreli belirteç saklama, yenileme ve bağlantıyı kesme uygulanmalıdır. Şirket–platform–hesap ilişkisi kurulmalı; yayın öncesi önizleme/onay, platform başına iş durumu, yeniden deneme ve yinelenen gönderiyi engelleme eklenmelidir. Başarı yalnızca sağlayıcının gerçek gönderi kimliği döndüğünde kaydedilmelidir. Hesap şifreleri kaynak koda eklenmemelidir.

## Doğrulama

`npm test` gerçek HTTP istekleri ve geçici SQLite veritabanıyla çalışır; sekiz görsel boyutunu, şirket ayrımını, JSON doğrulamasını, yeniden başlatmada kalıcılığı ve kaynak kısıtlarını sınar. `npm run test:e2e` ayrı bir geçici veri dizininde masaüstü ve mobil Türkçe kullanıcı akışlarını çalıştırır. Kullanıcının `data/` dizini bu testlerde kullanılmaz. `npm run build` TypeScript denetimi ve üretim derlemesidir. `npm run skills:verify` kaynak kopyalarının özetlerini denetler. Graphify grafı ve bütünlük kontrolü bu testlerin yerine geçmez.
