import { useEffect, useState } from "react";
import { api } from "./api.ts";

type Learning = {
  enabled: boolean;
  advertisingEnabled?: boolean;
  running: boolean;
  syncedAt: string;
  expired: boolean;
  pendingCount: number;
  notes: {
    id: string;
    url: string;
    summary: string;
    state: string;
    createdAt: string;
    validUntil: string;
    previousSummary?: string;
  }[];
  attempts: { url: string; state: string; at: string; reason?: string }[];
};
const states: Record<string, string> = {
  saved: "Not kaydedildi",
  unchanged: "Kaynak değişmedi",
  failed: "Okunamadı veya özetlenemedi",
  cancelled: "Durduruldu",
  running: "Başladı; kapanışta yarım kalmış olabilir",
};
export function NightLearning({ companyId }: { companyId: string }) {
  const [impacts, setImpacts] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const [data, setData] = useState<Learning | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let valid = true,
      inFlight = false;
    setData(null);
    setError("");
    const refresh = async (sync = false) => {
      if (inFlight) return;
      inFlight = true;
      try {
        const value = await api<Learning>(
          sync
            ? "/api/computer/ai/night"
            : `/api/computer/ai/night?companyId=${companyId}`,
          sync
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyId }),
              }
            : undefined,
        );
        if (valid) {
          setData(value);
          setError("");
        }
      } catch (e) {
        if (valid) setError((e as Error).message);
      } finally {
        inFlight = false;
      }
    };
    void refresh(true);
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      valid = false;
      clearInterval(timer);
    };
  }, [companyId]);
  async function act(path: string, body: object) {
    setBusy(true);
    setError("");
    try {
      setData(
        await api<Learning>(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, ...body }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card local-ai-status" aria-label="Gece öğrenmesi">
      <h3>Gece araştırması ve hafıza</h3>
      {data?.advertisingEnabled && (
        <p>
          Yedi platformun reklam rehberleri ve son manuel reklam planı/ölçümleri
          araştırma kapsamındadır. Yeni ölçüm veya kaynak değişince not yeniden
          inceleme bekler.
        </p>
      )}
      <p>
        KKTC saatiyle 00.00–07.00. Bilgisayar ve yardımcı açıkken resmî platform
        rehberlerini ve onaylı şirket kaynaklarını okur, yerel AI ile çalışma
        notları hazırlar. Modelin ağırlıkları değişmez.
      </p>
      <p>
        Gecede tüm şirketler için toplam en fazla 20 sayfa denenir; kaynaklar
        izin vermiyorsa atlanır. İçerik üretiminiz önceliklidir. Yeni notlar siz
        inceleyene kadar AI yanıtlarına eklenmez.
      </p>
      {data && (
        <>
          <p role="status">
            {data.running
              ? "Gece araştırması çalışıyor"
              : data.enabled
                ? "Gece programı açık"
                : "Gece programı kapalı"}
            {data.expired ? " · Kaynak listesini yenilemek gerekiyor" : ""}.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void act("/api/computer/ai/night", { enabled: !data.enabled })
            }
          >
            {data.enabled ? "Gece programını kapat" : "Gece programını aç"}
          </button>{" "}
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void act("/api/computer/ai/night", {})}
          >
            Onaylı kaynak listesini yenile
          </button>
          <small>
            Kaynak listesi bu ekran açılınca yenilenir. Son eşitleme:{" "}
            {data.syncedAt
              ? new Date(data.syncedAt).toLocaleString("tr-TR", {
                  timeZone: "Asia/Famagusta",
                })
              : "henüz yok"}
            . Yedi gün eşitlenmeyen program durur. Notlar en fazla 14 gün
            geçerlidir.
          </small>
          <details>
            <summary>
              Sabah incelemesi · {data.pendingCount || 0} bekleyen not
            </summary>
            <p>
              En fazla 10 not gösterilir; bekleyen notlar önce gelir.
              İnceledikçe sıradaki not görünür.
            </p>
            {data.notes.length === 0 && (
              <p>
                Henüz çalışma notu yok. Gece programı çalışınca sonuçlar burada
                görünecek.
              </p>
            )}
            {data.notes.map((n) => (
              <article className="expert-item" key={n.id}>
                <a href={n.url} target="_blank" rel="noreferrer">
                  Kaynağı aç
                </a>
                <p className="source-excerpt">{n.summary}</p>
                {n.previousSummary && (
                  <details>
                    <summary>Önceki notla karşılaştır</summary>
                    <p>{n.previousSummary}</p>
                  </details>
                )}
                <button
                  className="secondary"
                  onClick={() => {
                    void api<{ id: string; name: string }[]>(
                      `/api/content/impact?companyId=${companyId}&url=${encodeURIComponent(n.url)}`,
                    )
                      .then((rows) =>
                        setImpacts((s) => ({ ...s, [n.id]: rows })),
                      )
                      .catch((e) => setError(e.message));
                  }}
                >
                  İlişkili taslakları bul
                </button>
                {impacts[n.id] && (
                  <div>
                    <p>
                      Önerilen eylem: Kaynak değişimini inceleyin; etkilenen
                      ürün ve taslak bilgilerini yeniden doğrulayın.
                    </p>
                    {impacts[n.id].length ? (
                      impacts[n.id].map((d) => <p key={d.id}>{d.name}</p>)
                    ) : (
                      <p>
                        Kaynak bağlantısıyla doğrudan eşleşen taslak bulunamadı.
                      </p>
                    )}
                  </div>
                )}
                <small>
                  {new Date(n.createdAt).toLocaleString("tr-TR", {
                    timeZone: "Asia/Famagusta",
                  })}{" "}
                  ·{" "}
                  {n.state === "approved"
                    ? "İncelendi; ikincil bağlamda kullanılabilir"
                    : n.state === "rejected"
                      ? "Reddedildi"
                      : "İnceleme bekliyor"}
                </small>
                {n.state !== "approved" && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void act("/api/computer/ai/night/review", {
                        noteId: n.id,
                        state: "approved",
                      })
                    }
                  >
                    İnceledim, notu kullan
                  </button>
                )}{" "}
                {n.state !== "rejected" && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void act("/api/computer/ai/night/review", {
                        noteId: n.id,
                        state: "rejected",
                      })
                    }
                  >
                    Notu reddet
                  </button>
                )}
              </article>
            ))}
          </details>
          <details>
            <summary>Son kaynak denemeleri</summary>
            {data.attempts.map((a, i) => (
              <p key={i}>
                <a href={a.url} target="_blank" rel="noreferrer">
                  Kaynak
                </a>{" "}
                · {states[a.state] || a.state}
                {a.reason ? ` · ${a.reason}` : ""}
              </p>
            ))}
          </details>
        </>
      )}
      {error && (
        <p role="alert">
          {error} Yardımcının güncel ve açık olduğunu kontrol edin.
        </p>
      )}
    </section>
  );
}
