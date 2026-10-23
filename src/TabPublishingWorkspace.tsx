import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { firefoxRequest, firefoxAccountIssue } from "./firefoxBridge.ts";
import type { FirefoxStatus } from "./firefoxBridge.ts";
import { FirefoxConnection } from "./FirefoxConnection.tsx";
import { zonedTime } from "./scheduleTime.ts";
import { tabPublishing } from "../shared/tab-publishing.mjs";
import type { AuthUser, Company, Draft, PlatformId } from "./types.ts";

type Account = {
  id: string;
  label: string;
  companyId: string;
  platform: PlatformId;
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
    draftId?: string;
    post: { title: string };
    text: string;
    identityLabel: string;
    profileUrl: string;
    media: { mediaId: string; fit: string }[];
  };
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
  initialDraftId = "",
}: {
  company: Company;
  user: AuthUser;
  drafts: Draft[];
  initialDraftId?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [status, setStatus] = useState<FirefoxStatus | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState(initialDraftId),
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
  function targetIssue(a: Account) {
    const connectionIssue = firefoxAccountIssue(a, status);
    if (connectionIssue) return connectionIssue;
    if (!draft) return "Önce kaydedilmiş taslağı seçin.";
    if (!draft.posts.some((p) => p.platform === a.platform)) return "Bu platformun metni taslakta yok.";
    const count = draft.gallery && draft.gallery.length > 1 ? draft.gallery.length
      : draft.platformMedia?.[a.platform] || draft.gallery?.[0]?.mediaId || draft.mediaId ? 1 : 0;
    if (["instagram", "pinterest", "tiktok"].includes(a.platform) && !count)
      return "Bu platform için taslağa fotoğraf ekleyin.";
    if (count > (tabPublishing.platforms[a.platform]?.images ?? 0))
      return `Bu platform en fazla ${tabPublishing.platforms[a.platform]?.images || 0} fotoğraf kabul eder.`;
    return "";
  }
  const readyAccounts = accounts.filter((a) => !targetIssue(a));
  const pendingDraftJobs = jobs.filter((j) => j.created_by === user.id && j.snapshot.draftId === draftId &&
    (j.state === "draft" || (j.state === "queued" && status?.publishing &&
      !status.publishing.queued.includes(j.id) && status.publishing.activeJob !== j.id)));
  useEffect(() => {
    if (initialDraftId) { setDraftId(initialDraftId); setChosen([]); setConfirmed(false); }
  }, [initialDraftId]);
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
          if (active && alive.current) {
            if (d.companyId !== company.id) throw new Error("Yayın taslağı seçili şirkete ait değil.");
            setLoadedDraft(d);
          }
        })
        .catch((e) => {
          if (active && alive.current) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [draftId, company.id]);
  async function check() {
    try {
      const next = await firefoxRequest<FirefoxStatus>("status");
      if (alive.current) setStatus(next);
      return next;
    } catch (e) {
      if (alive.current) setStatus(null);
      throw e;
    }
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
      <ol aria-label="Yayın adımları">
        <li>Kaydedilmiş taslağı ve hedef hesapları seçin.</li>
        <li>Yayın önizlemelerini oluşturup fotoğraf ve metinleri kontrol edin.</li>
        <li>Gönderileri eklentiye iletip Firefox simgesinden toplu yayını onaylayın.</li>
      </ol>
      <p>Taslağa kaydetmek paylaşımı başlatmaz. Gönderim son eklenti onayından sonra başlar.</p>
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
      <FirefoxConnection
        companyId={company.id}
        companyName={company.name}
        disabled={busy}
        modelReady={false}
        registeredAccounts={accounts}
        compact
        onBinding={() => {}}
        onStatus={setStatus}
      />
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
        <a href={`?company=${company.id}&page=connections`}>
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
        <button type="button" className="secondary" disabled={!readyAccounts.length}
          onClick={() => { setChosen(readyAccounts.map((a) => a.id)); setConfirmed(false); }}>
          Uygun tüm hesapları seç ({readyAccounts.length})
        </button>
        {accounts.map((a) => {
          const b = binding(a.id), issue = targetIssue(a), ready = !issue,
            connectionIssue = firefoxAccountIssue(a, status);
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
                  {connectionIssue || "Firefox sekmesi bağlı"}
                </small>
                {!connectionIssue && <small>{issue || `İçerik önizlemesi oluşturulabilir · ${a.profileUrl}`}</small>}
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
          <button className="secondary" disabled={busy || !pendingDraftJobs.length}
            onClick={() => { setSelectedJobs(pendingDraftJobs.slice(0, 20).map((j) => j.id)); setConfirmed(false); }}>
            Bu taslağın bekleyen gönderilerini seç ({pendingDraftJobs.length})
          </button>
          <p>{selectedJobs.length} gönderi seçili. Gönderime iletmek için aşağıdaki paylaşım onayını işaretleyip eklentiye gönderin.</p>
          {selectedJobs.length > 20 && <p role="alert">Tek toplu onayda en fazla 20 hedef gönderilebilir. Seçimi azaltıp kalan hedefleri sonraki grupta onaylayın.</p>}
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
              {j.state === "draft" && <p role="status">
                {status?.publishing?.pendingJobs?.includes(j.id)
                  ? "Yayın isteği eklentiye ulaştı. Firefox araç çubuğundaki Sosyal Studio simgesinden toplu onayı tamamlayın."
                  : "Henüz gönderime iletilmedi. Bu önizlemeyi seçip aşağıdaki paylaşım onayından sonra eklentiye gönderin."}
              </p>}
              {j.state === "queued" && compatible && status?.publishing &&
                status.publishing.activeJob !== j.id && !status.publishing.queued.includes(j.id) && <p role="status">
                  Bu iş eklentinin yürütme listesinde görünmüyor. Gönderim başlamadıysa hedef sekmesini kontrol edip bu işi seçerek yeniden eklenti onayına gönderin.
                </p>}
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
