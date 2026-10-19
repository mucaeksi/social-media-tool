# Sosyal platform bağlantıları

19 Ekim 2026 tarihinde resmi belgeler ve Cloudflare giriş ekranları incelendi. Kullanıcının koşulu ücretsiz kullanım; ücretli API, kredi satın alma, otomatik bakiye yükleme ve ücretli aracı hizmet açılmayacak. API erişim onayı alınmadan çalışan bağlantı veya başarılı paylaşım gösterilmeyecek.

## Hangi yöntem kullanılabilir?

| Platform | Resmi API yolu | Panelde normal web girişi denemesi |
| --- | --- | --- |
| Facebook Sayfası | Meta uygulaması, Sayfa yönetim yetkisi ve yayın izni. Instagram ile birlikte ilk kurulum hedefi. | Giriş alanları ve canlı ekran açıldı. |
| Instagram | Profesyonel Business/Creator hesabı. Seçilen Facebook Login yöntemi için bağlı Facebook Sayfası gerekiyor. | Giriş alanları ve canlı ekran açıldı. |
| Threads | Meta uygulamasında Threads ürünü, `threads_basic` ve `threads_content_publish`. Gelişmiş izin onaylanana kadar yalnızca uygulamanın Threads test hesapları adına yayınlanabilir. | Giriş alanları ve canlı ekran açıldı. |
| Pinterest | İşletme hesabı ve geliştirici uygulaması başvurusu. Trial başvurusu bile incelemeye tabi. Farklı şirketlerin hesapları için erişim kapsamı ayrıca doğrulanmalı. | Giriş alanları ve canlı ekran açıldı. |
| YouTube | Google projesi, YouTube Data API ve kanal sahibinin OAuth izni. Ücretsiz günlük kota var. Kanalda video yükleme içindir; bu panelde video yükleyici henüz yok. | Google giriş alanı ve canlı ekran açıldı. |
| LinkedIn Sayfası | Community Management erişimi, `w_organization_social` ve uygun Sayfa rolü. Kişisel profile paylaşım izni şirket sayfası izni değildir. Başvuru ve ürün erişimi doğrulanmalı. | Sayfa ve canlı ekran açıldı; giriş alanı doğrulanamadı. |
| TikTok | Direct Post denetimi gerekir; denetlenmemiş istemcilerin gönderileri özel görünür. Kurallar yalnızca sizin/ekibinizin yönettiği hesaplara içerik yükleyen şirket içi aracı kabul etmiyor. Bu proje için uygun API onayı varsayılmıyor. | Sayfa ve canlı ekran açıldı; giriş alanı doğrulanamadı. |
| X / Twitter | Resmi API ücretli. Ücretsiz kullanım koşulu nedeniyle etkinleştirilmeyecek. | Cloudflare erişimi reddedildi. Bu yöntemle bağlantı sağlanmış değildir. |

Facebook, Instagram ve Threads için standart içerik API yolu hedeflenir; reklam veya ücretli mesajlaşma ürünleri açılmaz. Pinterest ve LinkedIn için erişim/onay koşulları belirleyicidir; belgelerde bir yayınlama uç noktasının bulunması tüm şirket hesaplarına ücretsiz üretim erişimi verildiği anlamına gelmez. Ücretsiz erişim kapsamı hesapta doğrulanmadan etkinleştirilmeyecek.

**Bu tablo hesapların bağlandığını göstermez.** Testte kullanıcı adı, şifre veya doğrulama kodu gönderilmedi; gönderi paylaşılmadı. Giriş formundan sonraki doğrulama, bot kontrolü, oturum yenileme ve gerçek yayın davranışı hesap sahibiyle henüz denenmedi. Normal web girişi ayrıca resmi API yetkisi vermez.

## Oturumun kayıtlı kalması

1. Panelde yönetici olarak şirketi seçin. **Hesap bağlantıları** sayfasında platforma **Hesap ekle** ile bir etiket verin.
2. **Giriş yap** sosyal ağın gerçek ekranını panel içinde açar. Kullanıcı adı, şifre ve istenen doğrulamayı bu ekranda kendiniz tamamlayın. Şifreyi sohbete veya proje dosyalarına eklemeyin.
3. **Oturumu kaydet ve kapat** ile platformun oturum çerezleri şirket ve hesap bazında şifreli olarak Cloudflare D1'e kaydedilir. Tarayıcı kapanınca bu kayıt silinmez. Kartta son kayıt zamanı görünür.
4. Sonraki **Hesabı aç** işleminde o hesabın kayıtlı çerezleri yüklenir. Platform bunları hâlâ geçerli sayıyorsa yeniden şifre istemeden açılabilir. Yeniden doğrulama istenirse aynı ekranda tamamlayıp tekrar kaydedin.

Süresiz açık oturum, bir defalık 2FA veya her platformda giriş garantisi yoktur. Tam tarayıcı profili/cihaz anahtarları taşınmaz. Şifreler uygulamaya kaydedilmez. Kayıtlı çerez, sağlayıcının halen geçerli saydığı doğrulanmış bir giriş anlamına gelmez. Panelden ayrılmadan önce kaydetmek gerekir. Ayrıntılar: [Hesap girişi](HESAP_GIRISI.md).

Ücretsiz uzak tarayıcı hesabın tamamında günde 10 dakika ile sınırlıdır; panel her açılışı en fazla 3 dakika ve aynı anda tek hesap olarak sınırlar. Dolayısıyla sekiz platformda sürekli açık tarayıcı ve sınırsız otomatik yayın bu ücretsiz yapıdan beklenemez. Platform erişimi reddederse bu alternatifle hesap bağlanamaz; engel aşma uygulanmaz.

## Geliştirici hesabında gereken hazırlık

- Meta: önce [Meta kurulum rehberindeki](META_KURULUM.md) uygulamayı hesap sahibi oluşturmalı. Uygulama henüz yok. Facebook/Instagram ilk hedef, Threads ayrı ürün ve izin ayarıyla devam eder.
- Pinterest: [Uygulamalar](https://developers.pinterest.com/apps/) bölümünde işletme hesabıyla başvuru. Sırasıyla verilen Trial/Standard erişim kapsamını ve kullanılacak şirket hesaplarını kontrol edin.
- LinkedIn: [Geliştirici uygulaması](https://www.linkedin.com/developers/apps) oluşturulmalı; şirket sayfası için Community Management ürün erişimi gerekiyor.
- YouTube: [Google API kitaplığında](https://console.cloud.google.com/apis/library/youtube.googleapis.com) YouTube Data API ve OAuth izin ekranı hazırlanmalı. API anahtarı tek başına kanala video yükleme yetkisi vermez. Ücretli kota artışı yapılmaz.

App Secret ve erişim token'larını sohbet veya kaynak kod yerine GitHub Actions/Cloudflare secret kanalında saklayın. Henüz bu sağlayıcıları otomatik bağlayan OAuth callback ve API yayın işçisi uygulanmadı. Geliştirici uygulaması oluşturmak bunları bu sürümde otomatik etkinleştirmez.

YouTube belgelerinin incelenen güncel sürümü varsayılan olarak günde 100 `videos.insert`, 100 `search.list` çağrısı ve diğer uç noktalar için ortak 10.000 birim belirtiyor. `videos.insert` ayrı Video Uploads kotasından 1 birim harcıyor. Eski 1.600 birim/yükleme bilgisini kullanmayın. Gerçek projede Google Console kotası esas alınmalı; bunlar uygulamada etkin bir yükleme sınırı veya uygulanmış yükleyici değildir.

## Doğrulanan kaynaklar

Resmi belgeler çalışma ortamındaki erişim kısıtından dolayı GitHub Actions üzerinden okundu. [Belge kontrol kaydı](../deployment/platform-research.json) yalnızca herkese açık kaynaklar ve kısa kesitler içerir. [Giriş ekranı kontrol kaydı](../deployment/browser-check.json) platform bazında form/canlı görünüm sonuçlarını içerir. Her iki iş akışı da gerçek sosyal hesap kimlik bilgisi kullanmaz.

- [Facebook Sayfası gönderileri](https://developers.facebook.com/docs/pages-api/posts/)
- [Instagram içerik yayınlama](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Threads yayın izinleri](https://developers.facebook.com/docs/threads/posts/)
- [Pinterest uygulama başvurusu](https://developers.pinterest.com/docs/getting-started/connect-app/)
- [Pinterest resmi Pin oluşturma şeması](https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml)
- [YouTube başlangıç ve kotalar](https://developers.google.com/youtube/v3/getting-started), [video yükleme](https://developers.google.com/youtube/v3/docs/videos/insert)
- [LinkedIn ürün erişimi](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access), [kuruluş yayın izinleri](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [TikTok kullanım ve denetim şartları](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [X resmi fiyatlandırma kaynağı](https://github.com/xdevplatform/docs/blob/cbb5ea4aa359e1ca24b7b3e9b666fad9d9c1d7c4/x-api/getting-started/pricing.mdx)
