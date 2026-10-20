# Yerel model seçimi — 20 Ekim 2026

Kullanıcının kartı RTX 4070 Ti / 16 GB VRAM, hedefi yaklaşık 10 GB model VRAM'idir. Qwen3.5 9B / 4-bit seçildi. Modelin Türkçe, görsel inceleme ve genel talimat takibi birlikte kullanılacak; KKTC kuralları, onaylı şirket kaynakları ve anlık Firefox metni mevcut uygulama bağlamından gelir. Bu bir sosyal medya modelinin ağırlıklarını eğitme işlemi değildir.

[Qwen'in resmî deposu](https://github.com/QwenLM/Qwen3.5) 9B ve 4B sürümlerini ve değerlendirmelerini yayımlar. Uygulama Ollama'daki `qwen3.5:9b` için boyut, Q4, parametre sayısı ve vision desteğini doğrular. Gerçek Türkçe kalite/hız/VRAM karşılaştırması kullanıcının kartında henüz yapılmadı; resmî genel model değerlendirmeleri sosyal medya başarısı garantisi değildir.

GitHub'da sosyal medya LLM ve içerik üretimi/fine-tune projeleri tarandı. Örneğin [ChatGLM-6B Social Media IE](https://github.com/phoenix-zhou/chatglm6b-social-media-ie), adında sosyal medya geçmesine rağmen metin sınıflandırma ve ilişki çıkarımı için eğitim kodu sunuyor; Türkçe görsel sosyal medya yöneticisi olduğuna ilişkin bir doğrulama sunmuyor. Bu sınırlı taramada mevcut gereksinimlerin tamamında daha iyi olduğu doğrulanabilen, yerelde 10 GB hedefinde çalışacak özel bir sosyal medya modeli saptanmadı. Bu, böyle bir modelin hiç var olmadığı iddiası değildir.

16K bağlam, tek model/tek üretim, q8 KV ve flash attention kullanılır. Ollama'ya 16 GB kartta 6 GiB ayırmama payı verilir. Ollama'nın model için bildirdiği kullanım 10 GiB üstündeyse model boşaltılıp işlem durur. Bu kontrol, sürücünün anlık tepe tüketimini veya Firefox dahil toplam GPU belleğini sınırlayan bir donanım kotası değildir. Panel model ölçümünü ayrıca gösterir.

Kullanıcı eski modeli silmeyi istedi. Yeni 9B indirildikten, vision doğrulandıktan ve yükleme/GPU kontrolü geçtikten sonra yalnız yardımcının özel 11435 Ollama deposundaki `qwen3.5:4b` kaldırılır. Kişisel Ollama/11434, sosyal girişler ve `knowledge.sqlite` silinmez. İndirme/yükleme başarısızsa eski model henüz silinmez.
