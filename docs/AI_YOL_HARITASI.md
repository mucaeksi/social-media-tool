# Sosyal medya uzmanı AI

Kullanıcı 19 Ekim 2026'da **Cloudflare üzerinde entegre sosyal medya AI'ı** seçti. Görsel + kısa özet iş akışında önce `@cf/google/gemma-4-26b-a4b-it` görseli okur; `@cf/qwen/qwen3-30b-a3b-fp8` bu gözlemi, özeti ve şirket hafızasını kullanarak ayrı platform içerikleri hazırlar. Llama 3.2 ayrı hesap/lisans kabulü istediğinden (5016) kullanılmaz. İki model de Cloudflare Workers AI üzerindedir; kod GitHub'da, hafıza/sohbetler D1'de, görsel özel R2 veya D1 deposundadır. OpenAI anahtarı ve ChatGPT üyeliği gerekmez. Manuel ChatGPT aktarımı da korunur.

## Kullanım ve şirket hafızası

1. Şirketi seçip **AI asistanı** ekranını açın.
2. Yönetici, **Şirket hafızası** alanına ürün/hizmet gerçekleri, marka kuralları ve onaylı gönderi örnekleri ekler; düzenleyebilir veya silebilir. Şirket başına en fazla 30 kayıt; içeriklerin toplamı 8.000, tek içerik 2.000 karakterdir. Şifre ve erişim belirteci eklemeyin.
3. **Danış / fikir üret** ile fikir, haftalık plan, doğal anahtar kelime ve anlatım önerileri isteyin. Seçili şirket profili/hafızası ve sizin o şirketteki son en fazla dört konuşmanız kullanılır. Girdi sınırına sığmayan eski konuşmalar önce çıkarılır.
4. Varsayılan **Platformlara içerik hazırla** akışında sekiz platform seçilidir. **Fotoğraf seç** ile görsel yükleyip kısa özeti yazın. JPEG/PNG/WebP en fazla 15 MB kabul edilir; tarayıcı mevcut görsel işlem hattıyla kaynak ve platform varyantlarını hazırlar. Görsel modeli, veritabanından şirketi doğrulanmış özel kaynak JPEG'i okur; kullanıcıdan analiz metni veya genel URL kabul edilmez. Sadece metinle de devam edebilirsiniz. Her seçili platform için ayrı başlık, metin, etiket ve gözleme dayalı görsel açıklaması hazırlanır. Hatalı/eksik/tekrarlanan platform verisi ve farklı platformlara kopyalanmış aynı açıklama reddedilir; metnin büyük/küçük harf veya boşluk farkı bunu aşmaz. İçerik isteğinde başlık 70, açıklama 400 (X etiketlerle 280), alternatif metin 160 karakter hedefi verilir. Görsel modeli başarısızsa görsel okunmuş gibi üretime devam edilmez.
5. **Stüdyoya aktar**, şirketi ve görsel ilişkisini yeniden kontrol eder; metinler ve aynı görsel birlikte yeni hazırlığa taşınır. Eski stüdyo taslağı bu onaydan önce değiştirilmez. Kaydedilmemiş içerik varsa onay istenir. Bilgileri, karakter uyarılarını, görseldeki yazıları ve etiketleri kontrol edip taslağı kaydedin. Bu işlem paylaşmaz. Platform kartları henüz etkin olmayan yayın bağlantısını açıkça belirtir.
6. **Örnek olarak düzenle** yanıtı hafıza formuna getirir. Doğrulayıp **Hafızaya ekle** dediğinizde onaylı örnek olur. 2.000 karakteri aşan yanıtta eklenecek bölümü kendiniz seçin; içerik sessizce kesilmez.

Hafıza her istekte referans olarak verilir; **modelin ağırlıkları eğitilmez**. Yanlış yanıtı düzeltmek için doğru bilgiyi veya onaylı örneği hafızaya ekleyebilirsiniz. Her konuşma otomatik marka kuralına dönüşmez. Gerçek ince ayar/LoRA eğitimi uygulanmadı. Cloudflare'in LoRA çalıştırma desteği eğitim hesaplaması sağlandığı anlamına gelmez; ayrıca uygun model, veri kümesi ve eğitim altyapısı gerekir. Vectorize veya ücretli eğitim hizmeti açılmadı.

Sosyal medya uzmanı çalışma rehberi `shared/social-expert.mjs` içinde sürümlenir (`gorsel-ozet-v1`). Kurulu sosyal medya becerisinden alınan editör ilkeleri; görsel–özet uyumu, marka tutarlılığı, platforma ayrı anlatım, doğal anahtar kelimeler, ölçülü etiketler, alternatif metin, kaynak doğruluğu ve yayın başarısını doğrulama kurallarını içerir. Algoritma/SEO başarısı veya uydurma trend verisi vaat edilmez.

## Ücretsiz kullanım

Cloudflare resmi kotası günlük **10.000 Neuron**. Bu bir işlem ölçüsüdür; sabit mesaj sayısı değildir. Workers Free üzerinde kota aşılınca hizmet hata verir; ücretli kullanım için plan değişikliği gerekir. Uygulama plan değiştirmez, ücretli model veya AI Gateway kredisi kullanmaz. Dağıtımda Workers/AI abonelikleri okunur; etkin ücretli, deneme veya ücreti belirsiz Workers/AI aboneliğinde dağıtım durur. Ücretli Workers aboneliği yoksa varsayılan Free kullanılır.

Uygulama tüm şirketler için ortak **9.000 Neuron/gün** güvenli bütçe kullanır. Her istek model çağrısından önce atomik D1 işlemiyle ayrılır; eşzamanlı çağrılar sınırı aşamaz. Kullanıcı başına saatte en fazla 20 istek vardır.

Panel sayacı gerçek tüketim ölçümü değildir. UTF-8 girdi boyutu, mesaj çerçevesi payı ve azami çıktı token'ı üzerinden, incelenen model fiyatının iki katı payla hesaplanan üst sınırdır. Başarıda da hatada da geri verilmez; sağlayıcının tam tüketimi bilinmez. Bu yüzden ücretsiz kotanın tamamından önce uygulama durabilir. İçerik hazırlamada hatalı JSON veya kopya açıklama için en fazla bir düzeltme çağrısı yapılır. İkinci metin çağrısının 26.000 bayt girdi ve azami çıktı bütçesi ilk çağrıdan önce ayrılır; kullanılmasa da geri verilmez. Düzeltme önceki çıktıyı ve doğrulama hatasını kullanır; girdiye sığmazsa kaynak kırpılmaz ve çağrı yapılmaz. Sağlayıcı, görsel veya kesilmiş metin hatasında otomatik tekrar yoktur. Yalnızca tüm kontrolleri geçen son sonuç kaydedilir. Danışma en fazla 2.048, içerik yanıtı 4.096 çıktı token'ıdır; iç düşünce de bu bütçeyi tüketebilir. Girdi sınırı 26.000 bayttır. Kesilmiş yanıt ve iç düşünce gösterilmez.

Görsel varsa iki modelin toplam bütçesi **ilk model çağrısından önce tek rezervasyonda** ayrılır. Görsel modeli için 32.768 görsel token'ı, metin/çerçeve payı ve 768 çıktı token'ı, incelenen 9.091/27.273 Neuron/milyon token fiyatının iki katı payla ayrılır. Görselin kenar/boyut sınırları için 32K pay bilinçli olarak geniş tutulur; Gemma'nın iç düşünce üretimi kapatılır. Metin modeline eklenecek gözlem için ayrıca 6.000 bayt üst sınır ayrılır. Kaynak JPEG en fazla 4 MB ve uzun kenarı 2.560 pikseldir. Görsel okuma R2 Class B sayacını kullanır; sosyal tarayıcı süresini tüketmez. Aynı görsel tekrar gönderilirse tekrar incelenir ve bütçe ayrılır.

Sayaç UTC gün başında, Türkiye saatiyle **03.00**'te yenilenir. Önceki iki dakika yeni istek başlatılmaz. Dağıtım veya sohbet temizleme bütçeyi sıfırlamaz. Bu bütçe yalnızca uygulama çağrılarını kapsar; hesaptaki diğer AI uygulamaları da sağlayıcı kotasını tüketebilir. Hesap planı dışarıdan değiştirilirse yeniden kontrol gerekir. R2, Zero Trust ve uzak tarayıcı sınırları ayrıca korunur.

## Veri ve yetkiler

- Ortak hafıza şirket kimliğiyle; sohbet **şirket + kullanıcı** kimliğiyle sorgulanır. Yetkili çalışma alanı kullanıcıları hafızayı okuyabilir, yalnızca yönetici değiştirebilir. Şirket bazında kullanıcı yetkisi henüz yoktur.
- Kullanıcı ve şirket başına son 20 soru/yanıt saklanır. **Yeni sohbet başlat** kendi seçili şirket geçmişinizi siler; ortak hafıza korunur. Şirket silinince hafıza ve sohbetleri D1 ilişkileriyle silinir.
- Saatlik sınır için kullanıcı kimliği, zaman ve rezervasyon miktarı içeren ayrı kayıtlar yaklaşık 24 saat tutulur; soru/yanıt içermez. Temizlik sonraki AI isteğinde yapılır.
- Modele yalnızca şirketin içerik alanları, ilgili hafıza ve gerekli konuşma verilir. Sosyal çerezler, oturum anahtarları ve giriş şifreleri gönderilmez. Modelin SQL, yayınlama veya dosya aracı yoktur.
- Görsel, şirket ilişkisi doğrulandıktan sonra özel depodan alınır ve görsel modeline bellek içinde veri olarak verilir. Genel erişim URL'si açılmaz. Sohbette görsel kimliği/gözlemi saklanır; base64 görsel loglara veya Git'e yazılmaz. Görsel silinirse sohbetin görsel bağı boşaltılır.
- Yanıtlar metin halinde gösterilir; HTML çalıştırılmaz. Yapılandırılmış gönderiler sunucuda şema/platform listesiyle doğrulanır. Yayınlama ayrı yetki ve doğrulama gerektirir.

## Sınırlar ve doğrulama

Asistan görsel + özetten Türkçe içerik ve strateji yardımı içindir. Görsel tanıma rötuş değildir; boyutlandırma mevcut tarayıcı işlem hattından gelir. Canlı internet, güncel trend, hesap analitiği, SEO/erişim garantisi, video üretimi, otomatik paylaşım veya zamanlama yapmaz. Fiyat/kampanya bilgisi uydurulmamalı; çıktılar incelenmelidir. Otomatik paylaşım için ayrıca gerçek yayın bağlantıları gerekir. Meta uygulaması/izinleri henüz yok; X resmi API ücretli ve TikTok şirket içi Direct Post koşulları bu kullanım için uygun değildir. [Platform koşulları](PLATFORM_BAGLANTILARI.md), [Meta hazırlığı](META_KURULUM.md).

Yerelde AI binding eklenmez ve gerçek model çağrılmaz. D1/model taklitli testler şirket ayrımını, yönetici yetkisini, hatalı yanıtı ve atomik sınırları denetler. Tarayıcı testleri hafıza, aktarım ve şirket değişirken geciken yanıtı denetler. Dağıtım kontrolü binding/bütçeyi model çağırmadan doğrular.

Gerçek model kontrolü `.github/workflows/ai-check.yml` ile açıkça çalıştırılır: geçici kullanıcı/şirket, kurgu bilgi ve sentetik kupa görseliyle şirket hafızasını, gerçek görsel tanımayı, sekiz ayrı platform anlatımını ve görselin korunmasını denetler. Deneme verileri silinir; güvenli sonuç bayrakları `deployment/ai-check.json` dosyasına yazılır. Bu kontrol geçmeden görsel modelinin canlıda doğrulandığı söylenmez. Sosyal gönderi paylaşılmaz.

## Resmi kaynaklar

- [Fiyatlandırma ve ücretsiz kota](https://developers.cloudflare.com/workers-ai/platform/pricing/): resmi kaynak sürümü `8b0bdc299319a7819c5bdad9881532ccc1b8d519` (15 Ekim 2026).
- [AI binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Qwen3 model şeması](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/qwen3-30b-a3b-fp8.json)
- [JSON yanıt modu](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [LoRA ile ince ayarlı model çalıştırma](https://developers.cloudflare.com/workers-ai/features/fine-tunes/)

- [Gemma 4 görsel model şeması](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/gemma-4-26b-a4b-it.json)
- [Workers AI hata kodları](https://developers.cloudflare.com/workers-ai/platform/errors/)
