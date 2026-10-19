import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  CircleAlert,
  Clock3,
  Copy,
  LoaderCircle,
  LogIn,
  Monitor,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api } from "./api.ts";
import { Modal } from "./Modal.tsx";
import { socialConnections, browserObservation, browserCheckedAt } from "./socialConnections.ts";
import type { AuthUser, Company, Platform, PlatformId, Post } from "./types.ts";

type Account = {
  id: string;
  companyId: string;
  platform: PlatformId;
  label: string;
  hasSession: boolean;
  savedAt: string | null;
};
type View = {
  accountId: string;
  expiresAt: number;
  viewUrl: string;
  navigationFailed?: boolean;
};
type Status = {
  usedMs: number;
  limits: { dailyMs: number };
  active: {
    accountId: string;
    companyId: string;
    expiresAt: number;
    owned: boolean;
  } | null;
};
const caption = (post?: Post) =>
  post
    ? [post.caption.trim(), post.hashtags.join(" ")]
        .filter(Boolean)
        .join("\n\n")
    : "";
const seconds = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor(Math.max(0, ms) / 1000) % 60).padStart(2, "0")}`;
const savedDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul",
  }).format(new Date(value));

export function SocialAccounts({
  company,
  platforms,
  user,
  enabled,
  posts,
  icon,
}: {
  company?: Company;
  platforms: Platform[];
  user: AuthUser;
  enabled: boolean;
  posts: Post[];
  icon: (id: PlatformId) => ReactNode;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<Platform | null>(null);
  const [label, setLabel] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [now, setNow] = useState(Date.now());
  const admin = user.role === "admin";
  const available = enabled && admin && Boolean(company);
  const activeAccount = accounts.find((a) => a.id === view?.accountId);
  const prepared = caption(
    posts.find((p) => p.platform === activeAccount?.platform),
  );

  async function refresh() {
    if (!available || !company) return;
    const [list, usage] = await Promise.all([
      api<Account[]>(`/api/social/accounts?companyId=${company.id}`),
      api<Status>("/api/social/status"),
    ]);
    setAccounts(list);
    setStatus(usage);
  }
  useEffect(() => {
    setAccounts([]);
    setStatus(null);
    setError("");
    setNotice("");
    let valid = true;
    if (available && company) {
      Promise.all([
        api<Account[]>(`/api/social/accounts?companyId=${company.id}`),
        api<Status>("/api/social/status"),
      ])
        .then(([list, usage]) => {
          if (valid) {
            setAccounts(list);
            setStatus(usage);
          }
        })
        .catch((e: Error) => {
          if (valid) setError(e.message);
        });
    }
    return () => {
      valid = false;
    };
  }, [company?.id, available]);
  useEffect(() => {
    if (!view) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view]);
  useEffect(() => {
    if (view && now >= view.expiresAt) {
      setView(null);
      setNotice(
        "Tarayıcı süresi doldu. Kaydedilen oturum durumunu hesap kartından kontrol edin.",
      );
      void refresh().catch(() => {});
    }
  }, [now, view]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(account: Account) {
    await run(async () => {
      const next = await api<View>(`/api/social/accounts/${account.id}/open`, {
        method: "POST",
      });
      setNow(Date.now());
      setView(next);
      await refresh();
    });
  }
  async function close(save: boolean) {
    if (!view || busy) return;
    await run(async () => {
      const result = await api<{
        saved: boolean;
        hasSession: boolean;
        closed: boolean;
      }>(`/api/social/accounts/${view.accountId}/${save ? "save" : "close"}`, {
        method: "POST",
      });
      if (!result.closed)
        throw new Error(
          "Tarayıcının kapanışı doğrulanamadı. Kapatma otomatik yeniden denenecek.",
        );
      setView(null);
      await refresh();
      setNotice(
        save
          ? result.saved
            ? "Hesap oturumu şifreli olarak kaydedildi. Platform tekrar doğrulama isteyebilir."
            : "Yeni bir giriş oturumu kaydedilemedi. Varsa önceki kayıt korundu; girişin tamamlandığını kontrol edin."
          : "Tarayıcı kapatıldı; bu oturumdaki değişiklikler kaydedilmedi.",
      );
    });
  }

  return (
    <>
      <section className="card api-setup-note">
        <h2>Ücretsiz resmi API bağlantıları</h2>
        <p>
          Uygun platformlarda resmi bağlantıya öncelik veriyoruz. İlk adım
          Facebook ve Instagram için Meta uygulaması oluşturmak. Diğer
          platformların koşullarını aşağıda görebilirsiniz. API ile hesap
          bağlama ve toplu yayınlama henüz etkin değil.
        </p>
        <div>
          <a
            className="primary"
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer"
          >
            Meta uygulaması oluştur
          </a>
          <a
            className="secondary"
            href="https://github.com/mucaeksi/social-media-tool/blob/main/docs/META_KURULUM.md"
            target="_blank"
            rel="noreferrer"
          >
            Meta kurulum adımları
          </a>
          <a
            className="secondary"
            href="https://github.com/mucaeksi/social-media-tool/blob/main/docs/PLATFORM_BAGLANTILARI.md"
            target="_blank"
            rel="noreferrer"
          >
            Tüm platformların koşulları
          </a>
        </div>
        <small>
          Ücretli API veya abonelik açılmayacak. API uygun değilse aşağıdaki
          deneysel web girişi denenebilir; platformun erişime izin vermesi gerekir.
        </small>
      </section>
      <div className="connection-banner">
        <Monitor size={28} />
        <div>
          <h2>Hesaplarınıza normal giriş yapın.</h2>
          <p>
            Giriş ve doğrulama kodunu sosyal ağın kendi ekranında girin. Her
            şirket ve hesap için ayrı oturum saklanır. Şifreler uygulamaya
            kaydedilmez. Kaydettiğiniz oturum tarayıcı kapalıyken de korunur;
            platform süreyi doldurursa veya yeniden doğrulama isterse tekrar giriş yaparsınız.
          </p>
        </div>
      </div>
      <div className="browser-limit-note">
        <Clock3 size={18} />
        <p>
          Ücretsiz uzak tarayıcı: tüm hesaplar için günde toplam{" "}
          <strong>10 dakika</strong>. Her açılış en fazla 3 dakika sürer;
          ardından kaydedip tekrar açabilirsiniz. Süre UTC gün başında yenilenir
          (Türkiye saatiyle 03.00).
          {status && (
            <span>
              {" "}
              Bugün kullanılan ve açık oturuma ayrılan:{" "}
              <strong>{seconds(status.usedMs)} / 10:00</strong>.
            </span>
          )}
        </p>
      </div>
      <div className="inline-warning">
        <CircleAlert size={18} />
        <span>
          Bu özellik deneyseldir. Her platformun son giriş ekranı kontrolü
          kendi kartında gösterilir. Giriş formunun açılması, hesabınıza giriş
          yapılabildiğini doğrulamaz. Toplu
          otomatik paylaşım henüz yoktur; açık tarayıcıda paylaşımı siz
          tamamlarsınız.
        </span>
      </div>
      {!enabled && (
        <p className="browser-message">
          Uzak tarayıcı bu ortamda etkin değil. Bu ekran canlı Cloudflare
          sürümünde kullanılabilir.
        </p>
      )}
      {enabled && !admin && (
        <p className="browser-message">
          Hesap girişi ve oturum yönetimi için yönetici hesabıyla giriş yapın.
        </p>
      )}
      {!company && (
        <p className="browser-message">Önce bir şirket ekleyin ve seçin.</p>
      )}
      {error && !view && (
        <p className="browser-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="browser-message" role="status">
          {notice}
        </p>
      )}
      {status?.active && !view && (
        <div className="browser-limit-note">
          <Monitor size={18} />
          <div>
            <p>Açık bir tarayıcı oturumu var. Önce bu oturumu tamamlayın.</p>
            {status.active.owned &&
              accounts.find((a) => a.id === status.active?.accountId) && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    const a = accounts.find(
                      (item) => item.id === status.active?.accountId,
                    );
                    if (a) void open(a);
                  }}
                >
                  Açık oturuma dön
                </button>
              )}
          </div>
        </div>
      )}
      <div className="connections-grid">
        {platforms.map((p) => {
          const list = accounts.filter((a) => a.platform === p.id);
          const connection = socialConnections[p.id];
          const observation = browserObservation(p.id);
          return (
            <section
              key={p.id}
              className="card connection-card social-account-card"
            >
              <div className="connection-card-top">
                <span className="platform-logo">{icon(p.id)}</span>
                <span className="not-connected">
                  <span />
                  {list.length ? `${list.length} hesap` : "Hesap eklenmedi"}
                </span>
              </div>
              <h2>{p.name}</h2>
              <div className="platform-connection-options">
                <details>
                  <summary>API: {connection.api}</summary>
                  <p>{connection.detail}</p>
                  <a href={connection.setup} target="_blank" rel="noreferrer">
                    {p.id === "x" || p.id === "tiktok" ? "Resmi koşulları incele" : "Geliştirici hesabını aç"}
                  </a>
                </details>
                <p className={`browser-observation ${observation.tone}`}>
                  <strong>Web girişi:</strong> {observation.text}
                </p>
              </div>
              <div className="social-account-list">
                {list.map((account) => (
                  <article key={account.id}>
                    <strong>{account.label}</strong>
                    <small>
                      {account.hasSession
                        ? "Oturum kaydedildi · Yeniden doğrulama gerekebilir"
                        : "Giriş bekliyor"}
                    </small>
                    {account.savedAt && (
                      <small>
                        Son kayıt: <time dateTime={account.savedAt}>{savedDate(account.savedAt)}</time>
                      </small>
                    )}
                    <div>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => void open(account)}
                      >
                        <LogIn size={14} />
                        {account.hasSession ? "Hesabı aç" : "Giriş yap"}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${account.label} hesabını kaldır`}
                        disabled={busy || Boolean(status?.active)}
                        onClick={() => {
                          if (
                            window.confirm(
                              `${account.label} hesabının kayıtlı oturumu silinsin mi?`,
                            )
                          )
                            void run(async () => {
                              await api(`/api/social/accounts/${account.id}`, {
                                method: "DELETE",
                              });
                              await refresh();
                            });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="secondary"
                disabled={!available || busy}
                onClick={() => {
                  setAdding(p);
                  setLabel(`${company?.name ?? ""} — ${p.name}`);
                }}
              >
                <Plus size={15} />
                Hesap ekle
              </button>
            </section>
          );
        })}
      </div>
      <p className="browser-message browser-check-date">
        Giriş ekranı kontrolü: <time dateTime={browserCheckedAt}>{savedDate(browserCheckedAt)}</time> (Türkiye saati).
        {" "}Gerçek hesap girişi ve paylaşım denenmedi. Kayıtlı oturum, platformun girişinizi hâlâ geçerli saydığını garanti etmez.
      </p>
      {adding && (
        <Modal
          title={`${adding.name} hesabı ekle`}
          onClose={() => {
            if (!busy) setAdding(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await api("/api/social/accounts", {
                  method: "POST",
                  body: JSON.stringify({
                    companyId: company?.id,
                    platform: adding.id,
                    label,
                  }),
                });
                setAdding(null);
                await refresh();
              });
            }}
          >
            <label className="browser-field">
              Hesap etiketi
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <p className="modal-description">
              Etiket yalnızca bu panelde görünür. Sonraki adımda sosyal ağın
              kendi giriş ekranı açılır. Şifre ve doğrulama kodunu o ekranda
              gireceksiniz.
            </p>
            {error && (
              <p role="alert" className="browser-message error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="primary" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Plus size={16} />
                )}
                Hesap ekle
              </button>
            </div>
          </form>
        </Modal>
      )}
      {view && (
        <div className="remote-browser-dialog">
          <Modal
            title={activeAccount?.label ?? "Sosyal hesap tarayıcısı"}
            wide
            onClose={() => void close(true)}
          >
            <div className="browser-toolbar">
              <span>
                <Clock3 size={16} />
                Kalan süre: {seconds(view.expiresAt - now)}
              </span>
              <span>
                <ShieldCheck size={16} />
                Hesabın kendi giriş ekranı
              </span>
            </div>
            <p className="modal-description">
              Girişinizi ve istenen doğrulamayı burada tamamlayın. Ekrandan
              ayrılmadan önce oturumu kaydedin. Süre dolunca varsa hesap oturumu
              kaydedilir ve tarayıcı kapatılır. Platform erişimi reddederse bu
              hesap bu yöntemle bağlanamaz.
            </p>
            {view.navigationFailed && (
              <p className="browser-message error">
                Platform sayfası açılırken hata oluştu. Erişim engeli olabilir;
                bu hesap için giriş doğrulanmadı.
              </p>
            )}
            {error && (
              <p role="alert" className="browser-message error">
                {error}
              </p>
            )}
            <iframe
              title="Sosyal medya giriş ekranı"
              src={view.viewUrl}
              referrerPolicy="no-referrer"
              allow="clipboard-read; clipboard-write"
              className="remote-browser-frame"
              tabIndex={0}
            />
            {prepared && (
              <div className="browser-transfer">
                <p>
                  Bu platform için hazırladığınız metin hazır. Uzak tarayıcıda
                  gönderi metni alanını açıp tıklayın, sonra aktarın.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `/api/social/accounts/${view.accountId}/paste`,
                        {
                          method: "POST",
                          body: JSON.stringify({ text: prepared }),
                        },
                      );
                      setNotice(
                        "Metin gönderi alanına aktarıldı. Henüz paylaşılmadı.",
                      );
                    })
                  }
                >
                  <Copy size={15} />
                  Metni seçtiğim alana yaz
                </button>
                <small>
                  Görseli uzaktaki forma yükleme ve toplu gönderim bu sürümde
                  uygulanmadı.
                </small>
              </div>
            )}
            <div className="modal-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void close(false)}
              >
                Kaydetmeden kapat
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void close(true)}
              >
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Save size={16} />
                )}
                Oturumu kaydet ve kapat
              </button>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
}
