# Mimari ve kapsam

Sosyal Studio, sekiz platform için içerik hazırlayan Türkçe bir web uygulamasıdır. Üretim Cloudflare Workers, D1 ve R2 üzerinde çalışacak şekilde hazırlanmıştır; eski Node/SQLite sürümü yerel geliştirme için korunur. R2 etkin olmayan hesaplarda görseller de D1 üzerinde saklanır. Cloudflare dağıtımı ve kullanıcı adı/şifre girişi `docs/CLOUDFLARE.md` içinde açıklanır. Aşağıdaki yerel disk bilgileri Node sürümüne aittir. İlk geliştirme hedefi dört şirketi aynı panelden yönetebilmekti; mevcut sürüm 30 şirket profiline kadar izin verir. Her şirketin taslak listesi ve görselleri kendi kimliğiyle ilişkilidir. Bu ayrım çok kullanıcılı bir yetkilendirme sistemi değildir.

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

- Toplu otomatik yayınlama, OAuth bağlantıları, zamanlama ve analitik uygulanmadı. Cloudflare sürümünde yöneticiye özel, şirketlere ayrı hesap kayıtları ve deneysel uzak tarayıcı girişi vardır. [Doğrulanan kapsam ve sınırlar](HESAP_GIRISI.md).
- ChatGPT hesabına uygulama içinden giriş yapılmaz; iframe, oturum çerezi kopyalama veya tarayıcı otomasyonu kullanılmaz. API olmadan seçilen yöntem manuel aktarım olduğundan tüm işlem otomatik değildir.
- Görsel boyutlandırma, beyaz dolgu veya merkezden kırpmadır. Yapay zekâ rötuşu, video yükleme, video üretimi ve çok görselli gönderi bu sürümde yoktur. YouTube için metin ve kapak hazırlamak tek başına video yayını sağlamaz.
- Karakter sınırları düzenleme yardımcısıdır. X'in ağırlıklı Unicode ve bağlantı hesabı yaklaşık gösterilir. Gerçek yayınlama eklenince her sağlayıcının güncel doğrulaması ayrıca gerekir.
- Uygulama `127.0.0.1` üzerinde çalışır. Dış kaynak ve geçersiz Host başlıkları reddedilir. Cloudflare sürümünde HTTPS, şifre özetiyle giriş ve iptal edilebilir güvenli oturum çerezleri vardır. Yönetici ve editör rolleri, yöneticiye özel kullanıcı oluşturma API’si uygulanmıştır. Yetkili kullanıcılar aynı şirket alanını paylaşır; şirket bazında kullanıcı yetkisi sonraki aşamadır.

## Gerçek yayınlama için sonraki geliştirme

Kullanıcı, geliştirici uygulaması yerine normal hesap oturumlarıyla ve yalnızca web panelinden çalışmayı seçti. Bu nedenle Cloudflare Browser Run + Live View ile insanın giriş yaptığı ayrı tarayıcı oturumları eklendi. Şirket–platform–hesap ilişkisi D1'de, çerezler AES-256-GCM ile şifreli saklanır; anahtar Worker secret'tır. Şifre ve doğrulama kodları uygulamanın veri modeline girmez. Bu yöntem platform erişimini veya kalıcı giriş garantisini sağlamaz. Instagram giriş ekranı gerçek Cloudflare tarayıcısıyla doğrulandı; X ilk denemede erişimi reddetti.

Metin aktarımı, kullanıcının tıkladığı textarea/contenteditable alanına yazma ile sınırlıdır ve paylaş düğmesine basmaz. Toplu yayın için her sağlayıcıda gerçek hesaplarla test edilmiş yayın adımları, medya aktarımı, hedef sayfa/kanal doğrulaması, önizleme/onay, iş durumu, yeniden deneme ve yinelenen gönderi engeli gerekir. Başarı ancak gerçek gönderi kimliği/bağlantısı doğrulandığında kaydedilmelidir. API seçeneğine geçilirse resmi geliştirici uygulamaları, OAuth ve sağlayıcı izinleri ayrıca gerekir.

## Doğrulama

`npm test` gerçek HTTP istekleri ve geçici SQLite veritabanıyla çalışır; sekiz görsel boyutunu, şirket ayrımını, JSON doğrulamasını, yeniden başlatmada kalıcılığı ve kaynak kısıtlarını sınar. `npm run test:e2e` ayrı bir geçici veri dizininde masaüstü ve mobil Türkçe kullanıcı akışlarını çalıştırır. Kullanıcının `data/` dizini bu testlerde kullanılmaz. `npm run build` TypeScript denetimi ve üretim derlemesidir. `npm run skills:verify` kaynak kopyalarının özetlerini denetler. Graphify grafı ve bütünlük kontrolü bu testlerin yerine geçmez.
