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
3. Workers alt alan adını ve Zero Trust kuruluşunu mevcutsa kullanır; kuruluş yoksa resmi API ile oluşturmayı dener. Hesap için Dashboard başlangıcı zorunlu tutulursa Cloudflare hatası sonuç dosyasına yazılır. E-posta giriş kodu sağlayıcısını ve yalnızca bu sitenin Access uygulamasını hazırlar.
4. Arayüz ve API'yi yayınlar. Üretim ayarında yerel giriş istisnası bulunmaz. Access yapılandırması eksikse veriye erişim kapalı kalır.
5. Kısa ömürlü bir CI erişimiyle canlı arayüzü, D1 kayıt/okumayı ve seçilen depoda görsel yükleme/indirmeyi sınar. Deneme şirketini, dosyalarını ve geçici CI erişimini temizler.
6. Sonucu ve doğrulanmış adresi `deployment/cloudflare.json` dosyasıyla `main` dalına kaydeder. Bu dosya tek başına yeni dağıtım tetiklemez. GitHub Actions özeti de adresi gösterir. Başarısız sonuç başarı olarak işaretlenmez.

Canlı dağıtımın doğrulandığını söylemek için sonuç dosyasında `status: success` ve `verified: true` bulunmalıdır. Yerel emulator testleri tek başına canlı hesabın hazır olduğunu kanıtlamaz. Kaynaklar için ücretli plan yükseltmesi otomatik yapılmaz. R2 sonradan etkinleştirilirse sonraki dağıtım yeni görseller için R2'yi seçer; mevcut D1 görselleri okunmaya devam eder. Bucket adı `sosyal-studio-media` olmalı ve herkese açık erişim kapalı kalmalıdır. Zero Trust başlangıç işlemi gerekirse Cloudflare'in verdiği hata Actions kaydında ve dağıtım sonucunda görünür; işlem tamamlandıktan sonra iş akışı yeniden çalıştırılabilir.

## R2 kullanım sınırları

Kodda R2 Standard için aşağıdaki üst sınırlar sabittir:

| Kullanım | Sınır | Dolduğunda |
| --- | --- | --- |
| Toplam saklanan görseller | 10.000.000.000 bayt (10 GB) | Yeni yükleme durur; silme alan açar |
| Class A | UTC takvim ayında 1.000.000 işlem | Yeni yükleme sonraki aya kadar durur |
| Class B | UTC takvim ayında 10.000.000 işlem | Görsel okuma sonraki aya kadar durur |

Cloudflare depolamayı günlük tepe değerlerinin aylık ortalamasıyla ücretlendirir. Uygulama, ortalamayı beklemek yerine her an 10 GB altında kalır. Bir görselin 17 dosyası yüklemeden önce tek D1 işlemiyle ortak bütçeden ayrılır; eşzamanlı istekler kapasiteyi veya işlem kotasını aşamaz. Her dosyanın yazılması bir Class A, her indirme/önizleme bir Class B sayılır. Başarısız denemeler temkinli olarak işlem sayacından düşülmez. Standard depolama sınıfı kodda açıkça seçilir.

Sayaç ve dosya boyutları D1 içinde kalıcıdır; Worker yeniden başlaması veya dağıtım sayaçları sıfırlamaz. Yalnızca işlem sayaçları UTC ay başında yenilenir. Depolama, R2 silmeyi doğruladıktan sonra serbest kalır. Dosya listesi D1 kayıtlarından okunur; böylece silme için Class A harcanmaz. Ücretsiz DeleteObject işlemi kota dolduğunda da kullanılabilir. Sonucu belirsiz bir kesintide ayrılmış kapasite tutulur; kota eksik sayılmaz. Eski R2 görselleri yükseltmede dosya başına izin verilen en yüksek boyutla sayılır.

Giriş gerektiren `GET /api/storage/usage`, sınırları ve o ayın kullanımını döndürür. Kota aşıldığında API, Türkçe açıklamayla HTTP 429 verir. Bu koruma uygulamanın R2 veri işlemlerini kapsar; Cloudflare hesabının genel faturalandırma kilidi değildir. Başka bucket/uygulama kullanımı, Dashboard/S3 üzerinden dışarıdan yapılan işlemler ve kurulumdaki bucket yönetimi bu sayaçlara dahil değildir. Workers, D1 ve Access kendi planlarına tabidir. Bucket'a uygulama dışından dosya yüklemeyin veya yaşam döngüsüyle farklı depolama sınıfına geçirmeyin.

Kaynak: [Cloudflare R2 fiyatlandırması](https://developers.cloudflare.com/r2/pricing/).

## Zero Trust Free sınırları

Access için ücretsiz plan 50 aktif kullanıcı koltuğu içerir. Bu, aylık sıfırlanan bir istek kotası değildir. Hesaptaki Access ve Gateway kullanıcıları aynı havuzu kullanır; aynı kullanıcı iki servisi de kullansa bir koltuktur. Cloudflare, abonelikteki koltuklar dolunca ek kullanıcıların girişini engeller. Otomatik ücretli plan yükseltmesi yapılmaz. Uygulama içindeki bir kontrol girişten sonra çalışacağından koltuk sınırını sağlayıcının Free planı uygular.

Her dağıtım kaynakları değiştirmeden önce hesabın aboneliklerini API'den okur. Zero Trust planının Free olduğunu ve abonelik tutarının sıfır olduğunu doğrular; ücretli/deneme planı, belirsiz plan bilgisi veya 50'den fazla aktif koltuk varsa durur. Abonelik satın alma, plan değiştirme veya koltuk artırma API'si çağrılmaz. Aktif koltuk sayısı ve denetim tarihi dağıtım sonuç dosyasına yazılır; kullanıcı e-postaları yazılmaz. Hesap sahibi planı Dashboard'dan sonradan değiştirirse dağıtım denetimi bunu bir sonraki çalışmada görür; uygulama hesabın faturalandırmasını kilitleyemez.

Uygulama bir Access uygulamasını ve mevcut e-posta kodu sağlayıcısını tekrar kullanır. Varsayılan hesap sınırları da yeni kaynak oluşturulmadan denetlenir: 500 Access uygulaması, 50 kimlik sağlayıcı, 50 service token ve uygulama başına 1.000 politika. Bunlar hesap kaynak sınırlarıdır; ücretli kapasite satın alınmaz. CI doğrulaması bir saatlik geçici service token kullanır; token koltuk tüketmez ve işlem sonunda politikasıyla birlikte kaldırılır. Gateway, Tunnel, DLP veya başka ücretli Zero Trust özelliği kurulmaz. Diğer uygulamaların kullanıcıları veya politikaları otomatik silinmez.

Kaynaklar: [Cloudflare koltuk yönetimi](https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/) · [Hesap kaynak sınırları](https://developers.cloudflare.com/cloudflare-one/account-limits/) · [Zero Trust planları](https://www.cloudflare.com/plans/zero-trust-services/).

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
npm run test:cloud      # 19 D1/R2, kota ve JWT testi
npm run test:deploy     # 12 kaynak hazırlama testi; dış servise bağlanmaz
npm run test:e2e:cloud  # 2 tarayıcı akışı; D1 + R2
npm run test:e2e:d1     # Aynı 2 akış; görseller de D1 üzerinde
```

Cloudflare doğrudan API erişimi olmayan geliştirme ortamlarında da dağıtım GitHub Actions tarafından yapılabilir. Sonuç, Git üzerinden okunabilen dağıtım dosyasında görünür. Siteye erişim, Cloudflare kaynaklarının oluşması ve uygulama davranışının doğrulanması ayrı sonuçlardır; yalnızca doğrulanan durum raporlanmalıdır.
