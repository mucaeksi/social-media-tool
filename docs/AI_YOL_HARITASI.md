# Sosyal medya uzmanı AI

Uygulama tamamlandıktan sonra açık ağırlıklı bir modeli sosyal medya asistanı olarak kullanmak mümkündür. Tüm çalışan altyapının Cloudflare'de kalması tercihi için uygun yol **Cloudflare Workers AI** ve sunucu tarafındaki AI binding'idir. Bu, kullanıcının cihazında çalışan yerel bir model değildir; Cloudflare üzerinde çalışan bir modeldir. Model ağırlıklarını React dosyalarının içine gömmek veya ChatGPT web oturumunu kullanmak gerekmez. Cloudflare hesabının model kotası ve ücretlendirmesi geçerli olur.

## Önce marka bilgisini kullanma

İlk aşamada modelin ağırlıklarını değiştirmek yerine şirkete özel bilgi tabanı kurmak daha uygundur:

- Marka dili, hedef kitle, ürünler, kullanılacak ve kaçınılacak ifadeler D1'de saklanır.
- Onaylanmış gönderiler ve şirket belgeleri Cloudflare üzerinde tutulur.
- İçerik hazırlanırken yalnızca seçili şirkete ait ilgili örnekler modele bağlam olarak verilir. Bu yöntem RAG / bilgi getirme olarak adlandırılır; modeli eğitmekle aynı şey değildir.
- Gerekirse Cloudflare Vectorize, belge benzerliği aramasına eklenebilir. Başlangıçtaki az sayıda şirket profili için zorunlu değildir.
- Platform sınırları, doğru bilgi kullanımı, Türkçe dil kontrolü ve yayın öncesi kullanıcı incelemesi modelin dışında da denetlenir.

## Sonra gerekirse eğitim

Marka bilgisiyle hazırlama yeterli olmazsa onaylanmış giriş–çıkış örnekleriyle ince ayar değerlendirilebilir. Seçilen modelin ve Cloudflare'in ilgili LoRA / ince ayar desteği o aşamada doğrulanmalıdır. Eğitim ile modelin yeni ürün ve kampanyaları bilmesi ayrı konulardır; güncel şirket bilgisi yine veritabanından verilmelidir. Hesap şifreleri ve erişim belirteçleri eğitim verisine eklenmez.

## Mevcut durum

Henüz model eklenmedi veya eğitilmedi; AI kaynağı oluşturulmadı ve otomatik model çağrısı yapılmaz. Şu an temel şablon ve kullanıcının seçtiği ChatGPT talimatını manuel çalıştırıp JSON yanıtını aktarma yöntemi vardır. Workers AI aşaması, üyelik ve gerçek sosyal medya yayınlama altyapısından ayrı geliştirilmelidir. Kullanıcıya model eğitilmiş, SEO başarısı ölçülmüş veya otomatik paylaşım yapılmış gibi gösterilmez.
