# Ana Firefox ile Sosyal Studio

**1.12 güncellemesi:** Yardımcı 1.12 / eklenti 1.5 ile Qwen ekran görüntüsü ve görünür alanlarla sosyal medya görevlerini adım adım yürütür. Sekme geçişi, izinli gezinti/tıklama ve boş şirket alanına metin yazma desteklenir. [Qwen Firefox görevleri ve güncelleme](FIREFOX_QWEN_1_12.md).

1.11 güncellemesinde yardımcı 1.11 / eklenti 1.4 ile **Açık hesap sekmelerini topluca bağla**, kendiliğinden durum yenileme, biçimi sınırlandırılmış AI sekme seçimi ve **Sekmeyi seç ve AI ile incele** eklendi. [Yeni kullanım ve gerçek Qwen testi](FIREFOX_QWEN_1_11.md). Bu dosyadaki tek tek bağlama yolu alternatif olarak korunur.

1.10 güncellemesinde onaylı toplu organik yayın da eklendi: [aynı pencerede otomatik yayın rehberi](OTOMATIK_YAYIN.md). Reklam bütçesi ve ödeme bu akıştan yürütülmez.

## Windows'ta tam otomatik kurulum — yardımcı 1.12 / eklenti 1.5

Güncel `Baslat.cmd` açılınca Firefox Developer Edition Mozilla'nın resmî HTTPS adresinden indirilir. Windows Authenticode zinciri ve Mozilla Corporation yayıncı imzası doğrulanmadan kurucu çalıştırılmaz. Firefox `FirefoxDeveloper`, kendine ait profil `FirefoxProfil`, ek tarayıcı verileri `FirefoxVerileri` klasörüne hazırlanır; hepsi BAT dosyasının yanındadır. İşletim sistemindeki kişisel Firefox profili, varsayılan tarayıcı ve şifre kasası değiştirilmez.

Eklenti bu özel profilin `extensions/firefox@sosyal-studio.local` klasörüne otomatik kurulur. İmzasız eklenti izni yalnız bu profile yazılır; normal Firefox'un ayarı değiştirilmez. Özel Firefox normal modda açılır: WebDriver/BiDi etkinleştirilmez. Sosyal hesaplara burada bir kez giriş yapılır. Yardımcı yeniden açılınca kendi Firefox süreci hâlâ çalışıyorsa ikinci pencere açılmaz.

Yardımcı patch'leri eklenti kaynaklarını da içerir. Sonraki açılış/güncellemede dosyalar otomatik hazırlanır. Eklenti, bağlı panel bağlantıları ve bekleyen onaylar bittiğinde yenilenen dosyalardan kendini yeniden yükler; etkin hesap bağlantılarını güncelleme sırasında kesmez. Firefox'un kendi tarayıcı güncelleyicisi bu ayrı kurulumun tarayıcı sürümünü yönetir.

Paneli bu özel Firefox'ta açın; pencere/hesap erişimini eklenti simgesinden onaylayın. Kullanıcı girişleri ve sayfa yetkileri otomatik varsayılmaz. Aşağıdaki geçici yükleme adımları yalnız kişisel normal Firefox'u kullanmak isteyenler içindir.

Bu eklenti panelin bulunduğu **tek Firefox penceresindeki bütün sekmeleri** listeleyip aralarında geçiş yapar. Diğer Firefox pencereleri kapsam dışıdır; `firefox.exe` süreçlerinin sayısı pencere sayısı değildir. Mevcut girişleriniz kullanılır; kişisel Firefox profiliniz, şifre kasanız ve sekmeleriniz kopyalanmaz veya başka Firefox'a taşınmaz. Mevcut yardımcı, yerel model, veritabanı ve güncelleme düzeni korunur. Yardımcı BAT penceresi yerel AI için açık kalır.

## İlk yükleme — normal Firefox

1. Panelin AI asistanı → Ana Firefox bölümünden **Eklenti paketini indir** seçeneğine basın. ZIP'i bir klasöre çıkarın.
2. Firefox'ta `about:debugging#/runtime/this-firefox` adresini açın.
3. **Geçici eklenti yükle** düğmesine basıp çıkardığınız klasördeki `manifest.json` dosyasını seçin.
4. Paneli yenileyin. Firefox eklentiler menüsünden Sosyal Studio simgesini araç çubuğuna sabitleyin.

Normal Firefox bu geçici yükleme için imza doğrulamasının kapatılmasını gerektirmez. Firefox tamamen kapanıp açılınca geçici eklenti kaldırılır; aynı dosyadan tekrar yükleyebilirsiniz. Kurumsal tarayıcı politikaları geçici kurulumu engelleyebilir. Bu paket **henüz Mozilla tarafından imzalanmış değildir**; normal Firefox'ta dosyadan kalıcı kurulum paketi olarak kullanılamaz.

## Sekmeyi bağlama ve AI

**1.1.0 düzeltmesi:** Yeni hesap sekmesi bağlamak önceki hesabın bağlantısını değiştirmez. Facebook, LinkedIn, Instagram ve diğer hesapların sekmelerini birer kez ekleyin; **Çalışılacak bağlı hesap sekmesi** listesinde hepsi birlikte kalır. Listeden seçim veya daha önce eşleştirilmiş sekmeye geçiş yeni eşleştirme istemez. Tek sekmeyi kapatmak diğer bağlantıları kaldırmaz. Aynı şirket/pencere bağlantısını tekrar onaylamak da hesap listesini sıfırlamaz. Firefox/eklenti tamamen yeniden başlatılırsa geçici izinler yeniden verilir.

Eski eklentiyi kullanıyorsanız panelden güncel ZIP'i indirip aynı klasöre çıkarın; `about:debugging` ekranından eski eklentiyi kaldırıp güncel `manifest.json` dosyasını yükleyin ve paneli yenileyin. 1.11 panelinde **Eklenti 1.4.0** görünmelidir. Mevcut sosyal medya girişleri etkilenmez.

Önce AI asistanı → Ana Firefox → **Bu Firefox penceresini bağla** düğmesine basın. Eklenti simgesinden pencereyi onaylayıp panelde **Eklenti bağlantısını kontrol et** seçeneğini kullanın. **Bu penceredeki tüm sekmeler** listesi açık ve sabitlenmiş sekmeleri gösterir; seçim yaparak aralarında dolaşabilirsiniz. Yeni sekme açıldığında listeyi yenileyin. Panel sekmesi başka pencereye taşınırsa bağlantı yeniden onay ister.

**AI hangi sekmeye geçsin?** alanına örneğin “LinkedIn şirket sekmesine geç” yazıp **AI ile sekmeye geç** düğmesine basabilirsiniz. Yerel model bu pencerenin sekme başlıkları/site adları arasından tek bir sekme seçer; sayfaların içeriği bu seçimde okunmaz. Seçim yalnız bu pencerenin mevcut sekme kimliklerinden biriyse uygulanır. Belirsiz veya hatalı yanıt işlem yapmaz. Bu işlem normal yerel AI üretim kotasından bir istek kullanır. 1.11'de seçim başlıkları/site adları şirket sohbet geçmişine veya yerel taslaklara kaydedilmez. Sekme geçişi mevcut taslak yerleştirme onayını iptal eder.

Sekme listesi bütün sekmeler arasında gezinmek içindir. Sayfa içeriği okuma/taslak hazırlama bu ilk sürümde yalnız izin verilen dokuz sosyal ağ ve aşağıdaki şirket hedefi bağlantısıyla çalışır; `about:` sayfaları, giriş ve özel mesaj içerikleri okunmaz. Şirketin genel web sitesi araştırması mevcut KKTC ve kaynaklar akışında kalır.

1. Panel → Hesap bağlantıları'nda ilgili şirkete ait gerçek profil/sayfa adresini kaydedin. LinkedIn için kişisel `/in/` profilini değil, `https://www.linkedin.com/company/sirketiniz/` adresini kullanın. Facebook'ta hedef şirket sayfasının adresini kaydedin.
2. AI asistanı'nda yerel modeli seçin; Ana Firefox → **Yeni hesap sekmesi ekle** bölümünden kayıtlı hedefi seçip **Hesabın Firefox sekmesini ekle** düğmesine basın.
3. Araç çubuğundaki Sosyal Studio simgesini açın. Şirketi ve hedef adresi kontrol edin, mevcut sosyal ağ sekmesini seçin. Hedef şirket sayfasının ekranda görünen tam adını yazıp **Bu sekmeyi bağla** düğmesine basın.
4. Panelde **Eklenti bağlantısını kontrol et** düğmesine basın. **Sekmeyi oku / hedefi kontrol et** ile gönderilecek metni inceleyebilirsiniz.
5. AI istek alanındaki **sekmesini bu istekte oku** seçeneğini işaretleyin. AI her istekte bağlı sekmenin güncel görünür metnini okur. Soru en fazla 2.000, sayfa alıntısı en fazla 2.800 karakterdir. Alıntı güvenilmeyen referans olarak işlenir; şirketin onaylı hafızasına eklenmez. İstek ve yanıt mevcut şirket sohbetine/yerel taslak geçmişine kaydedilir.

Eklenti model ağırlıklarını tarayıcıda çalıştırmaz: **Firefox sekmesi → eklenti → panel → eşleştirilmiş yardımcıdaki yerel model**. Modelin yanıtı panele gelir. Sayfa metni mevcut şifreli panel bağlantısından geçtiği için yalnız bilgisayar içinde kalan bir aktarım değildir. Eklenti çerez/şifre izinleri istemez; bütün sekmelerin sayfa içeriğini arka planda okumaz. Panel yalnız onaylanmış penceredeki sekme başlıklarını ve sorgu dizeleri çıkarılmış adresleri listeler; diğer pencerelerin listesi panele gönderilmez.

## Taslağı forma yerleştirme

Facebook'ta şirket sayfasının profiline geçin; LinkedIn'de şirket sayfasının yönetici görünümünü açın. Gönderi penceresini kendiniz açın. Pencerenin içinde kayıtlı hedefin profil bağlantısı ve tam adı görünür biçimde bulunmalıdır. Sadece arka plandaki şirket sayfası başlığı kimlik kanıtı sayılmaz.

AI'ın ilgili platform taslağındaki **Taslağı ana Firefox'ta onaya gönder** düğmesine basın. Eklenti simgesinden hedefi ve metni kontrol edip **Metni taslağa yerleştir** seçeneğine basın. Onay 60 saniyelik sayfa okumasına bağlıdır. Hedef veya alan değişmişse, kimlik doğrulanamıyorsa ya da alan doluysa işlem durur. Bazı sosyal ağ arayüzleri gerekli bağlantıyı göstermeyebilir; bu durumda metni panelden kopyalayıp Firefox'a kendiniz yerleştirin.

**Taslağı forma yerleştirme eylemi yayın düğmesine basmaz.** Bu eylemden sonra paylaşımı hedef şirket kimliğini kontrol ederek Firefox'ta siz tamamlarsınız. Aynı pencerede otomatik paylaşım için **Yayın takvimi → Firefox'ta toplu otomatik yayın** akışını kullanın; sabit fotoğraf/metin ve eklentide ayrı toplu yayın onayı gerekir. Eski Facebook pilotu ayrı bir akıştır. [Otomatik yayın rehberi](OTOMATIK_YAYIN.md).

## Kapsam ve bağlantıyı kesme

- Her panel sekmesinin gezinme izni tek bir şirket ve panelin bulunduğu Firefox penceresine bağlıdır. İçerik okuma/taslak hazırlama her hesap için ayrı onaylanmış sekmeyi kullanır. Başka sosyal ağa geçmek önceki hesabın sekmesini yeniden hedeflemez veya silmez. Şirket değiştirmek yeni şirkete otomatik erişim vermez; başka şirket için pencere onayı önceki şirketin bağlantılarını kaldırır.
- Giriş, doğrulama, özel mesaj ekranları ve görünür parola alanları okunmaz. Sayfa metni hazırlanırken düzenlenebilir alanlar, girişler ve bilinen mesaj panelleri çıkarılır. Sosyal ağlar görünüm değiştirebildiği için gizli alanlara dayanan işlemler elle tamamlanmalıdır.
- Eklenti rastgele kod/shell çalıştırmaz. Yayın düğmesine yalnız önizlemesi ve toplu onayı tamamlanan organik yayın işi basabilir; silme, reklam harcaması, ödeme veya hesap ayarı değiştiren işlemler çalıştırılmaz. AI yanıtı çalıştırılacak kod olarak kullanılmaz.
- Panelde bağlantıyı kesebilir veya eklenti simgesinden tüm bağlantıları iptal edebilirsiniz. Firefox ya da panel sekmesi kapanınca yeniden onay gerekir. Gizli pencereler desteklenmez.
- Bağlantı bu tarayıcıdadır; başka bilgisayardan açılan panel bu Firefox'a eklenti üzerinden uzaktan erişemez. Eklentiyle çalışırken panel sekmesi açık olmalıdır; yerel AI için yardımcı da açık olmalıdır.
- Eklenti güncellemesi, imzalı dağıtım kurulana kadar paketin yeniden indirilip geçici yüklenmesini gerektirir. Mevcut yardımcının patch güncelleyicisi Firefox imza kurallarını değiştirmez.

## Kalıcı kullanım — Mozilla imzası veya ESR

Önerilen kalıcı dağıtım, bu ZIP'in bir Mozilla Add-ons geliştirici hesabından **listelenmeyen / yalnız kendi dağıtımınız için** gönderilip imzalı XPI alınmasıdır. Mozilla hesabı, geliştirici sözleşmesi ve inceleme süreci hesap sahibi tarafından tamamlanır. Kodda veya Cloudflare'da AMO anahtarı/parolası bulunmaz. Mozilla incelemesi ve imza alınması tamamlanmış sayılmaz. İmzalı XPI elde edildiğinde aynı panelden dağıtılabilir; özel güncellemeler için AMO'nun güncelleme manifesti ve yeni sürümlerin de imzalanması gerekir.

Firefox Developer Edition, Nightly veya Mozilla'nın bu ayarı destekleyen ESR dağıtımında imzasız kalıcı kurulum için `about:config` → `xpinstall.signatures.required=false` kullanılabilir. Bu ayar tüm profilin imza denetimini etkiler; program otomatik değiştirmez. Bu yolu seçerseniz ayrı bir iş profili kullanın ve yalnız kendi derlediğiniz/incelediğiniz paketi yükleyin. ZIP'in bir kopyasını `.xpi` uzantısıyla adlandırıp Eklenti Yöneticisi → Dosyadan eklenti yükle yoluyla kurabilirsiniz. ESR sürümünü Mozilla'nın resmî sitesinden indirin. Yeni bir sürüme mevcut kişisel profili zorla açtırmayın; özellikle ESR sürümü mevcut Firefox'tan eskiyse profil uyumluluğunu varsaymayın.

## Doğrulama

Testler sentetik yerel sayfalarda kaynak/şirket ayrımını, eklenti onaylarını, parola/mesaj redlerini, kişisel gönderi kimliğiyle şirket başlığının karıştırılmamasını, eski sayfa onayının reddini ve yayın düğmesine basılmadığını kontrol eder. Gerçek Facebook/LinkedIn hesabında oturum veya yayın testi bu geliştirme ortamında yapılmış sayılmaz.
