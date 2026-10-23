# 1.12: Qwen ile sosyal medya Firefox görevleri

Yardımcı 1.12 ve eklenti 1.5, mevcut Qwen3.5:9b ile bağlı sosyal medya sekmelerini görme, gezinme ve boş metin alanına yazma görevlerini yürütür. İlk görevde Firefox görüntü izni istenir. Model ve girişler yeniden kurulmaz; mevcut patch akışı kullanılır. [Görev kullanımı ve güncelleme](https://github.com/mucaeksi/social-media-tool/blob/main/docs/FIREFOX_QWEN_1_12.md).

# 1.7.1: ilk Firefox kurulumunun yarıda kesilmesi düzeltildi

Firefox ilk kurulumunun 30 saniyelik normal başlangıç denetimiyle kesilmesi giderildi. Yardımcı indirme başlamadan kurulum aşamasını denetleyiciye bildirir; bu aşamanın ayrı, en fazla 30 dakikalık süresi vardır. İndirilen MB, Mozilla imza kontrolü ve kurulum aşamaları pencerede görünür. Boşluklu klasörlerde Mozilla NSIS kurucusunun hedef dizin seçeneğini okuyamamasına yol açan Windows argüman tırnaklaması da düzeltildi; yalnız dizin değeri tırnaklanır, shell kullanılmaz. Tekrarlanan ilerleme bildirimi üst süreyi uzatmaz. Zaman aşımı başarı olarak dönmez; henüz hazır olmayan yeni sürüm onaylanmaz. Sonraki açılışta güncelleme kontrolü Firefox kurulumu başlamadan yapılır; başarısız bir kurulum yeni düzeltmenin bulunmasını engellemez.

# 1.7 güncellemesi: gece araştırması ve yerel hafıza

AI asistanında Yerel AI ekranı açılınca seçili şirketin gece planı eşitlenir. Yardımcı ve bilgisayar açıkken KKTC saatiyle 00.00–07.00 arasında resmî platform rehberleri ve onaylı şirket kaynakları incelenir. Model ağırlıkları eğitilmez; kaynaklı çalışma notları `ai/knowledge.sqlite` içinde inceleme bekler. Sabah notları kontrol edip kullanıma açabilirsiniz. Panel sekmesi gece açık kalmak zorunda değildir; yedi gün eşitlenmeyen plan durur. Gecede tüm şirketler için toplam 20 sayfa denemesi vardır. [Kullanım ve sınırlar](https://github.com/mucaeksi/social-media-tool/blob/main/docs/GECE_OGRENMESI.md).

# 1.6 güncellemesi: otomatik Firefox ve daha güçlü AI

Baslat.cmd artık Windows’ta Mozilla imzası doğrulanan Firefox Developer Edition’ı, kendi FirefoxProfil profilini ve eklentiyi BAT klasörüne otomatik hazırlar. Kişisel Firefox değiştirilmez. Yeni Firefox’ta hesaplara bir kez giriş yapın. Eklenti güncellemeleri yardımcı patch’leriyle gelir; bağlantılar kapatılınca kendini yeniler. Detay: [Firefox kurulumu](https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev/indir/FIREFOX_EKLENTISI.md).

Yerel model Qwen3.5 9B / Q4’tür; 16 GB kart için 7–10 GiB model VRAM hedefi vardır. İlk yükseltme birkaç GB yeni model indirir. Yeni model başarıyla yüklenip ölçüldükten sonra yalnız yardımcının eski 4B ağırlıkları silinir. Şirket SQLite hafızası ve girişler korunur. Gerçek model GPU ölçümü panelde gösterilir; toplam sistem GPU tepe tüketimi garantisi verilmez.

# Windows ve Firefox ile kalıcı sosyal hesap girişleri

**Yardımcı 1.5.1 — masaüstünde taşınabilir kurulum:** ZIP’in tamamını masaüstündeki seçtiğiniz klasöre çıkarın. `companion\Kur-ve-Baslat.cmd` dosyasını çalıştırın. Aktif model, SQLite veritabanı, Firefox profilleri, kod yamaları, önbellek ve geçici dosyalar bu BAT’ın bulunduğu klasörün altında tutulur. Kısayolun çalışma dizini bu konumu değiştirmez.

Eski AppData kurulumundan geçmek için önce eski yardımcıyı ve şirkete ait Firefox pencerelerini kapatın, ardından **bu yeni ZIP’teki BAT’ı bir kez çalıştırın**. Mevcut `%LOCALAPPDATA%\SosyalStudio` cihaz kaydı, model, yerel SQLite ve Firefox profilleri yeni hedef boşsa otomatik kopyalanır; eski asıllar silinmez. Hedefte kendi cihaz/model/profil verisi varsa eski kurulumla karıştırılmaz. Sonraki yamalar aynı masaüstü klasöründe kalır. Klasörün yerini değiştirecekseniz yardımcı ve Firefox kapalıyken ZIP’ten çıkan bütün klasörü birlikte taşıyın.

**Yardımcı 1.5 yaması:** `Kur-ve-Baslat.cmd` aynı kurulumda AI’ı da otomatik hazırlar. Kod, AI çalıştırıcısı, model, yerel bilgi veritabanı ve mevcut Firefox profilleri `<BAT klasörü>` ana klasöründe tutulur. Model yardımcı açıkken bellekte hazır kalır; yardımcı kapanınca ona ait Ollama/model kapanır. Gerçek hız/VRAM ve Google girişi kullanıcı bilgisayarında doğrulanır.

**Yardımcı 1.4.2 yaması:** Hesap kartlarına **Normal Firefox’ta giriş yap** seçeneği eklendi. Özellikle Google’ın otomasyon bağlantılı tarayıcıda girişi reddettiği durumlarda aynı şirket profilini normal Firefox’ta açar. Gerçek Google hesabında bu yöntemin sonucu ayrıca doğrulanmalıdır.

**Yardımcı 1.4.1 yaması:** Windows başlatıcılarının satır sonları düzeltildi. Başlangıçta `'rlevel'`, `'Node.js'` veya `'Kurulumdan' tanınmıyor` hatası görüyorsanız eski yardımcı penceresini kapatın, güncel ZIP'in tamamını çıkarıp `companion\Kur-ve-Baslat.cmd` dosyasını çalıştırın. Cihaz eşleştirmesi, Firefox girişleri ve model dosyaları korunur.

**Yardımcı 1.3 yaması:** Aynı kurulumun otomatik güncellemesine KKTC kaynak araştırması, Firefox görevleri, AI ara kayıt/devam ve Facebook yayın pilotu eklendi. İlk kurulum adımları aşağıda; güncel özellikler ve gerçek hesapta doğrulanmamış kapsam [KKTC uzman web rehberindedir](https://github.com/mucaeksi/social-media-tool/blob/main/docs/KKTC_UZMAN_KULLANIM.md). Eski sürümün “otomatik yayın yok” notları yeni pilotu kapsamaz; diğer platformların otomatik yayını ve gerçek hesap kontrolü hâlâ tamamlanmış sayılmaz.

Panel, şirket kayıtları, taslaklar ve AI verileri Cloudflare'de; kaynak kod GitHub'da kalır. Kullanıcının onayıyla sosyal hesap tarayıcıları artık **Windows 10/11 şirket bilgisayarında Mozilla Firefox** ile çalışır. Chrome'un kişisel/iş profilleri kullanılmaz. Eklenti, ücretli tarayıcı servisi, API kredisi veya modemden port açma gerekmez. Bilgisayarın elektrik/internet maliyeti vardır.

## Tek pencereli şirket Firefox’u (1.4)

Hesap bağlantılarında **Şirket Firefox’unu aç** seçeneğini kullanın. Şirkete kayıtlı her sosyal ağın ilk hesabı aynı Firefox penceresinde ayrı sekmede açılır. Bilgisayarda bu sekmelere doğrudan giriş yapıp sayfaları sabitleyebilirsiniz. Şirket penceresi açıldığında panel otomatik olarak **Bilgisayarda giriş modu**na geçer ve ekran yenilemesini duraklatır; girişler bitince **Panel kontrolüne dön** seçin. Panelde **Sosyal ağ seç** ile aynı pencerede ilgili hesabı kontrol edin; seçim önceki panel görünümünü geçersiz kılar. **Firefox’u kapat, girişi koru** ortak pencerenin bütün sekmelerini kapatır ve profili korur.

Yeni ortak profil `<BAT klasörü>\profiles\company-<şirket-id>` altındadır. Aynı platformdaki ikinci ve sonraki hesaplar ayrı hesap profilinde tutulur; bunlara geçmeden açık ekranı kapatın. Farklı şirketlerin girişleri paylaşılmaz. İlk kurulumda kullanıcı ağlara kendisi giriş yapar; CAPTCHA ve ek doğrulama kullanıcıya aittir. Firefox’un kendi parola kaydetmesi açıktır; uygulama parola kasasını okumaz. Sekmenin açılması veya kayıtlı bir parolanın bulunması, doğru hesaba giriş yapıldığını doğrulamaz.

Önceki `profiles\<şirket-id>-<hesap-id>` klasörleri silinmez veya birleştirilmez. Ortak profile geçerken bir defa yeniden giriş gerekir. Normal Firefox’taki şifreler/çerezler otomatik taşınmaz; normal profiliniz korunur. Açık ekranları kapatıp yardımcının güncellenmesini bekleyin.

## Google ve diğer ağlarda normal Firefox ile giriş (1.4.2)

1. Yardımcı açıkken paneli yenileyin. **Hesap bağlantıları** bölümünde ilgili hesabın **Normal Firefox’ta giriş yap** düğmesine basın. Google girişi için YouTube hesabını seçin. Düğme kapalıysa açık hesap ekranlarını kapatıp yardımcının güncellenmesini bekleyin.
2. Bilgisayarda açılan normal Firefox penceresinde kendiniz giriş yapın ve doğrulamayı tamamlayın. Şirketin ilk hesapları aynı profili paylaşır; isterseniz bu pencerede diğer sosyal ağları da sekmelerde açıp giriş yapabilirsiniz. Aynı platformdaki ek hesaplar ayrı profil kullanır.
3. Giriş bitince bu normal Firefox penceresini tamamen kapatın. Panel pencerenin kapandığını gösterince **Firefox’u kapattım, panel kontrolüne dön** seçin. Aynı profil bu kez programın kontrolünde açılır; site oturumun hâlâ geçerli olup olmadığını kendisi belirler.

Normal giriş sırasında WebDriver/BiDi/Marionette bağlantısı açılmaz; panel ekran, şifre veya klavye girdisi almaz. Açık normal pencereye otomasyon bağlanmaz, aynı profile ikinci süreç açılmaz ve yardımcı güncellemesi pencere bitene kadar bekler. Panel görünümünü kapatmak normal Firefox’u zorla kapatmaz; pencereyi bilgisayardan kapatın. Normal kişisel Firefox’unuzun profili/parola kasası kopyalanmaz. Şirket profilleri ve cihaz eşleştirmesi korunur.

Bu seçenek Google güvenlik kontrolünün kesin aşılacağını veya sonraki otomasyon oturumunun her platformda kabul edileceğini garanti etmez. Gerçek Google girişi hesap sahibi tarafından denenmelidir; diğer platformlarda aynı sorun gözlenmiş sayılmaz.

## İlk kurulum

1. Şirket bilgisayarında [Node.js 24 veya üzeri LTS](https://nodejs.org/en/download) ve [Mozilla Firefox](https://www.mozilla.org/firefox/new/) kurulu olmalı. Yardımcı, 64 veya 32 bit Program Files klasörlerinde Firefox'u arar. Farklı kurulumda `STUDIO_FIREFOX` ortam değişkenine `firefox.exe` dosyasının tam yolunu verin.
2. Panelde yönetici olarak **Hesap bağlantıları** sayfasına girin ve **Windows yardımcısını indir** bağlantısından ZIP'i indirin. ZIP'in tamamını `C:\SosyalStudio-Bilgisayar` gibi kalıcı bir klasöre çıkarın. İçindeki `companion`, `shared`, `worker`, `docs` klasörleri birlikte kalmalı. İsterseniz yanındaki `.sha256` dosyasıyla ZIP özetini kontrol edin.
3. `companion\Kur-ve-Baslat.cmd` dosyasına çift tıklayın. Paket kilidindeki npm bağımlılıkları özetleri doğrulanarak, kurulum betikleri çalıştırılmadan kurulur; ayrı bir tarayıcı indirilmez. Windows güvenlik uyarısı çıkarsa kaynak depoyu ve dosyaları inceleyin; imzasız bir kaynak paketidir.
4. Panelde **Bilgisayarı eşleştir** düğmesine basın. Gösterilen tek kullanımlık kodu yardımcı penceresine yapıştırıp Enter'a basın. Kod 10 dakika geçerlidir; sonraki kod öncekinin yerine geçer. Kod ve cihaz dosyasını paylaşmayın. Cihaz kaydı en fazla birdir; değiştirmek için önce panelden eski bilgisayarı kaldırın.
5. Panel **Bilgisayar çevrimiçi** gösterdiğinde şirketi seçip **Hesap ekranını aç** düğmesine basın. Sosyal ağdaki alana ekran üzerinden tıklayın; altındaki gizli metin alanına kullanıcı adını/şifreyi/kodu yazıp **Seçili alana yaz** düğmesiyle aktarın. **Sonraki alan**, **Enter** ve kaydırma düğmeleriyle ilerleyin. İsterseniz şirket bilgisayarında açılan Firefox penceresinde doğrudan giriş yapın.
6. **Firefox'u kapat, girişi koru** yalnızca ilgili tarayıcıyı kapatır. Sosyal ağdan çıkış yapılmaz; sonraki açılış aynı Firefox profilini kullanır. Şirketin ilk sosyal hesapları aynı profili kullanır; aynı platformdaki ek hesaplar ayrıdır. En fazla üç tarayıcı süreci aynı anda açıktır. Diğer hesapların profilleri diskte korunur.

İlk gerçek X girişi ve profil yeniden açıldığında girişin korunması **şirket bilgisayarında hesap sahibi tarafından doğrulanmalıdır**. Bu belge veya profil dosyasının varlığı hesapların bağlandığı anlamına gelmez. Firefox kullanılması, X'in/diğer ağların erişime izin vereceğini veya tekrar doğrulama istemeyeceğini garanti etmez. CAPTCHA ve cihaz doğrulaması kullanıcı tarafından yapılır. Otomatik yayınlama bu sürümde yoktur.

## Sonraki açılış ve Windows başlangıcı

Sonraki açılışlarda `companion\Baslat.cmd` yeterlidir. Yardımcı penceresi açık, Windows kullanıcı oturumu ve internet bağlantısı etkin olmalıdır. Bilgisayar uyursa/kapanırsa panel çevrimdışı olur; profiller silinmez. Bağlantı kesilince yardımcı yeniden bağlanmayı dener. Uzak ekranın kapanması veya operatör süresinin dolması hesaptan çıkış değildir.

Windows başlangıcında çalışması için `Win+R` → `shell:startup` klasörünü açın ve `Baslat.cmd` dosyasının **kısayolunu** buraya koyun. Bu kullanıcı oturum açtığında başlar; Windows servisi veya otomatik Windows oturumu kurulmaz. Bilgisayar uyku ayarını iş ihtiyacınıza göre düzenleyin. Firefox özel profilini yardımcının dışında aynı anda açmayın.

## Otomatik güncelleme

Bu paketle birlikte otomatik güncelleme etkindir. Yardımcı açılışta ve açıkken **10 dakikada bir** Cloudflare'deki yeni yardımcı sürümünü kontrol eder. Panel güncellemeleri web sayfasını yenileyince görünür; yardımcı dosyaları değişmediyse bilgisayarda yeniden kurulum gerekmez.

Yeni kaynak paketi yalnızca derlemede sabitlenmiş panel HTTPS adresinden indirilir; yönlendirme izlenmez. Boyut sınırı, SHA-256 özeti, ZIP dosya yolları ve içerik sürümü denetlenir. Kilitli npm bağımlılıkları kurulum betikleri kapatılarak kurulur. Bu, HTTPS ve içerik özeti doğrulamasıdır; Windows kod imzası olduğu iddia edilmez. Güncellemelerin kaynağı bu GitHub deposundan Cloudflare'e yaptığımız yayındır.

İndirme/kurulum arka planda ayrı sürüm klasöründe yapılır. **Açık Firefox hesap ekranı veya devam eden komut varken yeniden başlatılmaz.** Panelde “Firefox'u kapat, girişi koru” ile açık ekranları kapattığınızda güncelleme uygulanır; yardımcı kısa süre çevrimdışı olup tekrar bağlanır. Terminalde güncellemenin hazır olduğu yazılır. Firefox pencerelerini açık bırakırsanız uygulama bekler; gerektiğinde yardımcıyı normal kapatıp `Baslat.cmd` ile yeniden açın.

İnternet/indirme/kurulum hatasında mevcut sürüm çalışmaya devam eder; kontrol sonraki aralıkta tekrarlanır. Başlangıcı doğrulanamayan yeni sürümden önceki sürüme otomatik dönülür ve o hatalı sürüm tekrar denenmez. Sonraki farklı sürüm yine alınır. Çalışmaya başladıktan sonraki tüm olası uygulama hatalarının otomatik algılandığı iddia edilmez.

Cihaz eşleştirmesi ve Firefox profilleri güncellenen koddan ayrıdır; silinmez veya yeniden oluşturulmaz. Kod ve en fazla bir önceki sürüm `<BAT klasörü>\updates` altında tutulur. Node.js ve Firefox'un kendi güncellemelerini bu yardımcı yapmaz; Node.js LTS kurulumunu ve Firefox'un yerleşik güncellemesini kullanın. Yardımcı açık/Windows oturumu etkin olmalıdır. Bilgisayar kapalıyken kod kontrol edilmez.

Otomatik güncellemesiz eski ZIP'i indirdiyseniz bu yeni paketi **bir kez** indirip çıkarın ve `Kur-ve-Baslat.cmd` ile başlatın. Sonraki kod güncellemeleri otomatik gelir. Eski yardımcı penceresini önce kapatın. Aynı bilgisayarda tek yardımcı çalışır; yalnızca yerel döngü adresinde tutulan 43975 numaralı kilit portu komut kabul etmez ve ağa açılmaz.

## Verilerin yeri ve erişim

- Cihaz kimliği/erişim anahtarı `<BAT klasörü>\device.json`; Ortak Firefox profili `<BAT klasörü>\profiles\company-<şirket-id>`, ek/eski hesap profilleri aynı dizinin `<şirket-id>-<hesap-id>` klasörlerindedir. Bunlar Git'e veya Cloudflare'e yüklenmez. Dosya izinleri ilgili Windows hesabına bağlıdır; disk şifrelemesi ve Windows hesabının korunması önemlidir. Tam profil, Firefox'un çerezlerini, yerel depolamayı ve IndexedDB'sini içerir; bunların hepsinin ayrıca uygulama tarafından şifrelendiği iddia edilmez.
- Panel ile yardımcı arasında TLS/WSS kullanılır. D1'de cihaz anahtarının yalnızca SHA-256 özeti ve profilin son açılma zamanı saklanır. Eşleştirme kodunun da yalnızca özeti saklanır; kullanım sonrası silinir.
- Ekran görüntüleri ve klavye girdileri Cloudflare üzerinden bellekte iletilir; D1/R2 veya loglara yazılmaz. Yardımcı, geliştirici hata metnini/URL'yi veya şifreleri terminale yazmaz. Hesap ekranına yalnızca panel yöneticisi erişir; aynı anda tek operatör/hesap ekranı kontrol edilir. 15 dakika etkin istek gelmezse kontrol kilidi sona erer; Firefox profili korunur.
- Yardımcı yalnızca kayıtlı hesabın sosyal ağ adreslerini, ekran görüntüsünü ve sınırlı fare/klavye işlemlerini kabul eder. Genel terminal, JavaScript çalıştırma, dosya okuma/yükleme veya genel gezinme arayüzü yoktur. Firefox otomasyon bağlantısı şirket bilgisayarının yerel döngü adresindedir; internete port açılmaz.
- Panelden **Bilgisayar bağlantısını kaldır**, panel erişimini iptal eder; bilgisayardaki Firefox oturumlarını silmez. Yeni eşleştirme için `Baslat.cmd --reset` çalıştırın. Hesabı/şirketi panelden silmek bilgisayardaki profil klasörünü otomatik silmez; gerekiyorsa Firefox kapalıyken ilgili klasörü bilgisayardan ayrıca kaldırın.

## Ücretsiz kullanım

Yerel Firefox, Cloudflare Browser Run'un günlük 10 dakikasını kullanmaz. Bulut üzerinde ekranı/komutları ileten Workers ve SQLite Durable Object, mevcut Free planında çalışır. Plan yükseltilmez, ücretli ürün açılmaz. Uygulama genelinde günlük 20.000 uzaktan kontrol komutu sınırı ve saniyede en fazla 6 işlem vardır. Açık ekran iki saniyede bir yenilenir; kapalı panel için ekran üretilmez. Bu sınır yaklaşık 11 saat yalnız ekran yenilemesine karşılık gelir; tıklamalar da sayılır. Kullanım UTC 00.00'da (Türkiye 03.00) yenilenir. Sınır dolarsa panel kontrolü durur; bilgisayardaki profiller korunur. Hesabın diğer uygulamaları için Cloudflare Free kotaları ayrıca geçerlidir.

R2, Zero Trust ve AI bütçeleri aynen korunur. Önceki Cloudflare tarayıcısı ayrı, isteğe bağlı ve deneysel seçenektir; kendi 10 dakika/gün sayacı devam eder. Bu sayaca ya da uygulama günlük sınırına dağıtımla sıfırlama yapılmaz.

## Doğrulama kapsamı

Otomatik testler cihaz kodunun tek kullanımını, eski anahtarın iptalini, yönetici erişimini, hesap/operatör ayrımını, sınırlı komutları ve gerçek Firefox ile profil yeniden açmayı denetler. Yerel testler sentetik bir web sayfası kullanır; Wood Mood hesaplarına giriş veya gerçek sosyal paylaşım değildir. Windows kurulumunun ve gerçek hesap girişlerinin son kontrolü şirket bilgisayarında yapılır. AI geliştirmesi bu giriş doğrulaması bitene kadar bekler.

## Küçük yerel sosyal medya AI’ı

Yardımcı 1.2 ile Qwen3.5-4B’nin 4-bit modeli için yerel AI bağlantısı gelir. **Model dosyaları ZIP’te ve GitHub’da bulunmaz.** Otomatik güncelleme yalnız kodu getirir; ilk model/runtime indirmesi yardımcı açılınca otomatik başlar. Hesapları test ederken AI üretimi ayrı yürür; tarayıcı komut kuyruğunu tutmaz.

1. Güncel yardımcı açık ve bilgisayar eşleştirilmiş olmalı. Eski yardımcı varsa açık hesap pencerelerini kapatıp güncellenmesini bekleyin. Node.js/Firefox profilleri ve cihaz eşleştirmesi korunur.
2. `companion\Kur-ve-Baslat.cmd` ile yardımcıyı açın. Resmî taşınabilir Ollama çalıştırıcısı sabit SHA-256 özeti doğrulanarak aynı ana klasöre kurulur; WinGet ve ayrı Ollama kurulumu gerekmez. Ardından yalnızca `qwen3.5:4b` indirilir ve belleğe yüklenir. İlk indirme birkaç GB ve geçici disk alanı gerektirir. İlerlemeyi **AI asistanı** bölümünde görebilirsiniz; sosyal hesaplara giriş bu sırada devam eder. İnternet/disk hatasında aynı panelde **Yerel AI kurulumunu başlat** ile tekrar deneyin. Üretim sırasında model/komut/indirme adresi seçilemez; model/API aboneliği yoktur.
3. **Yerel model hazır** görünce şirketin marka kurallarını, kesin ürün bilgilerini ve onaylı örneklerini **Şirket hafızası** alanına ekleyin. Aynı D1 hafızası kullanılır; şirketlerin verileri birbirine taşınmaz. Model ağırlıkları yeniden eğitilmez, sohbet dışında Codex tarafından eğitim yapılmaz. Yeni uzman kuralları yardımcı güncellemesiyle gelebilir.
4. Görseli ve özeti verin; hedef platformları seçin. Yerel AI yüklemesinde kaynak görsel 1024 piksele küçültülür; yerel analiz en fazla 600 KB JPEG kabul eder. Daha önce stüdyodan eklenmiş büyük görseli AI alanında yeniden yükleyin. Model görseli bir kez inceler, platform metinlerini sırayla üretir. Instagram, Facebook, X, Threads, Pinterest, YouTube, TikTok, LinkedIn ve Tumblr desteklenir. Her platformun ayrı metni, başlığı, etiketleri ve görsel açıklaması doğrulanır. Yanlış/eksik JSON veya yinelenen açıklama kaydedilmez; en fazla bir düzeltme denemesi yapılır.
5. Taslakları inceleyip **Stüdyoya aktar** seçin. Taslak/görseli taşır; otomatik paylaşım veya fotoğraftan video üretimi değildir. Gerçek yayınlama ve her platformun yükleme otomasyonu henüz uygulanmadı. Hesap sahibinin girişleri ve modelin gerçek Türkçe/görsel kalitesi şirket bilgisayarında doğrulanmalıdır.

Model en fazla 16.384 token bağlamı, sınırlı çıktı, bir üretim, dört CPU iş parçacığı ve küçük işlem grubuyla çağrılır. Kullanıcının isteğiyle yardımcı açık kaldığı sürece model bellekte tutulur; boşta 2 dakika sonra çıkarma artık uygulanmaz. Bu nedenle model boşta da RAM/VRAM kullanabilir. GPU hızlandırma ekran kartı/sürücüye ve Ollama desteğine bağlıdır. Metin bağlamı UTF-8 bayt üst sınırıyla kontrol edilir; uzun kaynak sessizce kesilmez. Gerçek hız/bellek ölçümü bu geliştirme ortamında yapılmadı. Görsel ve şirket bağlamı internet üzerindeki bir modele gönderilmez; Cloudflare üzerinden eşlenmiş bilgisayara gelir. Ollama API’si yardımcının açtığı süreçte yalnız `127.0.0.1:11435` dinler; ağa port açılmaz ve bulut modeller kapatılır. Üçüncü taraf bir Ollama kurulumunun diğer uygulamalar için yaptığı ayarlar bu belgeyle değiştirilmiş sayılmaz.

Model dosyaları `<BAT klasörü>\ai\models` klasöründe; onaylanan model özeti `<BAT klasörü>\local-ai-model.json` içinde tutulur. Pull işlemini Ollama kendi içerik özetleriyle doğrular; yardımcı ayrıca 4-bit, küçük model boyutu ve kaydedilen özeti kontrol eder. Bu dosya/model verileri yardımcı güncellemesinde silinmez. Model etiketi sonradan değişirse kullanıcı yeniden doğrulama başlatır. Güncelleyici model kurulumu/üretimi bitene kadar bekler. Hesap oturumları ve parolalar AI’a verilmez.

Yerel üretimde Cloudflare Workers AI Neuron kotası harcanmaz. Kontrol/veritabanı trafiği mevcut Cloudflare Free sınırlarına tabidir. Ayrıca günde toplam 50 üretim, kullanıcı başına saatte 10 üretim ve günde 3 kurulum denemesi vardır; hatalı girişimler de sayılır. Kod güncellemesi sayaçları sıfırlamaz. Cloudflare asistanı ayrı seçenektir ve önceki Neuron bütçeleri aynen korunur; gerçek Cloudflare model denetimi yeniden başlatılmaz.

Kaynaklar: [Qwen3.5 resmî depo](https://github.com/QwenLM/Qwen3.5), [Ollama Windows](https://github.com/ollama/ollama/blob/main/docs/windows.mdx), [Ollama API](https://github.com/ollama/ollama/tree/main/docs/api). Tam çalıştırıcı/model indirmesi ve gerçek GPU üretimi, kullanıcının Windows bilgisayarına erişim olmadan otomatik testte doğrulanmış sayılmaz.


## Tek klasör ve yerel SQLite hafızası (1.5)

- `<BAT klasörü>\apps`: ilk yardımcı kodu; `updates` aynı uygulamanın kod yamalarıdır.
- `ai\runtime`: doğrulanmış taşınabilir Ollama; `ai\models`: model dosyaları. Önceden standart Ollama klasörüne indirilen bu model varsa doğrulanmış dosyaları yeniden indirmeden alınır; eski kopya silinmez. Aynı diskte mümkün olduğunda dosyalar sabit bağlantı ile paylaşılır.
- `ai\knowledge.sqlite`: şirkete göre ayrılmış kalıcı kaynak metinleri, güncel onaylı şirket bağlamı ve son AI taslakları/yanıtları. Ekran görüntüsü, sosyal hesap çerezi/parolası ve cihaz anahtarı bu veritabanına yazılmaz. Ham internet metni onaylı bilgi, AI taslağı da gerçek bilgi veya yayınlanmış gönderi sayılmaz. Onaylar ve ana şirket verisi D1’de de korunur; güncel bağlam her istekte yerel kopyayı yeniler, silinmiş eski bilgi isteme geri eklenmez.
- Mevcut `profiles` ve `device.json` korunur. Dışarı çıkardığınız ZIP başlangıç dosyasıdır; çalışan kod aynı ana klasöre kopyalanır. BAT’ın yanındaki `ai\home`, `ai\tmp` ve `ai\cache` yalnız bu AI’a ait kullanıcı/config/geçici verileri tutar. Node.js ve Firefox sistemde kurulu uygulamalar olmaya devam eder.

Yerel hafıza üst sınırı 256 MiB’dir; 50 şirket, şirket başına 100 kaynak/son 100 yanıt ve genel son 1000 yanıt tutulur. Model dosyaları bu SQLite boyutuna dahil değildir. Bu kayıtlar model ağırlıklarını eğitmez; onaylı güncel bağlamdan içerik hazırlanır. İnternet araştırması mevcut onaylı şirket alanı/robots ve güvenli erişim sınırlarıyla yürür.

Yardımcı her Windows açılışında AI kurulumunu kontrol eder; hazır modeli yeniden indirmez. Normal kapatma, Ctrl+C veya terminalin kapanması kendi AI süreç sahibine kapanış bildirir; bağlantı kopması da model boşaltma ve kendi sunucusunu kapatma işlemini tetikler. İşletim sisteminin tamamen kapanması/elektrik kesilmesinde zaten süreçler durur. Sonraki açılış aynı model ve SQLite verisiyle devam eder. Başka uygulamalar için açılmış Ollama’ya müdahale edilmez.
