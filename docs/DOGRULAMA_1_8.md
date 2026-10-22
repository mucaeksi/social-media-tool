# Sosyal Studio 1.8 doğrulaması

22 Ekim 2026; geçici SQLite verileri, Miniflare D1/R2 ve yerel tarayıcı sayfaları kullanıldı. Kullanıcının `data/`, Firefox profilleri ve gerçek sosyal hesapları testlere dahil edilmedi.

| Kontrol | Sonuç |
| --- | --- |
| Birim/HTTP testleri | 28 geçti |
| Cloudflare Worker/D1/R2 testleri | 82 geçti |
| Dağıtım denetimleri | 29 geçti |
| Yerel Chromium akışları | 13 geçti, 1 yalnız D1 senaryosu atlandı |
| R2 ile Chromium akışları | 14 geçti |
| D1 görsel deposuyla Chromium akışları | 14 geçti |
| Şifreli giriş ve rol akışları | 2 geçti |
| Bütün yardımcı testleri, tek süreç | 67 geçti, 5 Windows testi Linux'ta atlandı |
| TypeScript, Vite ve yardımcı/eklenti paketleri | Başarılı |
| Sabit beceri dosyaları | 5 beceri, 38 dosya SHA-256 doğrulaması başarılı |
| Kod grafı | Yerel AST ile yenilendi; SQL ayrıştırıcısı dahil |
| Görsel kontrol | İçerik planı masaüstü ve mobilde incelendi; yatay taşma yok |

Toplam 249 test geçti, 6 test atlandı. Yardımcı paketi gerçek Firefox ESR 153.5.1 ile localhost sayfalarında sınandı. Yönetilen ortamın Firefox başlatmasını engelleyen dosya sistemi sandbox kısıtı için desteklenen çalıştırma izni kullanıldı. Bu durum üretim yardımcısının ayarlarını değiştirmez.

Yeni senaryolar; oturum kesilmesinde kurtarma, kullanıcı/şirket ayrımı ve 24 saat sınırı, eski sürüm ve eşzamanlı kayıt, çöp kutusu, onay yetkileri, AI kullanımı sırasında medya koruması, boş/sıfır ölçüm ayrımı, parçalı görselli yedeği ayrı şirkete geri yükleme ve gecikmeli taslak açılışında URL/geri hareketini kapsar.

İlk tarayıcı turunda geç gelen taslak yanıtının kullanıcıyı yeniden editöre götürdüğü hata bulundu; açılış tamamlanana kadar yükleme durumu ve ekranı değiştirmeyen geri yükleme eklendi. Yeni tarayıcı testiyle doğrulandı. Aynı anda ağır test paketleri çalışırken süre aşımı görüldü; son tarayıcı paketleri sırayla, son yardımcı paketi `--test-concurrency=1` ile çalıştırıldı ve geçti. Testler arasında derleme çıktısı değiştirilmedi.

Gerçek Windows kurulumunu GitHub Actions Windows işi ayrıca denetler. GPU hızı, gerçek modelin Türkçe/görsel kalitesi, canlı hesap oturumu ve gerçek sosyal paylaşım bu yerel sonuçlardan çıkarılamaz. Canlı dağıtım için Actions sonucu ve `deployment/cloudflare.json` içindeki kaynak commit esas alınır.
