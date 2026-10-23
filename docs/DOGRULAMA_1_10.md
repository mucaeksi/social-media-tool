# Sosyal Studio 1.10 doğrulaması

23 Ekim 2026. Geçici SQLite verileri, Miniflare D1/R2, yerel Chromium ve gerçek Firefox üzerinde yerel örnek sayfalar kullanıldı. Kullanıcının şirket verisi, Firefox oturumu, gerçek sosyal hesabı veya yerel model dosyası testlere dahil edilmedi.

| Kontrol | Sonuç |
| --- | --- |
| Birim/HTTP ve yayın politikası | 35 geçti |
| Worker/D1/R2 | 86 geçti |
| Dağıtım denetimleri | 29 geçti |
| Yerel Chromium | 14 geçti, 2 yalnız D1 senaryosu atlandı |
| R2 ile Chromium | 16 geçti |
| D1 görsel deposuyla Chromium | 16 geçti |
| Şifreli giriş ve yetki | 2 geçti |
| Bütün yardımcı testleri, tek süreç | 70 geçti, 5 Windows testi Linux'ta atlandı |
| TypeScript, Vite, yardımcı ve eklenti paketleri | Başarılı |
| Sabit beceriler | 5 beceri, 38 dosya SHA-256 doğrulaması başarılı |
| Kod grafı | Yerel AST ile güncellendi |
| Görsel inceleme | Masaüstü ve 390 piksel mobilde hedef seçimi ve önizleme; yatay taşma yok |
| Önceki güncelleyici | 1.9 kodu gerçek 1.10 kaynak ZIP'ini doğrulayarak açtı |

Toplam 268 test geçti, 7 test atlandı. Windows işi, yönetilen Firefox kurulumu ve aynı eklenti akışıyla birlikte dokuz platformun form testini ayrıca çalıştırır. Canlı dağıtım için GitHub Actions sonucu ve `deployment/cloudflare.json` içindeki kaynak commit esas alınır.

Yeni gerçek Firefox testi dokuz platformun farklı örnek gönderi formlarında JPEG aktarımı, doğru metin/başlık, etkin yazar, yeni gönderi bağlantısı ve tek yayın tıklamasını doğrular. Ayrıca yanlış hesap, kişisel gönderideki şirket bağlantısı önizlemesi, mevcut yazı, değişen metin/pano, tanınmayan formdaki Post düğmesi, reklam ekranı, dosya alanını önizlemeyle değiştiren form ve eski bağlantıyı başarı saymama denetlenir. Eklentinin kendisiyle ayrı test, popup onayından önce paylaşım yapılmadığını; onaydan sonra aynı pencerede fotoğraf/metin gönderilip yeni bağlantının kaydedildiğini ve tamamlanan işin yeniden gönderilmediğini doğrular.

D1 testleri yetki ve iş sahibi ayrımını, aynı anda tek yürütücüyü, executor eşleşmesini, profil değişimini, yinelenen içerik korumasını, yanlış hesap bağlantısıyla başarı raporu reddini, kesinti sonrası belirsiz durumunu ve eski cron'un eklenti işini ayrı Firefox'a taşımadığını kapsar. Yeni tarayıcı testi iki hedef için gerçek D1 önizlemesi oluşturur; site onayı yalnız eklentiye istek gönderir, kendiliğinden yayın durumuna geçmez.

İlk turda özet taslak listesinden tam gönderi alanlarına erişimin ekranı kapattığı hata bulundu; seçim üzerine tam taslak yükleme ve geç yanıtı yok sayma eklendi. Hesap metadata işlemleri, eklentiyle çalışırken uzak tarayıcı binding'i olmadan da kullanılabilir; yönetici ve şirket kuralları korunur. Aynı anda Firefox ile ağır görsel hazırlığı çalışırken eski arayüz testinde süre aşımı görüldü; son tam tarayıcı turu sırayla geçti. Testler sırasında derleme çıktısı değiştirilmedi.

Bu sonuçlar canlı sağlayıcıların tüm güncel DOM yapılarının, hesap yetkilerinin veya gerçek yayınların doğrulandığı anlamına gelmez. YouTube topluluk ve TikTok web fotoğraf özellikleri hesapta sunulmalıdır. Video, reklam, ödeme ve resmî OAuth/API yayınlama eklenmedi. İlk gerçek paylaşım kullanıcı tarafından bağlı hesapta ve sonuç bağlantısıyla kontrol edilmelidir. Kullanım: [otomatik yayın rehberi](OTOMATIK_YAYIN.md).

İlk GitHub Linux turu Chromium bağımlılık kurulumunda uzun süre ilerlemedi. Ubuntu 24.04 runner imajında Chrome/Chromium ve native Firefox zaten kurulu olduğundan CI, hazır arayüz tarayıcısını doğrulayıp `CHROMIUM_EXECUTABLE` üzerinden kullanır. Asıl yayın adaptörleri yine sabitlenmiş gerçek Mozilla Firefox ile test edilir; testler kaldırılmadı.
