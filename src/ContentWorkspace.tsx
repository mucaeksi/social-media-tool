import { useEffect, useState } from "react";
import { api } from "./api.ts";
import type {
  AuthUser,
  Company,
  Draft,
  DraftInput,
  Platform,
  PlatformId,
} from "./types.ts";
import { Modal } from "./Modal.tsx";
import { campaignUrl, latestMeasurements } from "../shared/editorial.mjs";
import { zonedTime } from "./scheduleTime.ts";
import type { AITurn } from "./SocialAI.tsx";
import { BackupManager } from "./BackupManager.tsx";

type Row = { id: string; revision: number; [key: string]: any };
type Kind =
  | "campaign"
  | "product"
  | "plan"
  | "metric"
  | "idea"
  | "experiment"
  | "correction"
  | "benchmark";
const labels: Record<Kind, string> = {
  campaign: "Kampanyalar",
  product: "Ürün bilgi kartları",
  plan: "İçerik takvimi",
  metric: "Ölçülen performans",
  idea: "Fikir ve soru kutusu",
  experiment: "İçerik deneyleri",
  correction: "Editör düzeltmeleri",
  benchmark: "Model karşılaştırması",
};
const fields: Record<Kind, [string, string, string?][]> = {
  campaign: [
    ["name", "Kampanya adı"],
    ["goal", "Amaç"],
    ["audience", "Hedef kitle"],
    ["offer", "Ana teklif / mesaj", "textarea"],
    ["cta", "Tek çağrı"],
    ["owner", "Sorumlu"],
    ["startsAt", "Başlangıç", "date"],
    ["endsAt", "Bitiş", "date"],
    ["pillar", "İçerik hattı"],
  ],
  product: [
    ["name", "Ürün adı"],
    ["sku", "Ürün kodu"],
    ["dimensions", "Onaylı ölçüler"],
    ["material", "Malzeme"],
    ["care", "Bakım bilgisi", "textarea"],
    ["colors", "Renk seçenekleri"],
    ["price", "Fiyat ve para birimi"],
    ["delivery", "Teslimat bölgesi / koşulu"],
    ["sourceUrl", "Kaynak bağlantısı", "url"],
    ["evidence", "Kaynakta geçen kanıt", "textarea"],
    ["validUntil", "Bilgi geçerlilik tarihi", "date"],
  ],
  plan: [
    ["name", "İçerik adı"],
    ["scheduledAt", "Planlanan yerel tarih ve saat", "date"],
    ["owner", "Sorumlu"],
    ["note", "İçerik / çekim notu", "textarea"],
    ["resultUrl", "Elle paylaşılan gönderi bağlantısı", "url"],
  ],
  metric: [
    ["sourceUrl", "Ölçüm / gönderi kaynak bağlantısı", "url"],
    ["measuredAt", "Gerçek ölçüm tarihi ve saati", "date"],
    ["variant", "Varyant etiketi"],
    ["windowHours", "Yayın sonrası ölçüm penceresi (saat)", "number"],
  ],
  idea: [
    ["title", "Fikir başlığı"],
    ["question", "Müşteri sorusu / içerik fikri", "textarea"],
    ["sourceUrl", "İsteğe bağlı kaynak", "url"],
    ["pillar", "İçerik hattı"],
  ],
  experiment: [
    ["name", "Deney adı"],
    ["hypothesis", "Hipotez", "textarea"],
    ["windowHours", "Ölçüm penceresi (saat)", "number"],
    ["conclusion", "Gözlem ve sınırlamalar", "textarea"],
  ],
  correction: [
    ["before", "İlk metin", "textarea"],
    ["after", "Editörün düzelttiği metin", "textarea"],
    ["reason", "Düzenleme gerekçesi", "textarea"],
  ],
  benchmark: [
    ["scenario", "Deneme senaryosu"],
    ["model", "Model etiketi"],
    ["modelDigest", "Model özeti (ölçüldüyse)"],
    ["expertVersion", "Uzman rehberi sürümü"],
    ["sourceVersion", "Kaynak sürümü / özeti"],
    ["answer", "Gerçek model yanıtı", "textarea"],
    ["corrected", "Düzeltilmiş yanıt", "textarea"],
    ["durationMs", "Toplam istek süresi (ms)", "nullable"],
    ["editingSeconds", "Editör düzeltme süresi (saniye)", "nullable"],
  ],
};
function localDate(value: string, timezone: string) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
const json = (data: unknown, method = "POST") => ({
  method,
  body: JSON.stringify(data),
});
const metricLabels: Record<string, string> = {
  impressions: "Gösterim",
  reach: "Erişim",
  saves: "Kaydetme",
  shares: "Paylaşma",
  clicks: "Tıklama",
  messages: "Ürün hakkında mesaj",
  leads: "Teklif / talep",
  visits: "Mağaza ziyareti niyeti",
};
function initial(kind: Kind, company: Company): Record<string, any> {
  return {
    campaign: {
      name: "",
      goal: company.regional?.goal || "",
      audience: company.audience,
      offer: "",
      cta: "",
      owner: "",
      startsAt: "",
      endsAt: "",
      platforms: company.preferredPlatforms || ["instagram", "facebook"],
      pillar: "",
    },
    product: {
      name: "",
      sku: "",
      dimensions: "",
      material: "",
      care: "",
      colors: "",
      price: "",
      delivery: "",
      sourceUrl: "",
      evidence: "",
      validUntil: "",
      state: "pending",
    },
    plan: {
      name: "",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      timezone: company.regional?.timezone || "Asia/Famagusta",
      platform: "instagram",
      format: "post",
      owner: "",
      note: "",
      state: "idea",
      resultUrl: "",
      campaignId: null,
      draftId: null,
    },
    metric: {
      sourceUrl: "",
      measuredAt: new Date().toISOString(),
      platform: "instagram",
      variant: "",
      windowHours: 72,
      values: Object.fromEntries(
        Object.keys(metricLabels).map((k) => [k, null]),
      ),
      draftId: null,
      campaignId: null,
      jobId: null,
    },
    idea: {
      title: "",
      question: "",
      sourceUrl: "",
      pillar: "",
      status: "open",
      campaignId: null,
    },
    experiment: {
      name: "",
      platform: "instagram",
      variable: "hook",
      hypothesis: "",
      variants: [
        { label: "A", draftId: null },
        { label: "B", draftId: null },
      ],
      windowHours: 72,
      conclusion: "",
      campaignId: null,
    },
    correction: {
      before: "",
      after: "",
      reason: "",
      platform: "instagram",
      draftId: null,
      state: "pending",
    },
    benchmark: {
      scenario: "",
      model: "",
      modelDigest: "",
      expertVersion: "",
      sourceVersion: "",
      answer: "",
      corrected: "",
      mediaId: null,
      durationMs: null,
      editingSeconds: null,
      validOutput: true,
      hallucination: false,
      scores: { grounding: 0, brand: 0, local: 0, platform: 0 },
    },
  }[kind];
}

export function ContentWorkspace({
  company,
  user,
  platforms,
  onOpen,
  onBrief,
  initialTab = "campaign",
}: {
  company: Company;
  user: AuthUser;
  platforms: Platform[];
  onOpen?: (d: Draft) => void;
  onBrief?: (brief: {
    text: string;
    details: Partial<DraftInput>;
    selected: PlatformId[];
  }) => void;
  initialTab?: Kind;
}) {
  const [tab, setTab] = useState<Kind | "preferences" | "backup">(initialTab),
    [records, setRecords] = useState<Record<Kind, Row[]>>({
      campaign: [],
      product: [],
      plan: [],
      metric: [],
      idea: [],
      experiment: [],
      correction: [],
      benchmark: [],
    }),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<{
      kind: Kind;
      row: Record<string, any>;
      id?: string;
      revision?: number;
    } | null>(null),
    [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)),
    [calendarMode, setCalendarMode] = useState<"month" | "week">("month"),
    [week, setWeek] = useState(0),
    [channel, setChannel] = useState(""),
    [campaign, setCampaign] = useState(""),
    [link, setLink] = useState(""),
    [variant, setVariant] = useState(""),
    [utmCampaign, setUtmCampaign] = useState(""),
    [destination, setDestination] = useState(company.website),
    [prefs, setPrefs] = useState({
      platforms:
        company.preferredPlatforms ||
        (["instagram", "facebook", "linkedin", "threads"] as PlatformId[]),
      compact: false,
    });
  const [publicationJobs, setPublicationJobs] = useState<
    {
      id: string;
      state: string;
      scheduled_at: string;
      snapshot: { accountLabel?: string; text: string };
    }[]
  >([]);
  const [turns, setTurns] = useState<AITurn[]>([]),
    [scenarioFilter, setScenarioFilter] = useState(""),
    [sourceFilter, setSourceFilter] = useState("");
  const timezone = company.regional?.timezone || "Asia/Famagusta";
  useEffect(() => {
    if (tab !== "plan") return;
    let valid = true,
      inFlight = false;
    const refresh = () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      void api<typeof publicationJobs>(
        `/api/publications?companyId=${company.id}`,
      )
        .then((rows) => {
          if (valid) setPublicationJobs(rows);
        })
        .catch(() => {})
        .finally(() => {
          inFlight = false;
        });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      valid = false;
      clearInterval(timer);
    };
  }, [company.id, tab]);
  useEffect(() => {
    if (tab !== "benchmark") return;
    let valid = true;
    void api<{ turns: AITurn[] }>(`/api/ai/workspace?companyId=${company.id}`)
      .then((r) => {
        if (valid) setTurns(r.turns);
      })
      .catch(() => {});
    return () => {
      valid = false;
    };
  }, [tab, company.id]);
  const comparisons = records.benchmark.filter(
    (r) =>
      (!scenarioFilter || r.scenario === scenarioFilter) &&
      (!sourceFilter || r.sourceVersion === sourceFilter),
  );
  async function refresh() {
    const kinds = Object.keys(labels) as Kind[];
    const rows = await Promise.all(
      kinds.map((kind) =>
        api<Row[]>(`/api/content/records?companyId=${company.id}&kind=${kind}`),
      ),
    );
    setRecords(
      Object.fromEntries(kinds.map((kind, i) => [kind, rows[i]])) as Record<
        Kind,
        Row[]
      >,
    );
    setDrafts(
      (
        await api<{ items: Draft[] }>(
          `/api/content/drafts?companyId=${company.id}&limit=100`,
        )
      ).items,
    );
  }
  useEffect(() => {
    let valid = true;
    void (async () => {
      try {
        const kinds = Object.keys(labels) as Kind[];
        const rows = await Promise.all(
          kinds.map((kind) =>
            api<Row[]>(
              `/api/content/records?companyId=${company.id}&kind=${kind}`,
            ),
          ),
        );
        const d = await api<{ items: Draft[] }>(
            `/api/content/drafts?companyId=${company.id}&limit=100`,
          ),
          p = await api<typeof prefs>(
            `/api/content/preferences?companyId=${company.id}`,
          );
        if (valid) {
          setRecords(
            Object.fromEntries(
              kinds.map((kind, i) => [kind, rows[i]]),
            ) as Record<Kind, Row[]>,
          );
          setDrafts(d.items);
          setPrefs(p);
        }
      } catch (e) {
        if (valid) setError((e as Error).message);
      }
    })();
    return () => {
      valid = false;
    };
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
  const add = (kind: Kind, row?: Row) =>
    setEditing({
      kind,
      row: row ? { ...row } : initial(kind, company),
      id: row?.id,
      revision: row?.revision,
    });
  async function save(
    kind: Kind,
    data: Record<string, any>,
    id?: string,
    revision?: number,
  ) {
    return api<Row>(
      id ? `/api/content/records/${id}` : "/api/content/records",
      json(
        { companyId: company.id, kind, data, revision },
        id ? "PUT" : "POST",
      ),
    );
  }
  function brief(row: Row, format?: "post" | "carousel" | "story" | "video") {
    if (!onBrief) return;
    const related = records.product.find((p) => p.id === row.productId),
      campaignRow = records.campaign.find(
        (c) => c.id === (tab === "campaign" ? row.id : row.campaignId),
      );
    const facts =
      related?.state === "approved" &&
      Date.parse(related.validUntil) > Date.now()
        ? `Onaylı ürün: ${related.name}\nÖlçü: ${related.dimensions}\nMalzeme: ${related.material}\nKaynak: ${related.sourceUrl}`
        : "Ürün özellikleri yalnız geçerli onaylı kaynaklarla kullanılacak.";
    onBrief({
      text: [
        row.name || row.title,
        row.question || row.note || row.offer,
        `Amaç: ${campaignRow?.goal || company.regional?.goal || "Belirlenecek"}`,
        `Tek çağrı: ${campaignRow?.cta || "İletişim için şirket profilini kullan."}`,
        facts,
      ]
        .filter(Boolean)
        .join("\n"),
      details: {
        campaignId: campaignRow?.id || null,
        productId: related?.id || null,
        production: {
          format: format || row.format || "post",
          hook: row.offer || row.name || row.title || "",
          scenes:
            format === "carousel"
              ? "1. Ana mesaj ve ürün.\n2. Kullanım ihtiyacı.\n3. Onaylı özellik / ölçü.\n4. Gerçek kullanım sahnesi.\n5. Tek çağrı."
              : format === "video"
                ? "Açılış: gerçek ürünü göster.\nDetay: onaylı özelliği yakın çek.\nKullanım: gerçek kullanım sahnesini çek.\nKapanış: tek çağrı ve şirket iletişimi."
                : "",
          subtitles: "",
          cover: "",
          cta: campaignRow?.cta || "",
        },
      },
      selected: (campaignRow?.platforms?.length
        ? campaignRow.platforms
        : prefs.platforms) as PlatformId[],
    });
  }
  const filteredMetrics = latestMeasurements(
    records.metric.filter(
      (r) =>
        (!channel || r.platform === channel) &&
        (!campaign || r.campaignId === campaign),
    ) as (Row & {
      platform: string;
      sourceUrl: string;
      measuredAt: string;
      windowHours: number;
    })[],
  );
  return (
    <section className="content-workspace">
      <div className="section-toolbar">
        <div>
          <h2>
            {tab === "preferences"
              ? "Şirket çalışma tercihleri"
              : tab === "backup"
                ? "Tam içerik yedeği"
                : labels[tab]}
          </h2>
          <p>
            {company.name} · {timezone}
          </p>
        </div>
        {tab !== "preferences" && tab !== "backup" && (
          <button className="primary" disabled={busy} onClick={() => add(tab)}>
            Yeni kayıt
          </button>
        )}
      </div>
      <nav className="content-tabs" aria-label="İçerik planı bölümleri">
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id as Kind)}
          >
            {label}
          </button>
        ))}
        <button
          aria-pressed={tab === "preferences"}
          onClick={() => setTab("preferences")}
        >
          Tercihler ve kanallar
        </button>
        {user.role === "admin" && (
          <button
            aria-pressed={tab === "backup"}
            onClick={() => setTab("backup")}
          >
            Yedek ve geri yükleme
          </button>
        )}
      </nav>
      {error && (
        <p role="alert" className="browser-message error">
          {error}
        </p>
      )}
      {tab === "plan" && (
        <>
          <p>
            Bu takvim editoryal plandır. Buradaki tarih değişiklikleri onaylı
            yayın kuyruğunu değiştirmez. Elle paylaşımı siz tamamlarsınız.
          </p>
          <div className="content-filters">
            <label className="field">
              Ay
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setWeek(0);
                }}
              />
            </label>
            <label className="field">
              Takvim görünümü
              <select
                value={calendarMode}
                onChange={(e) =>
                  setCalendarMode(e.target.value as typeof calendarMode)
                }
              >
                <option value="month">Aylık</option>
                <option value="week">Haftalık</option>
              </select>
            </label>
            <label className="field">
              Platform
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="">Bütün platformlar</option>
                {platforms.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {calendarMode === "week" && (
            <div className="content-actions">
              <button
                className="secondary"
                disabled={week === 0}
                onClick={() => setWeek((w) => w - 1)}
              >
                Önceki hafta
              </button>
              <span>{week + 1}. hafta</span>
              <button
                className="secondary"
                disabled={
                  (week + 1) * 7 >=
                  new Date(
                    Number(month.slice(0, 4)),
                    Number(month.slice(5)),
                    0,
                  ).getDate()
                }
                onClick={() => setWeek((w) => w + 1)}
              >
                Sonraki hafta
              </button>
            </div>
          )}
          <div className="editorial-calendar">
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)),
                  0,
                ).getDate(),
              },
              (_, i) => {
                if (
                  calendarMode === "week" &&
                  (i < week * 7 || i >= (week + 1) * 7)
                )
                  return null;
                const day = `${month}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <section className="calendar-day" key={day}>
                    <strong>
                      {i + 1}{" "}
                      {new Intl.DateTimeFormat("tr-TR", {
                        weekday: "short",
                        timeZone: timezone,
                      }).format(new Date(day + "T12:00:00Z"))}
                    </strong>
                    {records.plan
                      .filter(
                        (r) =>
                          localDate(r.scheduledAt, timezone).slice(0, 10) ===
                            day &&
                          (!channel || r.platform === channel),
                      )
                      .map((r) => (
                        <button
                          className="calendar-entry"
                          key={r.id}
                          onClick={() => add("plan", r)}
                        >
                          {r.name}
                          <small>
                            {r.platform} ·{" "}
                            {r.state === "manual-done"
                              ? "Elle tamamlandı"
                              : r.state === "ready"
                                ? "Hazır"
                                : "Fikir"}
                          </small>
                        </button>
                      ))}
                    {(!channel || channel === "facebook") &&
                      publicationJobs
                        .filter(
                          (j) =>
                            localDate(j.scheduled_at, timezone).slice(0, 10) ===
                            day,
                        )
                        .map((j) => (
                          <a
                            className="calendar-entry publication-entry"
                            key={j.id}
                            href={`?company=${company.id}&page=publications`}
                          >
                            Facebook · {j.snapshot.accountLabel || "Yayın işi"}
                            <small>
                              {(
                                {
                                  draft: "Onay bekliyor",
                                  queued: "Sırada",
                                  preparing: "Hazırlanıyor",
                                  sending: "Gönderiliyor",
                                  verified: "Bağlantı doğrulandı",
                                  unknown: "Sonuç belirsiz",
                                  missed: "Zamanı geçti",
                                  failed: "Başarısız",
                                  cancelled: "İptal",
                                } as Record<string, string>
                              )[j.state] || j.state}
                            </small>
                          </a>
                        ))}
                  </section>
                );
              },
            )}
          </div>
        </>
      )}
      {tab === "metric" && (
        <>
          <p>
            Gerçek platform/işletme ölçümlerini kaydedin. Boş alan “ölçülmedi”
            anlamına gelir. Aynı gönderinin aynı ölçüm penceresindeki son kaydı
            kullanılır; kümülatif anlık görüntüler toplanmaz.
          </p>
          <div className="content-filters">
            <label className="field">
              Platform filtresi
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="">Bütün platformlar</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Kampanya filtresi
              <select
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              >
                <option value="">Bütün kampanyalar</option>
                {records.campaign.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="metrics-table">
            <table>
              <thead>
                <tr>
                  <th>Gönderi / pencere</th>
                  <th>Ölçüm tarihi</th>
                  {Object.values(metricLabels).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                        {r.platform} {r.variant}
                      </a>
                      <br />
                      {r.windowHours} saat
                    </td>
                    <td>
                      {new Date(r.measuredAt).toLocaleString("tr-TR", {
                        timeZone: timezone,
                      })}
                    </td>
                    {Object.keys(metricLabels).map((k) => (
                      <td key={k}>
                        {r.values[k] === null ? "Ölçülmedi" : r.values[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Kampanya bağlantısı</h3>
          <div className="form-two">
            <label className="field">
              Hedef ürün / sayfa bağlantısı
              <input
                type="url"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </label>
            <label className="field">
              Kampanya adı
              <input
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
              />
            </label>
            <label className="field">
              Kaynak platform
              <select
                value={channel || "instagram"}
                onChange={(e) => setChannel(e.target.value)}
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Gönderi / varyant
              <input
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              />
            </label>
          </div>
          <button
            className="secondary"
            onClick={() => {
              try {
                setLink(
                  campaignUrl({
                    url: destination,
                    platform: channel || "instagram",
                    campaign:
                      records.campaign.find((c) => c.id === utmCampaign)
                        ?.name || utmCampaign,
                    variant,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            UTM bağlantısı oluştur
          </button>
          {link && (
            <label className="field">
              Hazırlanan bağlantı
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
          )}
        </>
      )}
      {tab === "benchmark" && (
        <>
          <p>
            Aynı senaryoyu aynı kaynak ve görselle karşılaştırın. Model
            bilgileri ve süreler gerçek ölçümle doldurulmalıdır; bu kayıtlar
            modeli eğitmez.
          </p>
          <div className="form-two">
            <label className="field">
              Karşılaştırma senaryosu
              <select
                value={scenarioFilter}
                onChange={(e) => setScenarioFilter(e.target.value)}
              >
                <option value="">
                  Bütün senaryolar (doğrudan kalite karşılaştırması değildir)
                </option>
                {[...new Set(records.benchmark.map((r) => r.scenario))].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              Kaynak sürümü
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="">Bütün kaynak sürümleri</option>
                {[
                  ...new Set(
                    records.benchmark
                      .map((r) => r.sourceVersion)
                      .filter(Boolean),
                  ),
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="benchmark-summary">
            {[...new Set(comparisons.map((r) => r.model || "Etiketsiz"))].map(
              (model) => {
                const rows = comparisons.filter(
                    (r) => (r.model || "Etiketsiz") === model,
                  ),
                  timed = rows.filter((r) => r.durationMs !== null),
                  edited = rows.filter((r) => r.editingSeconds !== null);
                return (
                  <article key={model}>
                    <h3>{model}</h3>
                    <p>
                      {rows.length} deneme ·{" "}
                      {rows.filter((r) => r.hallucination).length} uydurma bilgi
                      işareti · {rows.filter((r) => r.validOutput).length}{" "}
                      geçerli çıktı
                    </p>
                    <p>
                      Ortalama üretim:{" "}
                      {timed.length
                        ? Math.round(
                            timed.reduce((n, r) => n + r.durationMs, 0) /
                              timed.length,
                          ) + " ms"
                        : "Ölçülmedi"}
                      . Ortalama düzenleme:{" "}
                      {edited.length
                        ? Math.round(
                            edited.reduce((n, r) => n + r.editingSeconds, 0) /
                              edited.length,
                          ) + " saniye"
                        : "Ölçülmedi"}
                      .
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </>
      )}
      {tab === "experiment" && (
        <p>
          Her deney tek değişkeni değiştirir. Varyantları aynı platform ve ölçüm
          penceresinde karşılaştırın; az sayıdaki gözlemden kesin kazanan
          çıkarılmaz.
        </p>
      )}
      {tab === "correction" && (
        <p>
          İlk ve düzeltilmiş metni kaydedin. Yönetici onayladığı örnekler,
          şirketin hafıza sınırları içinde sonraki üretime örnek olabilir.
        </p>
      )}
      {tab === "product" && (
        <p>
          Fiyat, malzeme ve teslimatı görselden tahmin etmeyin. Yalnız kaynak ve
          geçerlilik tarihiyle yönetici tarafından onaylanan kartlar AI
          bağlamına alınır.
        </p>
      )}
      {tab === "preferences" && (
        <>
          <h3>Varsayılan platformlar</h3>
          <div className="content-checkboxes">
            {platforms.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={prefs.platforms.includes(p.id)}
                  onChange={(e) =>
                    setPrefs((s) => ({
                      ...s,
                      platforms: e.target.checked
                        ? [...s.platforms, p.id]
                        : s.platforms.filter((id) => id !== p.id),
                    }))
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={prefs.compact}
              onChange={(e) =>
                setPrefs((s) => ({ ...s, compact: e.target.checked }))
              }
            />
            Başlangıç açıklamalarını daralt
          </label>
          <button
            className="primary"
            disabled={busy || !prefs.platforms.length}
            onClick={() =>
              void run(async () => {
                await api(
                  "/api/content/preferences",
                  json({ companyId: company.id, ...prefs }, "PUT"),
                );
                window.dispatchEvent(
                  new CustomEvent("studio:preferences-changed", {
                    detail: { companyId: company.id, ...prefs },
                  }),
                );
              })
            }
          >
            Tercihleri kaydet
          </button>
          <button
            className="secondary"
            onClick={() =>
              setPrefs((s) => ({
                ...s,
                platforms: ["instagram", "facebook", "pinterest"],
              }))
            }
          >
            Mobilya ve yerel mağaza kanal önayarını seç
          </button>
          <p>
            Görsel ürün ve yerel mağaza için Instagram/Facebook ana deneme
            alanı, Pinterest ürün keşfi için ikinci alan olabilir. Video varsa
            aynı gerçek çekim Reels, TikTok ve Shorts'a uyarlanabilir. Kurumsal
            proje hedefinde LinkedIn için ayrı içerik hazırlayın.
          </p>
          <h3>Ek yerel kanallar</h3>
          <p>
            Google İşletme Profili için mağaza duyurusu, WhatsApp Business için
            katalog/iletişim metni hazırlanabilir. Bu kanalların otomatik
            bağlantısı yoktur.
          </p>
          <div className="content-actions">
            <a
              href="https://business.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Google İşletme Profili
            </a>
            <a
              href="https://business.whatsapp.com/"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp Business
            </a>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  for (const [i, name, format] of [
                    [1, "Ürün ve kullanım carousel'i", "carousel"],
                    [3, "Seçim rehberi: doğru ölçü alma", "post"],
                    [5, "Gerçek kullanım sahnesi çekim planı", "video"],
                  ] as const) {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    await save("plan", {
                      ...initial("plan", company),
                      name,
                      format,
                      scheduledAt: date.toISOString(),
                      note: "Başlangıç denemesi. Gerçek ürün ve onaylı şirket kaynaklarıyla tamamlayın.",
                    });
                  }
                  setTab("plan");
                })
              }
            >
              Mobilya için üç içeriklik deneme haftası oluştur
            </button>
          </div>
        </>
      )}
      {tab === "backup" && user.role === "admin" && (
        <BackupManager company={company} cloud={!!user.local === false} />
      )}
      {tab !== "preferences" && tab !== "backup" && (
        <div className="content-records">
          {records[tab].map((row) => (
            <article className="card content-row" key={row.id}>
              <div>
                <h3>
                  {row.name ||
                    row.title ||
                    row.scenario ||
                    row.variant ||
                    row.platform}
                </h3>
                <p>
                  {row.goal ||
                    row.question ||
                    row.note ||
                    row.reason ||
                    row.hypothesis ||
                    row.dimensions ||
                    row.sourceUrl}
                </p>
                {row.state && (
                  <small>
                    {(
                      {
                        pending: "İnceleme bekliyor",
                        approved: "Onaylı",
                        rejected: "Reddedildi",
                        open: "Açık",
                        used: "Kullanıldı",
                        idea: "Fikir",
                        ready: "Hazır",
                        "manual-done": "Elle tamamlandı",
                      } as Record<string, string>
                    )[row.state] || row.state}
                  </small>
                )}
                {row.validUntil && (
                  <p>
                    Geçerlilik:{" "}
                    {new Date(row.validUntil).toLocaleString("tr-TR", {
                      timeZone: timezone,
                    })}
                    {Date.parse(row.validUntil) <= Date.now()
                      ? " · Süresi doldu"
                      : ""}
                  </p>
                )}
              </div>
              <div className="content-actions">
                <button className="secondary" onClick={() => add(tab, row)}>
                  Düzenle
                </button>
                {onBrief && ["campaign", "idea", "plan"].includes(tab) && (
                  <button className="primary" onClick={() => brief(row)}>
                    Stüdyoda hazırla
                  </button>
                )}
                {row.draftId && onOpen && (
                  <button
                    className="secondary"
                    onClick={() =>
                      void run(async () =>
                        onOpen(await api<Draft>(`/api/drafts/${row.draftId}`)),
                      )
                    }
                  >
                    İlişkili taslağı aç
                  </button>
                )}
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Bu içerik kaydı silinsin mi? İlişkili taslaklar korunur.",
                      )
                    )
                      void run(async () => {
                        await api(`/api/content/records/${row.id}`, {
                          method: "DELETE",
                        });
                      });
                  }}
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <Modal
          title={`${labels[editing.kind]} · ${editing.id ? "Düzenle" : "Yeni kayıt"}`}
          wide
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = editing;
              void run(async () => {
                await save(value.kind, value.row, value.id, value.revision);
                setEditing(null);
              });
            }}
          >
            {editing.kind === "benchmark" && turns.length > 0 && (
              <label className="field">
                Gerçek AI yanıtından başlat
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const turn = turns.find((t) => t.id === e.target.value);
                    if (!turn) return;
                    const answer = turn.posts?.length
                      ? turn.posts
                          .map((p) => `${p.platform}: ${p.caption}`)
                          .join("\n\n")
                      : turn.answer;
                    if (answer.length > 6000) {
                      setError(
                        "Yanıt 6.000 karakteri aşıyor. Değerlendireceğiniz bölümü alana kendiniz ekleyin.",
                      );
                      return;
                    }
                    setEditing(
                      (s) =>
                        s && {
                          ...s,
                          row: {
                            ...s.row,
                            model: turn.model || turn.trace?.model || "",
                            expertVersion:
                              turn.expertVersion ||
                              turn.trace?.expertVersion ||
                              "",
                            sourceVersion: turn.trace?.sourceVersion || "",
                            modelDigest: turn.trace?.modelDigest || "",
                            durationMs: turn.trace?.durationMs ?? null,
                            answer,
                            mediaId: turn.mediaId || null,
                          },
                        },
                    );
                  }}
                >
                  <option value="">Yanıt seçin</option>
                  {turns.map((t) => (
                    <option value={t.id} key={t.id}>
                      {new Date(t.createdAt).toLocaleString("tr-TR")} ·{" "}
                      {t.model || "Model etiketi yok"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {fields[editing.kind].map(([key, label, type]) => (
              <label className="field" key={key}>
                {label}
                {type === "textarea" ? (
                  <textarea
                    value={editing.row[key] || ""}
                    maxLength={
                      key === "answer" ||
                      key === "before" ||
                      key === "after" ||
                      key === "corrected"
                        ? 6000
                        : key === "evidence" ||
                            key === "question" ||
                            key === "conclusion"
                          ? 2000
                          : 600
                    }
                    onChange={(e) =>
                      setEditing(
                        (s) =>
                          s && {
                            ...s,
                            row: { ...s.row, [key]: e.target.value },
                          },
                      )
                    }
                  />
                ) : (
                  <input
                    type={
                      type === "date"
                        ? "datetime-local"
                        : type === "nullable" || type === "number"
                          ? "number"
                          : type || "text"
                    }
                    value={
                      type === "date"
                        ? localDate(editing.row[key] || "", timezone)
                        : (editing.row[key] ?? "")
                    }
                    min={type === "nullable" ? 0 : undefined}
                    maxLength={type === "url" ? 2048 : 300}
                    onChange={(e) => {
                      try {
                        const value =
                          type === "date"
                            ? e.target.value
                              ? zonedTime(e.target.value, timezone)
                              : ""
                            : type === "nullable"
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : type === "number"
                                ? Number(e.target.value)
                                : e.target.value;
                        setEditing(
                          (s) => s && { ...s, row: { ...s.row, [key]: value } },
                        );
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                )}
              </label>
            ))}
            {editing.row.platform !== undefined && (
              <label className="field">
                Platform
                <select
                  value={editing.row.platform}
                  onChange={(e) =>
                    setEditing(
                      (s) =>
                        s && {
                          ...s,
                          row: { ...s.row, platform: e.target.value },
                        },
                    )
                  }
                >
                  {platforms.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {editing.kind === "plan" && (
                    <>
                      <option value="google-business">
                        Google İşletme Profili
                      </option>
                      <option value="whatsapp">WhatsApp Business</option>
                    </>
                  )}
                </select>
              </label>
            )}
            {editing.kind === "campaign" && (
              <div className="content-checkboxes">
                {platforms.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={editing.row.platforms?.includes(p.id)}
                      onChange={(e) =>
                        setEditing(
                          (s) =>
                            s && {
                              ...s,
                              row: {
                                ...s.row,
                                platforms: e.target.checked
                                  ? [...(s.row.platforms || []), p.id]
                                  : (s.row.platforms || []).filter(
                                      (id: string) => id !== p.id,
                                    ),
                              },
                            },
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
            {["plan", "metric", "idea", "experiment"].includes(
              editing.kind,
            ) && (
              <label className="field">
                Kampanya
                <select
                  value={editing.row.campaignId || ""}
                  onChange={(e) =>
                    setEditing(
                      (s) =>
                        s && {
                          ...s,
                          row: { ...s.row, campaignId: e.target.value || null },
                        },
                    )
                  }
                >
                  <option value="">Kampanyasız</option>
                  {records.campaign.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editing.kind === "campaign" && (
              <label className="field">
                Ürün
                <select
                  value={editing.row.productId || ""}
                  onChange={(e) =>
                    setEditing(
                      (s) =>
                        s && {
                          ...s,
                          row: { ...s.row, productId: e.target.value || null },
                        },
                    )
                  }
                >
                  <option value="">Ürün seçilmedi</option>
                  {records.product.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["plan", "metric", "correction"].includes(editing.kind) && (
              <label className="field">
                İlişkili taslak
                <select
                  value={editing.row.draftId || ""}
                  onChange={(e) =>
                    setEditing(
                      (s) =>
                        s && {
                          ...s,
                          row: { ...s.row, draftId: e.target.value || null },
                        },
                    )
                  }
                >
                  <option value="">Taslak seçilmedi</option>
                  {drafts.map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editing.kind === "metric" && (
              <div className="form-two">
                {Object.entries(metricLabels).map(([key, label]) => (
                  <label className="field" key={key}>
                    {label}
                    <input
                      type="number"
                      min={0}
                      max={1e9}
                      placeholder="Ölçülmedi"
                      value={editing.row.values[key] ?? ""}
                      onChange={(e) =>
                        setEditing(
                          (s) =>
                            s && {
                              ...s,
                              row: {
                                ...s.row,
                                values: {
                                  ...s.row.values,
                                  [key]:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                },
                              },
                            },
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {editing.kind === "experiment" && (
              <>
                <label className="field">
                  Değişen tek özellik
                  <select
                    value={editing.row.variable}
                    onChange={(e) =>
                      setEditing(
                        (s) =>
                          s && {
                            ...s,
                            row: { ...s.row, variable: e.target.value },
                          },
                      )
                    }
                  >
                    <option value="hook">Açılış</option>
                    <option value="cover">Kapak</option>
                    <option value="cta">Çağrı</option>
                  </select>
                </label>
                {editing.row.variants.map((v: any, i: number) => (
                  <div className="form-two" key={i}>
                    <label className="field">
                      Varyant {i + 1} etiketi
                      <input
                        value={v.label}
                        onChange={(e) =>
                          setEditing(
                            (s) =>
                              s && {
                                ...s,
                                row: {
                                  ...s.row,
                                  variants: s.row.variants.map(
                                    (a: any, j: number) =>
                                      i === j
                                        ? { ...a, label: e.target.value }
                                        : a,
                                  ),
                                },
                              },
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      Varyant taslağı
                      <select
                        value={v.draftId || ""}
                        onChange={(e) =>
                          setEditing(
                            (s) =>
                              s && {
                                ...s,
                                row: {
                                  ...s.row,
                                  variants: s.row.variants.map(
                                    (a: any, j: number) =>
                                      i === j
                                        ? {
                                            ...a,
                                            draftId: e.target.value || null,
                                          }
                                        : a,
                                  ),
                                },
                              },
                          )
                        }
                      >
                        <option value="">Seçilmedi</option>
                        {drafts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </>
            )}
            {editing.kind === "plan" && (
              <>
                <label className="field">
                  Format
                  <select
                    value={editing.row.format}
                    onChange={(e) =>
                      setEditing(
                        (s) =>
                          s && {
                            ...s,
                            row: { ...s.row, format: e.target.value },
                          },
                      )
                    }
                  >
                    {["post", "carousel", "story", "video", "pin", "faq"].map(
                      (v) => (
                        <option key={v} value={v}>
                          {
                            (
                              {
                                post: "Gönderi",
                                carousel: "Carousel",
                                story: "Story",
                                video: "Video çekim planı",
                                pin: "Pin",
                                faq: "Soru cevap",
                              } as Record<string, string>
                            )[v]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  Editoryal durum
                  <select
                    value={editing.row.state}
                    onChange={(e) =>
                      setEditing(
                        (s) =>
                          s && {
                            ...s,
                            row: { ...s.row, state: e.target.value },
                          },
                      )
                    }
                  >
                    <option value="idea">Fikir</option>
                    <option value="ready">Hazır</option>
                    <option value="manual-done">Elle tamamlandı</option>
                  </select>
                </label>
              </>
            )}
            {["product", "correction"].includes(editing.kind) && (
              <label className="field">
                Onay durumu
                <select
                  value={editing.row.state}
                  onChange={(e) =>
                    setEditing(
                      (s) =>
                        s && { ...s, row: { ...s.row, state: e.target.value } },
                    )
                  }
                >
                  <option value="pending">İnceleme bekliyor</option>
                  {user.role === "admin" && (
                    <option value="approved">Onaylı</option>
                  )}
                  {editing.kind === "correction" && (
                    <option value="rejected">Reddedildi</option>
                  )}
                </select>
              </label>
            )}
            {editing.kind === "benchmark" && (
              <>
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
                        value={editing.row.scores[key]}
                        onChange={(e) =>
                          setEditing(
                            (s) =>
                              s && {
                                ...s,
                                row: {
                                  ...s.row,
                                  scores: {
                                    ...s.row.scores,
                                    [key]: Number(e.target.value),
                                  },
                                },
                              },
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                {(
                  [
                    ["validOutput", "Geçerli çıktı üretti"],
                    ["hallucination", "Kaynakta olmayan bilgi üretti"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={editing.row[key]}
                      onChange={(e) =>
                        setEditing(
                          (s) =>
                            s && {
                              ...s,
                              row: { ...s.row, [key]: e.target.checked },
                            },
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(null)}
              >
                Vazgeç
              </button>
              <button className="primary" disabled={busy}>
                Kaydı kaydet
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
