# Qwen ile yayın hazırlığını birleştirme · 1.13

Yardımcı 1.13.0, mevcut Firefox eklentisi 1.5.0 ile çalışır. Qwen3.5:9b, hesap girişleri, eşleştirme ve taşınabilir veriler korunur. Devam eden işi bitirip yönetilen Firefox'u/yardımcıyı kapatın; aynı **Baslat.cmd** ile yeniden başlatın ve siteyi **Ctrl+F5** ile yenileyin. Model yeniden indirilmez.

## Tek hazırlık akışı

1. Stüdyoda tek kaynak görseli ve yazıyı ekleyip **Kaydet ve yayına hazırla** düğmesine basın. Kaydedilmiş taslağı Yayın takvimi'nden de seçebilirsiniz.
2. Şirket hesaplarını aynı eklentili Firefox penceresinde topluca bağlayın.
3. **Qwen ile tüm hesaplara hazırla** bölümünde hedefleri kontrol edin. Başlangıçta bağlı hesaplar seçilir; platform metni eksik olması bu seçimi engellemez. İsterseniz üstte yayın zamanı belirleyin; boşsa son onaydan sonra başlar.
4. **Qwen ile hazırla ve eklenti onayına gönder** düğmesine basın. Qwen kaynak görseli inceler; seçili platformlar için ayrı metin, etiket, başlık ve görsel alternatif metni hazırlar. Onaylı KKTC şirket bilgileri, marka tonu ve geçerli incelenmiş gece notları bağlamdır.
5. Sonuç ayrı bir **Qwen hazırlığı** taslağına kaydedilir. Asıl taslak değişmez ve seçili kalır; böylece yeniden deneme aynı hazırlığı kullanır. Hazırlık kopyası taslak seçicisinde ve Taslaklar ekranında bulunur.
6. Hedefler için yayın önizlemeleri otomatik oluşturulur ve eklentiye iletilir. Firefox araç çubuğundaki Sosyal Studio simgesinden **bütün hesap/fotoğraf/metin/zamanı inceleyip son toplu yayın onayını verin**. Onaydan sonra mevcut kuyruk sırayla yayınlar; sonuç ve doğrulanan bağlantılar Yayın takvimi'ndedir.

Bir platformun arayüzü veya etkin hesap kanıtı uygun değilse mevcut yayıncı o hedefi durdurur. Açık sekme veya Qwen metni, başarılı yayın kanıtı değildir. YouTube fotoğraflı topluluk gönderisi ve TikTok fotoğraf gönderisi hesapta sunulmalıdır. Reklam yayını/harcaması, video veya görsel rötuşu yapılmaz. Görseller mevcut contain/cover ve platform boyutlarıyla hazırlanır.

## Tekrar, iptal ve sınırlar

Aynı sekmede aynı kaynak sürümü ve aynı hedeflerle yeniden deneme 24 saat boyunca aynı hazırlık kimliğini kullanır; sekme belleğinde yalnız kimlik, hedef kimlikleri ve zaman vardır. Sunucudaki mevcut local_ai_jobs kaydı kalıcı makbuzdur; yeni tablo yoktur. Tamamlanmış üretim ve önizlemeler tekrar kullanılabilir. Yarım üretim, bağlam değişmemişse kalan platformlardan devam eder. Kaynak taslağın sürümü veya onaylı kanıtı değişirse işlem durur. Asıl ve üretim kaynakları birlikte korunur; 6 bilgi/2 ürün sınırı aşılırsa açık hata verilir. Sekme belleği ilk hazırlıkta kullanılamıyorsa tekrar güvenliği için işlem başlatılmaz. Yeni hazırlık kimliği yalnız bilinçli yeni çalışma için kullanılmalı; eski sonuçlar önce kontrol edilmelidir.

**Hazırlığı durdur** yalnız o işin ilgili üretim denemesine (jobId + attemptId) iptal isteği gönderir; geç yanıt yayın önizlemesi veya eklenti isteği başlatmaz. İptal sunucu iş kaydı oluşmadan veya bağlantı hatası sırasında verilirse yerel model isteği tamamlanabilir; panel yine yeni önizleme/yayın adımlarına geçmez. Daha önce kaydedilmiş taslak/önizlemeler korunur; otomatik silinmez. Sayfadan ayrılmak sonraki adımları keser. Henüz onaylanmamış hazırlık, paylaşım başlatmaz. Verilmiş son yayın onayını iptal etmek için ilgili işin mevcut iptal düğmesini kullanın.

Bu birleşik akış tek kaynak görsel veya yalnız metin içindir; çok görselli ve farklı platformlara ayrı kaynak fotoğraf atanmış taslaklar mevcut manuel önizleme akışında kalır. Tek görevde en fazla 20 hesap ve 9 platform, mevcut 6.000 karakter özet, 600 KB görsel, 16K model bağlamı, 50 üretim/gün ve 10 istek/kullanıcı/saat sınırları korunur. Önizleme oluştuktan sonra son eklenti onayı gerekir; hazırlık sessizce yayın izni vermez.

## Uzman rehberi ve doğrulama

ECC content-engine, brand-voice ve crosspost yöntemleri kısa Türkçe uzman rehberine uyarlandı. Onaylı marka tonu, somut tek fayda, platforma özgü yapı, tekrarsız etiketler, kaynak dışı fiyat/teslimat/başarı iddialarından kaçınma ve fotoğraflı format ayrımı kullanılır. Gönderi üretiminde sabit JSON şeması uygulanır; bozuk biçim, sınır aşımı, yinelenen etiket ve aynı platform metinleri kabul edilmez; mevcut sınırlı düzeltme denemesi korunur.

Sunucu testleri gerçek D1 ve sahte yardımcıyla şirket/yönetici kapsamını, asıl taslağın korunmasını, eşzamanlı tekrarı, kısmi devamı ve değişmiş kaynağı sınar. Arayüz testi eksik platform metinlerini, kısmi önizleme hatasından tekrarı, eklentiye aktarımı, mobil görünümü ve iptalden sonraki geç yanıtı denetler. Bunlar kullanıcının GPU'sunda gerçek Qwen kalitesini veya bütün canlı sosyal arayüzlerde yayın başarısını kanıtlamaz. Güncel canlı dağıtım kaydı deployment/cloudflare.json içindedir.
