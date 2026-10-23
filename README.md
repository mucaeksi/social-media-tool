# Sosyal Studio

Türkçe, çok şirketli sosyal medya içerik hazırlama ve çalışma paneli. Facebook, Instagram, X, Threads, Pinterest, YouTube, TikTok, LinkedIn ve Tumblr için içerik hazırlanır.

**1.10 yaması:** Aynı Firefox penceresinde dokuz platform için onaylı fotoğraf/metin yayın kuyruğu, hesap ve sayfa eşleştirmesi, toplu önizleme, zamanlama ve yeni gönderi bağlantısı denetimi eklendi. [Otomatik yayın rehberi](docs/OTOMATIK_YAYIN.md).

**1.9 yaması:** KKTC reklam planı, manuel reklam ölçümleri, yedi sağlayıcının reklam panelini aynı Firefox penceresinde açma, onaylı metin hazırlama ve reklam çalışma notları eklendi. [Reklam kullanım rehberi](docs/REKLAM_KULLANIM.md).

**1.8 yaması:** Otomatik kayıt ve oturum sonrası kurtarma, taslak sürüm kontrolü, medya kütüphanesi, kampanya/ürün kartları, haftalık/aylık içerik takvimi, çok görselli hazırlık, platform kırpması, ölçüm/deney takibi ve görselli parçalı yedek eklendi. [1.8 kullanım rehberi](docs/KULLANIM_1_8.md).

## Günlük çalışma

1. Şirketi ve varsayılan kanalları seçin. Her şirketin profil, kaynak, taslak ve medya alanı ayrıdır.
2. Stüdyoda kaynak metni ve görselleri hazırlayın. Cloudflare Gemma 4, yerel Qwen3.5:9b veya manuel ChatGPT aktarımı kullanılabilir. AI sonucu kontrol edilerek aktarılır; model ağırlıkları eğitilmez.
3. Kampanya, ürün, sorumlu ve inceleme durumunu ekleyin. Ürün kaynaklarını yönetici onaylar. Metin ve görselleri ZIP olarak indirebilirsiniz.
4. İçerik takviminde manuel planları takip edin. Yayın takviminde seçilen hesapların fotoğraf/metin önizlemelerini eklentide onaylayarak aynı Firefox penceresinde otomatik yayın başlatın.
5. Gerçek platform/işletme ölçümlerini gönderiye bağlayın. Boş ölçüm sıfır sayılmaz. UTM ve deneylerle sonraki içerik kararını gerçek sonuçlara dayandırın.
6. Reklam çalışma alanında bütçe, KKTC hizmet bölgeleri ve reklam denemelerini planlayın. Aynı Firefox penceresinde gerçek reklam hesabınıza giriş yapın; AI değerlendirmesi ve metin yerleştirme için eklenti onayını kullanın. Harcama ve yayın işlemlerini sağlayıcı panelinde siz tamamlarsınız.

Otomatik kayıt yayınlama yapmaz. Taslak çakışmasında eski kopya yeni düzenlemeyi ezmez. Şifreler, sosyal oturumlar ve cihaz anahtarları içerik alanlarına yazılmamalıdır.

## Çalışan altyapı ve sınırlar

Üretim GitHub Actions üzerinden Cloudflare Workers/D1/R2'ye dağıtılır. Giriş, D1 kullanıcıları ve güvenli oturum çerezleriyle yapılır; açık kayıt yoktur. Yönetici ve şirkete atanmış editör rolleri vardır.

Windows yardımcısı ayrı taşınabilir Firefox ve özel Ollama üzerinden çalışır. Model `qwen3.5:9b`, 4-bit ve 16K bağlamdır. Kurulum, eşleştirme, model dosyaları ve Firefox profilleri mevcut taşınabilir klasörde korunur. Yardımcı güncellemesi mevcut otomatik yama akışından gelir.

Eklenti 1.3 fotoğraf/metin gönderilerini aynı onaylı Firefox penceresinde sırayla yürütür; hesap, içerik ve yeni gönderi bağlantısı kanıtı arar. YouTube topluluk ve TikTok fotoğraf biçimi ilgili web hesabında sunulmalıdır. Tanınmayan formda işlem durur; gerçek hesap davranışı kullanıcı bilgisayarında doğrulanmalıdır. Resmî OAuth/API yayıncısı kullanılmaz. Video hazırlığı çekim/metin planıdır; video dosyası üretmez.

D1 tek veritabanı ücretsiz sınırı 500 MB; uygulamanın güvenli yazma eşiği 400 MB'tır. R2 için 10 GB uygulama depolama sınırı ayrıdır. Bulut AI rezervasyon bütçesi günlük 9.000 Neuron, yerel AI günlük 50 üretimdir. Bunlar hesap genelinde fatura kilidi değildir. Ücretli servis veya X API kredisi otomatik açılmaz.

## Yedek

Yönetici tam içerik yedeğini ZIP parçalarıyla indirir. Bütün parçaları birlikte saklayın. Geri yükleme yeni şirket kopyası oluşturur; kaynak onayları ve yayın işleri otomatik etkinleştirilmez. Sosyal oturumlar, Firefox profilleri, cihaz anahtarları ve model dosyaları içerik yedeğine dahil değildir. [Ayrıntılar](docs/KULLANIM_1_8.md#tam-içerik-yedeği).

## Yerel geliştirme

Node.js 24+, npm, Python 3.10+ ve uv gerekir. Mevcut checkout kullanılır:

```bash
cd /workspace/social-media-tool
bash scripts/setup.sh
npm run dev
```

Vite 5173 ve API 3001 portunda, yalnız loopback üzerinde çalışır. Yerel veri `data/` altındadır; Git'e girmez. Üretim aynı dosya veritabanını kullanmaz; Cloudflare D1/R2 kullanır. Testler ayrı geçici verilerle çalışır.

```bash
npm test
npm run build
npm run skills:verify
npm run test:cloud
npm run test:deploy
npm run test:e2e
npm run test:e2e:cloud
npm run test:e2e:d1
npm run test:e2e:auth
npm run test:companion
```

Firefox/Windows testlerinin gerçek çalıştırıcı gereksinimleri ilgili rehberlerdedir. Yerel/emülatör testleri gerçek sosyal medya gönderisi oluşturmaz. Canlı dağıtım sonucu `deployment/cloudflare.json` ve GitHub Actions kaydından kontrol edilir.

## Başvuru

- [1.10 aynı Firefox penceresinde otomatik yayın](docs/OTOMATIK_YAYIN.md)
- [1.10 test ve doğrulama sonuçları](docs/DOGRULAMA_1_10.md)
- [1.9 KKTC reklam çalışma alanı](docs/REKLAM_KULLANIM.md)
- [1.9 test ve doğrulama sonuçları](docs/DOGRULAMA_1_9.md)
- [1.8 kullanım rehberi](docs/KULLANIM_1_8.md)
- [1.8 değişiklik kapsamı](docs/DEGISIKLIKLER_1_8.md)
- [1.8 test ve doğrulama sonuçları](docs/DOGRULAMA_1_8.md)
- [Mimari ve veri yerleşimi](docs/MIMARI.md)
- [Cloudflare dağıtımı](docs/CLOUDFLARE.md)
- [Windows yardımcısı](docs/SIRKET_BILGISAYARI.md)
- [Firefox eklentisi](docs/FIREFOX_EKLENTISI.md)
- [KKTC kaynakları ve Facebook pilotu](docs/KKTC_UZMAN_KULLANIM.md)
- [Gece araştırması](docs/GECE_OGRENMESI.md)
- [Resmî Meta kurulumu](docs/META_KURULUM.md)
- [Skill kaynakları ve lisansları](docs/SKILLER.md)

Graphify geliştirme sırasında yerelde kullanılan ayrı bir araçtır; Sosyal Studio'nun Graphify Labs tarafından onaylandığı anlamına gelmez. Skill kopyaları ve lisansları korunur; `npm run skills:verify` ile doğrulanır.
