# GitHub ve Cloudflare dağıtımı

Uygulamanın kaynak kodu `mucaeksi/social-media-tool` deposunun `main` dalında tutulur. Kullanıcının talimatıyla geliştirme güncellemeleri bu dala gönderilir. `.github/workflows/cloudflare.yml`, her kaynak güncellemesinde testleri çalıştırır ve başarılıysa Cloudflare'e dağıtır.

## Bileşenler

| Bileşen | Konum |
| --- | --- |
| Türkçe arayüz ve API | Cloudflare Workers, `sosyal-studio` |
| Şirketler, taslaklar, görsel kayıtları | Cloudflare D1, `sosyal-studio` |
| İşlenmiş görseller | Cloudflare R2, `sosyal-studio-media`; R2 etkin değilse D1 |
| Kullanıcılar, şifre özetleri, oturumlar | Cloudflare D1 |
| Sosyal hesap kayıtları, şifreli çerezler | Cloudflare D1 |
| Deneysel sosyal hesap tarayıcısı, tek oturum ve süre bütçesi | Cloudflare Browser Run + SQLite Durable Object |
| Kaynak kod, testler, dağıtım otomasyonu | GitHub |

Görseller kullanıcının tarayıcısında üstveriden arındırılmış JPEG olarak hazırlanır ve Cloudflare'e yüklenir. Kaynak görselin uzun kenarı en fazla 2560 piksel olur; her platform için beyaz dolgu ve merkezden kırpma seçenekleri ayrı dosyalardır. Tek paket en fazla 16 MB, dosya en fazla 4 MB olabilir. D1 taslak kayıtları 1 MB ile sınırlandırılır. Sunucu, JPEG başlıklarını ve hedef boyutlarını denetler; dosyalar Cloudflare'de özel kalır ve yalnızca doğrulanmış isteklerle sunulur. Harici bir görsel dönüştürme servisi veya ayrı Node sunucusu kullanılmaz.

## Secret kullanımı

GitHub repository secret **`CLOUDFLARE_API`**, Actions dağıtım adımında `CLOUDFLARE_API_TOKEN` olarak bağlanır. Bu değer Cloudflare API token'ı olmalıdır. Anahtar kaynak dosyalara, tarayıcı paketine, dağıtım sonuç dosyasına veya loglara yazılmaz. Kod secret değerini GitHub'dan indirmeye çalışmaz; değeri GitHub Actions güvenli biçimde sürece sağlar.

Token tek hesaba erişiyorsa hesap kimliği otomatik bulunur. Birden fazla hesap varsa dağıtım rastgele hesap seçmez; hedef hesabın kimliği `CLOUDFLARE_ACCOUNT_ID` repository variable veya secret ile belirtilmelidir. Token'ın Workers, D1, R2 ve Access kaynaklarını yönetebilmesi gerekir.

## Dağıtımın yaptığı işlemler

1. Sunucu, D1/R2, şifreli giriş, yönetici yetkisi, dağıtım hazırlığı, masaüstü ve mobil tarayıcı kontrollerini çalıştırır.
2. Aynı adlı D1 ve R2 kaynaklarını kullanır; yoksa oluşturur. R2 etkin değilse görselleri D1 içinde 1 MB parçalar halinde saklar. Yetki hatalarını bu istisna kapsamında değerlendirmez. Şemaya eklemeli migration uygular; mevcut şirket ve taslaklar korunur.
3. Şifreli kullanıcı oluşturma isteği varsa CI içinde çözüp D1'e uygular. Etkin yönetici yoksa yeni giriş sürümünü yayımlamaz. İlk kurulum ve sonraki hesaplar aşağıdaki güvenli aktarım kanalını kullanır.
4. Worker'ı `AUTH_MODE=password` ile yayımlar. Yerel giriş istisnası üretimde bulunmaz. Yeni Worker ayarı ve etkin yönetici kaydı doğrulandıktan sonra yalnızca bu sitenin eski Access uygulamasını kaldırır. Başka Access uygulamaları ve kuruluş ayarları korunur.
5. Oturumsuz API erişiminin kapalı olduğunu, şifreyle girişi, güvenli çerezi, yönetici/editör ayrımını, çıkışta oturum iptalini, şirket/taslak kaydını ve görsel yükleme/indirmeyi canlıda sınar. Geçici test hesabı, oturumları ve dosyaları temizlenir.
6. Doğrulanan sonucu/adresi `deployment/cloudflare.json`, sonraki kullanıcı işlemi için yalnızca açık anahtarı `deployment/auth-bootstrap.json` ile `main` dalına kaydeder. Bu dosyalar yeni dağıtım tetiklemez; özel anahtar veya kullanıcı sırrı yazılmaz.

Canlı dağıtımın doğrulandığını söylemek için sonuç dosyasında `status: success` ve `verified: true` bulunmalıdır. Yerel emulator testleri tek başına canlı hesabın hazır olduğunu kanıtlamaz. Kaynaklar için ücretli plan yükseltmesi otomatik yapılmaz. R2 sonradan etkinleştirilirse sonraki dağıtım yeni görseller için R2'yi seçer; mevcut D1 görselleri okunmaya devam eder. Bucket adı `sosyal-studio-media` olmalı ve herkese açık erişim kapalı kalmalıdır. Zero Trust kuruluşu veya yeni e-posta kodu sağlayıcısı kurulmaz.

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

## Sosyal hesap tarayıcısı

Üretimde `BROWSER` tarayıcı bağlantısı ve `SOCIAL_BROWSER` SQLite Durable Object eklenir. `social-browser-v1` migration mevcut D1/R2 verilerini değiştirmez; sosyal hesap tablosu eklemeli `0005_social_accounts.sql` ile kurulur. `BROWSER_STATE_KEY` yalnızca Worker secret olarak hazırlanır; her dağıtımda var olan anahtar korunur. Tarayıcıyı yöneten API, uygulamanın mevcut şifreli girişini ve admin rolünü zorunlu tutar. Yerel sürümde gerçek Cloudflare tarayıcısı etkin değildir.

[Kullanım, doğrulanan platformlar ve 10 dakikalık günlük sınır](HESAP_GIRISI.md). Canlı panel kontrolü `Sosyal hesap tarayıcısı kontrolü` workflow'unda `panel=true` ile açıkça çalıştırılır. Geçici yönetici, şirket ve Instagram kayıtları oluşturur; gerçek giriş formunu ve oturumsuz sayfanın kaydedilmeden kapanmasını sınar, ardından test kayıtlarını temizler. Kullanıcının açık tarayıcısı varsa kontrol durur. Gerçek sosyal hesap şifresi veya gönderi kullanılmaz.

## Zero Trust Free sınırları

Access için ücretsiz plan 50 aktif kullanıcı koltuğu içerir. Bu, aylık sıfırlanan bir istek kotası değildir. Hesaptaki Access ve Gateway kullanıcıları aynı havuzu kullanır; aynı kullanıcı iki servisi de kullansa bir koltuktur. Cloudflare, abonelikteki koltuklar dolunca ek kullanıcıların girişini engeller. Otomatik ücretli plan yükseltmesi yapılmaz. Uygulama içindeki bir kontrol girişten sonra çalışacağından koltuk sınırını sağlayıcının Free planı uygular.

Her dağıtım kaynakları değiştirmeden önce hesabın aboneliklerini API'den okur. Zero Trust planının Free olduğunu ve abonelik tutarının sıfır olduğunu doğrular; ücretli/deneme planı, belirsiz plan bilgisi veya 50'den fazla aktif koltuk varsa durur. Abonelik satın alma, plan değiştirme veya koltuk artırma API'si çağrılmaz. Aktif koltuk sayısı ve denetim tarihi dağıtım sonuç dosyasına yazılır; kullanıcı e-postaları yazılmaz. Hesap sahibi planı Dashboard'dan sonradan değiştirirse dağıtım denetimi bunu bir sonraki çalışmada görür; uygulama hesabın faturalandırmasını kilitleyemez.

Panelin kullanıcı adı/şifre girişi Access koltuğu tüketmez. Bu hesaptaki başka Access/Gateway kullanımları için Free plan denetimi korunur; yeni Access uygulaması, sağlayıcı veya service token oluşturulmaz. Uygulamanın kendi D1 kullanıcı sayısı ayrıca 50 ile sınırlıdır; bu, Access koltuğundan ayrı bir uygulama sınırıdır. Gateway, Tunnel, DLP veya ücretli özellik kurulmaz. Başka uygulamaların kullanıcıları veya politikaları silinmez.

Kaynaklar: [Cloudflare koltuk yönetimi](https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/) · [Hesap kaynak sınırları](https://developers.cloudflare.com/cloudflare-one/account-limits/) · [Zero Trust planları](https://www.cloudflare.com/plans/zero-trust-services/).

## Giriş, yönetici hesabı ve kullanıcı oluşturma

Giriş ekranı tamamen Türkçedir. Kullanıcı adı veya e-posta ve şifre kabul eder. Açık kayıt ve e-posta kodu akışı yoktur. Yönetici, `GET/POST /api/admin/users` ile kullanıcıları listeleyip oluşturabilir; editör bu uç noktalara erişemez. Hesaplar aynı çalışma alanını kullanır; şirket bazında kullanıcı yetkisi, davet e-postası ve şifre sıfırlama ekranı henüz uygulanmadı.

Şifreler rastgele 32 bayt tuz ve WebCrypto PBKDF2-SHA256 (Workers'ın desteklediği 100.000 iterasyon) ile özetlenir. Düz şifre D1'e yazılmaz. Sekiz saatlik oturumlar rastgele 256 bit belirteç kullanır; D1'de yalnızca belirteç özeti tutulur. Üretim çerezi `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` kullanır. Çıkış belirteci D1'den siler. Devre dışı hesap ve süresi dolmuş oturum reddedilir. Yazma isteklerinde aynı Origin zorunludur. Giriş denemeleri IP başına 15 dakikada 10, kullanıcı adı başına 20 ile sınırlıdır; yanlış şifre ve olmayan hesap aynı yanıtı alır.

### Asistan üzerinden hesap oluşturma

GitHub repository secret değerleri indirilmez ve yeni secret yazma izni varsayılmaz. `admin-bootstrap.yml`, mevcut `CLOUDFLARE_API` ile D1'de yedi günlük RSA-3072 aktarım anahtarı hazırlar; yalnızca açık anahtar GitHub'a çıkar. `workflow_dispatch` ile gerektiğinde yenilenebilir; yenileme eski aktarım anahtarını iptal eder. Yeni zarfı güncel açık anahtarla hazırlayın. Özel anahtar sadece özel D1 veritabanında kalır.

Asistan, yetkilendirilmiş kullanıcı bilgilerini bu açık anahtarla RSA-OAEP-SHA256 + AES-256-GCM kullanarak şifreler. `.github/admin-request.json` yalnızca şifreli zarfı içerir; düz şifre, e-posta ve şifre özeti kaynak kodda bulunmaz. Zarfın içindeki istek kimliği AAD ile bağlanır. Hesap oluşturma isteği benzersiz kimliğiyle bir kez uygulanır; mevcut kullanıcının şifresi veya rolü yeniden dağıtımla değişmez. Kullanıcı kaydı ve işlem kaydı tamamlanınca kullanılan özel anahtar silinir; sonraki işlem için yeni açık anahtar hazırlanır. Kesinti sonrası tekrar çalıştırma aynı kullanıcıyı yeniden oluşturmaz. Süresi dolmuş, değiştirilmiş veya başka anahtarla hazırlanmış zarf reddedilir.

İlk oluşturma sırasında şifreli zarfın içindeki geçici doğrulama şifresi yalnızca CI belleğinde canlı giriş kontrolü için kullanılır; çıktılarda maskelenir ve kaydedilmez. Şifre özeti loglarda maskelenir. Özel anahtar hiçbir çıktı veya workflow komutuna gönderilmez; hata metinleri ayrıca gizli değerlerden arındırılır. Gelecekte yeni kullanıcı için yeni istek kimliği ve güncel açık anahtar kullanılır. Gerçek hesap bilgilerini test verisine, komut dosyalarına, belgelere veya düz metin GitHub girdilerine koymayın.

## Yerelde Cloudflare sürümünü deneme

```bash
npm ci
npm run build
npm run cf:migrate:local
npm run cf:dev
```

Bu komutlar yalnızca geliştirme için yerel D1/R2 emulatorünü kullanır; canlı Cloudflare verisine dokunmaz. Yerel giriş istisnası hem geliştirme ayarını hem localhost adresini gerektirir; `workers.dev` üzerinde geçerli değildir. Üretim yapılandırması Actions içinde ayrı üretilir ve Git'e alınmaz.

```bash
npm run test:cloud      # 30 D1/R2, kota, oturum ve güvenlik testi
npm run test:deploy     # 18 kaynak hazırlama, maskeleme ve güvenli geçiş testi; dış servise bağlanmaz
npm run test:e2e:cloud  # 2 tarayıcı akışı; D1 + R2
npm run test:e2e:d1     # Aynı 2 akış; görseller de D1 üzerinde
npm run test:e2e:auth   # 2 tarayıcı akışı; şifreli giriş, çıkış ve yönetici yetkisi
```

Cloudflare doğrudan API erişimi olmayan geliştirme ortamlarında da dağıtım GitHub Actions tarafından yapılabilir. Sonuç, Git üzerinden okunabilen dağıtım dosyasında görünür. Siteye erişim, Cloudflare kaynaklarının oluşması ve uygulama davranışının doğrulanması ayrı sonuçlardır; yalnızca doğrulanan durum raporlanmalıdır.
