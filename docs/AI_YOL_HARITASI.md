# Sosyal medya uzmanı AI

Kullanıcı 19 Ekim 2026'da **Cloudflare üzerinde entegre sosyal medya AI'ı** seçti. Workers AI binding'i üzerinden `@cf/qwen/qwen3-30b-a3b-fp8` modeli kullanılır. Bu ChatGPT üyeliği veya cihazda çalışan yerel model değildir. Kod GitHub'da, model Cloudflare Workers AI üzerinde, şirket hafızası ve sohbetler D1'dedir. OpenAI anahtarı gerekmez. Manuel ChatGPT talimatı/JSON aktarımı alternatif olarak korunur.

## Kullanım ve şirket hafızası

1. Şirketi seçip **AI asistanı** ekranını açın.
2. Yönetici, **Şirket hafızası** alanına ürün/hizmet gerçekleri, marka kuralları ve onaylı gönderi örnekleri ekler; düzenleyebilir veya silebilir. Şirket başına en fazla 30 kayıt; içeriklerin toplamı 8.000, tek içerik 2.000 karakterdir. Şifre ve erişim belirteci eklemeyin.
3. **Danış / fikir üret** ile fikir, haftalık plan, doğal anahtar kelime ve anlatım önerileri isteyin. Seçili şirket profili/hafızası ve sizin o şirketteki son en fazla dört konuşmanız kullanılır. Girdi sınırına sığmayan eski konuşmalar önce çıkarılır.
4. **Platformlara içerik hazırla** seçeneğinde hedef platformları işaretleyip doğrulanmış kaynak bilgileri yazın. Her seçili platform için başlık, metin ve etiket hazırlanır. Hatalı, eksik veya tekrarlanan platform çıktısı reddedilir; mevcut stüdyo içeriği korunur.
5. **Stüdyoya aktar**, şirketi yeniden kontrol ederek yeni gönderi hazırlığı açar. Kaydedilmemiş stüdyo içeriği varsa onay istenir. AI görsel görmez; yeni hazırlığa görseli ayrıca ekleyin. Bilgileri, karakter uyarılarını ve etiketleri kontrol edip taslağı kaydedin. Bu işlem paylaşmaz.
6. **Örnek olarak düzenle** yanıtı hafıza formuna getirir. Doğrulayıp **Hafızaya ekle** dediğinizde onaylı örnek olur. 2.000 karakteri aşan yanıtta eklenecek bölümü kendiniz seçin; içerik sessizce kesilmez.

Hafıza her istekte referans olarak verilir; **modelin ağırlıkları eğitilmez**. Yanlış yanıtı düzeltmek için doğru bilgiyi veya onaylı örneği hafızaya ekleyebilirsiniz. Her konuşma otomatik marka kuralına dönüşmez. Gerçek ince ayar/LoRA eğitimi uygulanmadı. Cloudflare'in LoRA çalıştırma desteği eğitim hesaplaması sağlandığı anlamına gelmez; ayrıca uygun model, veri kümesi ve eğitim altyapısı gerekir. Vectorize veya ücretli eğitim hizmeti açılmadı.

## Ücretsiz kullanım

Cloudflare resmi kotası günlük **10.000 Neuron**. Bu bir işlem ölçüsüdür; sabit mesaj sayısı değildir. Workers Free üzerinde kota aşılınca hizmet hata verir; ücretli kullanım için plan değişikliği gerekir. Uygulama plan değiştirmez, ücretli model veya AI Gateway kredisi kullanmaz. Dağıtımda Workers/AI abonelikleri okunur; etkin ücretli, deneme veya ücreti belirsiz Workers/AI aboneliğinde dağıtım durur. Ücretli Workers aboneliği yoksa varsayılan Free kullanılır.

Uygulama tüm şirketler için ortak **9.000 Neuron/gün** güvenli bütçe kullanır. Her istek model çağrısından önce atomik D1 işlemiyle ayrılır; eşzamanlı çağrılar sınırı aşamaz. Kullanıcı başına saatte en fazla 20 istek vardır.

Panel sayacı gerçek tüketim ölçümü değildir. UTF-8 girdi boyutu, mesaj çerçevesi payı ve azami çıktı token'ı üzerinden, incelenen model fiyatının iki katı payla hesaplanan üst sınırdır. Başarıda da hatada da geri verilmez; sağlayıcının tam tüketimi bilinmez. Bu yüzden ücretsiz kotanın tamamından önce uygulama durabilir. Danışma en fazla 2.048, içerik yanıtı 4.096 çıktı token'ıdır; iç düşünce de bu bütçeyi tüketebilir. Girdi sınırı 26.000 bayttır. Kesilmiş yanıt ve iç düşünce gösterilmez.

Sayaç UTC gün başında, Türkiye saatiyle **03.00**'te yenilenir. Önceki iki dakika yeni istek başlatılmaz. Dağıtım veya sohbet temizleme bütçeyi sıfırlamaz. Bu bütçe yalnızca uygulama çağrılarını kapsar; hesaptaki diğer AI uygulamaları da sağlayıcı kotasını tüketebilir. Hesap planı dışarıdan değiştirilirse yeniden kontrol gerekir. R2, Zero Trust ve uzak tarayıcı sınırları ayrıca korunur.

## Veri ve yetkiler

- Ortak hafıza şirket kimliğiyle; sohbet **şirket + kullanıcı** kimliğiyle sorgulanır. Yetkili çalışma alanı kullanıcıları hafızayı okuyabilir, yalnızca yönetici değiştirebilir. Şirket bazında kullanıcı yetkisi henüz yoktur.
- Kullanıcı ve şirket başına son 20 soru/yanıt saklanır. **Yeni sohbet başlat** kendi seçili şirket geçmişinizi siler; ortak hafıza korunur. Şirket silinince hafıza ve sohbetleri D1 ilişkileriyle silinir.
- Saatlik sınır için kullanıcı kimliği, zaman ve rezervasyon miktarı içeren ayrı kayıtlar yaklaşık 24 saat tutulur; soru/yanıt içermez. Temizlik sonraki AI isteğinde yapılır.
- Modele yalnızca şirketin içerik alanları, ilgili hafıza ve gerekli konuşma verilir. Sosyal çerezler, oturum anahtarları ve giriş şifreleri gönderilmez. Modelin SQL, yayınlama veya dosya aracı yoktur.
- Yanıtlar metin halinde gösterilir; HTML çalıştırılmaz. Yapılandırılmış gönderiler sunucuda şema/platform listesiyle doğrulanır. Yayınlama ayrı yetki ve doğrulama gerektirir.

## Sınırlar ve doğrulama

Asistan Türkçe metin ve strateji yardımı içindir. Canlı internet, güncel trend araştırması, hesap analitiği, SEO/erişim garantisi, görsel rötuş, video üretimi, otomatik paylaşım veya zamanlama yapmaz. Eksik fiyat/kampanya bilgisi uydurulmamalı; çıktıları kullanıcı incelemelidir.

Yerelde AI binding eklenmez ve gerçek model çağrılmaz. D1/model taklitli testler şirket ayrımını, yönetici yetkisini, hatalı yanıtı ve atomik sınırları denetler. Tarayıcı testleri hafıza, aktarım ve şirket değişirken geciken yanıtı denetler. Dağıtım kontrolü binding/bütçeyi model çağırmadan doğrular.

Gerçek model kontrolü `.github/workflows/ai-check.yml` ile açıkça çalıştırılır: geçici kullanıcı/şirket ve kurgu bilgiyle şirket hafızasını ve sekiz platform çıktısını kontrol eder. Deneme verileri silinir; güvenli sonuç bayrakları `deployment/ai-check.json` dosyasına yazılır. Bu kontrol geçmeden gerçek modelin canlıda doğrulandığı söylenmez.

## Resmi kaynaklar

- [Fiyatlandırma ve ücretsiz kota](https://developers.cloudflare.com/workers-ai/platform/pricing/): resmi kaynak sürümü `8b0bdc299319a7819c5bdad9881532ccc1b8d519` (15 Ekim 2026).
- [AI binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Qwen3 model şeması](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/qwen3-30b-a3b-fp8.json)
- [JSON yanıt modu](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [LoRA ile ince ayarlı model çalıştırma](https://developers.cloudflare.com/workers-ai/features/fine-tunes/)
