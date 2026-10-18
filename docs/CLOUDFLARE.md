# GitHub ve Cloudflare dağıtımı

Uygulamanın kaynak kodu `mucaeksi/social-media-tool` deposunun `main` dalında tutulur. Kullanıcının talimatıyla geliştirme güncellemeleri bu dala gönderilir. `.github/workflows/cloudflare.yml`, her kaynak güncellemesinde testleri çalıştırır ve başarılıysa Cloudflare'e dağıtır.

## Bileşenler

| Bileşen | Konum |
| --- | --- |
| Türkçe arayüz ve API | Cloudflare Workers, `sosyal-studio` |
| Şirketler, taslaklar, görsel kayıtları | Cloudflare D1, `sosyal-studio` |
| İşlenmiş görseller | Cloudflare R2, `sosyal-studio-media`; R2 etkin değilse D1 |
| E-posta giriş doğrulaması | Cloudflare Access / Zero Trust |
| Kaynak kod, testler, dağıtım otomasyonu | GitHub |

Görseller kullanıcının tarayıcısında üstveriden arındırılmış JPEG olarak hazırlanır ve Cloudflare'e yüklenir. Kaynak görselin uzun kenarı en fazla 2560 piksel olur; her platform için beyaz dolgu ve merkezden kırpma seçenekleri ayrı dosyalardır. Tek paket en fazla 16 MB, dosya en fazla 4 MB olabilir. D1 taslak kayıtları 1 MB ile sınırlandırılır. Sunucu, JPEG başlıklarını ve hedef boyutlarını denetler; dosyalar Cloudflare'de özel kalır ve yalnızca doğrulanmış isteklerle sunulur. Harici bir görsel dönüştürme servisi veya ayrı Node sunucusu kullanılmaz.

## Secret kullanımı

GitHub repository secret **`CLOUDFLARE_API`**, Actions dağıtım adımında `CLOUDFLARE_API_TOKEN` olarak bağlanır. Bu değer Cloudflare API token'ı olmalıdır. Anahtar kaynak dosyalara, tarayıcı paketine, dağıtım sonuç dosyasına veya loglara yazılmaz. Kod secret değerini GitHub'dan indirmeye çalışmaz; değeri GitHub Actions güvenli biçimde sürece sağlar.

Token tek hesaba erişiyorsa hesap kimliği otomatik bulunur. Birden fazla hesap varsa dağıtım rastgele hesap seçmez; hedef hesabın kimliği `CLOUDFLARE_ACCOUNT_ID` repository variable veya secret ile belirtilmelidir. Token'ın Workers, D1, R2 ve Access kaynaklarını yönetebilmesi gerekir.

## Dağıtımın yaptığı işlemler

1. Sunucu, D1/R2, Access imzası, dağıtım hazırlığı, masaüstü ve mobil tarayıcı kontrollerini çalıştırır.
2. Aynı adla mevcut D1 ve R2 kaynaklarını kullanır; yoksa oluşturur. R2 henüz etkin değilse görselleri D1 içinde 1 MB parçalar halinde saklar. Yetki hatalarını bu istisna kapsamında değerlendirmez. Başka isimli kaynakları silmez. Veritabanı şemasına eklemeli migration uygular.
3. Workers alt alan adını ve Zero Trust kuruluşunu mevcutsa kullanır. E-posta giriş kodu sağlayıcısını ve yalnızca bu sitenin Access uygulamasını hazırlar.
4. Arayüz ve API'yi yayınlar. Üretim ayarında yerel giriş istisnası bulunmaz. Access yapılandırması eksikse veriye erişim kapalı kalır.
5. Kısa ömürlü bir CI erişimiyle canlı arayüzü, D1 kayıt/okumayı ve seçilen depoda görsel yükleme/indirmeyi sınar. Deneme şirketini, dosyalarını ve geçici CI erişimini temizler.
6. Sonucu ve doğrulanmış adresi `deployment/cloudflare.json` dosyasıyla `main` dalına kaydeder. Bu dosya tek başına yeni dağıtım tetiklemez. GitHub Actions özeti de adresi gösterir. Başarısız sonuç başarı olarak işaretlenmez.

Canlı dağıtımın doğrulandığını söylemek için sonuç dosyasında `status: success` ve `verified: true` bulunmalıdır. Yerel emulator testleri tek başına canlı hesabın hazır olduğunu kanıtlamaz. Kaynaklar için ücretli plan yükseltmesi otomatik yapılmaz. R2 sonradan etkinleştirilirse sonraki dağıtım yeni görseller için R2'yi seçer; mevcut D1 görselleri okunmaya devam eder. Bucket adı `sosyal-studio-media` olmalı ve herkese açık erişim kapalı kalmalıdır. Zero Trust başlangıç işlemi gerekirse Cloudflare'in verdiği hata Actions kaydında ve dağıtım sonucunda görünür; işlem tamamlandıktan sonra iş akışı yeniden çalıştırılabilir.

## Şimdiki giriş ve üyelik durumu

Kullanıcının isteğiyle **doğrulanmış tüm e-posta adresleri** giriş yapabilir. Politika `allow` kullanır; doğrulamayı atlayan `bypass` kullanılmaz. Worker ayrıca Access JWT imzasını, süresini, sağlayıcısını ve uygulama hedefini doğrular. Sahte e-posta başlığı yeterli değildir.

Henüz kullanıcı oluşturma, davet, roller veya kullanıcıya göre şirket yetkisi yoktur. Giriş yapanlar aynı çalışma alanını kullanır. Kullanıcının hesapları kendisinin açacağı üyelik sistemi sonraki aşamadır. Üyelik hazır olmadan bu ayrımı varmış gibi göstermeyin.

## Yerelde Cloudflare sürümünü deneme

```bash
npm ci
npm run build
npm run cf:migrate:local
npm run cf:dev
```

Bu komutlar yalnızca geliştirme için yerel D1/R2 emulatorünü kullanır; canlı Cloudflare verisine dokunmaz. Yerel giriş istisnası hem geliştirme ayarını hem localhost adresini gerektirir; `workers.dev` üzerinde geçerli değildir. Üretim yapılandırması Actions içinde ayrı üretilir ve Git'e alınmaz.

```bash
npm run test:cloud      # 11 D1/R2 ve JWT testi
npm run test:deploy     # 6 kaynak hazırlama testi; dış servise bağlanmaz
npm run test:e2e:cloud  # 2 tarayıcı akışı; D1 + R2
npm run test:e2e:d1     # Aynı 2 akış; görseller de D1 üzerinde
```

Cloudflare doğrudan API erişimi olmayan geliştirme ortamlarında da dağıtım GitHub Actions tarafından yapılabilir. Sonuç, Git üzerinden okunabilen dağıtım dosyasında görünür. Siteye erişim, Cloudflare kaynaklarının oluşması ve uygulama davranışının doğrulanması ayrı sonuçlardır; yalnızca doğrulanan durum raporlanmalıdır.
