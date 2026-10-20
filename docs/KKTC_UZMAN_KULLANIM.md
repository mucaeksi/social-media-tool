# KKTC uzman çalışma alanı — mevcut programa yama

20 Ekim 2026 güncellemesi aynı uygulama adresine ve Windows yardımcısının mevcut güncelleme kanalına gelir. Şirketler, taslaklar, kullanıcılar, cihaz anahtarı, Firefox profilleri ve yerel model dosyaları sıfırlanmaz. D1 şeması `0012_expert_workspace.sql` ile eklemeli genişletilir. Resmî OAuth/API bağlantısı açılmaz; ücretli ürün, X kredisi veya yeni model aboneliği kullanılmaz.

## İlk kullanım

1. Web panelini yenileyin. Şirket bilgisayarında açık hesap ekranlarını kapatın; yardımcı yeni kaynak paketini alıp yeniden bağlansın. Güncelleme açık tarayıcı veya AI işlemi sürerken uygulanmaz. Güncelleyicisiz en eski pakette güncelleyicili pakete bir defalık geçiş gerekir.
2. **Şirketler → Profili düzenle** alanında KKTC profilini tamamlayın: sektör, ilçeler, müşteri grupları, içerik dilleri, teslimat, para birimi, iletişim, çalışma saatleri, hedef ve kullanılmayacak iddialar. Bilinmeyen alanları boş bırakın. İçerik takvimi için `Asia/Famagusta` varsayılandır; Türkiye saati ayrıca seçilebilir.
3. **KKTC ve kaynaklar** ekranına geçin. Şirketin kayıtlı web alan adından en fazla beş HTTPS sayfası girin. Aynı alan adının `www` biçimi de kabul edilir. Farklı siteler, yerel IP'ler ve giriş belirteci içeren adresler kabul edilmez.
4. **Siteyi incele** yalnız okuma yapar. Önce hafif sayfa okumasını kullanın; JavaScript gereken sayfada Firefox modunu seçin. Araştırma ayrı, giriş yapılmamış geçici profilde yapılır; sosyal hesap çerezleri kullanılmaz. Sonuç henüz şirket hafızasına eklenmiş değildir.
5. Kaynağın metnini açın. **Bilgi seç ve onayla** ile alan, değer, kanıt alıntısı ve geçerlilik süresi girin. Değer ve kanıt kaynakta aynen bulunmalıdır. Fiyat, stok ve kampanyada kısa süre kullanın. Aynı bilgi alanının yeni onayı önceki sürümü geçmişe ayırır. Değişen sayfanın eski/yeni metinleri karşılaştırılabilir.
6. **AI asistanı** geçerli kaynakları, KKTC profilini ve şirket hafızasını birlikte kullanır. Başvurulan kaynak bağlantıları yanıtın yanında görünür; kaynak sürümleri stüdyoya aktarılan taslakla saklanır. Kaynağın bulunması, içindeki her iddianın güncel veya doğru olduğu garantisi değildir; onay işletmeye aittir. Süresi dolan veya geçmişe ayrılan bilgiler yeni üretime alınmaz.

Site metni, kullanıcı özeti ve görsel yazıları referans verisidir. Bunlar araç/sistem talimatına dönüştürülmez. Model ağırlıkları eğitilmez. Otomatik arka plan site taraması yapılmaz; araştırmayı kullanıcı başlatır.

## Tek şirket penceresi

Yardımcı 1.4 ile **Hesap bağlantıları → Şirket Firefox’unu aç**, kayıtlı sosyal ağları ortak şirket profilinde sekme olarak açar. Ağlara bu pencerede giriş yapın; normal Firefox’taki şifreler otomatik aktarılmaz. Panelde **Sosyal ağ seç** ile geçiş yapılır. Aynı ağdaki ek hesaplar ayrı profil kullanır; önce mevcut ekranı kapatın. Eski hesap profilleri korunur ve yeni ortak profile otomatik birleştirilmez. Kurulum ayrıntıları [Windows rehberindedir](SIRKET_BILGISAYARI.md). Bu değişiklik diğer platformların otomatik yayın adaptörlerinin tamamlandığı anlamına gelmez.

## Firefox görevleri

**Hesap bağlantıları → Hesap ekranını aç → Firefox görevleri**:

- Geri/ileri/yenileme, sosyal ağ içinde adres açma ve sekme seçimi.
- Görünür sayfa metni ile yazı alanı, düğme, bağlantı ve görsel alanı listesi.
- Seçilen yazı alanına metin yerleştirme; seçilen düğmeye basma.
- Şirkete ait kaydedilmiş taslağın platform JPEG'ini forma yükleme. Aktarım en fazla 600 KB'tır; daha büyük görseli küçültüp yeniden yükleyin. Panel rastgele bilgisayar dosya yolu gönderemez. Geçici JPEG işlem sonunda silinir.
- **AI ile profili incele / bio öner**: sunucu o anda sayfayı okur ve yerel AI'a verir. İstemciden sahte sayfa gözlemi kabul edilmez. Öneri kendiliğinden profil ayarını değiştirmez; metni inceleyip seçili alana aktarın.

Sayfa öğelerinin kimlikleri 60 saniye geçerlidir; adres/sekme/öğe değişirse yeniden okuma gerekir. Tanınan giriş, parola ve özel mesaj yolları AI okumasına kapalıdır; parola/doğrulama alanları ve gizli metinler araç özetinden çıkarılır. İnsan için mevcut ekran, fare ve klavye kontrolü korunur. Genel shell, JavaScript/eval, CDP veya yerel dosya okuma komutu açılmaz.

Firefox'un her sitede aynı alanları sunacağı garanti edilmez. Güvenilir biçimde bulunamayan alan/düğmede işlem durur; insan ekran kontrolünü kullanabilir. CAPTCHA ve hesap doğrulaması kullanıcıya aittir. Profil dosyası ya da giriş çerezi ipucu, doğru hesabın doğrulandığı anlamına gelmez.

## Yerel AI ilerlemesi ve devam etme

Qwen3.5:4b/Q4 ve mevcut Ollama kurulumu korunur. Üretim sırasında model doğrulama, görsel inceleme ve hazırlanan platform bilgisi gösterilir. **Üretimi iptal et** devam eden isteği durdurur; mevcut taslak korunur.

Doğrulanan platformlar ve görsel gözlemi D1'de şirket/kullanıcı kapsamlı ara kayıt olur. **Yerel AI üretim işleri** son işleri gösterir. Kesinti sonrası **Kalan platformlardan devam et** ile tamamlanan platformlar yeniden üretilmez. Şirket bilgisi, kaynaklar, hafıza, istek veya uzman rehberi değişmişse eski/yeni içerik karıştırılmaması için yeni üretim istenir. Eksik paket stüdyoya aktarılmaz. Sürdürme de günlük/saatlik istek sınırına dahildir.

Yerel modelin gerçek Windows hızı, GPU kullanımı ve Türkçe/görsel kalitesi kullanıcının bilgisayarında ölçülmelidir. Otomatik testler model ağırlığı indirmez ve gerçek modeli başarılı çalışmış gibi göstermez. Kalite defterinde 30 kurgu deneme senaryosu, gerçek yanıt kaydı ve 0–4 editör puanlaması vardır. Son 100 değerlendirme korunur; uydurma bilgi ayrı işaretlenir.

Yerel AI durum kartı Ollama'nın `/api/ps` ölçümünden modelin GPU belleğini ve bağlamını gösterir. Bu sayı Firefox'un veya diğer uygulamaların toplam ekran kartı tüketimi değildir. Çalıştırıcıya erişilemezse sıfır yerine ölçüm alınamadığı yazılır. Model bellekte değilse sıfır ancak çalışan Ollama'nın boş model listesiyle doğrulanır. Kod yamaları model ağırlıklarını içermez; yardımcı kaynak paketi bu sürümde yaklaşık 0,15 MB'tır. Önbellekte bulunmayan npm bağımlılıkları ayrıca indirilebilir. Model ve Ollama ilk kurulum indirmeleri ayrıdır.

## Yayın takvimi ve Facebook pilotu

İlk otomatik adaptör **Facebook** içindir. Diğer sekiz platformda metin/görsel hazırlığı ve genel Firefox form araçları kullanılabilir; onların otomatik yayın adaptörleri bu yamada tamamlanmış sayılmaz. Resmî API/OAuth kurulumu yapılmadı.

1. İçeriği stüdyoda kontrol edip taslağı kaydedin. Facebook metni ve doğru şirkete ait Facebook hesabının profil adresi bulunmalı.
2. **Yayın takvimi** ekranında taslağı, hesabı ve zamanı seçin. Önizleme işi metni, görsel kimliğini, kaynak sürümlerini ve hedef adresi sabitler. Bu kayıt henüz paylaşım değildir.
3. Facebook'ta görünen hedef sayfa adını girin. Hesap, metin, görsel ve zamanı kontrol ederek paylaşımı açıkça onaylayın. Boş zaman alanı onaydan sonraki ilk kontrolde yürütme anlamına gelir. İleri tarih en fazla 30 gündür; dakika başına en fazla üç onaylı iş kabul edilir.
4. Cloudflare dakikada bir kuyruğu kontrol eder. Yardımcı ve Windows oturumu açık olmalı. Manuel hesap ekranı başka işlemdeyse görev kontrolü ele geçirmez. İki dakikadan fazla geciken iş otomatik geç paylaşılmaz; **Zamanı geçti** olur.
5. Adaptör hedef sayfa başlığını ve etkin profil bağlantısını kontrol eder; tekil form/düğme bulamazsa durur. Kaynak süresi veya hedef adres değişmişse paylaşmaz. Görsel gerekiyorsa yükleme önizlemesi de kontrol edilir.
6. Gönder düğmesine en fazla bir kez basılır. Yeni gönderi bağlantısı, hedef hesap ilişkisi ve metin kanıtı görülürse **Gönderi bağlantısı doğrulandı** yazılır. Sonuç belirsizse otomatik tekrar yapılmaz; hesabı insan kontrol etmelidir. Belirsiz işler silinip otomatik yeniden denenmez.

Yalnız hazırlanmış/sıradaki iş iptal edilebilir; gönderim başladıktan sonra iptal, gönderiyi geri almaz. Onaylayan yönetici devre dışı kalırsa sıradaki işi yürütme yetkisi de kalkar. Firefox'un yerel profilleri kapanınca korunur; sosyal ağın oturum süresi yine sağlayıcıya bağlıdır.

Bu adaptör gerçek Firefox üzerinde **sentetik localhost sayfasıyla** sınandı. Kullanıcının gerçek Facebook hesabı, canlı formun güncel yapısı ve gerçek paylaşım henüz doğrulanmadı. Test, canlı hesaba gönderi atmaz. Giriş tamamlandıktan sonra hesap sahibi kendi onayladığı ilk içeriğin gerçek bağlantısını kontrol etmelidir. Form yapısı desteklenmezse sahte başarı üretilmez.

## Yetkiler, ölçümler ve yedekler

**Ekip ve ayarlar** yöneticiye kullanıcı oluşturma, etkinlik/rol/şifre güncelleme ve editöre şirket atama sağlar. Yönetici bütün şirketleri görür; editör yalnız atanan şirketlerin profil, taslak, görsel, hafıza, kaynak ve ölçümlerine erişir. Tarayıcı, kaynak onayı ve paylaşım onayı yöneticiye aittir. Geçişte mevcut editörlere mevcut şirketlerin erişimi korunur; yeni editör ve sonradan eklenen şirket için erişim ayrıca atanır. İzin/rol/şifre değişikliği kullanıcının oturumlarını kapatır. Son etkin yönetici kaldırılamaz. Açık kayıt ve davet e-postası yoktur.

Kullanıcı kendi şifresini değiştirebilir ve bütün oturumlarını kapatabilir. Şifreler kaynak kodda, yedekte veya logda yer almaz. İşlem geçmişi şirket kapsamında eylem türü, zaman ve hedef kimliğini tutar; ekran veya klavye içeriğini kaydetmez.

**Ölçülen performans** işletmenin kaynak bağlantısıyla girdiği gösterim, tıklama, mesaj ve talep sayılarını saklar. Bunlar platform API'sinden çekilmiş gibi sunulmaz. Son 100 ölçüm korunur. Kampanya için UTM bağlantısı oluşturulabilir; erişim veya satış artışı uydurulmaz.

Metin yedeği profil, taslaklar, eski şirket hafızası ve site metinlerini içerir; en fazla 4 MB'tır. Görseller ayrıca indirilmelidir. Geri yükleme tek işlem grubuyla yeni şirket kopyası oluşturur; mevcut şirkete yazmaz. Görsel kimlikleri ve kaynak onayları yeni kopyaya otomatik taşınmaz; kaynakları yeniden onaylayın. Sosyal hesap oturumları, cihaz anahtarı ve model dosyaları bu yedekte yoktur.

## Veritabanı yerleşimi ve sınırlar

Veritabanı Cloudflare D1'de kalır. **10 GB, R2 görsel sınırıdır.** Resmî D1 Free sınırı tek veritabanında 500 MB, hesapta toplam 5 GB'tır. Model ağırlıkları ve Firefox profilleri Windows'ta kalır. Yeni bir yerel veritabanı kurulmaz; yamalar Cloudflare üzerinden gelir.

**Ekip ve ayarlar → Depolama kullanımı** D1'in yanıt üstverisindeki gerçek boyutu ve R2 sayacını ayrı gösterir. Üstveri bulunmazsa sıfır gösterilmez, ölçüm alınamadığı belirtilir. D1 400 MB'a ulaştığında yeni içerik/arşiv yazımı durur; silme, giriş ve yedek erişimi korunur. Bu, hesabın genel fatura kilidi değildir.

| Kayıt / işlem                | Uygulama sınırı                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Site araştırması             | Günde 20, görev başına 5 sayfa                                                   |
| Statik yanıt                 | Sayfa başına 1 MB sıkıştırılmış ve açılmış veri                                  |
| Dinamik araştırma ağı        | Görev başına 8 MB, onaylı alanlar, sınırlı bağlantı ve süre                      |
| Site metni                   | Kaynak başına 12.000 karakter                                                    |
| Kaynaklar / kanıtlı bilgiler | Şirket başına ayrı ayrı 100 kayıt                                                |
| Yayın işleri                 | Şirket başına 100 kayıt                                                          |
| Kalite / ölçüm geçmişi       | Şirket başına ayrı ayrı son 100 kayıt                                            |
| Yerel AI iş geçmişi          | Şirket başına tamamlanmış/yarım son 20 iş; kullanıcı yalnız kendi işlerini görür |
| Mevcut yerel AI              | 50 üretim/gün, 10 istek/kullanıcı/saat, 3 kurulum/gün                            |
| Mevcut Firefox kontrolü      | 20.000 komut/gün, saniyede 6, tek operatör                                       |

Araştırma DNS sonuçlarının tümünü özel/yerel adreslere karşı denetler; bağlantıyı doğrulanan IP'ye sabitler. Yönlendirmeler ve dinamik sayfanın alt istekleri de onaylı alanlarla sınırlandırılır. Statik modda kaynak metin ayrıştırılmadan önce eklenen içerik güvenlik ilkesi (CSP) sayfanın betiklerini, alt kaynaklarını ve form gönderimini engeller; ağ istekleri ayrıca durdurulur. Dinamik modda ağ yalnız yerel döngüdeki geçici HTTPS proxy'sinden çıkar; özel adreslere tünel açılmaz. Araştırma profili işlem bitince silinir. Kurumsal `HTTP_PROXY`/`HTTPS_PROXY` ortamı varsa mevcut ağ politikasını aşmak yerine araştırma durur. Robots kuralları gözetilir; sınırlanan veya okunamayan sayfa için bilgi uydurulmaz.

Kaynak: [Cloudflare D1 sınırları](https://developers.cloudflare.com/d1/platform/limits/). Sabit uygulama sınırları ücretli plana geçiş izni değildir.
