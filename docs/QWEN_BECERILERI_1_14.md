# Qwen'in kendi beceri dosyaları · 1.14

Yardımcı **1.14.0**, mevcut eklenti **1.5.0** ve Qwen3.5:9b ile çalışır. İşiniz bitince yönetilen Firefox'u/yardımcıyı kapatıp aynı **Baslat.cmd** ile yeniden başlatın; siteyi **Ctrl+F5** ile yenileyin. Model, eşleştirme, hesap girişleri ve şirket hafızası korunur. Model indirilmez veya yeniden eğitilmez.

## Dosyalar ve gerçek kullanım

İlk kontrol, BAT klasörünün yanında `ai/skills` dizinini oluşturur. `active.json` etkin paketi gösterir; dosyalar `ai/skills/packs/<paket-kimliği>/<beceri-id>/SKILL.md` içindedir. Paket manifesti SHA-256 özetlerini, LICENSE ise ECC'den uyarlanan bölümlerin MIT lisansını taşır. Şirket bilgileri veya oturumlar bu ortak dosyalara yazılmaz.

Qwen klasörleri kendiliğinden taramaz. Yardımcı bu gerçek dosyaları okur, sabit katalog ve özetlerle doğrular, sonra ilgili metinleri modelin sistem mesajına ekler. İçerik, sohbet, görsel inceleme, Firefox kararı, sekme seçimi ve gece notu çağrıları ayrı beceri seçimleri kullanır. Bütün paket her isteğe eklenmez. Ek rehber metni en fazla 6.000 UTF-8 bayttır; toplam 16K bağlam, çıkış ve görsel payı denetimi korunur. Şirket kaynağı sessizce kısaltılmaz.

**17 dosya** vardır: kaynak/marka dili, KKTC, görsel/alternatif metin, organik kalite, reklam planlama, ölçüm/deney, gece/güncellik, Firefox/yayın kanıtı ve dokuz ayrı platform rehberi. Platform sınırları mevcut merkezî katalogdan gelir. Threads'te zoraki soru ve TikTok etiket sayısındaki çelişki giderildi.

## Nereden kontrol edilir?

**AI asistanı → Yerel AI ve beceri yönetimi → Qwen'in yüklü becerileri** bölümünü açın.

- **17 beceri dosyası doğrulandı:** disk dosyaları o anda paketle eşleşiyor.
- **Son model yanıtındaki beceriler:** bu yardımcı oturumunda yanıtı alınmış son model çağrısına eklenen rehberler. Yalnız dosya kontrol etmek veya onarmak bu kaydı üretmez.
- **Beceri dosyalarını doğrula:** dosya denetimini yeniler, modele üretim yaptırmaz.
- **Beceri paketini onar:** model/gece işi aktif değilken sabit paketi geçici dizinde doğrular ve etkin pointer'ı atomik değiştirir. Model/hesap verisini yenilemez.

Dosya kontrolü Qwen'in talimatı anladığının, iyi içerik yazdığının, GPU'da çalıştığının veya paylaşım yaptığının kanıtı değildir. Ayrı **Qwen'i gerçekten test et** akışı metin, JSON ve sentetik görseli çağırır; gerçek şirket içeriği ve gerçek sosyal hesap yayını ayrıca incelenmelidir. Son organik yayın mevcut donmuş içerik ve eklenti son onayından yürür.

## Bozulma, özelleştirme ve bakım

Mevcut beceri/manifest değişirse durum sorgusu onu sessizce düzeltmez; yeni becerili üretim durur. Açık onarım gerekir. Symlink/junction, yol kaçışı, fazla büyük dosya ve yarım paket kabul edilmez. Normal onarım yalnız tanınan eski paketlerden en fazla iki snapshot tutar; kullanıcıya ait bilinmeyen dizinler silinmez. Bağlantı/dizin zincirinin kendisi uygunsuzsa onarım da bunu aşmaz.

Bu klasör yönetilen rehber paketidir; rastgele script, araç, URL veya indirilen skill eklemek çalıştırma yetkisi kazandırmaz. Markaya özel ton, onaylı örnek, ürün, fiyat ve kaynaklar paneldeki şirket alanlarından düzenlenir. Ortak beceri geliştirmeleri kaynak katalogdan sürümlenip yardımcı güncellemesiyle dağıtılır. Katalog/metin değiştirildiğinde `QWEN_SKILLS_VERSION` de artırılmalı; eski paketin yeni sürümde kullanıldığı varsayılmamalıdır.

Testler diskten SKILL.md okumasını, SHA-256 doğrulamasını, görev seçimini, gerçek Ollama istek biçimine aktarımı, gece çağrısını, bozuk paketin üretimi kesmesini, atomik onarımı, bilinmeyen kullanıcı dizinlerinin korunmasını ve paneldeki ayrımı denetler. Yerel testlerde gerçek kullanıcı modeli veya GPU'su çağrılmaz.
