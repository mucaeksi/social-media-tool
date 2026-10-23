// Versioned editing guidance. Provider permissions still require current verification.
export const PLATFORM_CATALOG_VERSION = "2026-10-22-v1";
export const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    kind: "Sayfa",
    limit: 2200,
    width: 1080,
    height: 1350,
    format: "4:5",
    hashtags: 5,
    hint: "Güçlü bir açılış, kısa paragraflar ve net bir çağrı.",
    needsVideo: false,
    docs: "https://developers.facebook.com/docs/instagram-platform/content-publishing/",
    requirement:
      "Instagram profesyonel hesabı, Meta uygulaması ve içerik yayınlama izinleri gerekir.",
  },
  {
    id: "facebook",
    name: "Facebook",
    kind: "Sayfa",
    limit: 63206,
    width: 1200,
    height: 630,
    format: "1.91:1",
    hashtags: 2,
    hint: "Topluluk odaklı anlatım ve etkileşime davet.",
    needsVideo: false,
    docs: "https://developers.facebook.com/docs/pages-api/posts/",
    requirement:
      "Facebook Sayfası, sayfa erişim belirteci ve uygun sayfa yayınlama izinleri gerekir.",
  },
  {
    id: "x",
    name: "X / Twitter",
    kind: "Hesap",
    limit: 280,
    width: 1600,
    height: 900,
    format: "16:9",
    hashtags: 2,
    hint: "Tek bir fikir, kısa anlatım ve az sayıda etiket.",
    needsVideo: false,
    docs: "https://docs.x.com/x-api/posts/create-post",
    requirement:
      "X API ücretlidir. Ücretsiz çalışma koşuluyla bu API etkinleştirilmeyecek; X'te otomatik paylaşım hazır değildir.",
  },
  {
    id: "threads",
    name: "Threads",
    kind: "Hesap",
    limit: 500,
    width: 1080,
    height: 1350,
    format: "4:5",
    hashtags: 1,
    hint: "Doğal bir sohbet başlatın; bir soru ile bitirin.",
    needsVideo: false,
    docs: "https://developers.facebook.com/docs/threads/",
    requirement:
      "Threads uygulaması, hesap yetkilendirmesi ve yayınlama izinleri gerekir.",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    kind: "Pano",
    limit: 500,
    titleLimit: 100,
    width: 1000,
    height: 1500,
    format: "2:3",
    hashtags: 0,
    hint: "Aranabilir bir başlık, açıklama ve ilgili hedef bağlantı.",
    needsVideo: false,
    docs: "https://developers.pinterest.com/docs/api/v5/pins-create/",
    requirement:
      "Pinterest geliştirici uygulaması, OAuth bağlantısı ve hedef pano seçimi gerekir.",
  },
  {
    id: "youtube",
    name: "YouTube",
    kind: "Kanal",
    limit: 5000,
    titleLimit: 100,
    width: 1280,
    height: 720,
    format: "16:9",
    hashtags: 3,
    hint: "İstenen biçime uy: fotoğraflı topluluk gönderisinde görselle ilgili kısa metin ve başlık; video istendiğinde arama niyetine uygun başlık, açıklama ve video planı. Fotoğrafı video olarak sunma.",
    needsVideo: true,
    docs: "https://developers.google.com/youtube/v3/docs/videos/insert",
    requirement:
      "Google Cloud projesi, YouTube Data API, OAuth ve video dosyası gerekir. Görsel tek başına video değildir.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    kind: "Hesap",
    limit: 2200,
    width: 1080,
    height: 1920,
    format: "9:16",
    hashtags: 4,
    hint: "Kısa bir açılış ve dikey video / fotoğraf akışı planı.",
    needsVideo: true,
    docs: "https://developers.tiktok.com/doc/content-posting-api-get-started/",
    requirement:
      "TikTok geliştirici uygulaması, Content Posting erişimi ve uygun medya gerekir. Bu sürüm metin ve görsel hazırlama sağlar.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    kind: "Şirket sayfası",
    limit: 3000,
    width: 1200,
    height: 627,
    format: "1.91:1",
    hashtags: 3,
    hint: "Profesyonel bir giriş, somut değer ve anlaşılır bir çağrı.",
    needsVideo: false,
    docs: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api",
    requirement:
      "LinkedIn uygulaması, kuruluş yöneticisi yetkisi ve ilgili Community Management erişimi gerekir.",
  },
  {
    id: "tumblr",
    name: "Tumblr",
    kind: "Blog",
    limit: 4000,
    titleLimit: 100,
    width: 1080,
    height: 1350,
    format: "4:5",
    hashtags: 5,
    hint: "Görsel hikâye, açıklayıcı başlık ve keşif etiketleri.",
    needsVideo: false,
    docs: "https://www.tumblr.com/docs/en/api/v2",
    requirement:
      "Tumblr için içerik hazırlanır; otomatik yayınlayıcı henüz uygulanmadı.",
  },
].map((platform) => ({
  ...platform,
  ruleVersion: PLATFORM_CATALOG_VERSION,
  ruleUpdatedAt: "2026-10-22",
  providerCheckedAt: null,
}));

export const platformIds = platforms.map((p) => p.id);
export const platformMap = Object.fromEntries(platforms.map((p) => [p.id, p]));
export const platformGuidance = platforms
  .map(
    (p) =>
      `${p.name}: ${p.limit} karakter, ${p.hashtags} etiket önerisi; ${p.hint}`,
  )
  .join("\n");
