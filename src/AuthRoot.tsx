import { forgetUser } from "./draftRecovery.ts";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import App from "./App.tsx";
import type { AuthUser } from "./types.ts";

export default function AuthRoot() {
  const [user, setUser] = useState<AuthUser | null>(null),
    [checking, setChecking] = useState(true),
    [error, setError] = useState("");
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false);
  async function check() {
    setChecking(true);
    setError("");
    try {
      const health = await fetch("/api/health", { cache: "no-store" });
      if (!health.ok)
        throw new Error("Sunucuya ulaşılamadı. Lütfen yeniden deneyin.");
      const state = await health.json();
      if (state.database === "sqlite") {
        setUser({
          id: "local",
          username: "yerel",
          email: "yerel",
          name: "Yerel geliştirme",
          role: "admin",
          local: true,
        });
        return;
      }
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok)
        throw new Error(
          "Oturum kontrolü tamamlanamadı. Lütfen yeniden deneyin.",
        );
      setUser((await response.json()).user);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    void check();
    const expired = () => {
      setUser(null);
      setPassword("");
      setError("Oturumunuz sona erdi. Yeniden giriş yapın.");
    };
    window.addEventListener("studio:session-expired", expired);
    return () => window.removeEventListener("studio:session-expired", expired);
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Giriş yapılamadı.");
      setPassword("");
      setUser(result.user);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (
      !window.confirm(
        "Kaydedilmemiş değişiklikleriniz varsa kaybolacak. Çıkış yapılsın mı?",
      )
    )
      return;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok && response.status !== 401)
        throw new Error("Çıkış yapılamadı. Yeniden deneyin.");
      if (user) forgetUser(user.id);
      setUser(null);
      setError("");
      setPassword("");
    } catch (caught) {
      window.alert((caught as Error).message);
    }
  }
  if (checking)
    return (
      <div className="auth-check" role="status">
        <LoaderCircle className="spin" size={24} />
        <p>Çalışma alanınız hazırlanıyor…</p>
      </div>
    );
  if (user)
    return (
      <App
        key={user.id}
        user={user}
        onLogout={
          user.local
            ? undefined
            : () => {
                void logout();
              }
        }
      />
    );
  return (
    <main className="login-page">
      <section className="login-story" aria-label="Sosyal Studio">
        <a className="logo" href="/">
          <div className="logo-mark">
            s<span>•</span>
          </div>
          <span>
            sosyal<span className="logo-light">studio</span>
          </span>
        </a>
        <div className="login-story-content">
          <div className="login-symbol">
            <Layers3 size={48} strokeWidth={1.3} />
          </div>
          <h1>
            Markalarınızın
            <br />
            ortak çalışma alanı.
          </h1>
          <p>
            Fikirlerinizi bir araya getirin. Her platform için markanızın
            dilinde içerikler hazırlayın.
          </p>
          <div className="login-platforms" aria-label="Desteklenen platformlar">
            {[
              "Instagram",
              "Facebook",
              "X",
              "Threads",
              "Pinterest",
              "YouTube",
              "TikTok",
              "LinkedIn",
              "Tumblr",
            ].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
        <p className="login-story-footer">Bir içerik, birçok hikâye.</p>
      </section>
      <section className="login-form-side" aria-label="Panele giriş">
        <form className="login-form" onSubmit={login}>
          <div className="login-lock">
            <LockKeyhole size={23} />
          </div>
          <h2>Tekrar merhaba.</h2>
          <p className="login-intro">
            Devam etmek için hesabınızla giriş yapın.
          </p>
          <label htmlFor="login-username">Kullanıcı adı veya e-posta</label>
          <input
            id="login-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={254}
            placeholder="Kullanıcı adınız"
            disabled={busy}
          />
          <label htmlFor="login-password">Şifre</label>
          <div className="login-password">
            <input
              id="login-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={256}
              placeholder="Şifreniz"
              disabled={busy}
            />
            <button
              type="button"
              aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary login-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} /> Giriş yapılıyor…
              </>
            ) : (
              <>
                Giriş yap <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="login-note">
            <ShieldCheck size={17} />
            <span>
              Hesaplar yönetici tarafından oluşturulur.
              <br />
              Erişim için yöneticinizle iletişime geçin.
            </span>
          </p>
          <button
            className="login-retry"
            type="button"
            onClick={() => {
              void check();
            }}
            disabled={busy}
          >
            Bağlantıyı yeniden kontrol et
          </button>
        </form>
      </section>
    </main>
  );
}
