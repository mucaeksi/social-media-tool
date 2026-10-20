# Sosyal Studio

**20 Ekim yaması:** [KKTC uzman çalışma alanı kullanımı](docs/KKTC_UZMAN_KULLANIM.md). KKTC profili, kanıtlı site araştırması, şirket bazında editör erişimi, Firefox görevleri, yerel AI ara kayıt/devam, kalite defteri, yedek ve Facebook yayın pilotu mevcut programa eklendi. Gerçek hesap/Windows/model kontrolü kullanıcı bilgisayarında yapılmalıdır; dokuz platform için otomatik yayın doğrulanmış değildir.

Birden fazla şirketin sosyal medya içeriklerini hazırlamak için tamamen Türkçe bir panel. Facebook, Instagram, X / Twitter, Threads, Pinterest, YouTube, TikTok, LinkedIn ve Tumblr için metin ve görsel hazırlama alanları içerir.

[Geliştirme öncesi KKTC incelemesi](docs/KKTC_GELISTIRME_INCELEMESI.md) · [Windows Firefox ve küçük yerel model kurulumu](docs/SIRKET_BILGISAYARI.md). Güncel uygulanan kapsam yukarıdaki yama rehberindedir.

**İçerik hazırlama ve Firefox hesap yardımcısı.** Yönetici şirketlere ayrı hesaplar ekleyip Windows'taki kalıcı Firefox profilleriyle giriş yapabilir. Sayfa okuma, alan seçimi, metin ve 600 KB'a kadar JPEG aktarımı vardır. Facebook için onaylı zamanlama/yayın pilotu eklendi; diğer platformların otomatik yayın adaptörleri ve gerçek hesap kontrolü tamamlanmış sayılmaz. Eski Cloudflare Browser Run seçeneği ayrı, deneysel ve şifreli çerez deposuyla korunur. [Hesap girişi](docs/HESAP_GIRISI.md).

[Sekiz platformun resmi API ve web girişi koşulları](docs/PLATFORM_BAGLANTILARI.md) panelde hesap kartlarına da eklendi. Facebook, Instagram, Threads, Pinterest ve Google/YouTube giriş alanları açıldı; gerçek hesap girişi denenmedi. X erişimi reddedildi, TikTok ve LinkedIn giriş alanları doğrulanamadı. Resmi API bağlantısı henüz etkin değildir.

**Entegre AI asistanı:** Cloudflare Gemma 4 veya şirket bilgisayarında Qwen3.5:4b, şirket hafızası ve onaylı kaynaklarla içerik hazırlar. Yönetici marka bilgileri ve onaylı örnekler ekler; kullanıcı sonucu kontrol edip stüdyoya aktarır. Model ağırlıkları eğitilmez. Bulut modelinde sağlayıcının günlük 10.000 Neuron ücretsiz kotası içinde uygulama 9.000 Neuron rezervasyon bütçesi kullanır; yerel model bu kotayı harcamaz. [Kullanım ve sınırlar](docs/AI_YOL_HARITASI.md).

**Görsel + kısa özet:** Seçilen model görseli inceler; uzman rehberi, şirket hafızası ve kaynaklarla platformlara ayrı metin/etiket/görsel açıklaması üretir. Metin ve görsel birlikte stüdyoya aktarılır. AI üretimi kendiliğinden paylaşım yapmaz; yayın kuyruğunda ayrıca açık onay gerekir.

## Cloudflare üzerinde yayın

Kaynaklar GitHub `main` dalındadır. Her kaynak güncellemesi `.github/workflows/cloudflare.yml` ile test edilip Cloudflare Workers'a dağıtılır. Üretim veritabanı Cloudflare D1, görsel deposu R2 (henüz etkin değilse D1), giriş doğrulaması D1 üzerinde kullanıcı adı/şifre ve güvenli oturum çerezleriyle yapılır. GitHub Actions mevcut `CLOUDFLARE_API` repository secret'ını kullanır; tarayıcıya veya koda secret yazılmaz.

Herkese açık kayıt yoktur; hesapları yönetici oluşturur. Yönetici bütün şirketleri, editör yalnız atanan şirketleri görür. Kullanıcı/şirket izinleri, şifre güncelleme ve oturum kapatma ekranları vardır. Uygulama en fazla 50 kullanıcıya izin verir. Zero Trust Free planı dağıtımda doğrulanır; panel Access koltuğu tüketmez. Ücretli plana geçilmez. Dağıtım sonucu ve doğrulanmış adres `deployment/cloudflare.json` dosyasındadır; başarı yalnız canlı kontrol geçince kaydedilir.

R2 için kodda 10 GB depolama, UTC ayında 1 milyon Class A ve 10 milyon Class B sınırı bulunur. Bu sayaçlar uygulamanın veri işlemlerini kapsar; hesap genelinde fatura limiti değildir.

[Cloudflare dağıtımının ayrıntıları](docs/CLOUDFLARE.md) · [Sosyal medya uzmanı AI planı](docs/AI_YOL_HARITASI.md)

## Neler çalışıyor?

- Ayrı şirket profilleri; anlatım dili, hedef kitle, web sitesi, marka rengi ve anahtar kelimeler.
- Şirkete özel taslak listesi; Cloudflare D1 üzerinde, yerel geliştirmede SQLite ile kalıcı kayıt.
- Platform seçimi; başlık, açıklama, etiket, karakter sayacı ve görsel açıklaması düzenleme.
- API gerektirmeyen ChatGPT akışı: talimat oluştur → kendi hesabında çalıştır → JSON yanıtını aktar. ChatGPT oturumuna program içinden erişilmez.
- Cloudflare AI ile şirkete özel danışma, içerik üretme ve kullanıcı onayıyla stüdyoya aktarma. Sohbet kullanıcı + şirket kapsamında; ortak hafızayı yönetici düzenler.
- JPEG, PNG ve WebP yükleme; platforma göre boyutlandırma, beyaz dolgu veya merkezden kırpma; JPEG indirme.
- Metinleri JSON olarak dışa aktarma. Görseller ayrı indirilir; dışa aktarımdaki yerel görsel yolları uygulama çalışırken kullanılabilir.
- Mobil düzen, klavye ile kullanılabilen pencereler ve kaydedilmemiş değişiklik uyarısı.

## Kurulum

Node.js 24+, npm, Python 3.10+ ve `uv` gerekir. Bulut ortamında bunlar ve Chromium hazırdır. Mevcut depoyu kullanın; bu görevler zaten yalıtılmış ortamda çalışır ve yeni Git worktree gerekmez.

```bash
cd /workspace/social-media-tool
bash scripts/setup.sh
npm run dev
```

Kurulum betiği kilit dosyasına göre bağımlılıkları kurar, Graphify 0.9.92'yi `/workspace/.tools` altına yükler, beceri kopyalarını doğrular, sunucu testlerini ve üretim derlemesini çalıştırır, kod grafını üretir ve Chromium testlerini tamamlar. Kalıcı kullanıcı verisini silmez. İnternet erişimi, paket kurulumu için npm ve PyPI; beceri kaynaklarını incelemek için GitHub gerektirir. Mevcut beceriler kurulumda internetten yeniden indirilmez.

Geliştirmede Vite 5173 portunu, API 3001 portunu kullanır. Her ikisi yalnızca `127.0.0.1` üzerinde dinler. Yerel tarayıcınızda 5173 portunu açabilirsiniz. Bulut onboarding arayüzü localhost önizleme bağlantılarını desteklemez.

Üretim derlemesini yerelde çalıştırmak için:

```bash
npm run build
npm start
```

Bu komut, derlenmiş arayüzü ve API'yi 3001 portunda sunar. Geliştirme sunucusu çalışırken aynı portta ikinci bir API başlatmayın. `PORT` değişkeni yalnızca tek sunuculu üretim çalıştırmasında kullanılabilir; geliştirme vekili 3001'e ayarlıdır. Bu Node/SQLite komutları yerel geliştirme içindir. Üretim Cloudflare Workers/D1/R2 sürümünü kullanır; yukarıdaki Cloudflare bölümüne bakın.

## Kullanım

1. İlk şirketinizi oluşturun; başka şirketleri **Şirketler** ekranından ekleyin.
2. **Aktif şirket** menüsünden hedef şirketi seçin. Gönderiyi yazın, görsel ekleyin ve platformları seçin.
3. **Temel metinleri hazırla** kaynak metni korur, şirket anahtar kelimelerinden etiket ekler. Özgün içerik uyarlaması için **ChatGPT talimatı oluştur** seçeneğini kullanın.
4. Talimatı ChatGPT'ye yapıştırın. Görsel gerekiyorsa ayrıca ekleyin. Yanıtın JSON nesnesinin tamamını **Yanıtı içe aktar** penceresine yapıştırın.
5. Her platformun metnini düzenleyin. İçeriğin doğruluğunu, sınırları ve kırpmayı kontrol edin. **Taslağı kaydet** ile saklayın; metin ve görselleri ayrı indirin.

Şirket değiştirmeden veya sayfayı kapatmadan önce taslağı kaydedin. Bir şirketi silmek o şirkete ait yerel taslakları ve görselleri de siler. Kullanıcı verisi `data/` altındadır ve Git'e eklenmez. Ortam silinmeden önce önemli içerikleri dışa aktarın veya `data/` dizininin yedeğini alın. Yedek alırken uygulamayı durdurun; SQLite veritabanı ile yan dosyalarını birlikte koruyun. Hesap bilgilerini koda, sohbetlere veya şirket profiline yazmayın.

## Kontroller

```bash
npm test                  # 12 sunucu testi; geçici veri dizini
npm run build             # TypeScript denetimi ve üretim derlemesi
npm run test:e2e          # 2 tarayıcı senaryosu; geçici veri dizini, port 3002
npm run test:e2e:auth     # 2 şifreli giriş / yönetici yetkisi tarayıcı senaryosu
npm run skills:verify     # 5 beceri / 38 kaynak dosyası
npm run graph             # API kullanmadan yerel Graphify analizi
```

Tarayıcı testleri bu ortamda `/usr/bin/chromium` kullanır. Farklı konum için `CHROMIUM_EXECUTABLE` belirtilebilir. Chromium bulunmazsa Playwright tarayıcısını ayrıca kurun; indirme alanlarına izin verilmesi gerekebilir. Testler kullanıcıya ait `data/` dizinine dokunmaz ve gerçek sosyal medya gönderisi oluşturmaz.

## Beceriler ve mimari

[Beceri kaynakları, sürümleri ve kullanım notları](docs/SKILLER.md) · [Mimari ve mevcut sınırlar](docs/MIMARI.md)

Graphify resmi `Graphify-Labs/graphify` kaynağından alınmış ayrı bir geliştirme aracıdır. Sosyal Studio, Graphify Labs ile bağlantılı veya onun tarafından onaylanmış bir ürün değildir. Geliştirme sırasında üretilen grafikler `graphify-out/` altındadır.
