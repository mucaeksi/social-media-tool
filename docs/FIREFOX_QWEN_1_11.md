# Firefox bağlantısı ve gerçek Qwen testi — 1.11

Bu değişiklikler son yayımlanan 1.10 sürümünün üzerine hazırlanmıştır. Kullanıcı bu yamayı mevcut GitHub Actions akışından yayımlamayı onayladı; doğrulanmış dağıtım sonucu deployment/cloudflare.json dosyasında tutulur. Yardımcı 1.11 ve eklenti 1.4 aynı güncellemede kullanılmalıdır; mevcut model dosyaları ve Firefox oturumları korunur.

## Taslaktan otomatik yayına geçiş

Taslaklar listesinde **Yayına hazırla**, stüdyoda **Kaydet ve yayına hazırla** kullanılır. Son içerik kaydedilip aynı taslak yayın ekranında seçilir. **Uygun tüm hesapları seç** hazır hedefleri işaretler; fotoğraf/metin veya bağlantı eksiği varsa o hedefte neden belirtilir. Yayın önizlemeleri oluşturulduktan sonra paylaşım onayı ve Firefox simgesindeki son toplu onay tamamlanmalıdır. Önceden kaydedilen önizlemeler **Bu taslağın bekleyen gönderilerini seç** ile yeniden seçilebilir; bu işlem yayın yapmaz. Ayrıntılar [otomatik yayın rehberinde](OTOMATIK_YAYIN.md).

Bir hedefin onayı hata verirse önce onaylanan hedefler artık sessizce kuyruk dışında kalmaz; yürütme listesinde korunur. Kalan hedefler eklenti popup'ında hata ve yeni onay bekler, ilk hedef tekrar yetkilendirilmez. Başlamış veya sonucu belirsiz gönderiler için otomatik tekrar kuralı değişmez.

## Hesap sekmelerini birlikte bağlama

1. Eklentili Firefox penceresinde paneli ve şirketin sosyal hesap/sayfa sekmelerini açık tutun. Hesap bağlantılarında her hedefin profil adresi kayıtlı olmalı.
2. AI asistanı → Ana Firefox bölümünde **Açık hesap sekmelerini topluca bağla** düğmesine basın. Aynı düğme Yayın takvimi → Pencereyi ve hesap sekmelerini bağla içinde de bulunur.
3. Araç çubuğundaki Sosyal Studio simgesini açın. Hesap başına sekme ve ekranda görünen şirket adı bir arada gösterilir. Profil adresi tam eşleşirse ya da o platformda yalnız bir hesap ve bir sekme varsa öneri seçilir. Birden fazla hesap belirsizse otomatik tahmin yapılmaz.
4. Adları kontrol edip **Seçili hesap sekmelerini birlikte bağla** düğmesine bir kez basın. Sekmesi bulunamayan hesap atlanabilir. Eksik sosyal ağ sekmesini açtıktan sonra toplu bağlantıyı tekrar çalıştırabilirsiniz; diğer hesap bağlantıları korunur.

Panel yaklaşık beş saniyede bir bağlantıyı ve sekmeleri yeniler; her hesap için paneli yeniden kontrol etmek gerekmez. Yayın takvimindeki bağlı hedefler de güncellenir. Bu bağlantı onayı kendi başına paylaşım başlatmaz. Organik yayın mevcut önizleme ve toplu yayın onayından yürür; reklam harcaması ve ödeme kapsam dışıdır.

## İstekle sekme bulma ve inceleme

**AI hangi sekmeye geçsin?** alanına “Instagram şirket sayfasını incele” gibi bir görev yazın:

- **AI ile sekmeye geç**: yalnız sekme başlıkları ve site adlarıyla mevcut sekmelerden birini seçer ve ona geçer.
- **Sekmeyi seç ve AI ile incele**: uygun sekmeyi seçer, bağlı şirket hesabının güncel görünür metnini okur ve Qwen ile değerlendirir. İnceleme yanıtı aynı kartta gösterilir; ilgili şirketin normal AI sohbet kaydına eklenir.

Sekme seçimi artık normal editör sohbetine bırakılmaz: sabit JSON şeması yalnız listedeki sekme kimliklerini veya `null` kabul eder. Belirsiz seçim sekmeyi değiştirmez. Bu işlem bir yerel üretim isteği, ardından inceleme yapılması ikinci bir istek kullanır. Başlıklar güvenilmeyen veridir; sayfadaki talimatlar çalıştırılmaz.

Kapsam, panelin bulunduğu Firefox penceresidir. Buradaki bütün sekmeler listelenip seçilebilir; içerik okuma ve forma hazırlama onaylanan sosyal/reklam hedefleriyle sınırlıdır. Başka pencereler, giriş/özel mesaj/parola ekranları ve `about:` içeriği okunmaz. Şirket web sitesi için mevcut kaynak araştırması akışı kullanılır. Rastgele kod, shell veya AI'ın uydurduğu düğme komutu çalıştırılmaz.

## Qwen'in gerçekten yanıt verdiğini kontrol etme

AI asistanı → Yerel AI bölümündeki **Model dosyası doğrulandı**, modelin kurulu ve özetinin onaylı olduğu anlamına gelir; gerçek yanıt testi değildir.

**Qwen'i gerçekten test et** dört adımı eşleştirilmiş bilgisayarda çalıştırır:

1. Model dosyası ve onaylı özet.
2. Gerçek metin üretimi: basit bir işlemin yanıtı.
3. Gönderi JSON biçimi: metin ve alanların mevcut gönderi doğrulamasından geçmesi.
4. Görsel: müşteriye ait olmayan sabit kırmızı test görselinin rengini tanıması.

Test arka planda sürer; her adımın süresi ve sonucu panelde görünür. **Qwen testini iptal et** işlemi durdurur. İlk başarısız adımda test durur; diğer adımlar başarılı gösterilmez. Test, mevcut günde 50/kullanıcı başına saatte 10 yerel istek sınırından bir istek kullanır; şirket taslağı veya sohbet kaydı oluşturmaz. Ön plan işi olarak gece araştırmasını bekletir.

GPU bellek ayıramama (`GPU_MEMORY`), 10 GiB hedefinin aşılması (`GPU_LIMIT`), süre aşımı (`TIMEOUT`), desteklenmeyen runtime biçimi (`RUNTIME_INCOMPATIBLE`), yarım kalan çıktı (`OUTPUT_LIMIT`) ve test yanıtının yanlış olması (`TEST_MISMATCH`) ayrı gösterilir. Son içerik üretiminin başarısız aşaması normal durum sorgularından sonra da raporda kalır. **Sorun raporunu kopyala**; test adımlarını, sürelerini, GPU ölçümünü ve son hata kodunu içerir. Ham model yanıtı, görsel, hesap adresi veya parola içermez.

Bu testler temel model işlevini gösterir; gerçek sosyal hesap girişi, platform arayüzü uyumluluğu, reklam sonucu veya tüm içeriklerin kalitesi için başarı kanıtı değildir. Kullanıcının bildirdiği önceki başarısız testin kesin nedeni, o denemenin hata metni/raporu olmadan belirlenmiş sayılmaz. Geliştirme ortamında kullanıcının Windows/GPU/model oturumuna erişim yoktur.
