# Aynı Firefox penceresinde otomatik yayın · 1.11

**1.11 güncellemesi:** Taslaklar listesindeki **Yayına hazırla** ve stüdyodaki **Kaydet ve yayına hazırla** düğmeleri seçili taslağı doğrudan yayın ekranına taşır. **Uygun tüm hesapları seç** kullanılabilir; fotoğraf/metin/sekme eksiği varsa hedefin yanında açıkça yazılır. Önceden oluşturulmuş kayıtlar için **Bu taslağın bekleyen gönderilerini seç** kullanılır. Dağıtım sonucu deployment/cloudflare.json dosyasından doğrulanır.

Bu yama mevcut Sosyal Studio, şirketler, taslaklar, Firefox girişleri ve yerel model üzerinde çalışır. Yardımcı 1.11, eklenti 1.4 sürümünü mevcut yönetilen Firefox'a taşır. Model yeniden indirilmez; sosyal oturumlar ve kişisel Firefox profili silinmez. Yeni ücretli API veya reklam harcaması yoktur.

## İlk hazırlık

1. Açık eski eklenti bağlantılarını kesip yardımcının güncellenmesini tamamlayın. Gerekiyorsa yönetilen Firefox'u normal şekilde kapatıp yeniden açın. Klasör, profil veya model dosyası silmeyin. Eklenti bağlantıları açıkken otomatik eklenti yenilemesi bekleyebilir.
2. Siteyi yönetici hesabınızla açın. Şirkete ait bütün sosyal hesapları ve sayfaları **aynı Firefox penceresinde**, ayrı sekmelerde açık bırakın. Giriş ve iki aşamalı doğrulamayı normal Firefox ekranında kendiniz tamamlayın.
3. **Hesap bağlantıları** ekranında her hesap ve sayfa için ayrı kayıt ve gerçek profil adresi olmalı. LinkedIn hedefi `/company/…` şirket sayfasıdır. Bir şirkette en fazla 25 kayıt, tek toplu onayda en fazla 20 hedef kullanılabilir.
4. **Hesap bağlantıları** veya **Yayın takvimi → Firefox'ta toplu otomatik yayın** ekranında **Açık hesap sekmelerini topluca bağla** düğmesine basın. Firefox araç çubuğundaki Sosyal Studio simgesinden sekmeleri birlikte onaylayın. Tam hedef adını kontrol edin. Yeni hedef eklemek önceki bağlantıları kaldırmaz. Reklam paneli bağlantıları organik yayın hedefi sayılmaz.
5. Doğru hesabın gönderi oluşturma ekranı ve hesap seçicisi tanınabilir olmalı. Tanınmayan arayüzde araç rastgele düğmeye basmaz: ilgili sekmede boş bir gönderi formu açıp yeni önizleme hazırlayın. Mevcut yazı ve dosyaların üzerine yazılmaz.

**Giriş açık ama hesap hazır görünmüyorsa:** Hesabın yanında bağlantı nedeni yazılır. Eklenti onayı bu panel sekmesi için verilir; Firefox yeniden başladığında veya site yeni sekmede açıldığında toplu bağlantı onayını yenileyin. **Firefox sekmesi bağlı** yazdığı halde seçim kapalıysa altındaki taslak/metin/fotoğraf eksiğini tamamlayın. Ayrı yardımcı profilinin giriş gözlemi bu bağlantıyı belirlemez. [Ayrıntılı bağlantı yardımı](FIREFOX_QWEN_1_11.md#firefoxta-giriş-açık-panel-bağlı-göstermiyorsa).

## Gönderimi başlatma

Önce fotoğrafları ve platformlara özel metinleri kaydedilmiş bir taslakta hazırlayın. **Yayın penceresini kontrol et** ile eklenti sürümünü ve bağlı hedefleri alın. Taslağı, hedef hesapları ve varsa KKTC yerel tarih/saatini seçin. Boş zaman alanı, eklenti onayından sonra hemen başlatır.

**Seçili hesapların yayın önizlemelerini oluştur** her hedef için ayrı ve sabit bir iş kaydeder. Hedef adresini, metni, başlığı ve gerçek platform görsellerini kontrol edin. Bir platformda hata olursa daha önce oluşturulmuş önizlemeler korunur; oluşturulmamış hedefin başarılı olduğu söylenmez.

İlgili önizlemeleri seçin, paylaşım onay kutusunu işaretleyin ve **Seçili gönderileri eklenti onayına gönder** deyin. Firefox araç çubuğundaki Sosyal Studio simgesinde hedefleri ve metinleri tekrar inceleyip **Bu hesaplarda otomatik yayını onayla** düğmesine basın. Bu onay gerçek paylaşımı yetkilendirir. Onaysız işler taslak olarak kalır.

**Taslakta kalıyorsa:** AI ekranındaki **Taslağı ana Firefox'ta onaya gönder** yalnız açık forma metin yerleştiren ayrı bir işlemdir. Otomatik gönderim için yukarıdaki **Yayın takvimi** akışını kullanın. “Henüz gönderime iletilmedi” aşamasında işaretli önizleme ve paylaşım onayı gerekir; “Yayın isteği eklentiye ulaştı” aşamasında Firefox simgesindeki son onay gerekir. Panelin yalnız içerikleri kaydetmesi yayın onayı değildir.

1.11 güncellemesinde toplu onayın bir hedefinde hata olursa önce onaylanan hedefler yürütme listesinde korunur ve diğer hedeflerin onayına devam edilir. Başarısız hedefler eklenti onay ekranında hata ayrıntısıyla kalır; yeniden onay yalnız kalan hedefleri işler. İlk onaylı hedef tekrar yetkilendirilmez. Bu düzeltme gerçek hesaplardaki önceki bir denemenin nedeninin tespit edildiği anlamına gelmez.

Eklenti, onaylı işleri sırayla yürütür: şirket/yönetici/pencere/hedef kontrolü, güncel kaynak kontrolü, fotoğraf yükleme ve metin hazırlama, tekrar hesap/içerik denetimi, tek yayın tıklaması ve yeni gönderi bağlantısı denetimi. Aynı iş başka panel veya yeniden başlatma üzerinden tekrar gönderilmez. Yeni bağlantının yanında doğru yazar ve gönderi metni de görünmelidir. Eski bir gönderi bağlantısı veya yalnızca formun kapanması başarı sayılmaz.

## Platform biçimleri

| Platform | Bu akışta kullanılan biçim | Fotoğraf sınırı |
| --- | --- | --- |
| Facebook | Sayfa gönderisi | 10 |
| Instagram | Fotoğraf/görsel dizisi | 10 |
| X | Metin ve fotoğraflar | 4 |
| Threads | Metin ve fotoğraflar | 10 |
| Pinterest | Fotoğraflı Pin; pano kullanıcı tarafından seçilir | 1 |
| LinkedIn | Şirket sayfası gönderisi | 10 |
| YouTube | Hesaba açık olan topluluk gönderisi | 10 |
| TikTok | Hesabın web arayüzünde sunulan fotoğraf gönderisi | 10 |
| Tumblr | Blog gönderisi ve fotoğraflar | 10 |

Sınırlar bu adaptörün sınırlarıdır; sağlayıcının bütün biçimlerini desteklediği anlamına gelmez. Platform metin sınırları ayrıca kontrol edilir. Her aktarılan platform JPEG'i en fazla 600 KB'dır. YouTube kanalında topluluk paylaşımı veya TikTok web hesabında fotoğraf yükleme sunulmuyorsa o hedef durur. Video yükleme, video üretimi, Story/Reels/Shorts dönüşümü ve otomatik pano/kanal seçimi bu yamada yoktur. Fotoğraf video gibi yüklenmez.

Pinterest kaydına hesabın profil adresini girin; panoyu native oluşturma formunda seçin. Hazırlık tamamlandıktan sonra pano değişirse gönderim durur.

Hesap seçicisi veya platform formu doğrulanamıyorsa ilgili boş formu açık bırakın. Platform arayüzleri değişebilir; bir sağlayıcının yalnız adı listede bulunduğu için gerçek hesabında yayınlandığı iddia edilmez.

## İzleme, zamanlama ve kesinti

**Yayın takvimi** her hedefin durumunu ayrı gösterir:

- **Önizleme:** Eklenti onayı bekler; yayın yapılmaz.
- **Onaylı:** Zamanını ve sırasını bekler.
- **Hazırlanıyor:** Metin ve fotoğraflar işlenir.
- **Gönderiliyor:** Gönderim sınırı geçilmiştir; tekrar gönderilmez.
- **Gönderi bağlantısı doğrulandı:** Eklenti yeni bağlantı, yazar ve metin kanıtını kaydetmiştir. Bağlantıyı açıp kontrol edebilirsiniz.
- **Gönderim başlatılmadı:** Hesap, form, görsel veya kaynak denetimi geçmedi. Ayrıntı görünür. Sorunu giderip yeni önizleme oluşturabilirsiniz.
- **Sonuç belirsiz:** Tıklama gerçekleşmiş olabilir. Hesabın gerçek gönderilerini kontrol edin; otomatik tekrar yoktur.
- **Zamanı geçti / iptal:** Yayın yapılmaz.

Şirket başına eski ve yeni akışın toplam 100 iş sınırı vardır. Sonuçlanmış işler için **İş kaydını sil** yalnız panel kaydını kaldırır; sosyal medyadaki gönderiyi silmez. Sonucu belirsiz veya gönderimi süren iş bu yoldan silinemez.

Zamanlı yayında bilgisayar uyanık, ilgili site aynı şirket ve yöneticiyle açık, hesap sekmeleri aynı onaylı pencerede kalmalıdır. Önceden onaylı işler aynı pencere içinde sırayla yürür. İş 15 dakikadan fazla gecikirse sonradan kendiliğinden gönderilmez. Tarayıcı/eklenti yeniden başlatıldığında eski sekme izinleri otomatik taşınmaz; gönderime başlamamış işler için tekrar bağlantı ve eklenti onayı gerekir. Başlamış/kesilmiş iş otomatik sürdürülmez; beş dakika içinde belirsiz olarak işaretlenir.

Gönderim başlamadan hedefi iptal edebilirsiniz. Gönderim başladıktan sonra iptal düğmesi daha önce yapılmış tıklamayı geri alamaz. Şirket, yönetici, hesap adresi, metin, görsel veya onaylı şirket kaynağı değişirse ilgili adım durdurulur. Kaynakların süresi gönderimden hemen önce de denetlenir.

Bu kuyruk yalnız eklentinin bağlı olduğu pencereyi kullanır. Ayrı oturum kullanan eski Facebook pilotu ekranda ayrıca korunur; eklenti işleri o pilotun tarayıcısına aktarılmaz. Reklam bütçesi, ödeme, reklam yayınlama ve kampanya açma/kapatma bu akışın dışındadır.

## Doğrulamanın sınırı

Otomasyon, gerçek Firefox üzerinde yerel örnek formlarla test edilir. Bunlar gerçek sosyal hesaba giriş, hesap uygunluğu, sağlayıcı arayüzlerinin tamamı veya canlı paylaşım başarısı değildir. İlk gerçek gönderimde durumları ve sonuç bağlantılarını takip edin; doğrulanmamış hedef için başarılı yayını varsaymayın.
