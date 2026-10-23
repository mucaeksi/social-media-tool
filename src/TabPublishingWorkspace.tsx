import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { firefoxRequest } from "./firefoxBridge.ts";
import type { FirefoxBinding } from "./firefoxBridge.ts";
import { FirefoxConnection } from "./FirefoxConnection.tsx";
import { zonedTime } from "./scheduleTime.ts";
import { tabPublishing } from "../shared/tab-publishing.mjs";
import type { AuthUser, Company, Draft } from "./types.ts";

type Account = {
  id: string;
  label: string;
  companyId: string;
  platform: string;
  profileUrl: string;
};
type Job = {
  id: string;
  state: string;
  company_id: string;
  account_id: string;
  created_by: string;
  scheduled_at: string;
  detail: string;
  result_url: string | null;
  snapshot: {
    platform: string;
    post: { title: string };
    text: string;
    identityLabel: string;
    profileUrl: string;
    media: { mediaId: string; fit: string }[];
  };
};
type Status = {
  version: string;
  window: { companyId: string } | null;
  bindings: FirefoxBinding[];
  publishing?: { activeJob: string | null; queued: string[]; error: string };
};
const names: Record<string, string> = {
  draft: "Önizleme · eklenti onayı bekliyor",
  queued: "Onaylı · yayın sırasını bekliyor",
  preparing: "Fotoğraf ve metin hazırlanıyor",
  sending: "Gönderiliyor",
  verified: "Gönderi bağlantısı doğrulandı",
  failed: "Gönderim başlatılmadı",
  unknown: "Sonuç belirsiz · hesabı kontrol edin",
  cancelled: "İptal edildi",
  missed: "Yayın zamanı geçti",
};
const post = (data: unknown) => ({
  method: "POST",
  body: JSON.stringify(data),
});
export function TabPublishingWorkspace({
  company,
  user,
  drafts,
}: {
  company: Company;
  user: AuthUser;
  drafts: Draft[];
}) {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [status, setStatus] = useState<Status | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState(""),
    [chosen, setChosen] = useState<string[]>([]),
    [selectedJobs, setSelectedJobs] = useState<string[]>([]),
    [time, setTime] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const alive = useRef(true),
    lock = useRef(false);
  const draft = loadedDraft?.id === draftId ? loadedDraft : undefined;
  const zone = company.regional?.timezone || "Asia/Famagusta";
  const bindings = (status?.bindings || []).filter(
    (b) => b.companyId === company.id && !b.platform.startsWith("ads-"),
  );
  const binding = (id: string) => bindings.find((b) => b.accountId === id);
  const compatible = Boolean(
    status &&
    /^1\.(?:[3-9]|[1-9]\d+)\./.test(status.version) &&
    status.window?.companyId === company.id,
  );
  async function refresh() {
    const rows = await api<Job[]>(
      `/api/tab-publications?companyId=${company.id}`,
    );
    if (alive.current) setJobs(rows);
  }
  useEffect(() => {
    alive.current = true;
    if (user.role !== "admin") return;
    void Promise.all([
      refresh(),
      api<Account[]>(`/api/social/accounts?companyId=${company.id}`).then(
        (rows) => {
          if (alive.current) setAccounts(rows);
        },
      ),
    ]).catch((e) => {
      if (alive.current) setError(e.message);
    });
    let checking = false;
    const timer = setInterval(() => {
      if (checking) return;
      checking = true;
      void refresh()
        .catch(() => {})
        .finally(() => {
          checking = false;
        });
    }, 10000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [company.id, user.role]);
  useEffect(() => {
    let active = true;
    setLoadedDraft(null);
    if (draftId)
      void api<Draft>(`/api/drafts/${draftId}`)
        .then((d) => {
          if (active && alive.current) setLoadedDraft(d);
        })
        .catch((e) => {
          if (active && alive.current) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [draftId, company.id]);
  async function check() {
    const next = await firefoxRequest<Status>("status");
    if (alive.current) setStatus(next);
    return next;
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (user.role !== "admin")
    return (
      <section className="card expert-panel">
        <h2>Firefox'ta toplu otomatik yayın</h2>
        <p>
          Gönderileri yönetici onaylar ve aynı Firefox penceresinde yürütür.
        </p>
      </section>
    );
  return (
    <section
      className="card expert-panel tab-publishing"
      style={{ gridColumn: "1 / -1" }}
    >
      <h2>Firefox'ta toplu otomatik yayın</h2>
      <p>
        Siteyi ve şirketin bütün hesap/sayfa sekmelerini eklentinin kurulu
        olduğu tek Firefox penceresinde açık bırakın. Seçilen hesaplarda
        fotoğraf ve metinler eklenti onayından sonra sırayla yayımlanır. Her
        sayfa ayrı hedef olarak seçilir.
      </p>
      <p>
        YouTube için fotoğraflı topluluk gönderisi, TikTok için hesabın web
        arayüzünde sunulan fotoğraf gönderisi kullanılır. Uygun oluşturma ekranı
        veya etkin hesap doğrulanamazsa o hedef durur. Video dosyası üretilmez;
        reklam ve ödeme işlemi yapılmaz.
      </p>
      {error && (
        <p role="alert" className="browser-message error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <details>
        <summary>Pencereyi ve hesap sekmelerini bağla</summary>
        <FirefoxConnection
          companyId={company.id}
          companyName={company.name}
          disabled={busy}
          modelReady={false}
          onBinding={() => {
            setStatus(null);
          }}
        />
      </details>
      <div className="content-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await check();
            })
          }
        >
          Yayın penceresini kontrol et
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void run(async () => {})}
        >
          Yayın sonuçlarını yenile
        </button>
        <a href={`?company=${company.id}&page=accounts`}>
          Hesap ve sayfa adreslerini düzenle
        </a>
      </div>
      {status && (
        <p>
          Eklenti {status.version} ·{" "}
          {compatible
            ? `${bindings.length} sosyal hedef bağlı`
            : "Toplu yayın için eklenti 1.3 veya üzeri ve bu şirketin pencere onayı gerekli."}
          {status.publishing?.activeJob ? " · Bir gönderi yürütülüyor" : ""}
        </p>
      )}
      {status?.publishing?.error && (
        <p role="alert">{status.publishing.error}</p>
      )}
      <div className="form-two">
        <label className="field">
          Toplu yayın için kaydedilmiş taslak
          <select
            value={draftId}
            disabled={busy}
            onChange={(e) => {
              setDraftId(e.target.value);
              setChosen([]);
              setConfirmed(false);
            }}
          >
            <option value="">Taslak seçin</option>
            {drafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Toplu yayın zamanı · {zone}
          <input
            type="datetime-local"
            value={time}
            disabled={busy}
            onChange={(e) => setTime(e.target.value)}
          />
          <small>
            Boş bırakılırsa eklenti onayından sonra başlar. Zamanlı yayında
            Firefox ve site açık kalmalıdır.
          </small>
        </label>
      </div>
      <fieldset disabled={busy}>
        <legend>Yayınlanacak hesaplar ve sayfalar</legend>
        {accounts.map((a) => {
          const b = binding(a.id),
            ready =
              compatible &&
              b?.platform === a.platform &&
              b.profileUrl === a.profileUrl &&
              Boolean(b.identityLabel) &&
              Boolean(draft?.posts?.some((p) => p.platform === a.platform));
          return (
            <label className="tab-publish-target" key={a.id}>
              <input
                type="checkbox"
                checked={chosen.includes(a.id)}
                disabled={!ready}
                onChange={(e) =>
                  setChosen((ids) =>
                    e.target.checked
                      ? [...ids, a.id]
                      : ids.filter((id) => id !== a.id),
                  )
                }
              />
              <span>
                <strong>
                  {tabPublishing.platforms[a.platform]?.name || a.platform} ·{" "}
                  {b?.identityLabel || a.label}
                </strong>
                <small>
                  {ready
                    ? a.profileUrl
                    : !a.profileUrl
                      ? "Önce hedef profil/sayfa adresini kaydedin."
                      : !b
                        ? "Bu hesabın açık sekmesini eklentide bağlayın."
                        : "Taslağı, pencereyi ve hedef adresini kontrol edin."}
                </small>
              </span>
            </label>
          );
        })}
        {!accounts.length && (
          <p>
            Önce şirkete ait hesap ve sayfaları Hesap bağlantıları ekranına
            ekleyin.
          </p>
        )}
      </fieldset>
      <button
        className="primary"
        disabled={busy || !chosen.length || !draft || !compatible}
        onClick={() =>
          void run(async () => {
            const ids: string[] = [];
            try {
              for (const accountId of chosen) {
                const b = binding(accountId);
                if (!b?.identityLabel)
                  throw new Error("Hedef sekmesini yeniden bağlayın.");
                const job = await api<Job>(
                  "/api/tab-publications",
                  post({
                    id: crypto.randomUUID(),
                    draftId,
                    accountId,
                    targetLabel: b.identityLabel,
                    scheduledAt: time ? zonedTime(time, zone) : null,
                  }),
                );
                ids.push(job.id);
              }
            } finally {
              if (alive.current) {
                setSelectedJobs(ids);
                setConfirmed(false);
                await refresh();
              }
            }
            setNotice(
              "Önizlemeler kaydedildi. Hesapları, fotoğrafları ve metinleri kontrol edip eklentiye onay gönderin.",
            );
          })
        }
      >
        Seçili hesapların yayın önizlemelerini oluştur
      </button>
      {jobs.length > 0 && (
        <>
          <h3>Hedeflere göre gönderiler</h3>
          {jobs.map((j) => (
            <article className="expert-item" key={j.id}>
              <label className="expert-check">
                <input
                  type="checkbox"
                  disabled={
                    busy ||
                    !["draft", "queued"].includes(j.state) ||
                    j.created_by !== user.id
                  }
                  checked={selectedJobs.includes(j.id)}
                  onChange={(e) => {
                    setSelectedJobs((ids) =>
                      e.target.checked
                        ? [...ids, j.id]
                        : ids.filter((id) => id !== j.id),
                    );
                    setConfirmed(false);
                  }}
                />
                <strong>
                  {tabPublishing.platforms[j.snapshot.platform]?.name} ·{" "}
                  {j.snapshot.identityLabel}
                </strong>
              </label>
              <p>
                {names[j.state] || j.state} ·{" "}
                {new Date(j.scheduled_at).toLocaleString("tr-TR", {
                  timeZone: zone,
                })}
              </p>
              <a href={j.snapshot.profileUrl} target="_blank" rel="noreferrer">
                {j.snapshot.profileUrl}
              </a>
              <div className="tab-publish-images">
                {j.snapshot.media.map((m, i) => (
                  <img
                    key={m.mediaId + ":" + i}
                    loading="lazy"
                    src={`/api/media/${m.mediaId}/${j.snapshot.platform}.jpg?fit=${m.fit}`}
                    alt={`${i + 1}. yayın fotoğrafı`}
                  />
                ))}
              </div>
              {j.snapshot.post.title && <p>{j.snapshot.post.title}</p>}
              <p className="source-excerpt">{j.snapshot.text}</p>
              <p>{j.detail}</p>
              {j.result_url && (
                <a href={j.result_url} target="_blank" rel="noreferrer">
                  Doğrulanan gönderiyi aç
                </a>
              )}
              {["draft", "queued", "preparing"].includes(j.state) && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `/api/tab-publications/${j.id}/cancel`,
                        post({}),
                      );
                      setSelectedJobs((ids) => ids.filter((id) => id !== j.id));
                    })
                  }
                >
                  Bu hedefi iptal et
                </button>
              )}
              {["draft", "cancelled", "failed", "missed", "verified"].includes(
                j.state,
              ) &&
                j.created_by === user.id && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api(`/api/publications/${j.id}`, {
                          method: "DELETE",
                        });
                        setSelectedJobs((ids) =>
                          ids.filter((id) => id !== j.id),
                        );
                      })
                    }
                  >
                    İş kaydını sil
                  </button>
                )}
              {j.state === "unknown" && (
                <p>
                  Hesaptaki gönderiyi kontrol edin. Bu iş yeniden gönderilmez.
                </p>
              )}
            </article>
          ))}
          <label className="expert-check">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Seçtiğim hedefleri, fotoğrafları, metinleri ve zamanı kontrol ettim;
            bu hesaplarda gerçek paylaşımı onaylıyorum.
          </label>
          <button
            className="primary"
            disabled={
              busy ||
              !confirmed ||
              !compatible ||
              !selectedJobs.length ||
              selectedJobs.length > 20
            }
            onClick={() =>
              void run(async () => {
                await firefoxRequest("publish-batch", {
                  companyId: company.id,
                  companyName: company.name,
                  jobIds: selectedJobs,
                });
                setNotice(
                  "Firefox araç çubuğundaki Sosyal Studio simgesinde hedefleri inceleyip ‘Bu hesaplarda otomatik yayını onayla’ düğmesine basın. Onaydan sonra site ve hesap sekmeleri açık kalmalı.",
                );
                setConfirmed(false);
              })
            }
          >
            Seçili gönderileri eklenti onayına gönder
          </button>
        </>
      )}
    </section>
  );
}
