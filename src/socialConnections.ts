import browserCheck from "../deployment/browser-check.json";
import type { PlatformId } from "./types.ts";

type Connection = { api: string; detail: string; setup: string };
export const socialConnections: Record<PlatformId, Connection> = {
  facebook: {
    api: "Meta uygulaması gerekiyor",
    detail: "Sayfa yönetim yetkisi ve yayın izni gerekir. İlk kurulum Facebook ve Instagram için birlikte yapılacak.",
    setup: "https://developers.facebook.com/apps/",
  },
  instagram: {
    api: "Profesyonel hesap gerekiyor",
    detail: "Business veya Creator hesabı gerekir. Seçilen bağlantı yöntemi için doğru Facebook Sayfasına bağlanmalıdır.",
    setup: "https://developers.facebook.com/apps/",
  },
  threads: {
    api: "Threads izinleri gerekiyor",
    detail: "Meta uygulamasında Threads ürünü ve yayın izni gerekir. Gelişmiş izin onaylanana kadar yalnızca uygulamanın test hesapları adına paylaşılabilir.",
    setup: "https://developers.facebook.com/apps/",
  },
  pinterest: {
    api: "Uygulama başvurusu gerekiyor",
    detail: "İşletme hesabı ve uygulama başvurusu gerekir. Trial erişimi de incelemeye tabidir; farklı şirketler için erişim kapsamı ayrıca onaylanmalıdır.",
    setup: "https://developers.pinterest.com/apps/",
  },
  youtube: {
    api: "Ücretsiz kota ve Google izni",
    detail: "Google projesi, YouTube Data API ve kanal sahibinin izni gerekir. Video yükleme içindir; bu panelde video yükleyici henüz yoktur.",
    setup: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
  },
  linkedin: {
    api: "Şirket sayfası izni gerekiyor",
    detail: "Community Management erişimi ve kuruluş adına yayın izni gerekir. Kişisel profile paylaşım izni, şirket sayfasına paylaşım yetkisi vermez.",
    setup: "https://www.linkedin.com/developers/apps",
  },
  tiktok: {
    api: "Bu kullanım için uygun değil",
    detail: "Direct Post kuralları, yalnızca sizin veya ekibinizin yönettiği hesaplara yükleyen şirket içi araçları kabul etmiyor. Bu proje için API onayı varsayılmayacak.",
    setup: "https://developers.tiktok.com/doc/content-sharing-guidelines",
  },
  x: {
    api: "Ücretli; etkinleştirilmeyecek",
    detail: "Resmi X API kredi satın alma ve kullanıma göre ödeme istiyor. Ücretsiz kullanım şartınız nedeniyle açılmayacak.",
    setup: "https://docs.x.com/x-api/getting-started/pricing",
  },
};

type Probe = {
  platform: string;
  error?: string;
  skipped?: boolean;
  challengeVisible?: boolean;
  httpStatus?: number | null;
  loginFieldsVisible?: boolean;
  liveViewAvailable?: boolean;
  iframeAllowed?: boolean;
};
const results: Probe[] = browserCheck.results;
export const browserCheckedAt = browserCheck.checkedAt;
export function browserObservation(platform: PlatformId) {
  const probe = results.find((item) => item.platform === platform);
  if (!probe || probe.skipped)
    return { tone: "unknown", text: "Giriş ekranı henüz kontrol edilmedi." };
  if (probe.error || (probe.httpStatus && probe.httpStatus >= 400))
    return { tone: "blocked", text: "Son kontrolde erişim sağlanamadı." };
  if (probe.challengeVisible)
    return { tone: "unknown", text: "Ek doğrulama ekranı görüldü; giriş doğrulanmadı." };
  if (probe.loginFieldsVisible && probe.liveViewAvailable && probe.iframeAllowed)
    return { tone: "observed", text: "Giriş formu açıldı; gerçek hesapla giriş denenmedi." };
  return { tone: "unknown", text: "Sayfa açıldı; giriş formu doğrulanamadı." };
}
