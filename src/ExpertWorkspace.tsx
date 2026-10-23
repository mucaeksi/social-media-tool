import { lazy, Suspense } from "react";
import { platforms as editorialPlatforms } from "../shared/platform-catalog.mjs";
const EditorialMetrics = lazy(() =>
  import("./ContentWorkspace.tsx").then((m) => ({
    default: m.ContentWorkspace,
  })),
);
import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { TabPublishingWorkspace } from "./TabPublishingWorkspace.tsx";
import { ActivityFeed } from "./ActivityFeed.tsx";
import type { AuthUser, Company, Draft } from "./types.ts";

type Source = {
  id: string;
  title: string;
  url: string;
  final_url: string;
  excerpt: string;
  fetched_at: string;
  state: string;
  content_hash: string;
};
type Fact = {
  id: string;
  source_id: string;
  field: string;
  value: string;
  final_url: string;
  valid_until: string;
  retired_at: string | null;
};
type Knowledge = { sources: Source[]; facts: Fact[] };
const date = (v: string) =>
  new Date(v).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
const json = (data: unknown) => ({
  method: "POST",
  body: JSON.stringify(data),
});
export function ResearchWorkspace({
  company,
  user,
}: {
  company: Company;
  user: AuthUser;
}) {
  const [data, setData] = useState<Knowledge>({ sources: [], facts: [] }),
    [urls, setUrls] = useState(company.website),
    [mode, setMode] = useState("static"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [chosen, setChosen] = useState<Source | null>(null),
    [field, setField] = useState("Ürün / hizmet"),
    [value, setValue] = useState(""),
    [evidence, setEvidence] = useState(""),
    [days, setDays] = useState(7);
  const refresh = () =>
    api<Knowledge>(`/api/knowledge?companyId=${company.id}`).then(setData);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [company.id]);
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
  return (
    <div className="expert-grid">
      <section className="card expert-panel">
        <h2>KKTC şirket bilgileri</h2>
        <p>
          İlçe, hedef kitle, dil, teslimat ve iletişim bilgilerini Şirketler →
          Profili düzenle alanından tamamlayın. AI bu bilgileri ve geçerli
          kaynakları birlikte kullanır.
        </p>
        <dl>
          {Object.entries(company.regional || {})
            .filter(([k, v]) => k !== "timezone" && v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{regionalLabels[k] || k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        <p>
          <strong>İçerik saat dilimi:</strong>{" "}
          {company.regional?.timezone || "Asia/Famagusta"}
        </p>
      </section>
      <section className="card expert-panel">
        <h2>Web sitesini incele</h2>
        <p>
          Şirketin kayıtlı alan adından en fazla beş adres girin. İlk okuma
          bilgileri hafızaya otomatik eklemez. Araştırma, giriş yapılmamış ayrı
          Firefox profilinde çalışır.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const result = await api<{
                saved: number;
                unchanged: number;
                limited?: number;
              }>(
                "/api/knowledge/research",
                json({
                  companyId: company.id,
                  urls: urls
                    .split(/\n/)
                    .map((u) => u.trim())
                    .filter(Boolean),
                  mode,
                }),
              );
              setNotice(
                `${result.saved} yeni kaynak; ${result.unchanged} değişmemiş sayfa. ${result.limited ? result.limited + " sayfa arşiv sınırı nedeniyle eklenemedi. " : ""}Bilgileri kanıt alıntısıyla onaylayın.`,
              );
            });
          }}
        >
          <label className="field">
            İncelenecek adresler
            <textarea
              aria-label="İncelenecek adresler"
              rows={5}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Okuma biçimi
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="static">Hafif sayfa okuma</option>
              <option value="firefox">Firefox ile dinamik sayfa</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={busy || user.role !== "admin" || !company.website}
          >
            {busy ? "İnceleniyor…" : "Siteyi incele"}
          </button>
        </form>
        <p>
          Günde 20 araştırma; şirket başına 100 kaynak ve 100 bilgi. Sayfa metni
          ve model dosyaları farklı depolardır.
        </p>
      </section>
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
      <section className="card expert-panel">
        <h2>Kaynaklar ve değişiklikler</h2>
        {!data.sources.length && <p>Henüz incelenmiş kaynak yok.</p>}
        {data.sources.map((s, i) => {
          const previous = data.sources
            .slice(i + 1)
            .find((p) => p.final_url === s.final_url);
          return (
            <article className="expert-item" key={s.id}>
              <h3>{s.title || "Başlıksız kaynak"}</h3>
              <a href={s.final_url} target="_blank" rel="noreferrer">
                {s.final_url}
              </a>
              <p>
                {date(s.fetched_at)} ·{" "}
                {s.state === "approved"
                  ? "Onaylı bilgi içeriyor"
                  : "İnceleme bekliyor"}
              </p>
              {previous && previous.content_hash !== s.content_hash && (
                <details>
                  <summary>Önceki okumadan farklı içerik</summary>
                  <p>
                    <strong>Önceki:</strong> {previous.excerpt}
                  </p>
                  <p>
                    <strong>Yeni:</strong> {s.excerpt}
                  </p>
                </details>
              )}
              <details>
                <summary>Kaynak metnini göster</summary>
                <p className="source-excerpt">{s.excerpt}</p>
              </details>
              {user.role === "admin" && (
                <div className="expert-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      setChosen(s);
                      setValue("");
                      setEvidence("");
                    }}
                  >
                    Bilgi seç ve onayla
                  </button>
                  <button
                    className="secondary"
                    disabled={
                      busy || data.facts.some((f) => f.source_id === s.id)
                    }
                    onClick={() =>
                      void run(async () => {
                        await api(`/api/knowledge/sources/${s.id}`, {
                          method: "DELETE",
                        });
                      })
                    }
                  >
                    Kullanılmayan kaynağı sil
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <section className="card expert-panel">
        <h2>Onaylı şirket hafızası</h2>
        <p>
          Alan adı aynı olan yeni bir bilgi, önceki bilgiyi geçmişe ayırır. Eski
          veya süresi dolmuş bilgiler AI'a verilmez.
        </p>
        {data.facts.map((f) => (
          <article className="expert-item" key={f.id}>
            <strong>{f.field}</strong>
            <p>{f.value}</p>
            <a href={f.final_url} target="_blank" rel="noreferrer">
              Kaynak
            </a>
            <p>
              {f.retired_at
                ? "Önceki sürüm"
                : Date.parse(f.valid_until) < Date.now()
                  ? "Geçerlilik süresi doldu"
                  : `Geçerli: ${date(f.valid_until)}`}
            </p>
            {user.role === "admin" && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api(`/api/knowledge/facts/${f.id}`, {
                      method: "DELETE",
                    });
                  })
                }
              >
                Bilgiyi sil
              </button>
            )}
          </article>
        ))}
      </section>
      {chosen && (
        <section className="card expert-panel">
          <h2>Kaynak bilgisini onayla</h2>
          <p>
            Değeri ve kanıtı kaynak metninden aynen kopyalayın. Fiyat/kampanya
            gibi değişken bilgiler için kısa bir geçerlilik süresi seçin.
          </p>
          <p className="source-excerpt">{chosen.excerpt}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api(
                  `/api/knowledge/sources/${chosen.id}/approve`,
                  json({
                    field,
                    value,
                    evidence,
                    validUntil: new Date(
                      Date.now() + days * 86400000,
                    ).toISOString(),
                  }),
                );
                setChosen(null);
                setNotice("Kaynak bilgisi şirket hafızasına eklendi.");
              });
            }}
          >
            <label className="field">
              Bilgi alanı
              <input
                value={field}
                maxLength={100}
                onChange={(e) => setField(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Doğrulanan değer
              <textarea
                value={value}
                maxLength={600}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Kaynakta geçen kanıt alıntısı
              <textarea
                value={evidence}
                maxLength={800}
                onChange={(e) => setEvidence(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Geçerlilik süresi
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={1}>1 gün</option>
                <option value={7}>7 gün</option>
                <option value={30}>30 gün</option>
                <option value={180}>180 gün</option>
              </select>
            </label>
            <div className="expert-actions">
              <button className="primary" disabled={busy}>
                Bilgiyi onayla
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setChosen(null)}
              >
                Vazgeç
              </button>
            </div>
          </form>
        </section>
      )}
      <QualityWorkspace company={company} />
      <ActivityFeed companyId={company.id} />
    </div>
  );
}
export const regionalLabels: Record<string, string> = {
  sector: "Sektör ve ürün grupları",
  districts: "Hizmet verilen ilçeler / yerleşimler",
  segments: "KKTC müşteri grupları",
  languages: "İçerik dilleri",
  delivery: "Teslimat ve kurulum bölgeleri",
  currency: "Para birimi ve fiyat açıklaması",
  contact: "Onaylı iletişim / WhatsApp / adres",
  hours: "Çalışma saatleri",
  goal: "İçerik hedefi ve eylem çağrısı",
  restrictions: "Kullanılmayacak ifadeler ve iddialar",
};

type Evaluation = {
  id: string;
  scenario: string;
  answer: string;
  scores: Record<string, number | boolean>;
  created_at: string;
};
function QualityWorkspace({ company }: { company: Company }) {
  const [data, setData] = useState<{
      cases: { id: string; brief: string }[];
      evaluations: Evaluation[];
    }>({ cases: [], evaluations: [] }),
    [scenario, setScenario] = useState("eksik-fiyat"),
    [answer, setAnswer] = useState(""),
    [scores, setScores] = useState({
      grounding: 0,
      brand: 0,
      local: 0,
      platform: 0,
      hallucination: false,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    api<typeof data>(`/api/quality?companyId=${company.id}`).then(setData);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [company.id]);
  return (
    <section className="card expert-panel">
      <h2>KKTC içerik kalite defteri</h2>
      <p>
        30 deneme senaryosu. Gerçek yanıtı ekleyip her ölçütü 0–4 arasında
        puanlayın. Bu ekran editör değerlendirmesidir; modeli otomatik eğitmez
        ve ölçülmemiş başarı göstermez.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              "/api/quality",
              json({ companyId: company.id, scenario, answer, scores }),
            );
            await refresh();
            setAnswer("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Deneme senaryosu
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {data.cases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.brief}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Değerlendirilen gerçek yanıt
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={6000}
            required
          />
        </label>
        <div className="form-two">
          {Object.entries({
            grounding: "Kaynak doğruluğu",
            brand: "Marka dili",
            local: "KKTC uygunluğu",
            platform: "Platform sınırları",
          }).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                type="number"
                min={0}
                max={4}
                value={scores[key as keyof typeof scores] as number}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>
        <label className="expert-check">
          <input
            type="checkbox"
            checked={scores.hallucination}
            onChange={(e) =>
              setScores((s) => ({ ...s, hallucination: e.target.checked }))
            }
          />
          Kaynakta olmayan bilgi üretti
        </label>
        <button className="primary" disabled={busy}>
          Değerlendirmeyi kaydet
        </button>
      </form>
      <p>
        {data.evaluations.length} kayıt ·{" "}
        {new Set(data.evaluations.map((r) => r.scenario)).size}/30 senaryo
        değerlendirildi ·{" "}
        {data.evaluations.filter((r) => r.scores.hallucination).length} uydurma
        bilgi işareti.
      </p>
      <details>
        <summary>Son değerlendirmeler</summary>
        {data.evaluations.slice(0, 10).map((r) => (
          <article className="expert-item" key={r.id}>
            <strong>{r.scenario}</strong>
            <p>{r.answer}</p>
            <small>{date(r.created_at)}</small>
          </article>
        ))}
      </details>
    </section>
  );
}

type Job = {
  id: string;
  state: string;
  scheduled_at: string;
  timezone: string;
  detail: string;
  result_url?: string;
  snapshot: {
    text: string;
    mediaId?: string;
    identityLabel?: string;
    accountLabel?: string;
    profileUrl?: string;
  };
};
const states: Record<string, string> = {
  draft: "Onay bekliyor",
  queued: "Sırada",
  preparing: "Hazırlanıyor",
  sending: "Gönderiliyor",
  verified: "Gönderi bağlantısı doğrulandı",
  unknown: "Sonuç belirsiz — hesabı kontrol edin",
  missed: "Zamanı geçti",
  failed: "Hazırlık başarısız",
  cancelled: "İptal edildi",
};
export function PublicationWorkspace({
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
  const [stateFilter, setStateFilter] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]),
    [accounts, setAccounts] = useState<
      { id: string; label: string; platform: string }[]
    >([]),
    [draftId, setDraftId] = useState(""),
    [accountId, setAccountId] = useState(""),
    [time, setTime] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [identity, setIdentity] = useState<Record<string, string>>({}),
    [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const refresh = () =>
    api<Job[]>(`/api/publications?companyId=${company.id}`).then(setJobs);
  useEffect(() => {
    let valid = true,
      inFlight = false;
    const timer = setInterval(() => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      void api<Job[]>(`/api/publications?companyId=${company.id}`)
        .then((rows) => {
          if (valid) setJobs(rows);
        })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    }, 15000);
    return () => {
      valid = false;
      clearInterval(timer);
    };
  }, [company.id]);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    if (user.role === "admin")
      void api<typeof accounts>(`/api/social/accounts?companyId=${company.id}`)
        .then(setAccounts)
        .catch((e) => setError(e.message));
  }, [company.id]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="expert-grid">
      <TabPublishingWorkspace
        key={company.id}
        company={company}
        user={user}
        drafts={drafts}
        initialDraftId={initialDraftId}
      />
      <section className="card expert-panel">
        <h2>Facebook · ayrı oturum pilotu</h2>
        <p>
          Onaylanan işler planlanan zamanda şirket bilgisayarındaki Firefox ile
          yürütülür. Bilgisayar çevrimdışı kalırsa iki dakikadan fazla geciken
          iş paylaşılmaz. İlk otomatik adaptör Facebook içindir; diğer
          platformların ve aynı pencerenin toplu yayını yukarıdaki ekrandadır.
        </p>
        <p>
          <strong>Hedef saat dilimi:</strong>{" "}
          {company.regional?.timezone || "Asia/Famagusta"}. Hesap girişleri ve
          gerçek yayın davranışı şirket bilgisayarında doğrulanmalıdır.
        </p>
        {error && (
          <p className="browser-message error" role="alert">
            {error}
          </p>
        )}
        {user.role === "admin" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = crypto.randomUUID();
              void run(async () => {
                const { zonedTime } = await import("./scheduleTime.ts");
                await api(
                  "/api/publications",
                  json({
                    id,
                    draftId,
                    accountId,
                    scheduledAt: time
                      ? zonedTime(
                          time,
                          company.regional?.timezone || "Asia/Famagusta",
                        )
                      : new Date().toISOString(),
                    timezone: company.regional?.timezone || "Asia/Famagusta",
                    immediate: !time,
                  }),
                );
              });
            }}
          >
            <label className="field">
              Kaydedilmiş taslak
              <select
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                required
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
              Facebook hesabı
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                <option value="">Hesap seçin</option>
                {accounts
                  .filter((a) => a.platform === "facebook")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Planlanan yerel tarih ve saat
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <p>
              Boş bırakırsanız onaydan sonraki ilk kontrolde yürütülür. Görsel,
              metin ve kaynak sürümleri bu işte sabitlenir.
            </p>
            <button className="primary" disabled={busy}>
              Önizleme işi oluştur
            </button>
          </form>
        )}
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void run(async () => {})}
        >
          Durumları yenile
        </button>
        <label className="field">
          Yayın durumu
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">Bütün işler</option>
            {Object.entries(states).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {jobs
          .filter(
            (j) =>
              (j.snapshot as unknown as { transport?: string }).transport !==
              "firefox-tabs",
          )
          .filter((j) => !stateFilter || j.state === stateFilter)
          .map((j) => (
            <article className="expert-item" key={j.id}>
              <h3>{states[j.state] || j.state}</h3>
              <p>
                {new Date(j.scheduled_at).toLocaleString("tr-TR", {
                  timeZone: j.timezone,
                })}{" "}
                · {j.timezone}
              </p>
              <p>
                <strong>
                  Hedef hesap:{" "}
                  {j.snapshot.accountLabel ||
                    j.snapshot.identityLabel ||
                    "Hesap adını onayda kontrol edin"}
                </strong>
              </p>
              {j.snapshot.profileUrl && (
                <a
                  href={j.snapshot.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {j.snapshot.profileUrl}
                </a>
              )}
              {j.snapshot.mediaId && (
                <img
                  className="publication-thumbnail"
                  src={`/api/media/${j.snapshot.mediaId}/facebook.jpg`}
                  alt="Yayınlanacak görsel önizlemesi"
                />
              )}
              <p className="source-excerpt">{j.snapshot.text}</p>
              <p>{j.snapshot.mediaId ? "Görsel eklenecek" : "Yalnız metin"}</p>
              <p>{j.detail}</p>
              {j.result_url && (
                <a href={j.result_url} target="_blank" rel="noreferrer">
                  Gerçek gönderiyi aç
                </a>
              )}
              {user.role === "admin" && (
                <>
                  <div className="expert-actions">
                    {j.state === "draft" && (
                      <>
                        <label className="field">
                          Facebook'ta görünen hedef sayfa adı
                          <input
                            value={identity[j.id] || ""}
                            onChange={(e) =>
                              setIdentity((s) => ({
                                ...s,
                                [j.id]: e.target.value,
                              }))
                            }
                            maxLength={100}
                          />
                        </label>
                        <label className="expert-check">
                          <input
                            type="checkbox"
                            checked={confirmed[j.id] || false}
                            onChange={(e) =>
                              setConfirmed((s) => ({
                                ...s,
                                [j.id]: e.target.checked,
                              }))
                            }
                          />
                          Hedef hesabı, metni, görseli ve zamanı kontrol ettim;
                          paylaşımı onaylıyorum.
                        </label>
                        <button
                          className="primary"
                          disabled={busy || !confirmed[j.id] || !identity[j.id]}
                          onClick={() =>
                            void run(async () => {
                              await api(
                                `/api/publications/${j.id}/approve`,
                                json({
                                  identityLabel: identity[j.id],
                                  confirmed: true,
                                }),
                              );
                            })
                          }
                        >
                          Paylaşımı onayla
                        </button>
                      </>
                    )}
                    {j.state === "queued" && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(
                              `/api/publications/${j.id}/execute`,
                              json({}),
                            );
                          })
                        }
                      >
                        Zamanı geldiyse yürüt
                      </button>
                    )}
                    {["draft", "queued", "preparing"].includes(j.state) && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(
                              `/api/publications/${j.id}/cancel`,
                              json({}),
                            );
                          })
                        }
                      >
                        İptal et
                      </button>
                    )}
                    {[
                      "draft",
                      "cancelled",
                      "failed",
                      "missed",
                      "verified",
                    ].includes(j.state) && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`/api/publications/${j.id}`, {
                              method: "DELETE",
                            });
                          })
                        }
                      >
                        İş kaydını sil
                      </button>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
      </section>
      <MetricsWorkspace company={company} user={user} />
    </div>
  );
}
function MetricsWorkspace({
  company,
  user,
}: {
  company: Company;
  user: AuthUser;
}) {
  const [legacy, setLegacy] = useState<
    {
      id: string;
      source_url: string;
      measured_at: string;
      values: Record<string, number>;
    }[]
  >([]);
  useEffect(() => {
    let valid = true;
    void api<typeof legacy>(`/api/metrics?companyId=${company.id}`)
      .then((rows) => {
        if (valid) setLegacy(rows);
      })
      .catch(() => {});
    return () => {
      valid = false;
    };
  }, [company.id]);
  return (
    <section className="card expert-panel">
      <Suspense fallback={<p role="status">Ölçümler açılıyor…</p>}>
        <EditorialMetrics
          company={company}
          user={user}
          platforms={editorialPlatforms}
          initialTab="metric"
        />
      </Suspense>
      {legacy.length > 0 && (
        <details>
          <summary>Önceki ölçüm kayıtları ({legacy.length})</summary>
          <p>
            Eski kayıtların platform bilgisi yoktur; yeni ölçümlerle
            birleştirilmez.
          </p>
          {legacy.map((r) => (
            <article key={r.id}>
              <a href={r.source_url} target="_blank" rel="noreferrer">
                Ölçüm kaynağı
              </a>
              <p>
                {date(r.measured_at)} · {r.values.impressions} gösterim ·{" "}
                {r.values.clicks} tıklama · {r.values.messages} mesaj ·{" "}
                {r.values.leads} talep
              </p>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
