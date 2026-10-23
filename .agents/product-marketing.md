# Sosyal Studio bağlamı

- Amaç: Birden fazla KKTC şirketinin dokuz sosyal platformunda kaynak görsel ve özetten marka diline uygun içerik ve onaylı yayın hazırlamak.
- Platformlar: Facebook, Instagram, X, Threads, Pinterest, YouTube topluluk, TikTok fotoğraf, LinkedIn, Tumblr. Canlı arayüz uygunluğu hesapta doğrulanır.
- Üretim: Cloudflare Workers/D1/R2, kullanıcı/şirket yetkileri, Windows portable yardımcı ve eklentili Firefox Developer Edition. Yerel Qwen3.5:9b/Q4 kullanılır; model ağırlığı eğitimi yapılmaz.
- Akış: Kaynak taslak → Qwen ile ayrı platform metinleri/etiket/alt → ayrı hazırlık kopyası → yayın önizlemeleri → native eklenti son onayı → sıralı kuyruk → gönderi bağlantısı doğrulaması. Manuel stüdyo ve ChatGPT aktarımı korunur.
- Marka sesi: Şirketin seçtiği ton ve onaylı hafızası esastır. Gerçek örnek yoksa ses profili keşfedildiği söylenmez; müşteri örnekleri Git'e konmaz.
- Dil: Türkçe arayüz ve yardım; şirketin açık dil tercihi içerikte geçerlidir. KKTC ilçe/hizmet/para birimi yalnız onaylı kaynaklardan alınır.
- ECC: İçerikte content-engine, brand-voice, crosspost; geliştirmede verification-loop ve e2e-testing. Kaynak sürümü/lisanslar skills-lock.json ile korunur. Ayrıntılar docs/ECC_KULLANIM.md.
- Sınırlar: Ücretsiz planlar, şirket ayrımı, model/bütçe sınırları ve native son onay korunur. Harici ücretli yayın servisi veya X API kurulmaz. Reklam harcaması/özel mesaj/ödeme çalıştırılmaz.
- Kanıt: Yerel/sentetik testler gerçek kullanıcı GPU'su, güncel sağlayıcı arayüzü veya başarılı canlı yayın kanıtı değildir. Dağıtım deployment/cloudflare.json ve ilgili Actions sonucu ile doğrulanır.
- Sırlar: Oturumlar, parolalar, cihaz anahtarları, müşteri ekranları ve kişisel ses örnekleri Git'e yazılmaz.
