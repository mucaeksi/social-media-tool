import { useState } from "react";
import type { SourceRef, Post } from "./types.ts";
import { api } from "./api.ts";
export function ClaimReview({
  companyId,
  sourceRefs,
  posts,
}: {
  companyId: string;
  sourceRefs: SourceRef[];
  posts: Post[];
}) {
  const [checked, setChecked] = useState<
      { factId: string; valid: boolean; reason: string }[] | null
    >(null),
    [error, setError] = useState("");
  const unsupported = [
    ...new Set(
      posts.flatMap(
        (p) =>
          p.caption.match(
            /\d[\d.,\s]*\s?(?:TL|₺|EUR|USD|GBP|€|£)(?!\p{L})/gu,
          ) || [],
      ),
    ),
  ].filter(
    (value) => !sourceRefs.some((ref) => ref.value.includes(value.trim())),
  );
  return (
    <section className="claim-review">
      <details>
        <summary>Kaynak ve iddia kontrolü</summary>
        <p>
          Her kaynak bilgisi ayrı gösterilir. Kaynağın geçerli olması metindeki
          bütün iddiaları doğrulamaz; ürün ve kampanya bilgilerini editör
          incelemelidir.
        </p>
        <button
          className="secondary"
          onClick={() => {
            setError("");
            void api<typeof checked>("/api/content/evidence/check", {
              method: "POST",
              body: JSON.stringify({ companyId, refs: sourceRefs }),
            })
              .then(setChecked)
              .catch((e) => setError(e.message));
          }}
        >
          Kaynakların güncelliğini denetle
        </button>
        {sourceRefs.map((ref) => (
          <article key={ref.factId}>
            <strong>
              {ref.field}: {ref.value}
            </strong>
            <p>
              <a href={ref.url} target="_blank" rel="noreferrer">
                Kaynağı aç
              </a>{" "}
              · {new Date(ref.validUntil).toLocaleString("tr-TR")}
            </p>
            <p>
              {checked?.find((r) => r.factId === ref.factId)?.reason ||
                "Henüz yeniden denetlenmedi"}
            </p>
            <small>
              Değerin aynen geçtiği platformlar:{" "}
              {posts
                .filter((p) => p.caption.includes(ref.value))
                .map((p) => p.platform)
                .join(", ") ||
                "Aynen eşleşen metin yok; anlamını editör kontrol etsin."}
            </small>
          </article>
        ))}
        {!sourceRefs.length && <p>Bu taslağa bağlanmış kaynak bilgisi yok.</p>}
        {unsupported.length > 0 && (
          <p role="alert">
            Kaynak değeriyle aynen eşleştirilemeyen fiyat ifadeleri:{" "}
            {unsupported.join(", ")}. Kaynağını kontrol edin.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </details>
    </section>
  );
}
