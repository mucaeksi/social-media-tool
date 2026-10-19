# Ücretsiz resmi API bağlantısı için ilk kurulum

Kullanıcı, 19 Ekim 2026'da ücretsiz olması koşuluyla resmi API kullanımını da kabul etti. Meta geliştirici uygulaması henüz yok. İlk hedef Facebook Sayfası ve ona bağlı profesyonel Instagram hesabıdır. Threads ayrı ürün/izin ayarlarıyla ele alınır. Mevcut sürümde OAuth bağlantısı ve API üzerinden yayınlama henüz uygulanmadı.

## Meta hesabında yapılacak işlem

1. [Meta for Developers](https://developers.facebook.com/apps/) sayfasını kendi Meta hesabınızla açın. Gerekirse ücretsiz geliştirici kaydını ve hesabın istediği kimlik/telefon doğrulamasını tamamlayın.
2. **Uygulama oluştur** ile `Sosyal Studio` adında bir uygulama açın. Facebook Sayfası ve Instagram içerik yönetimine uygun kullanım senaryosunu seçin. Menü adları hesabınıza göre değişebilir. Reklam satın alma veya ücretli mesajlaşma ürünü bu iş için gerekli değildir.
3. İletişim e-postasını kendiniz seçin. Meta bir işletme portföyü sorarsa sayfaların sahibi olan portföyü kullanın. İşletme doğrulaması ve gelişmiş izin incelemesi bazı kullanım senaryolarında ayrıca istenebilir.
4. **Uygulama ayarları → Temel** bölümündeki **Uygulama Kimliği (App ID)** bilgisini not edin. Bu kimlik bir şifre değildir; asistanla paylaşabilirsiniz.
5. **Uygulama Gizli Anahtarı (App Secret)** değerini sohbete veya kaynak koda yazmayın. Gerekirse [GitHub Actions secrets](https://github.com/mucaeksi/social-media-tool/settings/secrets/actions) içinde `META_APP_SECRET` adıyla saklayın. `META_APP_ID` secret'ına uygulama kimliğini ekleyebilirsiniz. Mevcut dağıtım bunları henüz Meta bağlantısına dönüştürmez; sonraki OAuth uygulaması bu güvenli aktarım kanalını kullanacak.

Meta uygulamasını Cloudflare API anahtarıyla oluşturamayız. Uygulama, kullanıcının Meta geliştirici hesabına ve işletme yetkilerine bağlıdır. İlk kayıt ve gerekli doğrulamalar hesap sahibi tarafından tamamlanmalıdır. İlk adım için ödeme/kredi satın alma yoktur.

## Hesap tarafındaki hazırlık

- Facebook hesabınız ilgili şirketin **Sayfasını yönetebilmeli** ve paylaşım yetkisine sahip olmalıdır.
- Başlangıçta seçilen Instagram API yöntemi için hesap **Business veya Creator** olmalı ve doğru Facebook Sayfasına bağlanmalıdır. Profesyonel hesaba geçişin kendisi ücretli API aboneliği değildir.
- Her şirketin hangi Facebook Sayfası ve Instagram hesabıyla eşleştiğini not edin. Yetki ekranında görülen tüm sayfalar bir şirkete otomatik eklenmemeli; doğru varlıklar açıkça seçilmelidir.
- İlk deneme için uygulama yöneticisi/test kullanıcısı rolleri kullanılır. Başka kullanıcıların hesapları, gelişmiş izinler ve bazı yayın özellikleri Meta incelemesi gerektirebilir. Ücretsiz erişim, otomatik onay veya sınırsız istek anlamına gelmez.

## Uygulama kimliğinden sonraki akış

Sunucuda OAuth başlatma/callback, tek kullanımlık durum doğrulaması, şirket ve kullanıcıya bağlı yetkilendirme, şifreli token saklama ve sayfa/Instagram hesabı seçimi kurulacak. Normal kullanıcılar kendi sosyal hesaplarının standart giriş ekranından izin verecek; her şirket için ayrı geliştirici uygulaması açılması gerekmeyecek.

Geri dönüş adresi, gizlilik politikası ve veri silme sayfaları **henüz uygulanmadı**. Meta ayarlarına çalışan adres gibi bir URL eklemeyin; hazır olduğunda paneldeki kesin HTTPS adresleri kullanılacak. Üretim alan adı `sosyal-studio.sosyalstudio-06a486e459d2.workers.dev` olarak kalacak. Yayınlama ancak gerçek hesaplar ve izinler doğrulandıktan sonra etkinleştirilecek.

## Ücret sınırı

Facebook/Instagram standart içerik API yolunda ücretli reklam veya mesajlaşma API'si kullanılmayacak. Ücretli erişim planı, kredi satın alma, otomatik bakiye yükleme veya ücretli üçüncü taraf paylaşım servisi açılmayacak. Threads ve diğer sağlayıcıların ürün erişimi, kota ve hesap koşulları etkinleştirmeden önce ayrıca doğrulanacak. Cloudflare R2/Zero Trust korumaları korunacak.

**X API ücretsiz değildir.** Resmi X belgesi istek/kaynak başına ücret ve önceden kredi satın alma modelini belirtir. 16 Ekim 2026 sürümünde standart gönderi oluşturma 0,015 USD, URL içeren gönderi oluşturma 0,200 USD olarak listelenir. Ücretsiz kredi teşvikinde de önce kartla kredi satın alma şartı vardır. X API entegrasyonu bu koşulla açılmayacak. X'in Cloudflare tarayıcısıyla giriş denemeleri de erişim hatası verdi; X'te otomatik paylaşım hazır değildir.

Kaynaklar:

- [Meta: Facebook Sayfası gönderileri](https://developers.facebook.com/docs/pages-api/posts/)
- [Meta: Instagram içerik yayınlama](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Meta: Threads](https://developers.facebook.com/docs/threads/)
- [X resmi fiyatlandırma kaynağı](https://github.com/xdevplatform/docs/blob/cbb5ea4aa359e1ca24b7b3e9b666fad9d9c1d7c4/x-api/getting-started/pricing.mdx)
- [X ücretsiz kredi şartları](https://github.com/xdevplatform/docs/blob/main/x-api/getting-started/free-credits.mdx)

X fiyatlandırması resmi GitHub kaynağından doğrulandı. Meta'nın herkese açık Facebook, Instagram ve Threads belgeleri daha sonra GitHub Actions üzerinden incelendi; [platform koşulları](PLATFORM_BAGLANTILARI.md) ve `deployment/platform-research.json` kaydına bakın. Hesabınıza özel ürün/izin ekranları henüz doğrulanmadı; kurulumda görülen koşullar esas alınmalıdır.
