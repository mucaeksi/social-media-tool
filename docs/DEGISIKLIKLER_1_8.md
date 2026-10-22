# Sosyal Studio 1.8 — inceleme önerilerinin uygulanması

22 Ekim 2026 tarihli incelemenin mevcut uygulamaya eklenen yamalarıdır. Kullanım adımları [1.8 rehberinde](KULLANIM_1_8.md) bulunur.

| Alan | Uygulanan geliştirme |
| --- | --- |
| Çalışmanın korunması | Üç saniyelik otomatik kayıt, kullanıcı/şirket kapsamında 24 saatlik sekme kurtarması, kayıt durum çubuğu, kaydet ve devam et, Ctrl/Cmd+S |
| Eşzamanlı düzenleme | Atomik sürüm kontrolü, eski sürüme 409, karşılaştırma ve kopya kaydetme, sınırlı sürüm geçmişi |
| Taslak düzeni | Sunucu tarafında sayfalama, arama, platform/kampanya/onay/tarih filtreleri, kopyalama, arşiv, çöp kutusu ve geri alma |
| Medya | Şirket kütüphanesi, kullanım yerleri, AI/yayın/taslak/geçmiş kullanımını koruyan temizleme, 10 slaytlık hazırlık, slayt açıklamaları ve sıralama |
| Üretim | Platforma özel görsel/kırpma, odak seçimi, güvenli alan yardımı, carousel/Story/video çekim iskeletleri, stüdyodan AI ve önce/sonra karşılaştırması |
| Günlük kullanım | Şirket platform tercihleri, daraltılmış açıklamalar, URL ile şirket/ekran/taslak, geri/ileri gezinme, işçi üzerinde görsel hazırlığı ve ilerleme |
| İçerik yönetimi | Kampanya ve ürün kartları, kaynak ve geçerlilik, sorumlu/yorum/içerik onayı, manuel planlarla gerçek yayın işlerini birlikte gösteren haftalık/aylık takvim |
| Ölçüm | Platform/varyant UTM, gönderi/kampanya/yayın bağlantısı, gerçek ölçüm tarihi, boş ile sıfır ayrımı, ölçüm düzenleme, aynı gönderinin son anlık görüntüsünü kullanma |
| Karşılaştırma | Gerçek üretimden model/rehber/kaynak sürümü, görsel ve toplam süre; insan düzeltmesi, geçerli çıktı ve uydurma bilgi değerlendirmesi |
| Kaynak ve marka | İddiaların kaynak değerleriyle eşleştirilmesi, geçerlilik kontrolü, ürün kaynağından etkilenen taslaklar, yönetici onaylı düzeltmenin sınırlı marka örneği olması |
| Gece araştırması | Seçili kanallar, yaklaşan kampanyaların ve değişen ürünlerin mevcut onaylı kaynaklarına öncelik, süresi yaklaşan kaynaklar, ortak 20 deneme sınırı, anlaşılır hata ve önceki/yeni özet |
| Sosyal medya düzeni | Mobilya/yerel mağaza kanal önayarı, üç içeriklik deneme haftası, fikir/soru kutusu, tek değişkenli deneyler, manuel Google İşletme Profili ve WhatsApp planları |
| Yayın hazırlığı | Hedef hesap/profil/görsel önizlemesi, durum filtresi ve görünür sayfada yenileme; değişen veya süresi dolan ürün kaynağında durdurma |
| Dışa aktarma/yedek | Platform metin ve görsellerinin parçalı ZIP paketi; sürümlü manifest ve SHA-256 denetimiyle tam içerik yedeği, ayrı şirkete devam edilebilir geri yükleme |
| Teknik bakım | Ortak platform kataloğu ve sürüm kaydı, 1.8 yardımcı paketi, sınıflandırılmış kurulum hataları, sır içermeyen tanılama, ayrı içerik bileşenleri ve yenilenen kod grafı |

## Korunan sınırlar

Veritabanı geçişi eklemelidir. Şirketler, mevcut taslaklar, cihaz eşleştirmeleri, Firefox profilleri ve model dosyaları silinmez. Yeni tablolar mevcut D1 üzerinde kalır; veri, medya ve AI kotaları korunur.

Yedekten gelen ürünler ve kaynaklar yeniden onay ister. Eski yayınlar, hafıza ve sürüm kayıtları inceleme arşividir; yeniden çalışan kuyruk değildir. Çöp kutusundaki taslaklar geri yüklemede çöp kutusunda kalır. Özel sohbetler, oturumlar, şifreler, cihaz anahtarları ve model ağırlıkları içerik yedeğine girmez.

Yerel 9B model değiştirilmedi. Gece araştırması ve marka örnekleri ağırlık eğitimi değildir. Kaynak özeti üretimde kullanılan bağlamı ayırır; model dosyası özeti ölçülmediyse boş kalır ve karşılaştırmaya elle eklenebilir. Sunucu süresi GPU süresi olarak sunulmaz.

Video hazırlığı çekim metni ve sahne planıdır. Çoklu görsel paketi otomatik carousel yayını sayılmaz. Mevcut Facebook pilotu tek görselle devam eder; belirsiz sonuç otomatik tekrarlanmaz. Resmî Meta/OAuth kurulumu, sağlayıcı izinleri, gerçek Windows/GPU kalitesi ve gerçek hesap yayını bu yamanın sentetik testleriyle tamamlanmış sayılmaz.

Platform kataloğundaki düzenleme tarihi canlı sağlayıcı koşulu doğrulaması değildir. Yeni ücretli hizmet, sosyal hesap girişi veya gerçek paylaşım yapılmaz.
