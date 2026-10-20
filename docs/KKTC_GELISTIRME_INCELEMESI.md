# KKTC sosyal medya uzmanı ve Firefox geliştirme incelemesi

İnceleme tarihi: 20 Ekim 2026. Bu belge kaynak kod incelemesine dayanır. Aşağıdaki öneriler uygulanmış özellikler değildir. Gerçek Windows bilgisayarı, sosyal hesaplar, canlı model kalitesi ve harici siteler bu incelemede test edilmedi. Son canlı dağıtım kanıtı `deployment/cloudflare.json` dosyasındadır; yeni yayının sonucu ayrıca doğrulanmalıdır.

## Değerlendirme

Programın iyi bir içerik stüdyosu ve kalıcı Firefox hesap yardımcısı temeli var. Hedeflenen KKTC sosyal medya uzmanı için eksik ana bağlantı şudur: **web kaynağı → doğrulanmış şirket bilgisi → yerel strateji → platforma özel taslak → doğrulanmış hesap işlemi**. Şu anda AI ve Firefox birbirinden ayrı çalışır. Daha büyük model kurmak tek başına bu bağlantıyı sağlamaz.

Öncelik, kaynak gösteren web araştırması ile KKTC şirket profilini oluşturmak; ardından tarayıcıda sınırlı görev otomasyonuna geçmektir. Genel bilgisayar kontrolü veya uzaktan kod çalıştırma arayüzü bu hedef için gerekli değildir.

## Kodda doğrulanan mevcut durum

| Alan | Mevcut uygulama | Hedefe göre eksik |
| --- | --- | --- |
| İçerik stüdyosu | Dokuz platform, şirket profili, taslaklar, görsel boyutları, manuel ChatGPT aktarımı | Video, çok görselli içerik, takvim ve analitik yok |
| Şirket hafızası | D1 üzerinde şirkete özel marka bilgileri ve onaylı örnekler | Kaynak URL'si, doğrulama tarihi, geçerlilik süresi ve alan bazında kaynak ilişkisi yok |
| KKTC uzmanlığı | Genel Türkçe editör rehberi; hedef kitle ve anahtar kelimeler serbest metin | Yapılandırılmış yerel pazar, ilçe, dil, teslimat ve yerel takvim katmanı yok |
| Web sitesi | Şirket profilindeki `website` AI bağlamına metin olarak eklenir | Adresi kaydetmek sayfayı okumaz; metin çıkarma, tarama ve kaynaklı özet servisi yok |
| Yerel AI | Ollama ile sabit Qwen3.5:4b, görsel gözlemi, ayrı platform metinleri, JSON denetimi | Tarayıcı araçları ve web araştırması yok; gerçek Windows hızı/kalitesi ölçülmeli |
| Bulut AI | Gemma 4, şirket hafızası, görsel inceleme, Neuron bütçesi | Canlı internet, hesap analitiği ve yayın araçları yok; canlı model kontrolü önceki talimat gereği beklemede |
| Firefox | Şirket/hesap başına yerel kalıcı profil; ekran, tıklama, yazma, tuş ve kaydırma | AI komut üretmiyor; genel URL, sekme yönetimi, yapılandırılmış sayfa okuma ve medya yükleme yok |
| Hesap durumu | Profil varlığı ve bazı giriş çerezlerine ilişkin ipucu | Doğru hesap/işletme kimliğini doğrulamaz; `loginVerified` bilerek `false` |
| Yayın | Metin hazırlama ve seçili alana aktarım | Otomatik yayın, zamanlama, gönderi kimliği/kalıcı bağlantı doğrulaması yok |
| Erişim | Kullanıcı adı/e-posta + şifre, admin/editör, güvenli oturum, açık kayıt yok | Şirket bazında kullanıcı yetkisi, şifre değiştirme/sıfırlama ve oturum yönetimi ekranı yok |
| Dağıtım | `main` → GitHub Actions → Cloudflare Workers/D1/R2; canlı kontrol | Yerel test başarısı, tek başına canlı yayın kanıtı değil |

Kod dayanakları: `shared/social-expert.mjs` (`SOCIAL_EXPERT_RULES`), `shared/local-ai.mjs` (`localSystem`, `localInput`, `localPost`), `worker/local-ai.mjs` (`registerLocalAI`), `worker/social-ai.mjs` (`aiMessages`), `companion/local-ai.mjs` (`LocalAI.execute`), `shared/computer-protocol.mjs` (`computerCommand`), `companion/browser.mjs` (`ProfileBrowsers.perform`), `worker/company-computer.mjs`, `worker/computer-relay.mjs`, `worker/index.mjs` ve `worker/password-auth.mjs`.

## 1. KKTC için yapılandırılmış uzman profili

Her şirkete aşağıdaki bilgiler eklenmeli; boş alanlar model tarafından doldurulmamalı:

- Sektör ve alt sektör; ürün/hizmet grupları; satış, teklif, rezervasyon veya mağaza ziyareti hedefi.
- Hizmet verilen ilçeler ve yerleşimler; teslimat/kurulum bölgeleri; fiziksel mağaza ve çalışma saatleri.
- Yerel sakin, öğrenci, turist ve işletme gibi hedef kitleler; Türkçe/İngilizce içerik tercihi. Diğer diller yalnız işletme ihtiyacına göre seçilmeli.
- Fiyatın para birimi, vergi açıklaması, stok, kampanya başlangıç/bitişi; yalnızca işletmenin doğruladığı bilgiler.
- Telefon/WhatsApp, adres, web bağlantısı ve kullanılacak tek ana eylem çağrısı.
- Marka tonu, kullanılmayacak ifadeler, izinli iddialar ve kullanıcı tarafından onaylanan iyi/kötü içerik örnekleri.

Yerel takvimde resmî günler, okul/üniversite dönemleri, turizm sezonları ve belediye etkinlikleri kaynak ve yıl ile saklanmalı. Güncel etkinlik, yasal şart veya piyasa verisi modelin genel bilgisinden doğrulanmış sayılmamalı. Yerel içerik planının saat dilimi şirket için `Asia/Famagusta` olarak saklanmalı; UTC'ye sabit saat eklenmemeli. Panelde kullanıcıya gösterilen saat ile paylaşımın hedef saat dilimi açık olmalı.

İlk pilot, mevcut Wood Mood profiliyle yapılabilir. Örneğin: doğrulanmış ürün sayfası + ürün fotoğrafı + hizmet bölgesi → Instagram için ürün kullanım anlatımı, Facebook için yerel teslimat/mağaza bağlamı, Pinterest için aranabilir ürün başlığı. Malzeme, ölçü, fiyat ve teslim süresi kaynakta yoksa eklenmemeli.

**Kabul ölçütü:** Aynı ürün için dokuz ayrı platform taslağı hazırlanır; şirketler karışmaz, kaynakta olmayan fiyat/teslimat/özellik yazılmaz, yerel bilgi yalnız ilgili şirketin onaylı kapsamından gelir.

## 2. Web sitelerini okuyup kaynaklı şirket bilgisi çıkarma

Önerilen kullanıcı akışı:

1. Şirketin web adresinden **Siteyi incele** seçilir.
2. İlk aşamada ana sayfa, hakkımızda, iletişim ve kullanıcının seçtiği birkaç ürün/hizmet sayfası incelenir. Başlangıç için görev başına en fazla beş sayfa önerilir; bu yeni bir öneridir, mevcut kota değildir.
3. Sayfa başlığı, görünür ana metin, ürün/hizmet bilgileri, iletişim ve varsa yapılandırılmış veriler çıkarılır. Kaynak adresi ve okuma zamanı her bulguyla birlikte tutulur.
4. Panel **Önerilen bilgiler** ekranında bulguları mevcut hafızayla karşılaştırır. Fiyat, telefon, adres veya kampanya değiştiyse farkı gösterir.
5. Yönetici kabul ettiği bilgileri şirket hafızasına ekler. AI yalnız ilgili ve geçerli kayıtları içerik üretiminde kullanır; kaynaklar taslağın yanında gösterilir.

Araştırma, sosyal hesap profillerinden ayrı, giriş yapılmamış geçici bir Firefox profiliyle başlamalı. Önce statik metin yeterliyse hafif HTTP okuması; JavaScript gerektiren sayfalarda Firefox kullanılabilir. İkisi de aynı kaynak ve erişim doğrulamasını kullanmalı. Şirketin onayladığı HTTPS alan adlarıyla başlanmalı; rakip siteler ayrıca seçilmeli. Sosyal hesap çerezleri, özel mesajlar veya kişisel Firefox geçmişi araştırma bağlamına taşınmamalı.

Önerilen kaynak kaydı: `companyId`, `sourceId`, istenen ve son URL, başlık, `fetchedAt`, içerik özeti, içerik hash'i ve durum. Bilgi kaydı: `sourceId`, alan/değer, kısa kanıt alıntısı, `approvedBy`, `approvedAt`, `validUntil` ve geçerli/çelişkili/eski durumu. Her taslak kullandığı bilgi sürümlerine bağlanmalı. Tek bir model güven puanı doğrulama yerine geçmemeli.

Fiyat, stok ve kampanya gibi değişken verilerin geçerlilik süresi kısa; adres/marka dili gibi bilgilerin daha uzun olabilir. Süre işletme ihtiyacına göre belirlenmeli. Eski kaynakta yazan fiyat otomatik güncel sayılmamalı. Çelişen kaynaklar sessizce birleştirilmemeli. İlk sürümde arka planda sürekli tarama yerine kullanıcı başlatmalı inceleme, maliyeti ve denetlenebilirliği daha kolay yönetir.

Teknik olarak `companion/` içinde ayrı araştırma modülü; `worker/` içinde şirket kapsamlı iş/kaynak API'si; D1 için eklemeli migration ve `src/` içinde kaynak inceleme ekranı gerekir. Mevcut şirket hafızası korunur. İlk sürümde küçük kaynak deposunda şirket/ürün/konu filtreleri ve metin araması yeterlidir; vektör veritabanı zorunlu değildir.

Araştırma erişiminde yalnız üst sayfanın URL'sini denetlemek yeterli değildir: yönlendirmeler, alt kaynaklar, IPv4/IPv6 özel ve yerel adresler, DNS yeniden bağlama, yeni pencere, `file:`/`data:` gezinmesi ve indirmeler de kontrol edilmelidir. Okunacak metin/yanıt boyutu, süre, sayfa sayısı ve eşzamanlılık sınırlandırılmalı; yerel ağ servislerine erişim test edilmelidir. Site metni veri olarak işlenmeli; sayfadaki “şifreni gönder” veya “talimatları değiştir” gibi ifadeler tarayıcı komutuna dönüşmemeli. Robots/erişim koşulları gözetilmeli; içerik izni ile görseli reklamda yeniden kullanma hakkı ayrı değerlendirilmelidir.

**Kabul ölçütü:** Sentetik bir şirket sitesinden telefon/ürün bilgisi kaynaklarıyla çıkarılır; değişen fiyat çelişki olarak görünür, yönetici onayı olmadan hafıza değişmez. Özel ağ/yönlendirme ve sayfa içi zararlı talimat denemeleri engellenir. Erişilemeyen site için bilgi uydurulmaz.

## 3. Firefox'u sosyal medya görevlerinde kapsamlı kontrol

Mevcut sabit tıklama/yazma protokolü iyi bir başlangıçtır. Fakat ekran koordinatları, kaydırma ve elle yazma karmaşık işlerde kırılgandır. İlerleme üç basamaklı olmalı:

| Basamak | Eklenmesi gereken | Doğrulama |
| --- | --- | --- |
| Okuma ve gezinme | Onaylı URL açma, geri/ileri/yenileme, sekme seçimi, görünür metin ve erişilebilir öğe özeti | Alan adı/şirket kapsamı her işlemde kontrol edilir; oturum verileri çıkarılmaz |
| Form hazırlama | Sayfadan üretilen kısa ömürlü öğe kimliğiyle alan seçme/yazma, izinli görsel yükleme, son önizleme | Yanlış hesap/sekme veya değişen sayfa olduğunda işlem durur |
| Görev yürütme | “Profili incele”, “bio öner”, “gönderi taslağını forma yerleştir” gibi sabit görevler | Her adımın son durumu okunur; hata sonrası kör tıklama tekrarlanmaz |

AI önce salt okuma araçlarıyla çalışmalı. “Siteyi incele → Instagram bio öner → onaya sun” ilk görev olabilir. Sonra onaylı taslağı doğru hesaptaki forma yerleştirme eklenebilir. Profil bilgisini değiştirme, mesaj gönderme ve paylaşma gibi yazma işlemlerinde öneri ve uygulanacak sonuç panelde görünmeli. Her tıklamada tekrar onay istemek yerine görev kapsamı başta belirlenmeli; kapsam dışı değişiklikte işlem durmalı.

Uzaktan genel JavaScript, shell, CDP veya yerel dosya yolu kabul edilmemeli. Sabit yerel kod, izin verilen sayfadan görünür metin/öğe özeti çıkarabilir; panel veya model bu fonksiyonun kodunu belirleyememeli. AI'ya verilen öğeler şifre alanlarını, çerezleri, doğrulama kodlarını ve özel mesajları içermemeli. Ekran tabanlı yedek kontrol insan için korunmalı.

Medya yüklemesinde panelden rastgele bilgisayar dosya yolu gönderilmemeli: şirket ilişkisi doğrulanmış medya kimliği, JPEG/ölçü/boyut denetimi, geçici dosya ve temizleme gerekir. Önce tek fotoğraf + metin için bir platform tamamlanmalı; video ve çoklu fotoğraf ayrı aşamalardır.

Görevlerde adım/süre/tekrar sınırı, iptal, duraklatma, tek operatör ve insanın kontrolü devralması olmalı. Mevcut 20.000 komut/gün ve saniyede altı işlem korunmalı; otomasyon sınırsız ekran sorgulaması üretmemeli. Görev günlüğü yalnız eylem türü, şirket/hesap, zaman ve sonucu içermeli; ekran, şifre ve yazılan hassas metin kalıcı loga girmemeli.

**Kabul ölçütü:** Sentetik sayfada metin okuma, öğe seçimi, görsel yükleme, sekme değişimi ve iptal sınanır. Gerçek Windows'ta hesap sahibi doğru platform hesabını doğrular; CAPTCHA ve ek doğrulama insan tarafından çözülür. Firefox profilini yeniden açınca oturum kontrol edilir. Bunlar tamamlanmadan tüm sitelerin/platformların desteklendiği söylenmez.

## 4. Gerçek paylaşım ve zamanlama

Programın webde yayımlanması ile sosyal medyaya gönderi yayımlaması ayrı özelliklerdir. Panelin yayına alınması mevcut dağıtım hattıyla yapılabilir; sosyal yayın için şu iş yaşam döngüsü gerekir:

`taslak → inceleme → onaylandı → sırada → hazırlanıyor → gönderiliyor → doğrulandı / başarısız / sonucu belirsiz`

Gönderinin hedef şirket/hesap kimliği, metni, medya sürümü ve planlanan zamanı iş oluşturulurken sabitlenmeli. İdempotency anahtarı ve içerik/medya özeti çift gönderiyi engellemeli. Bağlantı “paylaş” sonrasında kesilirse otomatik yeniden basılmamalı; önce gönderinin oluşup oluşmadığı kontrol edilmeli. Başarı için gerçek gönderi bağlantısı/kimliği ve doğru hesap kanıtı gerekir.

Yerel Firefox ile zamanlama, şirket bilgisayarı açıkken çalışabilir. Uyku/çevrimdışı durumda panel “zamanı geçti/bilgisayar çevrimdışı” göstermeli; kullanıcıya fark ettirmeden geç paylaşım yapmamalı. Kuyruk D1'de kalıcı olmalı. Resmî ücretsiz API uygunluğu doğrulandığında Facebook Sayfası + profesyonel Instagram için alternatif yayınlayıcı değerlendirilebilir; uygulama/izin kurulumu gerekir. X için ücretli API/kredi açılmamalı; diğer platformların ücretsiz erişimi veya onayı varsayılmamalı.

## 5. Küçük modelin kalitesi ve çalışma süresi

Önce mevcut 4B modelin gerçek şirket bilgisayarında kalitesi ölçülmeli. En az 30 onaylı KKTC senaryosu önerilir: eksik fiyat, eski kampanya, Türkçe/İngilizce hedef kitle, okunmayan görsel yazısı, aynı adlı şirketler ve yerel teslimat gibi durumlar. Ölçütler: kaynak doğruluğu, uydurma bilgi, marka dili, yerel uygunluk, platform sınırları ve editörün düzeltme ihtiyacı. Model değişiminde aynı örneklerle karşılaştırma yapılmalı.

Kodda görsel gözlemi ve dokuz platform üretimi sırayla çalışır; toplam üretim süresi 240 saniye, tek çağrı üst sınırı 90 saniye ve aktarım bekleme süresi 280 saniyedir. Bu sınırlar CPU üzerinde çoklu platform üretiminde zaman aşımı riski doğurabilir; gerçek hız ölçülmeden dokuz platformun tek seferde tamamlanacağı garanti edilmemeli. Sonraki iyileştirme kalıcı iş kimliği, ilerleme, iptal ve doğrulanmış platform sonucundan devam etme olmalı. Eksik sonuçlar tamamlanmış paket gibi stüdyoya taşınmamalı.

Yerel sohbet üretimi şu anda şirket profili, hafıza ve son soruyu modele verir; bulut sohbetindeki önceki konuşma akışıyla aynı değildir. Kullanıcı düzeltmelerinin devamlılığı için kısa, onaylı şirket hafızası ve gerekirse kullanıcı/şirket kapsamlı yakın konuşma özeti eklenebilir. Yeni web kaynaklarının tamamı küçük bağlama doldurulmamalı; yalnız soruyla ilgili parçalar, kaynak kimlikleri ve kesin bilgiler seçilmeli. Model ağırlığı eğitimi ilk ihtiyaç değildir.

## 6. Şifreli erişim ve işletme yönetimi

Mevcut üretim girişinde açık kayıt yoktur. Güvenli çerez, sunucuda oturum doğrulaması, çıkışta iptal ve giriş denemesi sınırı uygulanır. Bu yapı korunarak program webde yayımlanabilir. Giriş sayfası ve istemci dosyalarının açık olması, özel şirket API'lerinin açık olduğu anlamına gelmez. Yardımcı eşleştirme/bağlantı uçları ayrı cihaz kimliği kuralları kullanır.

Şirket bazında veri ilişkisi ile kullanıcı yetkilendirmesi farklıdır: şu an giriş yapan yetkili kullanıcılar aynı şirket çalışma alanını paylaşır. Birden fazla müşteri/ekip için sonraki önemli adım kullanıcı–şirket izin tablosudur. Bu kontrol yalnız arayüzde değil şirket, taslak, medya, hafıza, AI ve tarayıcı API'lerinin tümünde uygulanmalı. Mevcut admin/editör rolleri başlangıç olarak korunabilir.

Sonraki ihtiyaçlar: yönetici kullanıcı ekranı, şifre değiştirme/sıfırlama, oturumları kapatma, işlem geçmişi ve yedekten geri dönüş denemesi. Bunlar mevcut yayının önüne yeni bir onay süreci koymak için değil, kullanım büyürken yönetimi iyileştirmek içindir. Ücretsiz plan ve mevcut ücret sınırları korunmalı; ek ücretli hizmet otomatik açılmamalı.

## Önerilen geliştirme sırası

### Mevcut sürüme patch olarak teslim

Kullanıcının 20 Ekim 2026 talimatıyla tüm geliştirmeler ilk programın devamı olarak aynı depoda ve aynı canlı adres üzerinde yayımlanır. Ayrı ürün, veri sıfırlama veya her sürümde yeniden kurulum yapılmaz. Web paneli yeni yayınla güncellenir; yardımcı kod yamaları mevcut otomatik güncelleyiciden gelir. D1 şeması eklemeli migration ile ilerler; şirketler, taslaklar, kullanıcılar, Firefox profilleri, cihaz eşleştirmesi ve yerel model dosyaları korunur. Yeni araştırma protokolünde eski yardımcı yetenekleri kontrol edilir; güncel olmayan yardımcıya desteklemediği komut gönderilmez. Açık işlem bitmeden güncelleme uygulanmaz ve mevcut geri dönüş mekanizması korunur.

Otomatik güncelleme içermeyen ilk Windows paketi kullanılıyorsa, güncelleyiciyi içeren pakete belgelenmiş tek seferlik geçiş gerekir; sonrasında yamalar otomatik gelir. Bu incelemede kullanıcının bilgisayarındaki paketin sürümü doğrulanmadı.

| Öncelik | Paket | Tamamlanma kanıtı |
| --- | --- | --- |
| P0 | Mevcut panelin şifreli erişimle yayını | Actions başarılı, güncel kaynak commit'ine ait `verified: true` dağıtım kaydı |
| P1 | KKTC şirket profili + kaynaklı web araştırması | Pilot sitenin seçili sayfalarından onaylanabilir bilgiler, kaynak bağlantıları ve değişiklik karşılaştırması |
| P1 | Gerçek Windows/Firefox hesap ve yerel model kontrolü | Doğru hesap kimliği, kapanıp açılmada oturum, Türkçe/görsel kalite ve süre ölçümü |
| P2 | AI'nın salt okuma Firefox görevleri + bio/içerik önerisi | Sayfa okuma, kaynaklı öneri, şirket ayrımı ve durdurma testleri |
| P2 | Tek platformda medya + metin hazırlama ve onaylı yayın | Doğru hesap/medya, önizleme, çift gönderi engeli ve gerçek gönderi bağlantısı |
| P3 | Takvim, çevrimdışı kuyruk, diğer platformlar ve analitik | Saat dilimi/kaçırılmış iş davranışı, gerçek platform ölçümleri ve aşamalı adaptör testleri |

Sonrasında içerik sütunları, haftalık plan, onay iş akışı, UTM bağlantıları ve gerçek veriden performans değerlendirmesi eklenebilir. İzlenme/tıklama/mesaj/teklif gibi metrikler platformdan veya işletmenin doğruladığı kaynaktan alınmalı. AI erişim ya da satış artışı uydurmamalı; içerik kararlarını ölçülen sonuca göre önermeli.

Bu sıra, önce şirketi tanıyan ve kaynak gösteren bir KKTC editörü, ardından Firefox'ta görevlerini güvenilir biçimde tamamlayan bir yardımcı oluşturur. Her platformu aynı anda tam otomatik yapmaya çalışmak yerine bir pilot akışın uçtan uca kanıtlanması önerilir.
