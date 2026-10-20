import { useEffect, useState } from "react";
import { api } from "./api.ts";
const labels: Record<string, string> = {
  "website-researched": "Web sitesi incelendi",
  "source-fact-approved": "Kaynak bilgisi onaylandı",
  "publication-approved": "Paylaşım onaylandı",
  "publication-verified": "Gönderi bağlantısı doğrulandı",
  "backup-restored": "Metin yedeği geri yüklendi",
  "company-access-updated": "Şirket erişimleri güncellendi",
  "user-updated": "Kullanıcı yetkisi veya şifresi güncellendi",
};
export function ActivityFeed({
  companyId,
  admin = false,
}: {
  companyId?: string;
  admin?: boolean;
}) {
  const [rows, setRows] = useState<{ action: string; createdAt: string }[]>([]),
    [error, setError] = useState("");
  const path = admin
    ? "/api/admin/events"
    : "/api/workspace/events?companyId=" + companyId;
  const refresh = () =>
    api<typeof rows>(path)
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    let valid = true;
    void api<typeof rows>(path)
      .then((v) => {
        if (valid) setRows(v);
      })
      .catch((e) => {
        if (valid) setError(e.message);
      });
    return () => {
      valid = false;
    };
  }, [path]);
  return (
    <section className="card expert-panel">
      <h2>İşlem geçmişi</h2>
      <p>
        Eylem ve zaman kaydı tutulur; şifreler, ekran görüntüleri ve yazılan
        gizli metinler kaydedilmez.
      </p>
      {error && <p role="alert">{error}</p>}
      <button className="secondary" onClick={() => void refresh()}>
        Geçmişi yenile
      </button>
      {!rows.length && <p>Henüz işlem kaydı yok.</p>}
      {rows.map((r, i) => (
        <p key={r.createdAt + "-" + i}>
          {labels[r.action] || "Çalışma alanı işlemi"} ·{" "}
          {new Date(r.createdAt).toLocaleString("tr-TR", {
            timeZone: "Europe/Istanbul",
          })}
        </p>
      ))}
    </section>
  );
}
