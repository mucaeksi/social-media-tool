# Qwen ile sosyal medya Firefox'unu kullanma · 1.12

Bu yama mevcut uygulamaya, yardımcıya ve yönetilen Firefox Developer Edition'a eklenir. Yardımcı **1.12.0**, eklenti **1.5.0** olmalıdır. Model **Qwen3.5:9b**, mevcut model dosyası, cihaz eşleştirmesi ve Firefox girişleri korunur.

## Güncelleme

Devam eden yayın/görev bitince yönetilen Firefox'u ve yardımcıyı normal şekilde kapatın. Aynı klasördeki **Baslat.cmd** dosyasını yeniden çalıştırın; mevcut güncelleme akışı yeni kodu alır. Siteyi **Ctrl+F5** ile yenileyin. Klasör, profil ve model silmeyin. Yardımcı güncellemesi yeni model indirmez.

## Görev başlatma

1. Siteyi ve sosyal medya hesaplarını aynı eklentili Firefox penceresinde açın. **Açık hesap sekmelerini topluca bağla** ile hesap/sayfa sekmelerini araç çubuğundan birlikte onaylayın.
2. **Hesap bağlantıları**, **AI asistanı → Ana Firefox** veya **Yayın takvimi** ekranındaki **Qwen ile Firefox'u kullan** bölümünü bulun.
3. Başlangıç hesabını seçip görev yazın. Örneğin: “Facebook şirket sayfasını incele; boş gönderi alanını açıp Girne mağazamıza davet metni yaz. Ardından Instagram sayfamı incele.”
4. **Qwen Firefox görevini başlat** düğmesine basın. Firefox araç çubuğundaki **Sosyal Studio** simgesinden görevi ve hesapları inceleyip **Qwen'e bu sosyal medya görevini ver** ile bir kez onaylayın.
5. İlk kullanımda Firefox ekran görüntüsü izni ister. Bu izin verildiğinde eklenti yalnız görevin bağlı sosyal/reklam hesaplarında görüntü alır. İşlem adımları ve son görülen ekran panelde gösterilir.

Qwen her adımda gerçek sekme görüntüsünü ve görünür alanları birlikte inceler. Sonraki adım; bağlı başka hesaba geçmek, kayıtlı profil/sayfayı açmak, sayfadaki izinli bağlantı veya düğmeyi kullanmak, sayfayı kaydırmak, boş alana metin yazmak ya da değerlendirmeyi bitirmek olabilir. Her işlemden sonra yeni görüntü alınır. Metin yazıldıktan sonra gerçek alan değeri kontrol edilir.

Görev en fazla **8 adım** ve onaydan itibaren **12 dakika** sürer. Her Qwen ekran değerlendirmesi mevcut yerel AI sınırından bir istek kullanır: tüm hesaplarda günde 50, kullanıcı başına saatte 10. Sınır veya hata durumunda yapılmış işlemler korunur; otomatik tekrar yoktur. **Firefox görevini durdur** yeni işlemleri keser ve yalnız o görevin model çağrısını iptal eder. Yapılmış yazma geri alınmaz.

## Hesap ve sayfa kapsamı

Hesaplar, bu panel sekmesi için onaylanan aynı Firefox penceresindeki kayıtlı hedeflerden seçilir. Qwen görev boyunca bu hedefler arasında kendi geçebilir. Aynı kayıt hem sosyal hem reklam hedefi olarak bağlıysa görev, o kaydın seçili hedefini kullanır; başka reklam hedefi için bağlı hedef seçicisinden onu seçip yeni görev başlatın.

Giriş/parola/iki aşamalı doğrulama, özel mesaj, hesap ayarı ve ödeme sayfaları kullanılmaz. Sayfadaki özel mesaj panelleri, iframe'ler ve yetkisi doğrulanmamış form alanları görüntü gönderilmeden kapatılır. Değişmiş özel alan konumlarıyla alınan görüntü kullanılmaz. Normal gezinti bağlantıları aynı platformun izinli adreslerine açılır.

Yazma yalnız görünür, boş ve izinli metin alanında yapılır. Şirket gönderi alanında hedef profil bağlantısı ve görünen hesap adı doğrulanır; kişisel hesaba ait oluşturma alanı şirket başlığına bakılarak kabul edilmez. Arama alanları ayrıca kullanılabilir. Mevcut metin otomatik ezilmez; düzenleme gerekiyorsa ilgili alanı siz boşaltıp görevi yeniden verin. Etiketi/kimliği değişmiş alan, kapanan veya başka pencereye taşınan sekme, değişen şirket/yönetici ve eski görüntü işlemi durdurur.

Genel görevin son paylaşım, mesaj gönderme, silme, beğeni/takip, reklam harcaması veya ödeme komutu yoktur. Otomatik organik paylaşım **Yayın takvimi** içindeki sabit fotoğraf/metin önizlemesi ve toplu yayın onayından yürür. Dosya/fotoğraf aktarımı da mevcut yayın akışındadır. Qwen'in değerlendirme yazısı gerçek yayın kanıtı değildir; yayın sonucu kuyruğun yeni bağlantı denetiminden izlenir.

Genel görev ve yayın aynı anda hesabı kullanmaz. Onaylı bir yayının zamanı gelirse genel görev sona erer ve yayın kuyruğu öncelik alır. İleri tarihli kuyruk kaydı görev başlatmayı tek başına engellemez. Görev onayı, tarayıcı/panel yeniden başlatılınca otomatik sürdürülmez. Yeni görev için tekrar görev onayı verilir; sosyal hesaba yeniden giriş yalnız platform isterse gerekir.

## Veri ve teknik sınırlar

Ekran JPEG'i özel alanlar kapatıldıktan sonra en fazla 960×720 ve 200 KB olarak aktarılır. Görüntü, anlık görünür sayfa metni, görev ve alan kimlikleri mevcut kimliği doğrulanmış panel/Cloudflare/yardımcı bağlantısından yerel Qwen'e ulaşır. Bunlar D1 sohbetine, şirket hafızasına, yerel üretim geçmişine veya diske arşivlenmez. Paneldeki son görüntü gezinme/yenilemede kaldırılır. Kalıcı model ağırlığı eğitimi yapılmaz.

Firefox `captureTab` için `<all_urls>` köken izni istediğinden bu izin **isteğe bağlıdır** ve yalnız ilk görevde Firefox'un kendi izin ekranından alınır. Kod, izne rağmen her görüntü ve işlemde şirket/pencere/hesap ve sosyal adres listesini denetler. Başka siteler, başka Firefox profilleri, `about:` sayfaları ve Windows masaüstü bu araçtan kontrol edilmez.

Qwen kod, CSS seçicisi, koordinat, URL veya shell çalıştıramaz. İşlem JSON'u yalnız son gözlemdeki alan kimliklerini ve göreve bağlanan hesapları kabul eder. Kimlikler tek kullanımlıdır; değişmiş sayfaya eski karar uygulanmaz. Modelin görsel/alan içindeki talimatları izlemesi istenmez ve sonuç ayrıca uygulama tarafından doğrulanır. Tanınmayan düğmede veya kanıtlanamayan hesapta araç durur.

## Doğrulama

Gerçek Firefox'ta sentetik sosyal medya formlarında dokuz platform biçimi, kişisel/şirket ayrımı, tek yazma, eski görüntü reddi; gerçek eklentide görev onayı, JPEG yakalama ve özel alanın piksel düzeyinde kapatılması test edilir. Yerel model protokolü görseli vision çağrısına ve sabit işlem şemasına aktarır. Panel testleri çok adımlı iki hesap görevi ve iptalden sonra gelen yanıtın çalıştırılmamasını denetler.

Bu testler kullanıcının gerçek sosyal hesaplarına, sağlayıcıların bütün güncel arayüzlerine veya kullanıcının GPU'sunda gerçek Qwen karar kalitesine erişildiği anlamına gelmez. Güncel dağıtım sonucu `deployment/cloudflare.json` ve ilgili GitHub Actions kaydında bulunur.
