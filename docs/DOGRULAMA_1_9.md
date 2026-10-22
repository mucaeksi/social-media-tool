# Sosyal Studio 1.9 doğrulaması

22 Ekim 2026. Testler ayrı geçici SQLite verileri, Miniflare D1/R2 ve localhost tarayıcı sayfalarında çalıştı. Kullanıcının şirket verileri, gerçek reklam hesapları, Firefox giriş profilleri ve model dosyaları testlerde kullanılmadı.

| Kontrol | Sonuç |
| --- | --- |
| Birim/HTTP testleri | 31 geçti |
| Worker/D1/R2 testleri | 83 geçti |
| Dağıtım denetimleri | 29 geçti |
| Yerel Chromium akışları | 14 geçti, 1 yalnız D1 senaryosu atlandı |
| R2 ile Chromium akışları | 15 geçti |
| D1 görsel deposuyla Chromium akışları | 15 geçti |
| Şifreli giriş ve rol akışları | 2 geçti |
| Bütün yardımcı testleri, tek süreç | 69 geçti, 5 Windows testi Linux'ta atlandı |
| TypeScript, Vite, yardımcı ve eklenti paketleri | Başarılı |
| Sabit beceriler | 5 beceri, 38 dosya SHA-256 doğrulaması başarılı |
| Kod grafı | Yerel AST ile yenilendi |
| Görsel inceleme | 1440 ve 390 piksel genişlikte reklam planı; yatay taşma yok |
| Güncelleme uyumluluğu | 1.8 güncelleyicisi gerçek 1.9 kaynak ZIP'ini doğrulayarak açtı |

Toplam 258 test geçti, 6 test atlandı. Gerçek Firefox ESR testlerini çalıştırmak için yönetilen ortamın dosya sistemi sandbox'ı dışında desteklenen çalıştırma izni kullanıldı. Bu izin üretim profillerini veya Firefox güvenlik ayarlarını değiştirmez.

Yeni reklam senaryoları yedi sağlayıcıyı, sabit eklenti kataloğunu, sahte alan adı ve ödeme ekranı reddini, aynı hesap için sosyal/reklam bağlantılarının birlikte kalmasını, aynı pencerede reklam sekmesi açılmasını, hesap adı/kimliği doğrulamasını ve onayla yalnız boş taslak metninin yazılmasını kapsar. Yerel Firefox sayfasında bütçe alanının ve yayın düğmesinin değişmediği ayrıca kontrol edildi.

Uçtan uca uygulama akışı; reklam planı, boş/sıfır ölçüm ayrımı, maliyet oranları, doğrulanmamış gelirden ROAS üretmeme, onaylı ve süreli çalışma notu, uzun planla ekran değerlendirmesi ve eklentiye metin onayı gönderilmesini kapsar. Uygulama testinde model yanıtı ve eklenti mesajlaşması kontrollü kurgu yanıtlarla verilir; ayrıca gerçek Firefox eklentisi ayrı testte çalışır.

Gece testleri yedi resmî reklam kaynağını, şirket ve inceleme kapsamını, araştırmayı kapatma seçeneğini ve manuel sonuçlar değiştiğinde aynı resmî kaynağın yeniden değerlendirilip eski not onayının kaldırılmasını sınar. Bulut testleri süresi dolmuş reklam örneğinin AI bağlamına verilmediğini ve eski yardımcının reklam üretimi için güncelleme uyarısıyla reddedildiğini doğrular.

Gerçek Windows kurulum/güncelleme testleri GitHub Actions Windows işinde ayrıca çalışır. Canlı sağlayıcıların KKTC hesabı ve hedef konum uygunluğu, gerçek reklam hesabına giriş, reklam yayını/harcaması ve GPU/model kalitesi bu yerel testlerden çıkarılamaz. Canlı yayın için Actions sonucu ve `deployment/cloudflare.json` içindeki kaynak commit esas alınır. Kullanım adımları [reklam rehberindedir](REKLAM_KULLANIM.md).
