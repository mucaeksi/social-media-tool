import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { firefoxAccountIssue, firefoxRequest } from "./firefoxBridge.ts";
import type { FirefoxStatus } from "./firefoxBridge.ts";
import type { AuthUser, Company, Draft, PlatformId } from "./types.ts";
type Account = { id: string; companyId: string; platform: PlatformId; profileUrl: string; label: string };
const post = (data: unknown, signal?: AbortSignal) => ({ method: "POST", body: JSON.stringify(data), signal });
async function publicationId(run: string, account: string, scheduledAt: string | null) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${run}:${account}:${scheduledAt || "immediate"}`)));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b.slice(0, 16)].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function DraftAutomation({ company, user, draft, accounts, status, disabled, scheduledAt, onPrepared, onJobs, onBusy }: {
  company: Company; user: AuthUser; draft?: Draft; accounts: Account[]; status: FirefoxStatus | null;
  disabled: boolean; scheduledAt: () => string | null; onPrepared: (draft: Draft) => void;
  onJobs: (ids: string[]) => void; onBusy: (busy: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string[] | null>(null), [running, setRunning] = useState(false),
    [phase, setPhase] = useState(""), [error, setError] = useState("");
  const work = useRef<{ id: string; attemptId: string; controller: AbortController } | null>(null), alive = useRef(true);
  const identities = useRef(new Map<string, string>());
  const eligible = accounts.filter((a) => !firefoxAccountIssue(a, status));
  const ids = chosen ?? eligible.map((a) => a.id);
  const storageKey = draft ? `studio:automation:${user.id}:${company.id}:${draft.id}:${draft.revision ?? 0}` : "";
  useEffect(() => {
    alive.current = true; setChosen(null);
    return () => {
      alive.current = false;
      const run = work.current;
      if (run) { work.current = null; run.controller.abort();
        void api(`/api/computer/ai/jobs/${run.id}/cancel`, post({ attemptId: run.attemptId })).catch(() => {}); }
    };
  }, [company.id, draft?.id]);
  async function start() {
    if (!draft || work.current || !ids.length) return;
    const accountIds = [...ids].sort(), scope = JSON.stringify(accountIds);
    const identityKey = storageKey + scope;
    let id = identities.current.get(identityKey) || crypto.randomUUID();
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved?.scope === scope && /^[a-f0-9-]{36}$/i.test(saved.id) && Date.now() - saved.at < 86400000) id = saved.id;
      sessionStorage.setItem(storageKey, JSON.stringify({ id, scope, at: Date.now() }));
    } catch {
      if (!identities.current.has(identityKey)) { setError("Hazırlık kimliği sekme belleğine kaydedilemiyor. Tarayıcı depolama iznini kontrol edin; yeni bir hazırlık başlatılmadı."); return; }
    }
    identities.current.set(identityKey, id);
    while (identities.current.size > 20) identities.current.delete(identities.current.keys().next().value!);
    const run = { id, attemptId: crypto.randomUUID(), controller: new AbortController() }; work.current = run;
    const check = () => { if (!alive.current || work.current !== run || run.controller.signal.aborted) throw new Error("Hazırlık durduruldu."); };
    const created: string[] = [];
    setRunning(true); onBusy(true); setError("");
    try {
      const time = scheduledAt();
      setPhase("Qwen ve Firefox bağlantısı kontrol ediliyor…");
      const model = await api<{ draftAutomationVersion?: string; busy: boolean; phase: string }>("/api/computer/ai/status", { signal: run.controller.signal });
      check();
      if (model.draftAutomationVersion !== "draft-automation-v1") throw new Error("Bu akış için yardımcı 1.13 gerekli. Baslat.cmd ile güncellemeyi tamamlayın.");
      if (model.busy || model.phase !== "ready") throw new Error("Qwen hazır değil veya başka bir görevde. Yerel AI durumunu kontrol edin.");
      const before = await firefoxRequest<FirefoxStatus>("status"); check();
      for (const accountId of accountIds) {
        const a = accounts.find((a) => a.id === accountId);
        if (!a || firefoxAccountIssue(a, before)) throw new Error("Seçili hedeflerden biri bağlı değil. Hesap sekmelerini yeniden bağlayın.");
      }
      setPhase("Qwen görseli inceliyor; platformlara özel metinleri, etiketleri ve alternatif metni hazırlıyor…");
      const prepared = await api<{ draft: Draft }>("/api/computer/ai/prepare-draft", post({
        id, attemptId: run.attemptId, draftId: draft.id, revision: draft.revision ?? 0, accountIds,
      }, run.controller.signal));
      check();
      const current = await firefoxRequest<FirefoxStatus>("status"); check();
      for (const accountId of accountIds) {
        const a = accounts.find((a) => a.id === accountId)!;
        const b = current.bindings?.find((b) => b.accountId === accountId && b.companyId === company.id && b.platform === a.platform);
        if (!b?.identityLabel || firefoxAccountIssue(a, current)) throw new Error("Hazırlık sırasında Firefox hedefi değişti. Aynı hazırlığı yeniden sürdürün.");
        setPhase(`${created.length + 1}/${accountIds.length} · ${a.label} yayın önizlemesi oluşturuluyor…`);
        const jobId = await publicationId(id, accountId, time); check();
        const result = await api<{ id: string; state: string }>("/api/tab-publications", post({
          id: jobId, draftId: prepared.draft.id, draftRevision: prepared.draft.revision,
          accountId, targetLabel: b.identityLabel, scheduledAt: time,
        }, run.controller.signal));
        check();
        if (!["draft", "queued"].includes(result.state)) throw new Error("Bu hazırlığın bazı gönderileri zaten yürütülmüş. Yayın sonuçlarını kontrol edin; tekrar gönderilmedi.");
        created.push(result.id);
      }
      check();
      setPhase("Önizlemeler hazır. Firefox eklentisinde bütün hedefleri, fotoğrafları ve metinleri inceleyip son paylaşım onayını verin.");
      await firefoxRequest("publish-batch", { companyId: company.id, companyName: company.name, jobIds: created });
      check();
      onPrepared(prepared.draft);
    } catch (e) {
      if (alive.current && work.current === run) { setError((e as Error).message); setPhase("Hazırlık durdu. Kaynak taslak korundu; oluşan önizlemeler yayın sonuçlarında bulunur."); }
    } finally {
      if (alive.current && work.current === run) { work.current = null; onJobs(created); setRunning(false); onBusy(false); }
    }
  }
  async function stop() {
    const run = work.current;
    if (run) { run.controller.abort(); await api(`/api/computer/ai/jobs/${run.id}/cancel`, post({ attemptId: run.attemptId })).catch(() => {}); }
  }
  return <section className="firefox-agent" aria-label="Qwen ile otomatik yayın hazırlığı">
    <h3>Qwen ile tüm hesaplara hazırla</h3>
    <p>Kaydedilmiş taslağın tek kaynak görselini ve yazısını platformlara uyarlar; ayrı çalışma kopyasını kaydeder,
      yayın önizlemelerini oluşturur ve eklenti onayına gönderir. Son paylaşım onayından sonra sırayla yayın başlar.</p>
    <p>Asıl taslak korunur. Etiket ve görsel boyutları platforma göre hazırlanır; rötuş veya video üretilmez.
      Çok görselli gönderiler için aşağıdaki mevcut önizleme akışını kullanın.</p>
    <fieldset disabled={disabled || running}>
      <legend>Qwen hazırlığının hedefleri</legend>
      {accounts.map((a) => { const issue = firefoxAccountIssue(a, status); return <label className="tab-publish-target" key={a.id}>
        <input type="checkbox" checked={ids.includes(a.id)} disabled={Boolean(issue)} onChange={(e) => setChosen(e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id))} />
        <span><strong>{a.label}</strong><small>{issue || "Bağlı · platform metni eksikse Qwen hazırlayacak"}</small></span>
      </label>; })}
    </fieldset>
    <div className="expert-actions">
      <button className="primary" disabled={disabled || running || !draft || !ids.length || ids.length > 20} onClick={() => void start()}>
        Qwen ile hazırla ve eklenti onayına gönder ({ids.length})
      </button>
      {running && <button className="secondary" onClick={() => void stop()}>Hazırlığı durdur</button>}
      {!running && error && <button className="secondary" onClick={() => { identities.current.delete(storageKey + JSON.stringify([...ids].sort())); try { sessionStorage.removeItem(storageKey); } catch {} setError(""); setPhase("Yeni hazırlık için düğmeye basabilirsiniz. Önceki yayın sonuçlarını kontrol edin."); }}>Yeni hazırlık kimliği kullan</button>}
    </div>
    <small>Aynı hazırlığı yeniden denemek, tamamlanan üretimi ve önizlemeleri kullanır. Panelin kapanması son paylaşım onayı vermez.</small>
    {phase && <p role="status">{phase}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
