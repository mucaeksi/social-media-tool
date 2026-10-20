import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { ActivityFeed } from "./ActivityFeed.tsx";
import type { AuthUser, Company } from "./types.ts";
type Storage = {
  bytes: number | null;
  textWarningAt: number;
  textArchives: { kind: string; count: number; bytes: number }[];
};
const mb = (n: number | null) =>
  n === null
    ? "Ölçüm alınamadı"
    : (n / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) +
      " MB";
export function WorkspaceSettings({
  user,
  companies,
  company,
}: {
  user: AuthUser;
  companies: Company[];
  company?: Company;
}) {
  const [users, setUsers] = useState<AuthUser[]>([]),
    [access, setAccess] = useState<{ companyId: string; userId: string }[]>([]),
    [storage, setStorage] = useState<Storage | null>(null),
    [r2, setR2] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""),
    [password, setPassword] = useState(""),
    [newUser, setNewUser] = useState({
      username: "",
      email: "",
      name: "",
      password: "",
      role: "editor",
    });
  async function refresh() {
    if (user.role !== "admin") return;
    const [u, a, s, r] = await Promise.all([
      api<AuthUser[]>("/api/admin/users"),
      api<typeof access>("/api/admin/access"),
      api<Storage>("/api/workspace/storage"),
      api<{ r2: { usage: { storageBytes: number } } }>("/api/storage/usage"),
    ]);
    setUsers(u);
    setAccess(a);
    setStorage(s);
    setR2(r.r2.usage.storageBytes);
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const logout = () =>
    window.dispatchEvent(new Event("studio:session-expired"));
  return (
    <div className="expert-grid">
      {error && (
        <p className="browser-message error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className="card expert-panel">
        <h2>Şifre ve oturumlar</h2>
        <p>Şifre değişikliği bütün oturumları kapatır.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const old = currentPassword,
                next = password;
              setCurrentPassword("");
              setPassword("");
              await api("/api/auth/password", {
                method: "POST",
                body: JSON.stringify({ currentPassword: old, password: next }),
              });
              logout();
            });
          }}
        >
          <label className="field">
            Mevcut şifre
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Yeni şifre
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Şifremi değiştir
          </button>
        </form>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api("/api/auth/sessions/revoke", { method: "POST" });
              logout();
            })
          }
        >
          Bütün oturumlarımı kapat
        </button>
      </section>
      {user.role === "admin" && <ActivityFeed admin />}
      {user.role === "admin" && (
        <>
          <section className="card expert-panel">
            <h2>Depolama kullanımı</h2>
            <p>
              <strong>D1 veritabanı:</strong>{" "}
              {storage ? mb(storage.bytes) : "Ölçülüyor…"} / 500 MB ücretsiz tek
              veritabanı sınırı.
            </p>
            <p>
              <strong>R2 görseller:</strong> {mb(r2)} / 10.000 MB uygulama
              sınırı.
            </p>
            <p>
              Model ağırlıkları ve Firefox profilleri şirket bilgisayarında
              kalır. AI onaylı bilgileri kullanır; ağırlıkları eğitilmez.
            </p>
            {storage?.textArchives.map((r) => (
              <p key={r.kind}>
                {
                  (
                    {
                      sources: "Site metinleri",
                      facts: "Onaylı bilgiler",
                      jobs: "Yayın işleri",
                    } as Record<string, string>
                  )[r.kind]
                }
                : {r.count} kayıt · {mb(r.bytes)}
              </p>
            ))}
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(async () => {})}
            >
              Kullanımı yenile
            </button>
          </section>
          <section className="card expert-panel">
            <h2>Kullanıcı oluştur</h2>
            <p>Açık kayıt yoktur. Yeni editöre şirket erişimi atayın.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const input = { ...newUser };
                  setNewUser((s) => ({ ...s, password: "" }));
                  await api("/api/admin/users", {
                    method: "POST",
                    body: JSON.stringify(input),
                  });
                  setNotice(
                    "Kullanıcı oluşturuldu. Şirket erişimlerini atayın.",
                  );
                });
              }}
            >
              {Object.entries({
                username: "Kullanıcı adı",
                email: "E-posta",
                name: "Ad ve soyad",
                password: "İlk giriş şifresi",
              }).map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type={
                      key === "password"
                        ? "password"
                        : key === "email"
                          ? "email"
                          : "text"
                    }
                    autoComplete={key === "password" ? "new-password" : "off"}
                    value={newUser[key as keyof typeof newUser]}
                    onChange={(e) =>
                      setNewUser((s) => ({ ...s, [key]: e.target.value }))
                    }
                    minLength={key === "password" ? 10 : 1}
                    maxLength={256}
                    required
                  />
                </label>
              ))}
              <label className="field">
                Rol
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((s) => ({ ...s, role: e.target.value }))
                  }
                >
                  <option value="editor">Editör</option>
                  <option value="admin">Yönetici</option>
                </select>
              </label>
              <button className="primary" disabled={busy}>
                Kullanıcı oluştur
              </button>
            </form>
          </section>
          <section className="card expert-panel">
            <h2>Şirket erişimleri</h2>
            {users.map((u) => (
              <UserAccess
                key={u.id}
                user={u}
                companies={companies}
                initial={access
                  .filter((a) => a.userId === u.id)
                  .map((a) => a.companyId)}
                disabled={busy}
                onSave={(ids) =>
                  void run(async () => {
                    await api(`/api/admin/users/${u.id}/companies`, {
                      method: "PUT",
                      body: JSON.stringify({ companyIds: ids }),
                    });
                    setNotice("Erişimler güncellendi; oturumları kapatıldı.");
                  })
                }
                onUpdate={(data) =>
                  void run(async () => {
                    await api(`/api/admin/users/${u.id}`, {
                      method: "PUT",
                      body: JSON.stringify(data),
                    });
                    setNotice("Kullanıcı güncellendi; oturumları kapatıldı.");
                  })
                }
              />
            ))}
          </section>
          <section className="card expert-panel">
            <h2>Metin yedeği ve geri yükleme</h2>
            <p>
              Şirket profili, taslaklar ve site metinleri yedeklenir. Görselleri
              ayrıca indirin. Şifreler, cihaz anahtarı, Firefox oturumları ve
              model yedeğe girmez. Geri yükleme yeni şirket kopyası oluşturur.
            </p>
            {company && (
              <a
                className="secondary"
                href={`/api/workspace/backup?companyId=${company.id}`}
              >
                {company.name} metin yedeğini indir
              </a>
            )}
            <label className="field">
              JSON yedeğinden yeni şirket kopyası
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void run(async () => {
                    if (file.size > 4000000)
                      throw new Error("Yedek 4 MB sınırını aşıyor.");
                    const result = await api<{ note: string }>(
                      "/api/workspace/restore",
                      { method: "POST", body: await file.text() },
                    );
                    setNotice(
                      result.note + " Şirket listesi için sayfayı yenileyin.",
                    );
                  });
                }}
              />
            </label>
          </section>
        </>
      )}
    </div>
  );
}
function UserAccess({
  user,
  companies,
  initial,
  disabled,
  onSave,
  onUpdate,
}: {
  user: AuthUser;
  companies: Company[];
  initial: string[];
  disabled: boolean;
  onSave: (ids: string[]) => void;
  onUpdate: (input: {
    enabled: boolean;
    role: string;
    password?: string;
  }) => void;
}) {
  const [ids, setIds] = useState(initial),
    [password, setPassword] = useState(""),
    [role, setRole] = useState(user.role),
    [enabled, setEnabled] = useState(user.enabled !== false);
  useEffect(() => setIds(initial), [initial.join(",")]);
  return (
    <article className="expert-item">
      <h3>
        {user.name} · {user.username}
      </h3>
      <label className="field">
        Rol
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AuthUser["role"])}
        >
          <option value="editor">Editör</option>
          <option value="admin">Yönetici</option>
        </select>
      </label>
      <label className="expert-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Hesap etkin
      </label>
      {role === "admin" ? (
        <p>Yöneticinin bütün şirketlere erişimi vardır.</p>
      ) : (
        companies.map((c) => (
          <label className="expert-check" key={c.id}>
            <input
              type="checkbox"
              checked={ids.includes(c.id)}
              onChange={(e) =>
                setIds((s) =>
                  e.target.checked
                    ? [...s, c.id]
                    : s.filter((id) => id !== c.id),
                )
              }
            />
            {c.name}
          </label>
        ))
      )}
      <button
        className="secondary"
        disabled={disabled}
        onClick={() => onSave(ids)}
      >
        Şirket erişimlerini kaydet
      </button>
      <label className="field">
        Yeni şifre (değişmeyecekse boş bırakın)
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          maxLength={256}
        />
      </label>
      <button
        className="secondary"
        disabled={disabled || Boolean(password && password.length < 10)}
        onClick={() => {
          onUpdate({ enabled, role, ...(password ? { password } : {}) });
          setPassword("");
        }}
      >
        Kullanıcıyı güncelle
      </button>
    </article>
  );
}
