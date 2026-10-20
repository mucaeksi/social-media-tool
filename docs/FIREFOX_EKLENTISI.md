# Ana Firefox ile Sosyal Studio

Bu eklenti panelin bulunduğu **tek Firefox penceresindeki bütün sekmeleri** listeleyip aralarında geçiş yapar. Diğer Firefox pencereleri kapsam dışıdır; `firefox.exe` süreçlerinin sayısı pencere sayısı değildir. Mevcut girişleriniz kullanılır; kişisel Firefox profiliniz, şifre kasanız ve sekmeleriniz kopyalanmaz veya başka Firefox'a taşınmaz. Mevcut yardımcı, yerel model, veritabanı ve güncelleme düzeni korunur. Yardımcı BAT penceresi yerel AI için açık kalır.

## İlk yükleme — normal Firefox

1. Panelin AI asistanı → Ana Firefox bölümünden **Eklenti paketini indir** seçeneğine basın. ZIP'i bir klasöre çıkarın.
2. Firefox'ta `about:debugging#/runtime/this-firefox` adresini açın.
3. **Geçici eklenti yükle** düğmesine basıp çıkardığınız klasördeki `manifest.json` dosyasını seçin.
4. Paneli yenileyin. Firefox eklentiler menüsünden Sosyal Studio simgesini araç çubuğuna sabitleyin.

Normal Firefox bu geçici yükleme için imza doğrulamasının kapatılmasını gerektirmez. Firefox tamamen kapanıp açılınca geçici eklenti kaldırılır; aynı dosyadan tekrar yükleyebilirsiniz. Kurumsal tarayıcı politikaları geçici kurulumu engelleyebilir. Bu paket **henüz Mozilla tarafından imzalanmış değildir**; normal Firefox'ta dosyadan kalıcı kurulum paketi olarak kullanılamaz.

## Sekmeyi bağlama ve AI

Önce AI asistanı → Ana Firefox → **Bu Firefox penceresini bağla** düğmesine basın. Eklenti simgesinden pencereyi onaylayıp panelde **Eklenti bağlantısını kontrol et** seçeneğini kullanın. **Bu penceredeki tüm sekmeler** listesi açık ve sabitlenmiş sekmeleri gösterir; seçim yaparak aralarında dolaşabilirsiniz. Yeni sekme açıldığında listeyi yenileyin. Panel sekmesi başka pencereye taşınırsa bağlantı yeniden onay ister.

**AI hangi sekmeye geçsin?** alanına örneğin “LinkedIn şirket sekmesine geç” yazıp **AI ile sekmeye geç** düğmesine basabilirsiniz. Yerel model bu pencerenin sekme başlıkları/site adları arasından tek bir sekme seçer; sayfaların içeriği bu seçimde okunmaz. Seçim yalnız bu pencerenin mevcut sekme kimliklerinden biriyse uygulanır. Belirsiz veya hatalı yanıt işlem yapmaz. Bu işlem normal yerel AI üretim kotasından bir istek kullanır; başlık ve site adları mevcut AI sohbet kaydına da girer. Sekme geçişi mevcut taslak yerleştirme onayını iptal eder.

Sekme listesi bütün sekmeler arasında gezinmek içindir. Sayfa içeriği okuma/taslak hazırlama bu ilk sürümde yalnız izin verilen dokuz sosyal ağ ve aşağıdaki şirket hedefi bağlantısıyla çalışır; `about:` sayfaları, giriş ve özel mesaj içerikleri okunmaz. Şirketin genel web sitesi araştırması mevcut KKTC ve kaynaklar akışında kalır.

1. Panel → Hesap bağlantıları'nda ilgili şirkete ait gerçek profil/sayfa adresini kaydedin. LinkedIn için kişisel `/in/` profilini değil, `https://www.linkedin.com/company/sirketiniz/` adresini kullanın. Facebook'ta hedef şirket sayfasının adresini kaydedin.
2. AI asistanı'nda yerel modeli seçin; Ana Firefox bölümünden kayıtlı hedefi seçip **Firefox'ta sekme seçimini iste** düğmesine basın.
3. Araç çubuğundaki Sosyal Studio simgesini açın. Şirketi ve hedef adresi kontrol edin, mevcut sosyal ağ sekmesini seçin. Hedef şirket sayfasının ekranda görünen tam adını yazıp **Bu sekmeyi bağla** düğmesine basın.
4. Panelde **Eklenti bağlantısını kontrol et** düğmesine basın. **Sekmeyi oku / hedefi kontrol et** ile gönderilecek metni inceleyebilirsiniz.
5. AI istek alanındaki **sekmesini bu istekte oku** seçeneğini işaretleyin. AI her istekte bağlı sekmenin güncel görünür metnini okur. Soru en fazla 2.000, sayfa alıntısı en fazla 2.800 karakterdir. Alıntı güvenilmeyen referans olarak işlenir; şirketin onaylı hafızasına eklenmez. İstek ve yanıt mevcut şirket sohbetine/yerel taslak geçmişine kaydedilir.

Eklenti model ağırlıklarını tarayıcıda çalıştırmaz: **Firefox sekmesi → eklenti → panel → eşleştirilmiş yardımcıdaki yerel model**. Modelin yanıtı panele gelir. Sayfa metni mevcut şifreli panel bağlantısından geçtiği için yalnız bilgisayar içinde kalan bir aktarım değildir. Eklenti çerez/şifre izinleri istemez; bütün sekmelerin sayfa içeriğini arka planda okumaz. Panel yalnız onaylanmış penceredeki sekme başlıklarını ve sorgu dizeleri çıkarılmış adresleri listeler; diğer pencerelerin listesi panele gönderilmez.

## Taslağı forma yerleştirme

Facebook'ta şirket sayfasının profiline geçin; LinkedIn'de şirket sayfasının yönetici görünümünü açın. Gönderi penceresini kendiniz açın. Pencerenin içinde kayıtlı hedefin profil bağlantısı ve tam adı görünür biçimde bulunmalıdır. Sadece arka plandaki şirket sayfası başlığı kimlik kanıtı sayılmaz.

AI'ın ilgili platform taslağındaki **Taslağı ana Firefox'ta onaya gönder** düğmesine basın. Eklenti simgesinden hedefi ve metni kontrol edip **Metni taslağa yerleştir** seçeneğine basın. Onay 60 saniyelik sayfa okumasına bağlıdır. Hedef veya alan değişmişse, kimlik doğrulanamıyorsa ya da alan doluysa işlem durur. Bazı sosyal ağ arayüzleri gerekli bağlantıyı göstermeyebilir; bu durumda metni panelden kopyalayıp Firefox'a kendiniz yerleştirin.

**Bu eklenti sürümü yayın düğmesine basmaz, gönderi zamanlamaz veya yayın yapıldı demez.** Son paylaşımı hedef şirket kimliğini kontrol ederek Firefox'ta siz tamamlarsınız. Var olan Facebook yayın pilotu ayrı bir akıştır; eklentide seçtiğiniz sekme pilotun tarayıcısı değildir. Eklenti bağlantısı mevcut yayın işlerinin hedefini değiştirmez.

## Kapsam ve bağlantıyı kesme

- Her panel sekmesinin gezinme izni tek bir şirket ve panelin bulunduğu Firefox penceresine bağlıdır. İçerik okuma/taslak hazırlama ayrıca seçili şirket/hesap hedefini kullanır. Başka sosyal ağ sekmesine geçince ilgili kayıtlı şirket hedefini seçin. Şirket değiştirmek yeni şirkete otomatik erişim vermez.
- Giriş, doğrulama, özel mesaj ekranları ve görünür parola alanları okunmaz. Sayfa metni hazırlanırken düzenlenebilir alanlar, girişler ve bilinen mesaj panelleri çıkarılır. Sosyal ağlar görünüm değiştirebildiği için gizli alanlara dayanan işlemler elle tamamlanmalıdır.
- Eklenti rastgele kod/shell çalıştırmaz; yayın, silme, ödeme veya hesap ayarı değiştiren düğmelere basmaz. AI yanıtı çalıştırılacak kod olarak kullanılmaz.
- Panelde bağlantıyı kesebilir veya eklenti simgesinden tüm bağlantıları iptal edebilirsiniz. Firefox ya da panel sekmesi kapanınca yeniden onay gerekir. Gizli pencereler desteklenmez.
- Bağlantı bu tarayıcıdadır; başka bilgisayardan açılan panel bu Firefox'a eklenti üzerinden uzaktan erişemez. Eklentiyle çalışırken panel sekmesi açık olmalıdır; yerel AI için yardımcı da açık olmalıdır.
- Eklenti güncellemesi, imzalı dağıtım kurulana kadar paketin yeniden indirilip geçici yüklenmesini gerektirir. Mevcut yardımcının patch güncelleyicisi Firefox imza kurallarını değiştirmez.

## Kalıcı kullanım — Mozilla imzası veya ESR

Önerilen kalıcı dağıtım, bu ZIP'in bir Mozilla Add-ons geliştirici hesabından **listelenmeyen / yalnız kendi dağıtımınız için** gönderilip imzalı XPI alınmasıdır. Mozilla hesabı, geliştirici sözleşmesi ve inceleme süreci hesap sahibi tarafından tamamlanır. Kodda veya Cloudflare'da AMO anahtarı/parolası bulunmaz. Mozilla incelemesi ve imza alınması tamamlanmış sayılmaz. İmzalı XPI elde edildiğinde aynı panelden dağıtılabilir; özel güncellemeler için AMO'nun güncelleme manifesti ve yeni sürümlerin de imzalanması gerekir.

Firefox Developer Edition, Nightly veya Mozilla'nın bu ayarı destekleyen ESR dağıtımında imzasız kalıcı kurulum için `about:config` → `xpinstall.signatures.required=false` kullanılabilir. Bu ayar tüm profilin imza denetimini etkiler; program otomatik değiştirmez. Bu yolu seçerseniz ayrı bir iş profili kullanın ve yalnız kendi derlediğiniz/incelediğiniz paketi yükleyin. ZIP'in bir kopyasını `.xpi` uzantısıyla adlandırıp Eklenti Yöneticisi → Dosyadan eklenti yükle yoluyla kurabilirsiniz. ESR sürümünü Mozilla'nın resmî sitesinden indirin. Yeni bir sürüme mevcut kişisel profili zorla açtırmayın; özellikle ESR sürümü mevcut Firefox'tan eskiyse profil uyumluluğunu varsaymayın.

## Doğrulama

Testler sentetik yerel sayfalarda kaynak/şirket ayrımını, eklenti onaylarını, parola/mesaj redlerini, kişisel gönderi kimliğiyle şirket başlığının karıştırılmamasını, eski sayfa onayının reddini ve yayın düğmesine basılmadığını kontrol eder. Gerçek Facebook/LinkedIn hesabında oturum veya yayın testi bu geliştirme ortamında yapılmış sayılmaz.
