import { useEffect, useState } from "react";
import { api } from "./api.ts";
import type { AITurn } from "./SocialAI.tsx";
type Job = {
  id: string;
  state: string;
  question: string;
  selected: string[];
  completed: number;
  createdAt: string;
};
export function LocalAIJobs({
  companyId,
  onComplete,
}: {
  companyId: string;
  onComplete: (turn: AITurn) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const refresh = () =>
    api<Job[]>(`/api/computer/ai/jobs?companyId=${companyId}`).then(setJobs);
  useEffect(() => {
    let valid = true;
    const update = () => {
      void api<Job[]>(`/api/computer/ai/jobs?companyId=${companyId}`)
        .then((v) => {
          if (valid) setJobs(v);
        })
        .catch(() => {});
    };
    update();
    const timer = setInterval(update, 8000);
    return () => {
      valid = false;
      clearInterval(timer);
    };
  }, [companyId]);
  return (
    <section className="card expert-panel">
      <h3>Yerel AI üretim işleri</h3>
      <p>
        Doğrulanan platform sonuçları D1'e ara kayıt olarak alınır. Kesinti
        sonrası aynı şirket bilgileriyle kalan platformlardan devam
        edebilirsiniz. Yarım paket stüdyoya aktarılmaz.
      </p>
      {error && <p role="alert">{error}</p>}
      {!jobs.length && <p>Yeni üretimler burada görünür.</p>}
      {jobs.map((j) => (
        <article className="expert-item" key={j.id}>
          <strong>
            {j.state === "running"
              ? "Üretim sürüyor"
              : j.state === "complete"
                ? "Tamamlandı"
                : "Yarım kaldı / iptal edildi"}
          </strong>
          <p>{j.question.slice(0, 180)}</p>
          <p>
            {j.completed}/{j.selected.length || 1} platform doğrulandı.
          </p>
          {j.state === "paused" && (
            <button
              className="secondary"
              disabled={pending}
              onClick={() => {
                setPending(true);
                setError("");
                void api<AITurn>(`/api/computer/ai/jobs/${j.id}/resume`, {
                  method: "POST",
                })
                  .then((turn) => {
                    onComplete(turn);
                  })
                  .then(refresh)
                  .catch((e) => setError(e.message))
                  .finally(() => setPending(false));
              }}
            >
              {pending ? "Sürdürülüyor…" : "Kalan platformlardan devam et"}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
