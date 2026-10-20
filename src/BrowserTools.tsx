import { useEffect, useState } from "react";
import { api } from "./api.ts";
import type { Draft } from "./types.ts";
export type PageRead = {
  id: string;
  url: string;
  title: string;
  text: string;
  elements: { id: string; kind: string; label: string }[];
};
export type BrowserTab = { index: number; title: string; selected: boolean };
export function BrowserTools({
  accountId,
  companyId,
  viewId,
  page,
  tabs,
  busy,
  command,
}: {
  accountId: string;
  companyId: string;
  viewId: string;
  page?: PageRead;
  tabs?: BrowserTab[];
  busy: boolean;
  command: (action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const [url, setUrl] = useState(""),
    [elementId, setElementId] = useState(""),
    [text, setText] = useState(""),
    [mediaId, setMediaId] = useState(""),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [answer, setAnswer] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void api<Draft[]>(`/api/drafts?companyId=${companyId}`)
      .then(setDrafts)
      .catch(() => {});
  }, [companyId]);
  useEffect(() => setElementId(""), [page?.id]);
  async function analyze(task: string) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await api<{ answer: string }>(
        `/api/computer/accounts/${accountId}/analyze`,
        { method: "POST", body: JSON.stringify({ viewId, task }) },
      );
      setAnswer(result.answer);
      await command("read");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  const item = page?.elements.find((e) => e.id === elementId),
    disabled = busy || pending;
  return (
    <section className="browser-tools-panel">
      <h3>Firefox görevleri</h3>
      <div className="expert-actions">
        {[
          ["back", "Geri"],
          ["forward", "İleri"],
          ["reload", "Sayfayı yenile"],
          ["read", "Sayfayı oku"],
          ["tabs", "Sekmeleri listele"],
        ].map(([action, label]) => (
          <button
            className="secondary"
            key={action}
            disabled={disabled}
            onClick={() => void command(action)}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void command("navigate", { url });
        }}
      >
        <label className="field">
          Bu sosyal ağda açılacak adres
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2048}
          />
        </label>
        <button className="secondary" disabled={disabled}>
          Adresi aç
        </button>
      </form>
      {tabs && tabs.length > 1 && (
        <label className="field">
          Firefox sekmesi
          <select
            value={tabs.find((t) => t.selected)?.index ?? 0}
            onChange={(e) =>
              void command("tab", { index: Number(e.target.value) })
            }
          >
            {tabs.map((t) => (
              <option key={t.index} value={t.index}>
                {t.title || `Sekme ${t.index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>
        Giriş ve özel mesaj ekranları AI için okunmaz. Alan kimlikleri kısa süre
        geçerlidir; sayfa değiştiğinde tekrar okuyun.
      </p>
      {page && (
        <>
          <details>
            <summary>{page.title || "Okunan sayfa"}</summary>
            <p className="source-excerpt">{page.text}</p>
          </details>
          <label className="field">
            Sayfadaki alan / düğme
            <select
              value={elementId}
              onChange={(e) => setElementId(e.target.value)}
            >
              <option value="">Bir öğe seçin</option>
              {page.elements.map((e) => (
                <option key={e.id} value={e.id}>
                  {
                    (
                      {
                        field: "Yazı alanı",
                        file: "Görsel alanı",
                        button: "Düğme",
                        link: "Bağlantı",
                      } as Record<string, string>
                    )[e.kind]
                  }
                  : {e.label}
                </option>
              ))}
            </select>
          </label>
          {item?.kind === "field" && (
            <>
              <label className="field">
                Alana yerleştirilecek metin
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={10000}
                />
              </label>
              <button
                className="secondary"
                disabled={disabled || !text}
                onClick={() =>
                  void command("fill", { snapshotId: page.id, elementId, text })
                }
              >
                Metni seçilen alana yerleştir
              </button>
            </>
          )}
          {item?.kind === "file" && (
            <>
              <label className="field">
                Şirkete ait kayıtlı taslak görseli
                <select
                  value={mediaId}
                  onChange={(e) => setMediaId(e.target.value)}
                >
                  <option value="">Görsel seçin</option>
                  {drafts
                    .filter((d) => d.mediaId)
                    .map((d) => (
                      <option key={d.id} value={d.mediaId!}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="secondary"
                disabled={disabled || !mediaId}
                onClick={() =>
                  void command("upload", {
                    snapshotId: page.id,
                    elementId,
                    mediaId,
                  })
                }
              >
                Görseli forma yükle
              </button>
              <p>
                Platform görseli en fazla 600 KB olmalı. Bilgisayardan rastgele
                dosya okunmaz.
              </p>
            </>
          )}
          {["button", "link"].includes(item?.kind || "") && (
            <button
              className="secondary"
              disabled={disabled}
              onClick={() =>
                void command("activate", { snapshotId: page.id, elementId })
              }
            >
              Seçili düğmeye / bağlantıya bas
            </button>
          )}
        </>
      )}
      <div className="expert-actions">
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => void analyze("audit")}
        >
          AI ile profili incele
        </button>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => void analyze("bio")}
        >
          AI ile bio öner
        </button>
      </div>
      <p>
        AI önerir; profil değişikliği için metni seçtiğiniz alana siz
        aktarırsınız. Bu işlem yerel modelin kurulu olmasını gerektirir.
      </p>
      {error && <p role="alert">{error}</p>}
      {pending && <p role="status">Yerel AI profili inceliyor…</p>}
      {answer && (
        <>
          <p className="source-excerpt">{answer}</p>
          <button className="secondary" onClick={() => setText(answer)}>
            Öneriyi yazı alanına al
          </button>
        </>
      )}
    </section>
  );
}
