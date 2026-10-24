# Panel düzeni ve kullanılan UI kaynakları · 1.14

Kullanıcı 24 Ekim 2026'da daha güzel, kolay ve gruplandırılmış bir panel istedi. Mevcut içerik, şirket, adres ve yayın onayı akışları korunarak günlük operasyon düzeni yenilendi. Menü Üretim, Planlama ve Yönetim gruplarını kullanır; seçili şirket, sayfa adı ve asıl eylemler öne çıkar.

Tasarımda kaynaklar karşılaştırılıp amaçlarına göre kullanıldı; herhangi bir kaynağın nesnel olarak bütün alanlarda “en iyi” olduğu iddia edilmez:

- Kurulu **Anthropic frontend-design**: görsel hiyerarşi, yazı ölçeği ve tutarlı kontrol dili.
- **Impeccable 4.7.1**, `https://github.com/pbakaus/impeccable`, commit `936867543ac2576920d663cc9803597f6044f3ac`: görev odaklı Operate yaklaşımı, sadeleştirme, tipografi, erişilebilirlik ve farklı ekran denetimi. SKILL.md ve referanslar `.agents/skills/impeccable` altında asıllarıyla, Apache-2.0 lisansı ve NOTICE ile bulunur; `skills-lock.json` dosya bütünlüğünü doğrular. Binary/CLI, otomatik indirme, tarayıcı eklentisi veya hook kurulmadı; belgede tanımlanan doğrudan bağlam okuma yolu kullanıldı.
- **Vercel Web Interface Guidelines**: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`, 24 Ekim 2026'da çevrimiçi okundu. Klavye odağı, skip link, etiketler, taşma, hareket azaltma, küçük ekran ve durum metinleri için kontrol referansı olarak kullanıldı; kaynak paket depoya kopyalanmadı.

Ürün gerçekleri PRODUCT.md, tasarım kararları DESIGN.md içindedir. Pazarlama sayfası şablonu yerine günlük Windows/Firefox çalışma bağlamı esas alınır. Sistem yazı ailesi, açık ana yüzey, petrol gezinme ve mevcut yeşil marka rengi kullanılır. Renk tek başına durum anlatmaz; gerçek veriye dayanmayan çevrimiçi, başarı veya yayın sayacı eklenmez.

Uzun kurulum bilgileri açılır rehberdedir. Yerel AI, beceriler, gece programı ve yarım üretimler aynı yönetim bölümünde toplanır. Firefox bağlantı adımları kısa kalır; ayrıntılı kurulum ayrıca açılabilir. Yayın takvimindeki ayrı oturum Facebook yöntemi ve performans ölçümleri birincil toplu yayın akışından ayrılır; aktif/hataya düşmüş eski işler gizlenmez.

Yeni gezinme, aktif şirket seçimi, URL ile açılış/geri hareketi, mobil çekmece, klavye kullanımı ve geniş/dar ekran taşması mevcut kullanıcı akışlarıyla birlikte test edilir. Ekran görüntüleri yerel uygulamada sentetik içerikle alınır; gerçek hesap veya GPU erişimi sağlanmış gibi sunulmaz.
