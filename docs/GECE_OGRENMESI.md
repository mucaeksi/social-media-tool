# Gece araştırması ve yerel hafıza — 1.7

Bu özellik model ağırlıklarını eğitmez. Resmî sosyal platform rehberlerini ve şirket için onaylanmış, süresi geçmemiş kaynakları okur; yerel Qwen3.5 9B ile kaynak bağlantılı Türkçe çalışma notları çıkarır. İncelenmiş notlar sonraki yerel AI isteklerinde ikincil referans olur. Şirketin Cloudflare'deki doğrulanmış bilgileri esas olmaya devam eder. Gece işi sosyal hesaplara giriş yapmaz, paylaşım yapmaz ve açık kişisel sekmeleri kullanmaz.

## Kullanım

1. Yardımcı güncellendikten sonra panelde şirketinizi seçin, **AI asistanı → Yerel AI** ekranını açın. Bu şirketin gece planı ilk eşitlemede açılır. Önceden kapattığınız plan kendiliğinden yeniden açılmaz.
2. Bilgisayar ve yardımcı açık, internet bağlantısı kurulmuş olsun. Panel sekmesi açık kalmak zorunda değildir. Windows'un uykuya geçmesi sırasında iş çalışmaz; bilgisayarı kendiliğinden uyandırmaz.
3. Program KKTC'nin `Asia/Famagusta` saat diliminde 00.00 dahil, 07.00 hariç çalışır. Geç açılırsa kalan sürede devam eder, gündüz telafi yapmaz. 07.00'de aktif çalışma iptal edilir; bitmemiş özet kaydedilmez.
4. Sabah **Gece araştırması ve hafıza → Sabah incelemesi** bölümünde kaynakla birlikte notu inceleyin. **İnceledim, notu kullan** seçilmeden modelin yanıtlarına eklenmez. Onayınızı kaldırmak için **Notu reddet** kullanılır.

**Gece programını kapat** devam eden gece işini de durdurur. Ön planda içerik üretmek, modeli kurmak veya iptal istemek gece işini durdurup ön plan işlemine öncelik verir. Yardımcı kapanınca gece işi ve yardımcının kendi Ollama/model süreci kapanır.

## Kaynaklar ve sınırlar

Sabit resmî başlangıç adresleri `shared/night-learning.mjs` içindedir: Facebook Business Learn, Instagram Creators, Instagram/Threads Help, X Business, Pinterest Business, YouTube Help, TikTok Creator Portal, LinkedIn Help ve Tumblr Help. Sayfalar erişilebilir değilse, robot kuralları izin vermiyorsa, başka alan adına yönlendiriyorsa veya metin çıkarılamıyorsa başarısız deneme olarak görünür. Bu adreslerin tamamının canlı olarak okunabildiği veya platform hesaplarına erişildiği iddia edilmez. Giriş engeli aşılmaz.

Şirket kaynakları yalnız yöneticinin onayladığı ve geçerliliği devam eden D1 araştırma kayıtlarından alınır; model yeni adres seçemez. Liste panelde bu ekran açılınca veya **Onaylı kaynak listesini yenile** ile yenilenir. Listede olmayan şirketler programlanmaz. Son eşitleme yedi günü geçerse yeni araştırma durur; güncel izinleri almak için ekranı yeniden açın. Kaynak kaldırılırsa sonraki eşitlemede o kaynağın yerel notları da bağlam dışında kalır.

Tüm şirketler için gecede toplam 20 kaynak denemesi, şirket başına en fazla 11 onaylı şirket adresi ve 9 sabit resmî rehber vardır. Aynı sayfa aynı gece yeniden denenmez; başarısız veya kapanışta yarım kalan deneme de kotadan düşer. Kota SQLite'a istekten önce yazılır; yardımcıyı yeniden açmak kotayı sıfırlamaz. Şirketler sırayla ele alınır. Bu, yedi saat kesintisiz GPU işlemi vaadi değildir; sınır dolunca çalışma biter.

Metin değişmemişse tekrar model özeti üretilmez. Değişen sayfanın eski not onayı kaldırılır; yeni not yeniden inceleme bekler. Şirket başına en fazla 100 not tutulur; notun geçerliliği en fazla 14 gün ve şirket kaynağının geçerlilik tarihi kadardır. Son 30 günün sınırlı deneme kayıtları tutulur. Model bağlamına seçili şirketin en yeni en fazla iki incelenmiş notunun kısa bölümü eklenir. Notlar şirket gerçeklerini, sistem kurallarını veya platform sınırlarını değiştiremez.

Yarım kalan içerik üretimine devam ederken kullanılan gece notları değişmişse yeni üretim istenir. Önceki platform metinleri korunur; yeni bağlamla sessizce karıştırılmaz.

Veriler BAT yanındaki `ai/knowledge.sqlite` içinde, mevcut 256 MiB üst sınırla tutulur. Yeni bulut AI çağrısı, abonelik veya model eğitimi hizmeti kullanılmaz. İnternet, elektrik ve yerel GPU çalışması devam eder. Gerçek not kalitesi kullanıcı bilgisayarında kontrol edilmelidir.

## Doğrulama

Sentetik testler yaz/kış saatlerini, 07.00 sınırını, kalıcı ortak kotayı, iptali, kaynak değişimini, onay ve şirket ayrımını denetler. Bulut testi şirket kaynağı listesinin istemci URL'lerinden değil güncel onaylı D1 kayıtlarından kurulduğunu ve yönetici yetkisini kontrol eder. Bunlar gerçek sosyal platform metninin doğruluğu veya GPU'da gece boyunca çalışma testi değildir.
