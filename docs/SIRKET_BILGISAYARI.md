# Windows ve Firefox ile kalıcı sosyal hesap girişleri

Panel, şirket kayıtları, taslaklar ve AI verileri Cloudflare'de; kaynak kod GitHub'da kalır. Kullanıcının onayıyla sosyal hesap tarayıcıları artık **Windows 10/11 şirket bilgisayarında Mozilla Firefox** ile çalışır. Chrome'un kişisel/iş profilleri kullanılmaz. Eklenti, ücretli tarayıcı servisi, API kredisi veya modemden port açma gerekmez. Bilgisayarın elektrik/internet maliyeti vardır.

## İlk kurulum

1. Şirket bilgisayarında [Node.js 24 veya üzeri LTS](https://nodejs.org/en/download) ve [Mozilla Firefox](https://www.mozilla.org/firefox/new/) kurulu olmalı. Yardımcı, 64 veya 32 bit Program Files klasörlerinde Firefox'u arar. Farklı kurulumda `STUDIO_FIREFOX` ortam değişkenine `firefox.exe` dosyasının tam yolunu verin.
2. Panelde yönetici olarak **Hesap bağlantıları** sayfasına girin ve **Windows yardımcısını indir** bağlantısından ZIP'i indirin. ZIP'in tamamını `C:\SosyalStudio-Bilgisayar` gibi kalıcı bir klasöre çıkarın. İçindeki `companion`, `shared`, `worker`, `docs` klasörleri birlikte kalmalı. İsterseniz yanındaki `.sha256` dosyasıyla ZIP özetini kontrol edin.
3. `companion\Kur-ve-Baslat.cmd` dosyasına çift tıklayın. Paket kilidindeki npm bağımlılıkları doğrulanarak kurulur; ayrı bir tarayıcı indirilmez. Windows güvenlik uyarısı çıkarsa kaynak depoyu ve dosyaları inceleyin; imzasız bir kaynak paketidir.
4. Panelde **Bilgisayarı eşleştir** düğmesine basın. Gösterilen tek kullanımlık kodu yardımcı penceresine yapıştırıp Enter'a basın. Kod 10 dakika geçerlidir; sonraki kod öncekinin yerine geçer. Kod ve cihaz dosyasını paylaşmayın. Cihaz kaydı en fazla birdir; değiştirmek için önce panelden eski bilgisayarı kaldırın.
5. Panel **Bilgisayar çevrimiçi** gösterdiğinde şirketi seçip **Hesap ekranını aç** düğmesine basın. Sosyal ağdaki alana ekran üzerinden tıklayın; altındaki gizli metin alanına kullanıcı adını/şifreyi/kodu yazıp **Seçili alana yaz** düğmesiyle aktarın. **Sonraki alan**, **Enter** ve kaydırma düğmeleriyle ilerleyin. İsterseniz şirket bilgisayarında açılan Firefox penceresinde doğrudan giriş yapın.
6. **Firefox'u kapat, girişi koru** yalnızca ilgili tarayıcıyı kapatır. Sosyal ağdan çıkış yapılmaz; sonraki açılış aynı Firefox profilini kullanır. Şirket/hesap başına ayrı profil; en fazla üç tarayıcı süreci aynı anda açıktır. Diğer hesapların profilleri diskte korunur.

İlk gerçek X girişi ve profil yeniden açıldığında girişin korunması **şirket bilgisayarında hesap sahibi tarafından doğrulanmalıdır**. Bu belge veya profil dosyasının varlığı hesapların bağlandığı anlamına gelmez. Firefox kullanılması, X'in/diğer ağların erişime izin vereceğini veya tekrar doğrulama istemeyeceğini garanti etmez. CAPTCHA ve cihaz doğrulaması kullanıcı tarafından yapılır. Otomatik yayınlama bu sürümde yoktur.

## Sonraki açılış ve Windows başlangıcı

Sonraki açılışlarda `companion\Baslat.cmd` yeterlidir. Yardımcı penceresi açık, Windows kullanıcı oturumu ve internet bağlantısı etkin olmalıdır. Bilgisayar uyursa/kapanırsa panel çevrimdışı olur; profiller silinmez. Bağlantı kesilince yardımcı yeniden bağlanmayı dener. Uzak ekranın kapanması veya operatör süresinin dolması hesaptan çıkış değildir.

Windows başlangıcında çalışması için `Win+R` → `shell:startup` klasörünü açın ve `Baslat.cmd` dosyasının **kısayolunu** buraya koyun. Bu kullanıcı oturum açtığında başlar; Windows servisi veya otomatik Windows oturumu kurulmaz. Bilgisayar uyku ayarını iş ihtiyacınıza göre düzenleyin. Firefox özel profilini yardımcının dışında aynı anda açmayın.

## Verilerin yeri ve erişim

- Cihaz kimliği/erişim anahtarı `%LOCALAPPDATA%\SosyalStudio\device.json`; Firefox profilleri `%LOCALAPPDATA%\SosyalStudio\profiles\<şirket-id>-<hesap-id>` içindedir. Bunlar Git'e veya Cloudflare'e yüklenmez. Dosya izinleri ilgili Windows hesabına bağlıdır; disk şifrelemesi ve Windows hesabının korunması önemlidir. Tam profil, Firefox'un çerezlerini, yerel depolamayı ve IndexedDB'sini içerir; bunların hepsinin ayrıca uygulama tarafından şifrelendiği iddia edilmez.
- Panel ile yardımcı arasında TLS/WSS kullanılır. D1'de cihaz anahtarının yalnızca SHA-256 özeti ve profilin son açılma zamanı saklanır. Eşleştirme kodunun da yalnızca özeti saklanır; kullanım sonrası silinir.
- Ekran görüntüleri ve klavye girdileri Cloudflare üzerinden bellekte iletilir; D1/R2 veya loglara yazılmaz. Yardımcı, geliştirici hata metnini/URL'yi veya şifreleri terminale yazmaz. Hesap ekranına yalnızca panel yöneticisi erişir; aynı anda tek operatör/hesap ekranı kontrol edilir. 15 dakika etkin istek gelmezse kontrol kilidi sona erer; Firefox profili korunur.
- Yardımcı yalnızca kayıtlı hesabın sosyal ağ adreslerini, ekran görüntüsünü ve sınırlı fare/klavye işlemlerini kabul eder. Genel terminal, JavaScript çalıştırma, dosya okuma/yükleme veya genel gezinme arayüzü yoktur. Firefox otomasyon bağlantısı şirket bilgisayarının yerel döngü adresindedir; internete port açılmaz.
- Panelden **Bilgisayar bağlantısını kaldır**, panel erişimini iptal eder; bilgisayardaki Firefox oturumlarını silmez. Yeni eşleştirme için `Baslat.cmd --reset` çalıştırın. Hesabı/şirketi panelden silmek bilgisayardaki profil klasörünü otomatik silmez; gerekiyorsa Firefox kapalıyken ilgili klasörü bilgisayardan ayrıca kaldırın.

## Ücretsiz kullanım

Yerel Firefox, Cloudflare Browser Run'un günlük 10 dakikasını kullanmaz. Bulut üzerinde ekranı/komutları ileten Workers ve SQLite Durable Object, mevcut Free planında çalışır. Plan yükseltilmez, ücretli ürün açılmaz. Uygulama genelinde günlük 20.000 uzaktan kontrol komutu sınırı ve saniyede en fazla 6 işlem vardır. Açık ekran iki saniyede bir yenilenir; kapalı panel için ekran üretilmez. Bu sınır yaklaşık 11 saat yalnız ekran yenilemesine karşılık gelir; tıklamalar da sayılır. Kullanım UTC 00.00'da (Türkiye 03.00) yenilenir. Sınır dolarsa panel kontrolü durur; bilgisayardaki profiller korunur. Hesabın diğer uygulamaları için Cloudflare Free kotaları ayrıca geçerlidir.

R2, Zero Trust ve AI bütçeleri aynen korunur. Önceki Cloudflare tarayıcısı ayrı, isteğe bağlı ve deneysel seçenektir; kendi 10 dakika/gün sayacı devam eder. Bu sayaca ya da uygulama günlük sınırına dağıtımla sıfırlama yapılmaz.

## Doğrulama kapsamı

Otomatik testler cihaz kodunun tek kullanımını, eski anahtarın iptalini, yönetici erişimini, hesap/operatör ayrımını, sınırlı komutları ve gerçek Firefox ile profil yeniden açmayı denetler. Yerel testler sentetik bir web sayfası kullanır; Wood Mood hesaplarına giriş veya gerçek sosyal paylaşım değildir. Windows kurulumunun ve gerçek hesap girişlerinin son kontrolü şirket bilgisayarında yapılır. AI geliştirmesi bu giriş doğrulaması bitene kadar bekler.
