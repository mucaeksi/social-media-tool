import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Monitor,
  Link2,
  Download,
  Plus,
  LoaderCircle,
  LogIn,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "./api.ts";
import { Modal } from "./Modal.tsx";
import type {
  AuthUser,
  Company,
  Platform,
  PlatformId,
  SocialPlatformId,
  Post,
} from "./types.ts";

type Account = {
  id: string;
  companyId: string;
  platform: SocialPlatformId;
  label: string;
  profileUrl: string;
};
type Profile = {
  accountId: string;
  lastOpenedAt: string;
  authDetected: number | null;
};
type ComputerStatus = {
  devices: { id: string; name: string }[];
  onlineDeviceId: string | null;
  active: { accountId: string; companyId: string; owned: boolean } | null;
  commandsUsed: number;
  dailyCommands: number;
};
type Screen = {
  accountId: string;
  viewId: string;
  frame: string;
  width: number;
  height: number;
  loginVerified: false;
  closed?: boolean;
};
type Pairing = { code: string; expiresAt: number };
const sendClose = (screen: Screen) => {
  void fetch(`/api/computer/accounts/${screen.accountId}/command`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "close", viewId: screen.viewId }),
  }).catch(() => {});
};

export function CompanyAccounts({
  company,
  platforms,
  user,
  posts,
  icon,
  onCloud,
}: {
  company?: Company;
  platforms: Platform[];
  user: AuthUser;
  posts: Post[];
  icon: (id: PlatformId) => ReactNode;
  onCloud: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [status, setStatus] = useState<ComputerStatus | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [pairing, setPairing] = useState<Pairing | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null),
    [text, setText] = useState("");
  const [adding, setAdding] = useState<{
      id: SocialPlatformId;
      name: string;
    } | null>(null),
    [label, setLabel] = useState(""),
    [profileUrl, setProfileUrl] = useState("");
  const operation = useRef<Promise<unknown>>(Promise.resolve());
  const currentCompany = useRef(company?.id),
    live = useRef<Screen | null>(null),
    working = useRef(false),
    mounted = useRef(true);
  currentCompany.current = company?.id;
  const admin = user.role === "admin",
    account = accounts.find(
      (a) => a.id === screen?.accountId && a.companyId === company?.id,
    );
  const device = status?.devices[0],
    online = Boolean(device && status?.onlineDeviceId === device.id);
  function show(value: Screen | null) {
    live.current = value;
    setScreen(value);
    setText("");
  }
  async function refresh() {
    if (!admin) return;
    const scope = company?.id;
    const [next, list, saved] = await Promise.all([
      api<ComputerStatus>("/api/computer/status"),
      scope
        ? api<Account[]>(`/api/social/accounts?companyId=${scope}`)
        : Promise.resolve([]),
      scope
        ? api<Profile[]>(`/api/computer/profiles?companyId=${scope}`)
        : Promise.resolve([]),
    ]);
    if (mounted.current && currentCompany.current === scope) {
      setStatus(next);
      setAccounts(list);
      setProfiles(saved);
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setAccounts([]);
    setProfiles([]);
    setError("");
    setNotice("");
    setAdding(null);
    show(null);
    let valid = true;
    if (admin)
      void refresh().catch((e: Error) => {
        if (valid) setError(e.message);
      });
    const timer = setInterval(() => {
      if (valid && admin) void refresh().catch(() => {});
    }, 15000);
    return () => {
      valid = false;
      clearInterval(timer);
      if (live.current) {
        sendClose(live.current);
        live.current = null;
      }
    };
  }, [company?.id, admin]);
  useEffect(() => {
    if (!screen) return;
    let valid = true;
    const timer = setInterval(() => {
      if (working.current || !live.current) return;
      const target = live.current;
      working.current = true;
      const pending = api<Screen>(
        `/api/computer/accounts/${target.accountId}/command`,
        {
          method: "POST",
          body: JSON.stringify({ action: "screen", viewId: target.viewId }),
        },
      )
        .then((next) => {
          if (valid && live.current?.viewId === target.viewId) {
            live.current = next;
            setScreen(next);
          }
        })
        .catch((e: Error) => {
          if (valid) setError(e.message);
        })
        .finally(() => {
          working.current = false;
        });
      operation.current = pending;
    }, 2000);
    const leave = () => {
      if (live.current) {
        sendClose(live.current);
        live.current = null;
      }
    };
    window.addEventListener("pagehide", leave);
    return () => {
      valid = false;
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
    };
  }, [screen?.viewId]);
  async function run(action: () => Promise<void>) {
    const scope = currentCompany.current;
    const previous = operation.current;
    const next = (async () => {
      await previous.catch(() => {});
      if (!mounted.current || scope !== currentCompany.current) return;
      working.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await action();
      } catch (e) {
        if (mounted.current && scope === currentCompany.current)
          setError((e as Error).message);
      } finally {
        working.current = false;
        if (mounted.current) setBusy(false);
      }
    })();
    operation.current = next;
    await next;
  }
  async function open(target: Account) {
    await run(async () => {
      const next = await api<Screen>(
        `/api/computer/accounts/${target.id}/command`,
        { method: "POST", body: JSON.stringify({ action: "open" }) },
      );
      if (!mounted.current || currentCompany.current !== target.companyId) {
        sendClose(next);
        return;
      }
      show(next);
      await refresh();
    });
  }
  async function control(action: string, extra: Record<string, unknown> = {}) {
    const target = live.current;
    if (!target) return;
    await run(async () => {
      const next = await api<Screen>(
        `/api/computer/accounts/${target.accountId}/command`,
        {
          method: "POST",
          body: JSON.stringify({ action, viewId: target.viewId, ...extra }),
        },
      );
      if (live.current?.viewId === target.viewId) {
        live.current = next;
        setScreen(next);
      }
    });
  }
  function close() {
    const target = live.current;
    if (!target) return;
    show(null);
    void run(async () => {
      await api(`/api/computer/accounts/${target.accountId}/command`, {
        method: "POST",
        body: JSON.stringify({ action: "close", viewId: target.viewId }),
      });
      setNotice(
        "Firefox penceresi kapatıldı. Giriş profili şirket bilgisayarında korundu; sosyal hesaptan çıkış yapılmadı.",
      );
      await refresh();
    });
  }
  const prepared = posts.find((p) => p.platform === account?.platform);
  return (
    <>
      <section className="card computer-setup">
        <div className="computer-heading">
          <Monitor size={30} />
          <div>
            <h2>Şirket bilgisayarı</h2>
            <p>
              Hesap girişleri bilgisayarınızdaki kalıcı Firefox profillerinde
              korunur. Paneli webden kullanmaya devam edin.
            </p>
          </div>
          <span className={`computer-status ${online ? "online" : ""}`}>
            {online
              ? "Bilgisayar çevrimiçi"
              : device
                ? "Bilgisayar çevrimdışı"
                : "Henüz eşleştirilmedi"}
          </span>
        </div>
        {admin ? (
          <>
            <ol className="computer-steps">
              <li>
                <strong>Windows paketini indirin</strong>
                <p>
                  Node.js 24 veya üzeri ile Mozilla Firefox kurulu olmalı. ZIP'i
                  kalıcı bir klasöre çıkarıp{" "}
                  <b>companion → Kur-ve-Baslat.cmd</b> dosyasını çalıştırın.
                  Yeni sürümler otomatik alınır; açık hesap ekranlarını
                  kapatınca uygulanır. Giriş profilleri korunur.
                </p>
                <a
                  className="secondary"
                  href="/indir/sosyal-studio-bilgisayar.zip"
                  download
                >
                  <Download size={15} /> Windows yardımcısını indir
                </a>
              </li>
              <li>
                <strong>Bilgisayarı eşleştirin</strong>
                <p>
                  Kodu bilgisayardaki yardımcıya yapıştırın. Kod 10 dakika
                  geçerlidir ve bir kez kullanılır.
                </p>
                <button
                  className="primary"
                  disabled={busy || Boolean(device)}
                  onClick={() =>
                    void run(async () => {
                      setPairing(
                        await api<Pairing>("/api/computer/pairing", {
                          method: "POST",
                        }),
                      );
                    })
                  }
                >
                  <Link2 size={15} /> Bilgisayarı eşleştir
                </button>
              </li>
              <li>
                <strong>Hesaplara giriş yapın</strong>
                <p>
                  Yardımcı penceresini açık bırakın. Aşağıdan bir hesabı açın;
                  giriş ve doğrulamayı sosyal ağın ekranında tamamlayın.
                </p>
                <a
                  href="https://github.com/mucaeksi/social-media-tool/blob/main/docs/SIRKET_BILGISAYARI.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Kurulum ve başlangıçta çalıştırma rehberi
                </a>
              </li>
            </ol>
            {pairing && !device && (
              <div className="computer-pairing" role="status">
                <strong>Tek kullanımlık eşleştirme kodu</strong>
                <code>{pairing.code}</code>
                <small>
                  Bu kod cihaz erişimi sağlar; paylaşmayın. Geçerlilik:{" "}
                  {new Date(pairing.expiresAt).toLocaleTimeString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  })}{" "}
                  (Türkiye).
                </small>
                <button
                  className="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(pairing.code)
                      .then(() => setNotice("Eşleştirme kodu kopyalandı."))
                      .catch(() =>
                        setError("Kod kopyalanamadı. Kodu seçip kopyalayın."),
                      )
                  }
                >
                  Kodu kopyala
                </button>
              </div>
            )}
            {device && (
              <div className="computer-device">
                <p>
                  <strong>{device.name}</strong> ·{" "}
                  {online
                    ? "Bağlantı açık"
                    : "Yardımcıyı bu bilgisayarda başlatın"}
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Bu bilgisayarın panel erişimi kaldırılsın mı? Bilgisayardaki Firefox profilleri silinmez.",
                      )
                    )
                      void run(async () => {
                        await api(`/api/computer/devices/${device.id}/revoke`, {
                          method: "POST",
                        });
                        setPairing(null);
                        await refresh();
                      });
                  }}
                >
                  Bilgisayar bağlantısını kaldır
                </button>
              </div>
            )}
          </>
        ) : (
          <p>
            Bilgisayarı eşlemek ve hesap ekranlarını kullanmak için yönetici
            hesabıyla giriş yapın.
          </p>
        )}
      </section>
      <div className="browser-limit-note">
        <ShieldCheck size={20} />
        <p>
          Bu yöntem Cloudflare'in 10 dakikalık tarayıcı süresini kullanmaz. Tam
          Firefox profilleri bilgisayarda tutulur; platform yeniden giriş veya
          doğrulama isteyebilir. X'in bu bilgisayardan erişimi ve gerçek hesap
          girişleri henüz doğrulanmadı. Toplu otomatik paylaşım henüz etkin
          değil.
        </p>
      </div>
      {error && (
        <p className="browser-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="browser-message" role="status">
          {notice}
        </p>
      )}
      {status?.active && !screen && (
        <p className="browser-message">
          Açık bir hesap ekranı var. Aynı kullanıcıysanız ilgili hesabı açarak
          devam edebilirsiniz; başka bir kullanıcı kullanıyorsa ekranını
          kapatmasını bekleyin.
        </p>
      )}
      {!company && (
        <p className="browser-message">Hesapları görmek için şirket seçin.</p>
      )}
      <div className="connections-grid">
        {platforms.map((p) => (
          <section
            className="card connection-card social-account-card"
            key={p.id}
          >
            <div className="connection-card-top">
              <span className="platform-logo">
                {p.id === "tumblr" ? "t" : icon(p.id)}
              </span>
              <span className="not-connected">
                {accounts.filter((a) => a.platform === p.id).length || ""}{" "}
                {accounts.some((a) => a.platform === p.id)
                  ? "hesap"
                  : "Hesap eklenmedi"}
              </span>
            </div>
            <h2>{p.name}</h2>
            <div className="social-account-list">
              {accounts
                .filter(
                  (a) => a.platform === p.id && a.companyId === company?.id,
                )
                .map((a) => (
                  <article key={a.id}>
                    <strong>{a.label}</strong>
                    {a.profileUrl && (
                      <a href={a.profileUrl} target="_blank" rel="noreferrer">
                        Hesap / sayfa bağlantısı
                      </a>
                    )}
                    <small>
                      {profiles.some((p) => p.accountId === a.id)
                        ? profiles.find((p) => p.accountId === a.id)
                            ?.authDetected === 1
                          ? "Giriş çerezi bulundu · Yeniden doğrulama gerekebilir"
                          : "Bu bilgisayarda profil açıldı · Giriş doğrulanmadı"
                        : "İlk giriş bekleniyor"}
                    </small>
                    <div>
                      <button
                        className="secondary"
                        disabled={!admin || !online || busy}
                        onClick={() => void open(a)}
                      >
                        <LogIn size={14} /> Hesap ekranını aç
                      </button>
                      <button
                        className="icon-button"
                        disabled={!admin || busy || Boolean(status?.active)}
                        aria-label={`${a.label} hesabını kaldır`}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Hesap panelden kaldırılsın mı? Bilgisayardaki profil dosyaları ayrıca silinmelidir.",
                            )
                          )
                            void run(async () => {
                              await api(`/api/social/accounts/${a.id}`, {
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
              disabled={!company || !admin || busy}
              onClick={() => {
                setAdding(p);
                setLabel(`${company?.name} — ${p.name}`);
                setProfileUrl("");
              }}
            >
              <Plus size={15} /> Hesap ekle
            </button>
          </section>
        ))}
      </div>
      <div className="computer-alternative">
        <p>
          Cloudflare tarayıcısını ayrıca denemek isterseniz önceki seçenek
          korunuyor. X orada 403 hatası verdi; günlük toplam süre 10 dakikadır.
        </p>
        <button className="secondary" onClick={onCloud}>
          Cloudflare tarayıcısı seçeneğini göster
        </button>
      </div>
      {adding && (
        <Modal
          title={`${adding.name} hesabı ekle`}
          onClose={() => setAdding(null)}
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
                    profileUrl,
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
            <label className="browser-field">
              Hesap / sayfa bağlantısı
              <input
                type="url"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                maxLength={2048}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="modal-actions">
              <button className="primary" disabled={busy}>
                Hesap ekle
              </button>
            </div>
          </form>
        </Modal>
      )}
      {screen && (
        <div className="remote-browser-dialog">
          <Modal
            wide
            title={account?.label || "Şirket bilgisayarındaki hesap"}
            onClose={close}
          >
            <p className="modal-description">
              Bu ekran şirket bilgisayarındaki Firefox'u kontrol eder. Alana
              tıklayın, aşağıdan metni yazın veya tuşları kullanın. Girişi ve
              doğrulamayı tamamlayın. Ekranı kapatmak sosyal hesaptan çıkış
              yapmaz.
            </p>
            {error && (
              <p className="browser-message error" role="alert">
                {error}
              </p>
            )}
            <div className="browser-toolbar">
              {[
                ["login", "Giriş ekranını aç"],
                ["profile", "Kayıtlı sayfayı aç"],
              ].map(([action, title]) => (
                <button
                  key={action}
                  className="secondary"
                  disabled={busy}
                  onClick={() => void control(action)}
                >
                  {title}
                </button>
              ))}
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void control("screen")}
              >
                <RefreshCw size={14} /> Ekranı yenile
              </button>
            </div>
            <img
              className="computer-screen"
              alt="Şirket bilgisayarındaki sosyal hesap ekranı; alan seçmek için tıklayın"
              src={`data:image/jpeg;base64,${screen.frame}`}
              draggable={false}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                void control("click", {
                  x: Math.min(
                    1279,
                    Math.floor(
                      ((event.clientX - rect.left) * 1280) / rect.width,
                    ),
                  ),
                  y: Math.min(
                    799,
                    Math.floor(
                      ((event.clientY - rect.top) * 800) / rect.height,
                    ),
                  ),
                });
              }}
            />
            <form
              className="computer-input"
              onSubmit={(event) => {
                event.preventDefault();
                const value = text;
                setText("");
                void control("type", { text: value });
              }}
            >
              <label>
                Seçili alana yazılacak metin (gizli gösterilir)
                <input
                  type="password"
                  autoComplete="off"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={10000}
                />
              </label>
              <button className="primary" disabled={busy || !text}>
                {busy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  "Seçili alana yaz"
                )}
              </button>
            </form>
            <div className="computer-keys">
              {[
                ["Tab", "Sonraki alan"],
                ["Shift+Tab", "Önceki alan"],
                ["Enter", "Enter"],
                ["Backspace", "Geri sil"],
                ["SelectAll", "Tümünü seç"],
                ["Escape", "Esc"],
              ].map(([key, title]) => (
                <button
                  className="secondary"
                  key={key}
                  disabled={busy}
                  onClick={() => void control("key", { key })}
                >
                  {title}
                </button>
              ))}
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void control("scroll", { deltaY: -600 })}
              >
                Yukarı kaydır
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void control("scroll", { deltaY: 600 })}
              >
                Aşağı kaydır
              </button>
            </div>
            {prepared && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void control("type", {
                    text: [prepared.caption, prepared.hashtags.join(" ")]
                      .filter(Boolean)
                      .join("\n\n"),
                  })
                }
              >
                Hazır gönderi metnini seçili alana yaz
              </button>
            )}
            <p className="modal-description">
              Gönderi yayınlanmış sayılmaz; sosyal ağdaki paylaşma işlemini siz
              tamamlarsınız. Bilgisayarda açık duran Firefox'dan da giriş
              yapabilirsiniz.
            </p>
            <div className="modal-actions">
              <button className="primary" disabled={busy} onClick={close}>
                Firefox'u kapat, girişi koru
              </button>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
}
