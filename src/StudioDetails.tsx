import { useEffect, useState, useRef } from "react";
import type {
  AuthUser,
  Company,
  DraftInput,
  Media,
  Platform,
  PlatformId,
  Post,
} from "./types.ts";
import { api } from "./api.ts";
import { prepareCloudMedia } from "./prepareMedia.ts";
import { Modal } from "./Modal.tsx";
const emptyProduction = {
  format: "post" as const,
  hook: "",
  scenes: "",
  subtitles: "",
  cover: "",
  cta: "",
};
export function StudioDetails({
  company,
  user,
  platforms,
  draftId,
  disabled = false,
  details,
  posts,
  sourceText,
  media,
  activePlatform,
  onMedia,
  onChange,
  cloud,
}: {
  company: Company;
  user: AuthUser;
  platforms: Platform[];
  draftId: string | null;
  disabled?: boolean;
  details: Partial<DraftInput>;
  posts: Post[];
  sourceText: string;
  media: Media | null;
  activePlatform: PlatformId;
  onMedia: (m: Media) => void;
  onChange: (d: Partial<DraftInput>) => void;
  onUpload: (file?: File) => Promise<void>;
  cloud: boolean;
}) {
  const [library, setLibrary] = useState<Media[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]),
    [products, setProducts] = useState<{ id: string; name: string }[]>([]),
    [focus, setFocus] = useState({ x: 0.5, y: 0.5 }),
    [usage, setUsage] = useState<{
      drafts: { name: string }[];
      jobs: { id: string }[];
    } | null>(null);
  useEffect(() => {
    let valid = true;
    void Promise.all([
      api<typeof campaigns>(
        `/api/content/records?companyId=${company.id}&kind=campaign`,
      ),
      api<typeof products>(
        `/api/content/records?companyId=${company.id}&kind=product`,
      ),
    ])
      .then(([a, b]) => {
        if (valid) {
          setCampaigns(a);
          setProducts(b);
        }
      })
      .catch(() => {});
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sourceSnapshot = useRef(sourceText);
  sourceSnapshot.current = sourceText;
  function change(patch: Partial<DraftInput>) {
    onChange(patch);
  }
  const gallery = details.gallery || [],
    production = details.production || emptyProduction,
    review = details.review || { state: "draft", owner: "", comment: "" };
  const openLibrary = () =>
    void run(async () =>
      setLibrary(
        await api<Media[]>(`/api/content/media?companyId=${company.id}`),
      ),
    );
  const move = (i: number, offset: number) => {
    const rows = [...gallery];
    [rows[i], rows[i + offset]] = [rows[i + offset], rows[i]];
    change({ gallery: rows });
  };
  return (
    <section className="card studio-details">
      <fieldset disabled={busy || disabled} className="studio-detail-fields">
        <details>
          <summary>Medya, kampanya ve içerik onayı</summary>
          <p>
            İçerik onayı, yayınlama izninden ayrıdır. Çoklu görseller
            hazırlanır; mevcut Facebook pilotu yalnız tek görselle çalışır.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="content-actions">
            <button className="secondary" disabled={busy} onClick={openLibrary}>
              Medya kütüphanesinden seç
            </button>
            {media && (
              <button
                className="secondary"
                disabled={
                  gallery.some((a) => a.mediaId === media.id) ||
                  gallery.length >= 10
                }
                onClick={() =>
                  change({
                    gallery: [...gallery, { mediaId: media.id, alt: "" }],
                  })
                }
              >
                Görseli slaytlara ekle
              </button>
            )}
          </div>
          <div className="gallery-strip">
            {gallery.map((g, i) => (
              <div key={g.mediaId} className="gallery-slide">
                <img src={`/api/media/${g.mediaId}/original.jpg`} alt={g.alt} />
                <label className="field">
                  Slayt {i + 1} açıklaması
                  <input
                    value={g.alt}
                    maxLength={2000}
                    onChange={(e) =>
                      change({
                        gallery: gallery.map((a, j) =>
                          j === i ? { ...a, alt: e.target.value } : a,
                        ),
                      })
                    }
                  />
                </label>
                <button disabled={i === 0} onClick={() => move(i, -1)}>
                  Öne al
                </button>
                <button
                  disabled={i === gallery.length - 1}
                  onClick={() => move(i, 1)}
                >
                  Arkaya al
                </button>
                <button
                  onClick={() =>
                    change({ gallery: gallery.filter((_, j) => j !== i) })
                  }
                >
                  Slayttan çıkar
                </button>
              </div>
            ))}
          </div>
          <div className="form-two">
            <label className="field">
              Kampanya
              <select
                value={details.campaignId || ""}
                onChange={(e) => change({ campaignId: e.target.value || null })}
              >
                <option value="">Kampanyasız</option>
                {campaigns.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Ürün bilgi kartı
              <select
                value={details.productId || ""}
                onChange={(e) => change({ productId: e.target.value || null })}
              >
                <option value="">Ürün seçilmedi</option>
                {products.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-two">
            <label className="field">
              İçerik durumu
              <select
                value={review.state}
                onChange={(e) =>
                  change({
                    review: {
                      ...review,
                      state: e.target.value as typeof review.state,
                    },
                  })
                }
              >
                <option value="draft">Taslak</option>
                <option value="review">İnceleme bekliyor</option>
                <option value="changes">Değişiklik istendi</option>
                {user.role === "admin" && (
                  <>
                    <option value="approved">İçerik onaylandı</option>
                    <option value="planned">Editoryal planda</option>
                  </>
                )}
              </select>
            </label>
            <label className="field">
              Sorumlu
              <input
                value={review.owner}
                maxLength={120}
                onChange={(e) =>
                  change({ review: { ...review, owner: e.target.value } })
                }
              />
            </label>
          </div>
          <label className="field">
            İnceleme notu
            <textarea
              value={review.comment}
              maxLength={2000}
              onChange={(e) =>
                change({ review: { ...review, comment: e.target.value } })
              }
            />
          </label>
          {details.originalPosts?.some(
            (p) => p.platform === activePlatform,
          ) && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const before =
                      details.originalPosts?.find(
                        (p) => p.platform === activePlatform,
                      )?.caption || "",
                    after =
                      posts.find((p) => p.platform === activePlatform)
                        ?.caption || "";
                  if (before === after)
                    throw new Error("Bu platformun metni henüz değişmedi.");
                  await api("/api/content/records", {
                    method: "POST",
                    body: JSON.stringify({
                      companyId: company.id,
                      kind: "correction",
                      data: {
                        draftId,
                        platform: activePlatform,
                        before,
                        after,
                        reason: "Stüdyodaki editör düzenlemesi",
                        state: "pending",
                      },
                    }),
                  });
                  setError(
                    "Düzeltme inceleme bekleyen örnek olarak kaydedildi. İçerik planı → Editör düzeltmeleri alanından inceleyin.",
                  );
                })
              }
            >
              Bu platformun düzeltmesini örnek kaydet
            </button>
          )}
          <label className="field">
            İçerik formatı
            <select
              value={production.format}
              onChange={(e) =>
                change({
                  production: {
                    ...production,
                    format: e.target.value as typeof production.format,
                  },
                })
              }
            >
              <option value="post">Tek gönderi</option>
              <option value="carousel">Carousel / slaytlar</option>
              <option value="story">Story hazırlığı</option>
              <option value="video">Kısa video çekim planı</option>
            </select>
          </label>
          {production.format !== "post" && (
            <>
              {cloud && user.role === "admin" && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await api<{ answer: string }>(
                        "/api/computer/ai/ask",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            companyId: company.id,
                            mode: "chat",
                            question: `${production.format} hazırlığı için Türkçe açılış, sahne/slayt sırası, ekranda yazılar, altyazı önerisi ve tek çağrı içeren bir plan hazırla. Ürün gerçeği uydurma; yalnız aşağıdaki özet ve şirket kaynaklarıyla çalış. En fazla 500 kelime. Veri: ${sourceText}`,
                            mediaId: null,
                          }),
                        },
                      );
                      if (sourceSnapshot.current !== sourceText)
                        throw new Error(
                          "Kaynak metin değişti. Yeni metinle planı yeniden hazırlayın.",
                        );
                      if (result.answer.length > 4000)
                        throw new Error(
                          "Plan 4.000 karakteri aştı. AI asistanından daha kısa plan isteyin.",
                        );
                      change({
                        production: { ...production, scenes: result.answer },
                      });
                    })
                  }
                >
                  Yerel AI ile çekim / slayt planını hazırla
                </button>
              )}

              <p>
                {production.format === "carousel"
                  ? "Kapak → tek fikirli slaytlar → tek çağrı. Görsel sırasını yukarıda düzenleyin."
                  : "Bu alan çekim/metin hazırlığıdır. Video dosyası oluşturmaz veya yüklemez."}
              </p>
              {(
                [
                  ["hook", "Açılış"],
                  ["scenes", "Sahne / slayt sırası"],
                  ["subtitles", "Altyazı taslağı"],
                  ["cover", "Kapak metni"],
                  ["cta", "Tek çağrı"],
                ] as const
              ).map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <textarea
                    value={production[key]}
                    maxLength={
                      key === "scenes" || key === "subtitles" ? 4000 : 500
                    }
                    onChange={(e) =>
                      change({
                        production: { ...production, [key]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
            </>
          )}
          {media && (
            <details>
              <summary>
                {platforms.find((p) => p.id === activePlatform)?.name} için odak
                ve kırpma
              </summary>
              <p>
                Odak noktasını seçip bu platforma özel görsel hazırlayın. Özgün
                görsel korunur.
              </p>
              <div
                className="focus-preview"
                style={{
                  aspectRatio:
                    platforms
                      .find((p) => p.id === activePlatform)
                      ?.format?.replace(":", "/") || "4/5",
                }}
              >
                <img
                  src={`/api/media/${media.id}/original.jpg`}
                  alt="Kırpma odağı"
                  style={{
                    objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
                  }}
                />
                {["story", "video"].includes(production.format) && (
                  <div className="safe-area">Metin için güvenli alan</div>
                )}
              </div>
              <label className="field">
                Yatay odak
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={focus.x}
                  onChange={(e) =>
                    setFocus((s) => ({ ...s, x: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="field">
                Dikey odak
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={focus.y}
                  onChange={(e) =>
                    setFocus((s) => ({ ...s, y: Number(e.target.value) }))
                  }
                />
              </label>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const r = await fetch(
                      `/api/media/${media.id}/original.jpg`,
                    );
                    if (!r.ok) throw new Error("Görsel okunamadı.");
                    const source = new File([await r.blob()], "odak.jpg", {
                      type: "image/jpeg",
                    });
                    const p = platforms.find((p) => p.id === activePlatform)!;
                    const bitmap = await createImageBitmap(source);
                    const canvas = document.createElement("canvas");
                    canvas.width = p.width;
                    canvas.height = p.height;
                    const ctx = canvas.getContext("2d")!;
                    const ratio = Math.max(
                        p.width / bitmap.width,
                        p.height / bitmap.height,
                      ),
                      w = bitmap.width * ratio,
                      h = bitmap.height * ratio;
                    ctx.drawImage(
                      bitmap,
                      (p.width - w) * focus.x,
                      (p.height - h) * focus.y,
                      w,
                      h,
                    );
                    bitmap.close();
                    const blob = await new Promise<Blob>((resolve, reject) =>
                      canvas.toBlob(
                        (b) =>
                          b
                            ? resolve(b)
                            : reject(new Error("Görsel hazırlanamadı.")),
                        "image/jpeg",
                        0.9,
                      ),
                    );
                    const file = new File([blob], "odak.jpg", {
                      type: "image/jpeg",
                    });
                    const payload = cloud
                      ? await prepareCloudMedia(file, platforms)
                      : file;
                    const saved = await api<Media>(
                      `/api/media?companyId=${company.id}`,
                      {
                        method: "POST",
                        headers: cloud ? {} : { "Content-Type": "image/jpeg" },
                        body: payload,
                      },
                    );
                    change({
                      platformMedia: {
                        ...details.platformMedia,
                        [activePlatform]: saved.id,
                      },
                      platformFits: {
                        ...details.platformFits,
                        [activePlatform]: "cover",
                      },
                    });
                  })
                }
              >
                Bu platformun kırpmasını hazırla
              </button>
              {details.platformMedia?.[activePlatform] && (
                <button
                  onClick={() => {
                    const rows = { ...details.platformMedia };
                    delete rows[activePlatform];
                    change({ platformMedia: rows });
                  }}
                >
                  Özgün görsele dön
                </button>
              )}
            </details>
          )}
          {draftId && (
            <p>
              <a href={`?company=${company.id}&page=studio&draft=${draftId}`}>
                Bu taslağın bağlantısı
              </a>
            </p>
          )}
        </details>
      </fieldset>
      {library && (
        <Modal
          title="Şirket medya kütüphanesi"
          wide
          onClose={() => setLibrary(null)}
        >
          <p>
            {library.length}/200 görsel. Taslak ve yayınlarda kullanılan
            görseller silinemez.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="media-library">
            {library.map((m) => (
              <article key={m.id}>
                <img
                  src={`/api/media/${m.id}/original.jpg`}
                  alt="Kayıtlı şirket görseli"
                  loading="lazy"
                />
                <small>
                  {m.width} × {m.height}
                </small>
                {m.deleting && (
                  <p>
                    Görsel temizliği yarıda kaldı. Sil düğmesiyle tamamlayın.
                  </p>
                )}
                <div className="content-actions">
                  <button
                    className="primary"
                    disabled={busy || !!m.deleting}
                    onClick={() => {
                      onMedia(m);
                      setLibrary(null);
                    }}
                  >
                    Ana görsel seç
                  </button>
                  <button
                    className="secondary"
                    disabled={
                      busy ||
                      !!m.deleting ||
                      gallery.length >= 10 ||
                      gallery.some((g) => g.mediaId === m.id)
                    }
                    onClick={() =>
                      change({
                        gallery: [...gallery, { mediaId: m.id, alt: "" }],
                      })
                    }
                  >
                    Slayt ekle
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      void run(async () =>
                        setUsage(await api(`/api/content/media/${m.id}/usage`)),
                      )
                    }
                  >
                    Kullanım yerleri
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Kullanılmıyorsa bu görsel kalıcı silinsin mi?",
                        )
                      )
                        void run(async () => {
                          await api(`/api/content/media/${m.id}`, {
                            method: "DELETE",
                          });
                          setLibrary(
                            (rows) => rows?.filter((r) => r.id !== m.id) || [],
                          );
                        });
                    }}
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
          {usage && (
            <div role="status">
              <strong>Kullanım yerleri</strong>
              {usage.drafts.map((d, i) => (
                <p key={i}>{d.name}</p>
              ))}
              <p>
                {usage.jobs.length} etkin yayın işi. AI kayıtları ayrıca silme
                sırasında denetlenir.
              </p>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
