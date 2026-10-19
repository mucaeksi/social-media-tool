# Windows ve Firefox ile kalıcı sosyal hesap girişleri

Panel, şirket kayıtları, taslaklar ve AI verileri Cloudflare'de; kaynak kod GitHub'da kalır. Kullanıcının onayıyla sosyal hesap tarayıcıları artık **Windows 10/11 şirket bilgisayarında Mozilla Firefox** ile çalışır. Chrome'un kişisel/iş profilleri kullanılmaz. Eklenti, ücretli tarayıcı servisi, API kredisi veya modemden port açma gerekmez. Bilgisayarın elektrik/internet maliyeti vardır.

## İlk kurulum

1. Şirket bilgisayarında [Node.js 24 veya üzeri LTS](https://nodejs.org/en/download) ve [Mozilla Firefox](https://www.mozilla.org/firefox/new/) kurulu olmalı. Yardımcı, 64 veya 32 bit Program Files klasörlerinde Firefox'u arar. Farklı kurulumda `STUDIO_FIREFOX` ortam değişkenine `firefox.exe` dosyasının tam yolunu verin.
2. Panelde yönetici olarak **Hesap bağlantıları** sayfasına girin ve **Windows yardımcısını indir** bağlantısından ZIP'i indirin. ZIP'in tamamını `C:\SosyalStudio-Bilgisayar` gibi kalıcı bir klasöre çıkarın. İçindeki `companion`, `shared`, `worker`, `docs` klasörleri birlikte kalmalı. İsterseniz yanındaki `.sha256` dosyasıyla ZIP özetini kontrol edin.
3. `companion\Kur-ve-Baslat.cmd` dosyasına çift tıklayın. Paket kilidindeki npm bağımlılıkları özetleri doğrulanarak, kurulum betikleri çalıştırılmadan kurulur; ayrı bir tarayıcı indirilmez. Windows güvenlik uyarısı çıkarsa kaynak depoyu ve dosyaları inceleyin; imzasız bir kaynak paketidir.
4. Panelde **Bilgisayarı eşleştir** düğmesine basın. Gösterilen tek kullanımlık kodu yardımcı penceresine yapıştırıp Enter'a basın. Kod 10 dakika geçerlidir; sonraki kod öncekinin yerine geçer. Kod ve cihaz dosyasını paylaşmayın. Cihaz kaydı en fazla birdir; değiştirmek için önce panelden eski bilgisayarı kaldırın.
5. Panel **Bilgisayar çevrimiçi** gösterdiğinde şirketi seçip **Hesap ekranını aç** düğmesine basın. Sosyal ağdaki alana ekran üzerinden tıklayın; altındaki gizli metin alanına kullanıcı adını/şifreyi/kodu yazıp **Seçili alana yaz** düğmesiyle aktarın. **Sonraki alan**, **Enter** ve kaydırma düğmeleriyle ilerleyin. İsterseniz şirket bilgisayarında açılan Firefox penceresinde doğrudan giriş yapın.
6. **Firefox'u kapat, girişi koru** yalnızca ilgili tarayıcıyı kapatır. Sosyal ağdan çıkış yapılmaz; sonraki açılış aynı Firefox profilini kullanır. Şirket/hesap başına ayrı profil; en fazla üç tarayıcı süreci aynı anda açıktır. Diğer hesapların profilleri diskte korunur.

İlk gerçek X girişi ve profil yeniden açıldığında girişin korunması **şirket bilgisayarında hesap sahibi tarafından doğrulanmalıdır**. Bu belge veya profil dosyasının varlığı hesapların bağlandığı anlamına gelmez. Firefox kullanılması, X'in/diğer ağların erişime izin vereceğini veya tekrar doğrulama istemeyeceğini garanti etmez. CAPTCHA ve cihaz doğrulaması kullanıcı tarafından yapılır. Otomatik yayınlama bu sürümde yoktur.

## Sonraki açılış ve Windows başlangıcı

Sonraki açılışlarda `companion\Baslat.cmd` yeterlidir. Yardımcı penceresi açık, Windows kullanıcı oturumu ve internet bağlantısı etkin olmalıdır. Bilgisayar uyursa/kapanırsa panel çevrimdışı olur; profiller silinmez. Bağlantı kesilince yardımcı yeniden bağlanmayı dener. Uzak ekranın kapanması veya operatör süresinin dolması hesaptan çıkış değildir.

Windows başlangıcında çalışması için `Win+R` → `shell:startup` klasörünü açın ve `Baslat.cmd` dosyasının **kısayolunu** buraya koyun. Bu kullanıcı oturum açtığında başlar; Windows servisi veya otomatik Windows oturumu kurulmaz. Bilgisayar uyku ayarını iş ihtiyacınıza göre düzenleyin. Firefox özel profilini yardımcının dışında aynı anda açmayın.

## Otomatik güncelleme

Bu paketle birlikte otomatik güncelleme etkindir. Yardımcı açılışta ve açıkken **10 dakikada bir** Cloudflare'deki yeni yardımcı sürümünü kontrol eder. Panel güncellemeleri web sayfasını yenileyince görünür; yardımcı dosyaları değişmediyse bilgisayarda yeniden kurulum gerekmez.

Yeni kaynak paketi yalnızca derlemede sabitlenmiş panel HTTPS adresinden indirilir; yönlendirme izlenmez. Boyut sınırı, SHA-256 özeti, ZIP dosya yolları ve içerik sürümü denetlenir. Kilitli npm bağımlılıkları kurulum betikleri kapatılarak kurulur. Bu, HTTPS ve içerik özeti doğrulamasıdır; Windows kod imzası olduğu iddia edilmez. Güncellemelerin kaynağı bu GitHub deposundan Cloudflare'e yaptığımız yayındır.

İndirme/kurulum arka planda ayrı sürüm klasöründe yapılır. **Açık Firefox hesap ekranı veya devam eden komut varken yeniden başlatılmaz.** Panelde “Firefox'u kapat, girişi koru” ile açık ekranları kapattığınızda güncelleme uygulanır; yardımcı kısa süre çevrimdışı olup tekrar bağlanır. Terminalde güncellemenin hazır olduğu yazılır. Firefox pencerelerini açık bırakırsanız uygulama bekler; gerektiğinde yardımcıyı normal kapatıp `Baslat.cmd` ile yeniden açın.

İnternet/indirme/kurulum hatasında mevcut sürüm çalışmaya devam eder; kontrol sonraki aralıkta tekrarlanır. Başlangıcı doğrulanamayan yeni sürümden önceki sürüme otomatik dönülür ve o hatalı sürüm tekrar denenmez. Sonraki farklı sürüm yine alınır. Çalışmaya başladıktan sonraki tüm olası uygulama hatalarının otomatik algılandığı iddia edilmez.

Cihaz eşleştirmesi ve Firefox profilleri güncellenen koddan ayrıdır; silinmez veya yeniden oluşturulmaz. Kod ve en fazla bir önceki sürüm `%LOCALAPPDATA%\SosyalStudio\updates` altında tutulur. Node.js ve Firefox'un kendi güncellemelerini bu yardımcı yapmaz; Node.js LTS kurulumunu ve Firefox'un yerleşik güncellemesini kullanın. Yardımcı açık/Windows oturumu etkin olmalıdır. Bilgisayar kapalıyken kod kontrol edilmez.

Otomatik güncellemesiz eski ZIP'i indirdiyseniz bu yeni paketi **bir kez** indirip çıkarın ve `Kur-ve-Baslat.cmd` ile başlatın. Sonraki kod güncellemeleri otomatik gelir. Eski yardımcı penceresini önce kapatın. Aynı bilgisayarda tek yardımcı çalışır; yalnızca yerel döngü adresinde tutulan 43975 numaralı kilit portu komut kabul etmez ve ağa açılmaz.

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

## Küçük yerel sosyal medya AI’ı

Yardımcı 1.2 ile Qwen3.5-4B’nin 4-bit modeli için yerel AI bağlantısı gelir. **Model dosyaları ZIP’te ve GitHub’da bulunmaz.** Otomatik güncelleme yalnız kodu getirir; ilk model/runtime indirmesini panelden bir kez başlatın. Hesapları test ederken AI üretimi ayrı yürür; tarayıcı komut kuyruğunu tutmaz.

1. Güncel yardımcı açık ve bilgisayar eşleştirilmiş olmalı. Eski yardımcı varsa açık hesap pencerelerini kapatıp güncellenmesini bekleyin. Node.js/Firefox profilleri ve cihaz eşleştirmesi korunur.
2. Panelde **AI asistanı → Şirket bilgisayarı · küçük yerel model → Yerel AI kurulumunu başlat** seçin. Windows App Installer/WinGet varsa Microsoft’un paket yöneticisiyle `Ollama.Ollama` paketi kurulur; ardından yalnızca `qwen3.5:4b` indirilir. Bilgisayarda WinGet yoksa veya kurulum engelliyse paneldeki resmi [Ollama Windows](https://ollama.com/download/windows) bağlantısından kurup aynı düğmeye tekrar basın. Yönetici ilk kurulumu başlatır; üretim sırasında model/komut/indirme adresi seçilemez. Kurulum ve model için birkaç GB indirme ve ek disk alanı gerekir; elektrik/internet tüketimi vardır, model/API aboneliği yoktur.
3. **Yerel model hazır** görünce şirketin marka kurallarını, kesin ürün bilgilerini ve onaylı örneklerini **Şirket hafızası** alanına ekleyin. Aynı D1 hafızası kullanılır; şirketlerin verileri birbirine taşınmaz. Model ağırlıkları yeniden eğitilmez, sohbet dışında Codex tarafından eğitim yapılmaz. Yeni uzman kuralları yardımcı güncellemesiyle gelebilir.
4. Görseli ve özeti verin; hedef platformları seçin. Yerel AI yüklemesinde kaynak görsel 1024 piksele küçültülür; yerel analiz en fazla 600 KB JPEG kabul eder. Daha önce stüdyodan eklenmiş büyük görseli AI alanında yeniden yükleyin. Model görseli bir kez inceler, platform metinlerini sırayla üretir. Instagram, Facebook, X, Threads, Pinterest, YouTube, TikTok, LinkedIn ve Tumblr desteklenir. Her platformun ayrı metni, başlığı, etiketleri ve görsel açıklaması doğrulanır. Yanlış/eksik JSON veya yinelenen açıklama kaydedilmez; en fazla bir düzeltme denemesi yapılır.
5. Taslakları inceleyip **Stüdyoya aktar** seçin. Taslak/görseli taşır; otomatik paylaşım veya fotoğraftan video üretimi değildir. Gerçek yayınlama ve her platformun yükleme otomasyonu henüz uygulanmadı. Hesap sahibinin girişleri ve modelin gerçek Türkçe/görsel kalitesi şirket bilgisayarında doğrulanmalıdır.

Model en fazla 16.384 token bağlamı, sınırlı çıktı, bir üretim, dört CPU iş parçacığı, küçük işlem grubu ve 2 dakika bellekten çıkarma ayarıyla çağrılır. GPU hızlandırma ekran kartı/sürücüye ve Ollama desteğine bağlıdır. Metin bağlamı UTF-8 bayt üst sınırıyla kontrol edilir; uzun kaynak sessizce kesilmez. Gerçek hız/bellek ölçümü bu geliştirme ortamında yapılmadı. Görsel ve şirket bağlamı internet üzerindeki bir modele gönderilmez; Cloudflare üzerinden eşlenmiş bilgisayara gelir. Ollama API’si yardımcının açtığı süreçte yalnız `127.0.0.1:11434` dinler; ağa port açılmaz ve bulut modeller kapatılır. Üçüncü taraf bir Ollama kurulumunun diğer uygulamalar için yaptığı ayarlar bu belgeyle değiştirilmiş sayılmaz.

Model dosyaları Ollama’nın Windows kullanıcı klasöründe; onaylanan model özeti `%LOCALAPPDATA%\SosyalStudio\local-ai-model.json` içinde tutulur. Pull işlemini Ollama kendi içerik özetleriyle doğrular; yardımcı ayrıca 4-bit, küçük model boyutu ve kaydedilen özeti kontrol eder. Bu dosya/model verileri yardımcı güncellemesinde silinmez. Model etiketi sonradan değişirse kullanıcı yeniden doğrulama başlatır. Güncelleyici model kurulumu/üretimi bitene kadar bekler. Hesap oturumları ve parolalar AI’a verilmez.

Yerel üretimde Cloudflare Workers AI Neuron kotası harcanmaz. Kontrol/veritabanı trafiği mevcut Cloudflare Free sınırlarına tabidir. Ayrıca günde toplam 50 üretim, kullanıcı başına saatte 10 üretim ve günde 3 kurulum denemesi vardır; hatalı girişimler de sayılır. Kod güncellemesi sayaçları sıfırlamaz. Cloudflare asistanı ayrı seçenektir ve önceki Neuron bütçeleri aynen korunur; gerçek Cloudflare model denetimi yeniden başlatılmaz.

Kaynaklar: [Qwen3.5 resmî depo](https://github.com/QwenLM/Qwen3.5), [Ollama Windows](https://github.com/ollama/ollama/blob/main/docs/windows.mdx), [Ollama API](https://github.com/ollama/ollama/tree/main/docs/api). Model/WinGet kurulumu ve gerçek GPU üretimi, kullanıcının Windows bilgisayarına erişim olmadan otomatik testte doğrulanmış sayılmaz.
