# Sosyal hesaplara normal giriş

19 Ekim güncellemesi: kullanıcı ücretsiz resmi API kullanımını da kabul etti. Resmi bağlantılara öncelik verilecek; Meta geliştirici uygulaması henüz yok. [İlk kurulum adımları](META_KURULUM.md). Aşağıdaki deneysel tarayıcı seçeneği korunur; OAuth ve API yayınlama henüz uygulanmadı.

Kullanıcı, sosyal ağlara kullanıcı adı/şifre ve istenen doğrulama koduyla giriş yapmayı; yardımcı eklenti olmadan yalnızca web panelinden çalışmayı seçti. Bu akış için geliştirici uygulaması yerine Cloudflare Browser Run kullanılır. Ücretli plan satın alınmaz. Normal web sayfasına giriş, resmi API yayın izni sağlamaz.

## Kullanım

1. Yönetici hesabıyla giriş yapın; üstten şirketi seçin.
2. **Hesap bağlantıları → Hesap ekle** ile platform ve şirket için bir etiket oluşturun. Aynı platforma birden fazla hesap eklenebilir; şirket başına en fazla 25 kayıt vardır.
3. **Giriş yap** düğmesi gerçek sosyal ağ sayfasını Cloudflare Live View içinde açar. Kullanıcı adı, şifre ve doğrulama kodunu o sayfada girin. Uygulama bu alanları kendi formlarında toplamaz veya kaydetmez.
4. **Oturumu kaydet ve kapat**, ilgili platforma ait oturum çerezlerini şifreli saklayıp tarayıcıyı kapatır. Kayıtlı oturum, sağlayıcının girişin geçerli olduğunu onayladığı anlamına gelmez. Platform çerezi iptal edebilir veya yeniden doğrulama isteyebilir.
5. **Hesabı aç** kayıtlı çerezleri yalnızca o hesabın yeni tarayıcısına yükler. Gönderi formunu kendiniz açabilirsiniz. Stüdyoda o platform için hazırlanmış metin varsa formdaki metin alanına tıklayıp **Metni seçtiğim alana yaz** düğmesine basın. Bu işlem paylaşmaz ve şifre/giriş alanlarına yazmaz.

Hesabı kaldırmak kayıtlı çerezlerini siler. Şirket silinirken açık tarayıcısı önce kapatılır ve D1 ilişkili hesapları siler. Sosyal hesap işlemleri yöneticiye özeldir. Diğer kullanıcılar aynı taslak alanını kullanmaya devam eder; şirket bazında kullanıcı yetkisi henüz yoktur.

Ekrandan ayrılmadan veya panelden çıkmadan önce **Oturumu kaydet ve kapat** düğmesini kullanın. Bağlantı kopması, sekmenin kapanması veya sağlayıcının tarayıcıyı erken sonlandırması durumunda henüz kaydedilmemiş giriş kaybolabilir; varsa önceki kayıt korunur.

## Gerçek doğrulama ve sınırlar

- Cloudflare tarayıcısında Instagram'ın giriş formu, etkileşimli Live View ve panel içinde gösterime izin veren yanıt başlıkları doğrulandı. Kullanıcının Instagram hesabına giriş yapılmadı.
- X, Cloudflare'den ilk gerçek açılma denemelerini `net::ERR_HTTP_RESPONSE_CODE_FAILURE` ile reddetti. X girişi ve paylaşımı çalışıyor kabul edilmez. Diğer altı sağlayıcının gerçek hesap akışları henüz doğrulanmadı.
- CAPTCHA, ek doğrulama veya oturum sonlandırması platformun kontrolündedir. İki adımlı doğrulamanın yalnızca bir kez isteneceği garanti edilmez. Engelleri aşma, gizlenmiş tarayıcı veya CAPTCHA çözme uygulanmaz.
- Toplu otomatik gönderim, platforma göre yayın işçisi/kuyruğu, uzak forma görsel aktarma, video yükleme ve zamanlama yoktur. Açık tarayıcıda paylaşımı kullanıcı tamamlar; panel yayın başarısı veya gönderi kimliği üretmez.
- Cloudflare yalnızca çerezleri saklar; tam tarayıcı profili, IndexedDB, yerel depolama, cihaz anahtarları ve passkey'ler taşınmaz. Bazı girişler bu nedenle yeniden istenebilir veya çalışmayabilir.

Sonuçlar `deployment/browser-check.json`; yayımlanan panelin ayrıca yapılan giriş ekranı/kapanış denetimi `deployment/browser-panel.json` dosyasına kaydedilir. `verified: true` gerçek kullanıcıyla giriş veya paylaşım testi demek değildir; dosyada doğrulanan adımlar belirtilir.

## Ücretsiz kullanım ve oturum ömrü

Workers Free için Browser Run hesabın tamamında günde toplam **10 dakika**, en fazla **3 eşzamanlı tarayıcı** ve **20 saniyede bir yeni tarayıcı** sağlar. Bu uygulama tek bir Durable Object ile aynı anda yalnızca bir hesap açar. Her açılış en fazla 3 dakikadır; süre UTC gün başını geçmeyecek şekilde kısaltılır. UTC gün değişimi Türkiye saatiyle 03.00'tür.

Açılıştan önce kullanım bütçesi kalıcı Durable Object depolamasından ayrılır. Buna 30 saniye boşta kapanma payı eklenir. Normal kapanış doğrulanınca kullanılmayan süre geri verilir; harcanan süre ve 30 saniye payı sayılır. Belirsiz kapanışta yeni hesap açılmaz, rezervasyon korunur ve alarm kapanışı tekrar dener. Süre dolduğunda varsa platform oturumu kaydedilip tarayıcı kapatılır. Beklenenden geç kapanan süre de bütçeye eklenir. Sayaç dağıtımla sıfırlanmaz.

Bu sayaç uygulamanın kullanım bütçesidir. Hesaptaki başka Browser Run uygulamaları ve açıkça çalıştırılan GitHub giriş kontrolleri bu sayaçta yoktur; Cloudflare Free günlük sınırı hesap genelinde ayrıca uygulanır. Ücretli plan yükseltme çağrısı yoktur. R2 ve Zero Trust sınırları ayrı olarak korunur.

## Oturum verisinin korunması

`social_accounts` D1 tablosu şirket, platform, etiket ve şifreli çerez zarfını tutar. API listeleri çerez içeriğini veya şifreli zarfı döndürmez. AES-256-GCM ek doğrulama verisi hesap kimliği, şirket kimliği ve platformu bağlar; bir kaydın başka şirkete taşınması çözmeyi başarısız kılar. Başka alan adlarının ve süresi dolmuş çerezlerin kaydı reddedilir. Çerez zarfı 128 KB ile sınırlıdır.

32 bayt anahtar ilk kurulumda yalnızca Worker **`BROWSER_STATE_KEY` secret** olarak oluşturulur; GitHub'a, D1'e, koda veya çıktıya yazılmaz. Sonraki dağıtımlarda yeniden üretilmez. Anahtar silinirse kayıtlı oturumlar çözülemez; yeniden hesap girişi gerekir. Uygulamanın kendi kullanıcı şifreleri mevcut özetleme düzeninde kalır.

Live View adresi kısa süreli imzalı erişim bilgisi içerir. Yalnızca oturumu açan yöneticiye, API üzerinden `no-store` ile gönderilir; veritabanına ve loglara yazılmaz. Adresi paylaşmayın. Bağlantı başlatma süresi 1 dakikadır; tarayıcı oturumu ayrıca 3 dakikalık alarm ile sınırlandırılır. Panel yalnızca `https://live.browser.run` iframe kaynağına izin verir ve yönlendiren adresi göndermez.

## Kaynaklar

- [Browser Run Live View](https://developers.cloudflare.com/browser-run/features/live-view/)
- [Cloudflare tarayıcı limitleri](https://developers.cloudflare.com/browser-run/limits/)
- [Fiyatlandırma](https://developers.cloudflare.com/browser-run/pricing/)
- [Kaldırılamayan tarayıcı tanımlama başlıkları](https://developers.cloudflare.com/browser-run/reference/automatic-request-headers/)

Cloudflare belgeleri, resmi `cloudflare/cloudflare-docs` deposunun `production` dalından da incelendi. Limit belgesinin incelenen sürümü: `e9eb37276f97692206f697277950042b7c61a443` (14 Ekim 2026).
