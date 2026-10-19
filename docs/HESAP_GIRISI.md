# Sosyal hesaplara normal giriş

19 Ekim güncellemesi: kullanıcı ücretsiz resmi API kullanımını da kabul etti. Resmi bağlantılara öncelik verilecek; Meta geliştirici uygulaması henüz yok. [İlk kurulum adımları](META_KURULUM.md) ve [sekiz platformun erişim koşulları](PLATFORM_BAGLANTILARI.md). Aşağıdaki deneysel tarayıcı seçeneği korunur; OAuth ve API yayınlama henüz uygulanmadı.

Kullanıcı, sosyal ağlara kullanıcı adı/şifre ve istenen doğrulama koduyla giriş yapmayı; yardımcı eklenti olmadan yalnızca web panelinden çalışmayı seçti. Bu akış için geliştirici uygulaması yerine Cloudflare Browser Run kullanılır. Ücretli plan satın alınmaz. Normal web sayfasına giriş, resmi API yayın izni sağlamaz.

## Kullanım

1. Yönetici hesabıyla giriş yapın; üstten şirketi seçin.
2. **Hesap bağlantıları → Hesap ekle** ile platform ve şirket için bir etiket ve isteğe bağlı hesap/sayfa bağlantısı oluşturun. Bağlantı ilgili sosyal ağın HTTPS adresi olmalıdır; sorgu ve parça bilgileri saklanmaz. Aynı platforma birden fazla hesap eklenebilir; şirket başına en fazla 25 kayıt vardır.
3. **Giriş yap** düğmesi gerçek sosyal ağ sayfasını Cloudflare Live View içinde açar. Kullanıcı adı, şifre ve doğrulama kodunu o sayfada girin. Uygulama bu alanları kendi formlarında toplamaz veya kaydetmez.
4. **Oturumu kaydet ve kapat**, ilgili platformun çerezlerini ve açık kaynaklardaki `localStorage` verilerini AES-256-GCM ile şifreli saklayıp tarayıcıyı kapatır. Kartta **Uyku modunda** görülür: çalışan tarayıcı yoktur ve beklerken Browser Run süresi tüketilmez. Kayıtlı oturum, sağlayıcının girişin geçerli olduğunu onayladığı anlamına gelmez. Platform çerezi iptal edebilir veya yeniden doğrulama isteyebilir.
5. **Hesabı aç** kayıtlı çerezleri ve yerel depolamayı yalnızca o hesabın yeni tarayıcısına yükler. Kayıtlı sayfa bağlantısı varsa o sayfa açılır; giriş çerezi bulunmamışsa giriş ekranı açılır. **Giriş ekranını aç** ve **Kayıtlı sayfayı aç** düğmeleri bu tarayıcı içinde gezinir. Gönderi formunu kendiniz açabilirsiniz. Stüdyoda o platform için hazırlanmış metin varsa formdaki metin alanına tıklayıp **Metni seçtiğim alana yaz** düğmesine basın. Bu işlem paylaşmaz ve şifre/giriş alanlarına yazmaz.

Hesabı kaldırmak şifreli giriş profilini siler. Şirket silinirken açık tarayıcısı önce kapatılır ve D1 ilişkili hesapları siler. Sosyal hesap işlemleri yöneticiye özeldir. Diğer kullanıcılar aynı taslak alanını kullanmaya devam eder; şirket bazında kullanıcı yetkisi henüz yoktur.

Tarayıcı penceresi açıkken panel **15 saniyede bir** ara kayıt dener ve son başarılı kaydı gösterir. Şirket değiştirme, panel ekranından ayrılma ve sekmenin kapanmasında kaydedip kapatma isteği gönderilir; sekme kapanışındaki istek en iyi çabadır, tarayıcı/işletim sistemi bunu tamamlatmayabilir. **Son kaydı koruyup kapat**, önceki otomatik kayıtları geri almaz.

Ekrandan ayrılmadan veya panelden çıkmadan önce **Oturumu kaydet ve kapat** düğmesini kullanın. Bağlantı kopması, sekmenin kapanması veya sağlayıcının tarayıcıyı erken sonlandırması durumunda henüz kaydedilmemiş giriş kaybolabilir; varsa önceki kayıt korunur.

## Gerçek doğrulama ve sınırlar

- Cloudflare tarayıcısında Facebook, Instagram, Threads, Pinterest ve Google/YouTube giriş alanları, etkileşimli Live View ve panel içinde gösterime izin veren yanıt başlıkları doğrulandı. Kullanıcının hesaplarına giriş yapılmadı.
- X, Cloudflare'den açılma denemelerini `net::ERR_HTTP_RESPONSE_CODE_FAILURE` ile reddetti. TikTok ve LinkedIn sayfaları ile canlı görünüm açıldı; giriş alanları doğrulanamadı. Bu üç platform için giriş ve paylaşım çalışıyor kabul edilmez. Diğerlerinde de gerçek hesap akışları henüz denenmedi.
- CAPTCHA, ek doğrulama veya oturum sonlandırması platformun kontrolündedir. İki adımlı doğrulamanın yalnızca bir kez isteneceği garanti edilmez. Engelleri aşma, gizlenmiş tarayıcı veya CAPTCHA çözme uygulanmaz.
- Toplu otomatik gönderim, platforma göre yayın işçisi/kuyruğu, uzak forma görsel aktarma, video yükleme ve zamanlama yoktur. Açık tarayıcıda paylaşımı kullanıcı tamamlar; panel yayın başarısı veya gönderi kimliği üretmez.
- Çerez ve `localStorage` aktarılır; bu tam bir Chromium disk profili değildir. IndexedDB, oturuma bağlı `sessionStorage`, cihaz anahtarları ve passkey'ler taşınmaz. IP/cihaz denetimi veya bu depolara bağlı girişler yeniden istenebilir ya da çalışmayabilir.
- Tumblr dokuzuncu hesap bağlantısı olarak eklendi; canlı giriş ekranı kontrolü henüz yapılmadı. Tumblr için giriş çerezi sezgisi kullanılmaz; profil kaydı gerçek giriş diye gösterilmez. Stüdyodaki sekiz içerik biçimine henüz eklenmedi.

Sonuçlar `deployment/browser-check.json`; yayımlanan panelin ayrıca yapılan giriş ekranı/kapanış denetimi `deployment/browser-panel.json` dosyasına kaydedilir. `verified: true` gerçek kullanıcıyla giriş veya paylaşım testi demek değildir; dosyada doğrulanan adımlar belirtilir.

## Ücretsiz kullanım ve oturum ömrü

Workers Free için Browser Run hesabın tamamında günde toplam **10 dakika**, en fazla **3 eşzamanlı tarayıcı** ve **20 saniyede bir yeni tarayıcı** sağlar. Bu uygulama tek bir Durable Object ile aynı anda yalnızca bir hesap açar. Her açılış en fazla 3 dakikadır; süre UTC gün başını geçmeyecek şekilde kısaltılır. UTC gün değişimi Türkiye saatiyle 03.00'tür.

Açılıştan önce kullanım bütçesi kalıcı Durable Object depolamasından ayrılır. Buna 30 saniye boşta kapanma payı eklenir. Normal kapanış doğrulanınca kullanılmayan süre geri verilir; harcanan süre ve 30 saniye payı sayılır. Belirsiz kapanışta yeni hesap açılmaz, rezervasyon korunur ve alarm kapanışı tekrar dener. Süre dolduğunda varsa platform oturumu kaydedilip tarayıcı kapatılır. Beklenenden geç kapanan süre de bütçeye eklenir. Sayaç dağıtımla sıfırlanmaz.

Bu sayaç uygulamanın kullanım bütçesidir. Hesaptaki başka Browser Run uygulamaları ve açıkça çalıştırılan GitHub giriş kontrolleri bu sayaçta yoktur; Cloudflare Free günlük sınırı hesap genelinde ayrıca uygulanır. Ücretli plan yükseltme çağrısı yoktur. R2 ve Zero Trust sınırları ayrı olarak korunur.

## MCP ve sürekli açık tarayıcı

MCP bir araca erişim biçimidir; Cloudflare'in çalışma süresi kotasını değiştirmez. Agents SDK 0.28 ile gelen **Persistent browser**, aynı canlı tarayıcıyı çağrılar arasında korur; tarayıcı süre dolunca veya çökerse eski sekmeler/giriş durumu korunmaz. Sürekli çalışan veya bekleyen canlı tarayıcı ücretsiz 10 dakikayı tüketir. Bu uygulama giriş profilini şifreli saklayıp gerçek tarayıcıyı kapatır ve gerektiğinde yeni tarayıcıya yükler. Bu düzen boşta kullanım süresini kaldırır; sağlayıcının yeniden giriş/2FA isteğini kaldıramaz.

## Wood Mood hazırlığı

`0009_wood_mood.sql`, **Wood Mood Mobilya** şirketini ve kullanıcının verdiği Facebook, Instagram, Tumblr, X, YouTube, TikTok, Pinterest, Threads ve LinkedIn sayfa bağlantılarını ekler. Web sitesi: https://woodmoodmobilya.com/tr. Var olan eşleşen şirket tercih edilir; tek bir eski boş platform kaydı varsa kimliği ve şifreli oturumu korunur. Belirsiz birden fazla eski kayıt otomatik bir hesaba bağlanmaz. Şirket başına 25 kayıt sınırı korunur. Kullanıcı bu hesapları sonradan değiştirebilir/silebilir; sonraki dağıtımlar tekrar eklemez.

Bunlar hesap/sayfa tanımlarıdır; gerçek hesaplara giriş yapılmadı. Yönetici **Wood Mood Mobilya → Hesap bağlantıları → Giriş yap** ile ilgili sosyal ağda girişini ve istenen doğrulamayı tamamlamalıdır. Web sitesi önizleme giriş bilgileri sosyal hesap bilgisi olarak kullanılmaz veya Git'e eklenmez. Metalüx ve yeni şirketler panelden ayrı eklenebilir.

## Oturum verisinin korunması

`social_accounts` D1 tablosu şirket, platform, etiket ve sayfa URL'si, son kayıt zamanı, giriş çerezi gözlem işareti ve şifreli profil zarfını tutar. Bu işaret platform oturumunun hâlâ geçerli olduğunu doğrulamaz. API listeleri çerez içeriğini veya şifreli zarfı döndürmez. AES-256-GCM ek doğrulama verisi hesap kimliği, şirket kimliği ve platformu bağlar; bir kaydın başka şirkete taşınması çözmeyi başarısız kılar. Başka alan adlarının ve süresi dolmuş çerezlerin kaydı reddedilir. Yeni v2 profil düz metni en fazla 1 MB, 24 kaynak ve kaynak başına 1.000 yerel depolama girdisidir. Yalnızca ilgili platformun HTTPS kaynakları kabul edilir. Okuma eksikse önceki şifreli profil korunur. Eski v1 çerez zarfları aynı anahtarla açılmaya devam eder. `localStorage` yalnızca ilk kaynak ziyaretinde, eksik anahtarlara yüklenir; her sayfa yenilemede eski giriş verisi tekrar zorlanmaz.

32 bayt anahtar ilk kurulumda yalnızca Worker **`BROWSER_STATE_KEY` secret** olarak oluşturulur; GitHub'a, D1'e, koda veya çıktıya yazılmaz. Sonraki dağıtımlarda yeniden üretilmez. Anahtar silinirse kayıtlı oturumlar çözülemez; yeniden hesap girişi gerekir. Uygulamanın kendi kullanıcı şifreleri mevcut özetleme düzeninde kalır.

Live View adresi kısa süreli imzalı erişim bilgisi içerir. Yalnızca oturumu açan yöneticiye, API üzerinden `no-store` ile gönderilir; veritabanına ve loglara yazılmaz. Adresi paylaşmayın. Bağlantı başlatma süresi 1 dakikadır; tarayıcı oturumu ayrıca 3 dakikalık alarm ile sınırlandırılır. Panel yalnızca `https://live.browser.run` iframe kaynağına izin verir ve yönlendiren adresi göndermez.

## Kaynaklar

- [Persistent browser duyurusu (13 Ekim 2026)](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/changelog/agents/2026-10-13-persistent-browser.mdx)
- [Tarayıcı oturumlarını yeniden kullanma](https://developers.cloudflare.com/browser-run/workers-bindings/reuse-sessions/)
- [Browser Run Live View](https://developers.cloudflare.com/browser-run/features/live-view/)
- [Cloudflare tarayıcı limitleri](https://developers.cloudflare.com/browser-run/limits/)
- [Fiyatlandırma](https://developers.cloudflare.com/browser-run/pricing/)
- [Kaldırılamayan tarayıcı tanımlama başlıkları](https://developers.cloudflare.com/browser-run/reference/automatic-request-headers/)

Cloudflare belgeleri, resmi `cloudflare/cloudflare-docs` deposunun `production` dalından da incelendi. Limit belgesinin incelenen sürümü: `e9eb37276f97692206f697277950042b7c61a443` (14 Ekim 2026).
