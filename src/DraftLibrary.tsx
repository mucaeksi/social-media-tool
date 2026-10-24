import { useEffect, useState } from "react";
import type { AuthUser, Company, Draft, Platform } from "./types.ts";
import { api } from "./api.ts";
import { Modal } from "./Modal.tsx";
const body = (data: unknown, method = "POST") => ({
  method,
  body: JSON.stringify(data),
});
export function DraftLibrary({
  company,
  platforms,
  user,
  onOpen,
  onNew,
  onPublish,
}: {
  company: Company;
  platforms: Platform[];
  user: AuthUser;
  onOpen: (d: Draft) => void;
  onNew: () => void;
  onPublish?: (d: Draft) => void;
}) {
  const [data, setData] = useState<{ items: Draft[]; total: number }>({
      items: [],
      total: 0,
    }),
    [q, setQ] = useState(""),
    [platform, setPlatform] = useState(""),
    [mode, setMode] = useState("active"),
    [campaignId, setCampaignId] = useState(""),
    [state, setState] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Draft[] | null>(null),
    [historyId, setHistoryId] = useState("");
  const query = () =>
    new URLSearchParams({
      companyId: company.id,
      q,
      platform,
      mode,
      campaignId,
      state,
      from,
      to,
      page: String(page),
    });
  useEffect(() => {
    let valid = true;
    void api<{ id: string; name: string }[]>(
      `/api/content/records?companyId=${company.id}&kind=campaign`,
    )
      .then((rows) => {
        if (valid) setCampaigns(rows);
      })
      .catch((e) => {
        if (valid) setError(e.message);
      });
    return () => {
      valid = false;
    };
  }, [company.id]);
  const refresh = () =>
    api<typeof data>(`/api/content/drafts?${query()}`).then(setData);
  useEffect(() => {
    let valid = true;
    const timer = setTimeout(() => {
      void api<typeof data>(`/api/content/drafts?${query()}`)
        .then((d) => {
          if (valid) setData(d);
        })
        .catch((e) => {
          if (valid) setError(e.message);
        });
    }, 150);
    return () => {
      valid = false;
      clearTimeout(timer);
    };
  }, [company.id, q, platform, mode, campaignId, state, from, to, page]);
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
    <section className="content-workspace">
      <div className="section-toolbar">
        <h2>Kaydedilmiş gönderiler</h2>
        <button className="primary" onClick={onNew}>
          Yeni gönderi
        </button>
      </div>
      <div className="content-filters">
        <label className="field">
          Taslak ara
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Ad veya kaynak metin"
          />
        </label>
        <label className="field">
          Platform
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(0);
            }}
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
          Görünüm
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setPage(0);
            }}
          >
            <option value="active">Etkin taslaklar</option>
            <option value="archive">Arşiv</option>
            <option value="trash">Çöp kutusu</option>
          </select>
        </label>
      </div>
      <details>
        <summary>Kampanya, onay ve tarih filtreleri</summary>
        <div className="content-filters">
          <label className="field">
            Kampanya
            <select
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Bütün kampanyalar</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            İçerik durumu
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Bütün durumlar</option>
              {[
                ["draft", "Taslak"],
                ["review", "İnceleme bekliyor"],
                ["changes", "Değişiklik istendi"],
                ["approved", "Onaylandı"],
                ["planned", "Planlandı"],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Son düzenleme başlangıcı
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="field">
            Son düzenleme bitişi
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
      </details>
      {error && <p role="alert">{error}</p>}
      <p>
        {data.total} kayıt · sayfa {page + 1}
      </p>
      {!data.items.length && (
        <p>
          Bu görünümde taslak yok. Aramayı değiştirin veya yeni gönderi
          oluşturun.
        </p>
      )}
      {data.items.map((d) => (
        <article key={d.id} className="card content-row">
          {d.mediaId && (
            <img
              src={`/api/media/${d.mediaId}/original.jpg`}
              alt=""
              loading="lazy"
            />
          )}
          <div>
            <h3>{d.name}</h3>
            <p>{d.text}</p>
            <small>
              {new Date(d.updatedAt).toLocaleString("tr-TR")} ·{" "}
              {d.selected
                .map((id) => platforms.find((p) => p.id === id)?.name)
                .join(", ")}
            </small>
          </div>
          <div className="content-actions">
            {mode !== "trash" && (
              <>
                {onPublish && user.role === "admin" && mode !== "archive" && (
                  <button className="primary" disabled={busy}
                    onClick={() => void run(async () => onPublish(await api<Draft>(`/api/drafts/${d.id}`)))}>
                    Yayına hazırla
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      onOpen(await api<Draft>(`/api/drafts/${d.id}`)),
                    )
                  }
                >
                  Düzenle
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const original = await api<Draft>(`/api/drafts/${d.id}`);
                      const copy = await api<Draft>(
                        "/api/drafts",
                        body({
                          ...original,
                          id: undefined,
                          revision: undefined,
                          name: (original.name + " — kopya").slice(0, 120),
                          review: {
                            state: "draft",
                            owner: original.review?.owner || "",
                            comment: "",
                          },
                        }),
                      );
                      onOpen(copy);
                    })
                  }
                >
                  Kopyasını oluştur
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const original = await api<Draft>(`/api/drafts/${d.id}`);
                      await api(
                        `/api/drafts/${d.id}`,
                        body(
                          {
                            ...original,
                            archived: mode !== "archive",
                            review: { ...original.review, state: "draft" },
                          },
                          "PUT",
                        ),
                      );
                    })
                  }
                >
                  {mode === "archive" ? "Arşivden çıkar" : "Arşivle"}
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    void run(async () => {
                      setHistoryId(d.id);
                      setHistory(
                        await api<Draft[]>(
                          `/api/content/drafts/${d.id}/history`,
                        ),
                      );
                    })
                  }
                >
                  Sürüm geçmişi
                </button>
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Taslak çöp kutusuna taşınsın mı? Buradan geri alabilirsiniz.",
                      )
                    )
                      void run(async () => {
                        await api(`/api/drafts/${d.id}`, { method: "DELETE" });
                      });
                  }}
                >
                  Çöp kutusuna taşı
                </button>
              </>
            )}
            {mode === "trash" && (
              <>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `/api/content/drafts/${d.id}/restore`,
                        body({}),
                      );
                    })
                  }
                >
                  Geri al
                </button>
                {user.role === "admin" && (
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Taslak ve sürüm geçmişi kalıcı olarak silinsin mi?",
                        )
                      )
                        void run(async () => {
                          await api(`/api/content/drafts/${d.id}/permanent`, {
                            method: "DELETE",
                          });
                        });
                    }}
                  >
                    Kalıcı sil
                  </button>
                )}
              </>
            )}
          </div>
        </article>
      ))}
      <div className="content-actions">
        <button
          className="secondary"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Önceki sayfa
        </button>
        <button
          className="secondary"
          disabled={(page + 1) * 20 >= data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Sonraki sayfa
        </button>
      </div>
      {history && (
        <Modal
          title="Son beş taslak sürümü"
          wide
          onClose={() => setHistory(null)}
        >
          {!history.length && <p>Henüz önceki sürüm yok.</p>}
          {history.map((h) => (
            <article className="expert-item" key={h.revision || 0}>
              <h3>
                Sürüm {h.revision || 0} · {h.name}
              </h3>
              <p>{h.text}</p>
              <details>
                <summary>Platform metinleri</summary>
                {h.posts.map((p) => (
                  <p key={p.platform}>
                    {p.platform}: {p.caption}
                  </p>
                ))}
              </details>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const current = await api<Draft>(
                      `/api/drafts/${historyId}`,
                    );
                    const restored = await api<Draft>(
                      `/api/drafts/${historyId}`,
                      body(
                        {
                          ...h,
                          revision: current.revision,
                          review: {
                            state: "draft",
                            owner: h.review?.owner || "",
                            comment: "Önceki sürümden geri alındı.",
                          },
                        },
                        "PUT",
                      ),
                    );
                    setHistory(null);
                    onOpen(restored);
                  })
                }
              >
                Bu sürümü düzenleme taslağına geri al
              </button>
            </article>
          ))}
        </Modal>
      )}
    </section>
  );
}
