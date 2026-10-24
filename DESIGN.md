# Sosyal Studio panel tasarımı

Mod: Operate. Kullanım ortamı: masaüstü Windows/Firefox'ta uzun süre açık kalan, gerektiğinde telefondan kontrol edilen Türkçe çalışma aracı.

Amaç: üretim, planlama ve yönetimi ayırmak; sayfanın ilk görünümünde seçili şirketi, yapılan işi ve ana eylemi anlaşılır kılmak. Mevcut yeşil marka bağını koruyup yoğun metinleri, kontrolleri ve başlıkları daha tutarlı bir düzene taşımak.

## Görsel sistem

- Zemin `#f3f6f8`, yüzey `#ffffff`, güçlü metin `#20323e`, ikincil metin `#526877`, çizgi `#dde4e9`.
- Sol gezinme için derin petrol `#17313d`; ana eylem ve etkin seçim için marka yeşili `#2b6c55`; açık vurgu `#e5f1ea`.
- Tek sistem yazı ailesi: system-ui / Segoe UI. Windows operasyon panelinde okunabilirlik ve yerel kontrollerle uyum, dış font isteğinden daha değerlidir.
- Sabit yazı ölçeği: 14–15 px gövde, 16–18 px bölüm başlığı, 28–32 px sayfa başlığı. Yeterli satır yüksekliği, sayılarda tabular-nums.
- Kartlar sade beyaz; sınırlı çizgi/gölge, 12 px kart ve 8–10 px kontrol köşeleri. İç içe dekoratif kartlardan, degrade ve gereksiz hareketten kaçın.

## Bilgi mimarisi

Sol menü üç gerçek iş grubuna ayrılır: Üretim (stüdyo, AI, taslaklar), Planlama (içerik planı, yayın takvimi, reklam), Yönetim (şirket, hesap, kaynak, ekip). Mevcut ekran isimleri ve adresleri korunur. Aktif menü aria-current ile belirtilir; klavye odağı görünürdür.

Üst çubuk sayfa bağlamını ve kullanıcı eylemlerini taşır. Aktif şirket seçicisi görünür ve tektir. Sayfa başlığı işin adını söyler; pazarlama sloganı ve büyük dekoratif etiketler günlük alanı işgal etmez. Durum/bildirimler yalnız gerçek uygulama verisine dayanır.

Form alanları, birincil/ikincil eylemler, alt sekmeler, listeler ve hatalar aynı kontrol dilini kullanır. Uzun kurulum açıklamaları isteğe bağlı açılabilir; hata veya gerekli eylem gizlenmez. Ana içerik için klavye atlama bağlantısı sağlanır.

## Dar ekran ve denetim

Mobilde yan menü çekmece olur; örtü, Escape ve menü seçimi ile kapanır. Formlar tek sütuna geçer; metin ve düğmeler taşmaz. Dokunma hedefi en az 40–44 px, görünür odak, normal yakınlaştırma ve reduced-motion desteği korunur.

Masaüstü 1440×1000 / 1280×900 ve mobil 390×844 görüntülerini gerçek yerel uygulamadan incele. Yapay işletme/metin test verisi kullanılabilir; gerçek hesap/başarı iddiası üretilmez. Üç menü grubu, şirket değiştirme, URL/geri hareketi ve mevcut iş akışları test edilir.

Kaynaklar: kurulu frontend-design; Impeccable 4.7.1'in Operate ve craft-floor rehberleri (Apache-2.0); Vercel Web Interface Guidelines çevrimiçi kontrol referansı. Impeccable'ın binary/CLI/hook kurulumu yapılmaz; belge bağlamı ve mevcut Playwright araçları kullanılır.
