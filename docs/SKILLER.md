# Projeye eklenen beceriler

Bu beceriler geliştirme sırasında kullanılan talimat ve başvuru dosyalarıdır. Uygulamanın içine çalışan bir ChatGPT modeli, sosyal medya oturumu veya yayınlama yetkisi eklemezler. Programın kullanıcı arayüzü Türkçedir; dış kaynak beceriler ve lisanslar asıllarıyla korunmuştur.

| Beceri | Kullanımı | Kaynak | Sabit sürüm |
| --- | --- | --- | --- |
| `graphify` | Kodun dosya, fonksiyon ve çağrı ilişkilerini yerelde çıkarmak | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | `graphifyy 0.9.92`, `86c57be82046` |
| `social` | Platforma göre anlatım, içerik uyarlama, etiket ve medya rehberi | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/365b412152b9542499ca1439426f7fc3cc92bb65/skills/social) | `365b412152b9` |
| `content-strategy` | Aynı ana fikrin şirketin hedef kitlesine uygun dağıtılması | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/365b412152b9542499ca1439426f7fc3cc92bb65/skills/content-strategy) | `365b412152b9` |
| `copy-editing` | Türkçe metin, tutarlı marka dili ve kanıtlanabilir iddia kontrolü | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/365b412152b9542499ca1439426f7fc3cc92bb65/skills/copy-editing) | `365b412152b9` |
| `frontend-design` | Panelin görsel düzeni, mobil kullanım ve anlaşılır etkileşimler | [anthropics/skills](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) | `dbd4588f9e10` |

Sosyal medya becerileri `.agents/skills/` altında; Graphify'ın resmi Codex kurulumuyla gelen beceri ve başvuru dosyaları `.codex/skills/graphify/` altındadır. Kaynak depoların tamamı uygulamaya eklenmedi. İlgili beceri dizinleri, bağlı başvuru dosyaları ve lisans bildirimleri eklendi. Pazarlama becerileri MIT; Graphify Apache-2.0 ve paketindeki ek MIT bildirimi; arayüz becerisi birlikte gelen `LICENSE.txt` koşullarıyla saklanır.

`skills-lock.json`, tam kaynak commit kimliklerini ve eklenen 38 dosyanın SHA-256 özetlerini içerir. Bu kayıt kurulumda alınan kopyaların sonradan değişmediğini denetler; kaynakların güvenilirliğine ilişkin bağımsız bir imza değildir. Denetim:

```bash
npm run skills:verify
```

## Bu projede nasıl kullanıldı?

- `social`: Platformların farklı anlatım biçimleri ve etiket önerileri ChatGPT talimatına aktarıldı. Ana metni otomatik kesmek yerine düzenleme sınırını aşan içerik gösterilir. Taslak oluşturmak, gerçek yayınlama olarak sunulmaz.
- `content-strategy`: Şirket profili, hedef kitle, anahtar kelimeler ve anlatım dili talimata eklenir. Kullanıcı tek bir ana fikri farklı platformlar için uyarlayabilir.
- `copy-editing`: Talimatta açıklık, doğru Türkçe, somut fayda, tutarlı anlatım, iddiaların doğruluğu ve klişe metinlerden kaçınma kontrolü vardır. SEO ve erişim garantisi verilmez.
- `frontend-design`: Şirket seçimi, içerik hazırlama, manuel ChatGPT aktarımı ve son kontrol ayrı, anlaşılır işlemlerdir. Masaüstü ve mobil akışlar Chromium ile sınanır; pencereler klavye odağını içeride tutar.
- `graphify`: Uygulama kaynak kodu tarandı, ilişkiler sorgulandı ve grafın bütünlüğü kontrol edildi. Yeniden üretmek için `npm run graph` çalıştırılır.

## Graphify

Resmi Python paketi **`graphifyy`** (iki `y`), komut adı **`graphify`**. Bu ortamda çalıştırılabilir dosya `/workspace/.tools/bin/graphify` konumundadır. Kurulum `bash scripts/setup.sh` ile tekrarlanır. Graphify becerisi ve başvuru dosyaları zaten depoda bulunduğundan kurulum betiği bunları yeniden yazmaz.

```bash
export PATH="/workspace/.tools/bin:$PATH"
export GRAPHIFY_BACKEND=none
npm run graph
graphify query 'createApp requireMedia createStore' --context call --budget 1500
graphify explain 'saveCurrent'
graphify diagnose multigraph
```

`graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md` ve `graphify-out/graph.html` üretilir. Kod analizi yereldir; LLM API'si, model girişi veya Graphify Cloud hesabı kullanılmaz. `GRAPHIFY_BACKEND=none` ve `--code-only` sayesinde belgeler ve görseller anlamsal analiz için bir sağlayıcıya gönderilmez. Hassas kabul edilen `.npmrc`, üçüncü taraf beceriler, veri dizini ve derleme çıktıları kapsam dışındadır. Bazı başlangıç veya tip dosyaları sembol üretmeyebilir; grafik tam bir davranış doğrulaması değildir. Otomatik araç çıktıları İngilizce olabilir; Türkçe mimari açıklama `docs/MIMARI.md` içindedir.

## Güncelleme

Yeni kaynak sürümü otomatik alınmaz. Bir beceri güncellenecekse değişiklikleri, lisansını ve bağlı dosyalarını inceleyin; sonra kopyayı ve kaynak özetlerini birlikte güncelleyin. Dosya özetini yalnızca denetimi geçirmek için değiştirmeyin. Beceri dosyalarının talimatları kullanıcının isteğinin veya platform güvenlik kurallarının önüne geçmez. Toplu paylaşım, mesaj gönderimi ya da yeni dış servis bağlantısı bu becerileri kurmakla yetkilendirilmiş sayılmaz.
