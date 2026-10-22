# KKTC reklam çalışma alanı · 1.9

Yerel Qwen3.5:9b modeli mevcut uygulamada reklam planlama ve inceleme için de kullanılır. Model yeniden indirilmez; şirket verileri, cihaz eşleştirmesi, Firefox profilleri ve sosyal hesap bağlantıları korunur. Yeni alanlar mevcut kampanya/ölçüm/düzeltme JSON kayıtlarına eklenir; yeni veritabanı veya veri silen geçiş yoktur.

## Plan ve ölçüm

Sol menüden **Reklam çalışma alanı**nı açın. Meta (Facebook/Instagram/Threads), Google (Arama/YouTube), TikTok, Pinterest, LinkedIn, X ve Tumblr Blaze aynı öncelikte sunulur. Her sağlayıcıda hesap, ülke, reklam ürünü ve KKTC hedef konumunun uygunluğu ayrıca kontrol edilmelidir. Bağlantı listesinde bulunmak, sağlayıcının KKTC için hesabınızı kabul ettiği anlamına gelmez.

**Yeni reklam planı**nda amaç, hizmet ilçeleri, dil, onaylı teklif, açılış sayfası, para birimi, önerilen günlük bütçe ve toplam harcama üst sınırını belirleyin. Tarihler şirketin KKTC saat diliminde düzenlenir. Şirketin hizmet vermediği bölgeyi eklemeyin; bütün Kıbrıs veya Türkiye, KKTC yerine otomatik seçilmez. Bütçe alanı boşsa bilinmiyor kabul edilir. Günlük bütçe bazı sağlayıcılarda ortalamadır; gerçek kampanya/hesap limitlerini platformda ayrıca doğrulayın.

**Planı yerel AI ile değerlendir**, seçilen plan ve son ilgili manuel ölçümleri referans alır. Metin ve çekim önerisi, eksik bilgi, bölge kontrolü, tek değişkenli deneme ve ölçüm planı hazırlayabilir. Harcama, erişim veya satış garantisi vermez; plan kaydetmek gerçek reklam oluşturmaz.

**Ölçülen reklam sonuçları** bölümünde rapor bağlantısı, dönem, atıf penceresi, para birimi, harcama, gösterim, tıklama, mesaj, nitelikli talep ve doğrulanmış dönüşümü girin. Eksik değerleri boş bırakın. CTR/CPC/CPM/dönüşüm maliyeti yalnız gerekli paydalar biliniyor ve sıfırdan büyükse hesaplanır. ROAS için satış gelirinin bu reklama ait olduğu ayrıca doğrulanmalıdır. Mesaj ve talep, satış geliri değildir. Farklı dönem veya para birimlerini birlikte toplamayın; aynı reklamın kümülatif anlık görüntülerini toplayarak sonuç üretmeyin. Kayıtlar daha sonra düzeltilebilir.

## Aynı Firefox penceresi

1. Yardımcı **1.9** ve eklenti **1.2** güncel olmalıdır. Açık yardımcı/hesap işlemlerini bitirip mevcut otomatik güncelleme yolunu kullanın. İlk otomatik güncellemesiz eski kurulumlar için bir defalık güncel paket kurulumu gereksinimi devam eder. Model dosyasını veya kişisel Firefox'unuzu silmeyin.
2. Paneli mevcut yönetilen Firefox Developer Edition penceresinde açın. **Firefox reklam panelleri → Bu Firefox penceresini bağla** deyin; araç çubuğundaki Sosyal Studio simgesinden pencereyi onaylayın.
3. Sağlayıcıyı ve şirkete ait kayıtlı hesabı seçin. Hesap yoksa bu şirket için bağlantı kaydı ekleyebilirsiniz. Bu işlem sağlayıcıda reklam hesabı açmaz.
4. **Reklam panelini aynı pencerede aç** düğmesi sağlayıcının sabit HTTPS yönetim adresini bu pencereye yeni sekme olarak açar. Gerçek giriş, doğrulama ve hesap seçimini Firefox'ta siz tamamlarsınız. Şifreler AI'a verilmez.
5. **Reklam hesabının sekmesini bağla** deyin. Eklenti simgesinde ilgili sekmeyi seçip panelde görünen tam hesap adını ve reklam hesabı kimliğini girin. Aynı sosyal hesabın reklam ve sosyal sekmeleri ayrı tutulur; önceki sosyal bağlantılar korunur.
6. **Reklam ekranını oku** ile seçili ekranın kısa metni alınır. **Reklam ekranını yerel AI ile değerlendir** bu anlık alıntıyı modelin referansına ekler. Alıntı doğrulanmış şirket hafızası veya sağlayıcı raporu sayılmaz.
7. Görünür hesap adı/kimliği, yeni taslak görünümü ve desteklenen boş metin alanı bulunursa alan seçilebilir. **Seçilen alan için AI metni hazırla** ile metin üretin, inceleyip düzenleyin ve **Metni eklenti onayına gönder** deyin. Eklenti penceresinde hesabı ve metni tekrar onaylayın. Sayfa, hesap veya alan değişmişse işlem reddedilir; bir onay bir kez kullanılır.

Yayınlama, kampanyayı açma/kapatma, bütçe/teklif değiştirme ve ödeme bu metin yerleştirme akışından yürütülmez. Bunlar gerçek Firefox panelinde kullanıcı kontrolünde tamamlanır. Mevcut metin üzerine yazılmaz. Desteklenmeyen veya kimliği doğrulanamayan formda metni kopyalayıp elle kullanın; her sağlayıcının canlı arayüzüne uyarlanmış otomatik yayıncı iddiası yoktur. Giriş, özel mesaj, ödeme ve müşteri listesi ekranları AI için okunmaz. Başka Firefox penceresi veya kişisel profil otomatik kullanılmaz.

Eklenti henüz Mozilla tarafından imzalanmadığından kişisel normal Firefox'ta elle kurulum geçicidir; mevcut yönetilen Developer Edition kurulumu önerilen yoldur. Açık eklenti bağlantıları güncellemeyi bekletebilir: bağlantıları kesip güncel eklentinin yüklenmesini bekleyin ve paneli yenileyin.

## Reklam konusunda gelişmesi

**Reklam çalışma notları** bölümünde reklam rehberlerini gece araştırmasına dahil etme seçeneği bulunur. Reklam çalışma alanı açılınca ve plan/ölçüm değişince son dört ilgili kaydın sınırlı bağlamı yardımcıya eşitlenir. Yardımcı çevrimdışıysa eşitleme hatası gösterilir; tekrar bağlandığında çalışma alanını açın.

Gece araştırması KKTC saatiyle 00.00–07.00 arasında, mevcut **tüm şirketler için ortak 20 sayfa/gece** sınırında çalışır. Yedi sağlayıcının erişilebilen resmî reklam rehberleri kullanılır; oturum açılmış reklam hesapları gece kendiliğinden taranmaz. Engel, yönlendirme veya robots kuralı aşılmaz. Şirketlerin ortak bütçesi nedeniyle her rehberin her gece her şirkette okunması garanti edilmez.

Yeni sonuçlar rehberle birlikte değerlendirilerek bir sonraki deney için çalışma notu hazırlanabilir. Kaynak veya manuel reklam bağlamı değiştiğinde eski notun onayı taşınmaz. Notlar **inceleme bekliyor** durumundadır. Yalnız yönetici onayından sonra aynı şirketin sınırlı ve geçerli notları sonraki üretimlerde ikincil bağlam olur. Gece programını kapatmak veya reklam araştırmasını kaldırmak mümkündür; eşitleme kapatılmış genel gece programını açmaz.

AI değerlendirmesinden veya kendi ölçümlerinizden kısa bir reklam çalışma notu da hazırlayabilirsiniz. Onay için ileri geçerlilik tarihi gerekir. Süresi dolan not yeni AI isteklerine verilmez. Şirket hafızasının mevcut 30 kayıt/8.000 karakter sınırı korunur.

Bu geliştirme, kaynak ve sonuçlara dayalı hafızadır; model ağırlıklarını eğitmez. Yeni ücretli API, kredi yükleme veya otomatik reklam harcaması açılmaz. X Ads paneline giriş desteği, ücretli X API bağlantısı değildir. Gerçek sağlayıcı girişleri, reklam hesabı/KKTC erişimi, reklam yayını ve GPU/model kalitesi bu geliştirme ortamında doğrulanmış sayılmaz.
