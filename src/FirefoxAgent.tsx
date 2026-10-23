import { useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import { firefoxRequest } from "./firefoxBridge.ts";
import type { FirefoxBinding, FirefoxStatus } from "./firefoxBridge.ts";
import { firefoxAgent } from "../shared/firefox-agent.mjs";
import type { AgentObservation, AgentDecision } from "../shared/firefox-agent.mjs";

type View = { observation: AgentObservation; image: string; target: FirefoxBinding;
  tabs: { accountId: string; platform: string; label: string }[] };
type Run = { id: string; cancelled: boolean; controller: AbortController };
const post = (data: unknown, signal?: AbortSignal) => ({ method: "POST", body: JSON.stringify(data), signal });
export function FirefoxAgent({ companyId, companyName, status, disabled }: {
  companyId: string; companyName: string; status: FirefoxStatus | null; disabled: boolean;
}) {
  const [task, setTask] = useState(""), [accountId, setAccountId] = useState("");
  const [running, setRunning] = useState(false), [phase, setPhase] = useState(""),
    [error, setError] = useState(""), [answer, setAnswer] = useState(""),
    [steps, setSteps] = useState<string[]>([]), [view, setView] = useState<View | null>(null);
  const [endedId, setEndedId] = useState("");
  const work = useRef<Run | null>(null), mounted = useRef(true);
  const bindings = (status?.bindings || []).filter((b) => b.companyId === companyId && b.identityLabel && firefoxAgent.safeURL(b.profileUrl, b.platform));
  // A saved social account can also have an advertising binding. Each task
  // uses one target per account, preferring its currently selected binding.
  const targets = [...bindings].sort((a, b) =>
    Number(b.platform === status?.binding?.platform && b.accountId === status?.binding?.accountId) -
    Number(a.platform === status?.binding?.platform && a.accountId === status?.binding?.accountId),
  ).filter((b, index, rows) => rows.findIndex((row) => row.accountId === b.accountId) === index);
  const compatible = status?.window?.companyId === companyId && /^1\.(?:[5-9]|[1-9]\d+)\./.test(status.version);
  const active = status?.agent?.companyId === companyId && status.agent.id !== endedId ? status.agent : null;
  const initial = targets.some((b) => b.accountId === accountId) ? accountId : status?.binding?.accountId || targets[0]?.accountId || "";
  async function revoke(runId: string) {
    await Promise.allSettled([
      firefoxRequest("agent-stop", { companyId, sessionId: runId }),
      api("/api/computer/ai/browser-cancel", post({ companyId, runId })),
    ]);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const run = work.current;
      if (run) { run.cancelled = true; run.controller.abort(); void revoke(run.id); }
    };
  }, [companyId]);
  async function stop() {
    const run = work.current;
    if (run) { run.cancelled = true; run.controller.abort(); setPhase("Görev durduruluyor…"); await revoke(run.id); }
    else if (active) { await revoke(active.id); setEndedId(active.id); setPhase("Firefox görevi durduruldu."); }
  }
  async function start() {
    if (work.current || disabled || !initial) return;
    const run = { id: crypto.randomUUID(), cancelled: false, controller: new AbortController() };
    work.current = run;
    setRunning(true); setError(""); setAnswer(""); setView(null); setSteps([]); setPhase("Yerel Qwen bağlantısı kontrol ediliyor…");
    const history: string[] = [];
    const live = () => mounted.current && work.current === run && !run.cancelled;
    const check = () => { if (!live()) throw new Error("Firefox görevi durduruldu."); };
    try {
      const model = await api<{ phase: string; busy: boolean; browserAgentVersion?: string }>("/api/computer/ai/status", { signal: run.controller.signal });
      check();
      if (model.browserAgentVersion !== firefoxAgent.version) throw new Error("Qwen Firefox kontrolü için yardımcı 1.12 gerekli. Güncellemeyi tamamlayıp tekrar deneyin.");
      if (model.busy || model.phase !== "ready") throw new Error("Yerel Qwen hazır değil veya başka bir işlem yapıyor. AI asistanı → Yerel AI durumunu kontrol edin.");
      const request = task.trim();
      await firefoxRequest("agent-start", { companyId, companyName, requestId: run.id, task: request, accountId: initial,
        targets: targets.map(({ accountId, platform }) => ({ accountId, platform })) });
      check();
      setPhase("Firefox araç çubuğundaki Sosyal Studio simgesinden görevi onaylayın. İlk kullanımda ekran görüntüsü iznini de verin.");
      let approved = false;
      for (let i = 0; i < 150; i++) {
        check();
        const next = await firefoxRequest<FirefoxStatus>("status");
        check();
        if (next.agent?.id === run.id) { approved = true; break; }
        if (!next.pending) throw new Error("Firefox görev onayı reddedildi veya süresi doldu. İşlem başlamadı.");
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!approved) throw new Error("Firefox görev onayının süresi doldu.");
      for (let i = 0; i < firefoxAgent.maxSteps; i++) {
        check();
        setPhase(`${i + 1}/8 · Firefox sayfası görüntüleniyor…`);
        const current = await firefoxRequest<View>("agent-observe", { companyId, sessionId: run.id });
        check(); setView(current);
        setPhase(`${i + 1}/8 · Qwen ekranı inceliyor ve sıradaki işlemi seçiyor…`);
        const result = await api<{ decision: AgentDecision }>("/api/computer/ai/browser-step", post({
          ...current, companyId, runId: run.id, task: request, history,
        }, run.controller.signal));
        check();
        const choice = firefoxAgent.decision(result.decision, current.observation, current.tabs);
        setPhase(`${i + 1}/8 · ${choice.message || "Firefox işlemi uygulanıyor…"}`);
        const applied = await firefoxRequest<{ applied?: boolean; finished?: string; detail: string }>("agent-act", {
          companyId, sessionId: run.id, snapshotId: current.observation.id, decision: choice,
        });
        check();
        const detail = (applied.detail || choice.message).slice(0, 160);
        history.push(detail); setSteps([...history]);
        if (applied.finished) {
          setAnswer(choice.message || (applied.finished === "ask" ? "Devam etmek için sayfayı kontrol edin." : "Qwen görev değerlendirmesini tamamladı."));
          setPhase(applied.finished === "ask" ? "Kullanıcı müdahalesi bekleniyor." : "Görev değerlendirmesi tamamlandı.");
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      check();
      const last = await firefoxRequest<View>("agent-observe", { companyId, sessionId: run.id });
      check(); setView(last);
      setPhase("8 adımlık görev sınırına ulaşıldı. Son ekranı kontrol edip gerekirse yeni görev verin.");
    } catch (e) {
      if (mounted.current && work.current === run) {
        if (run.cancelled) setPhase("Firefox görevi durduruldu. Daha önce yapılmış işlemler geri alınmadı.");
        else { setError((e as Error).message); setPhase("Firefox görevi durdu."); }
      }
    } finally {
      await revoke(run.id);
      if (work.current === run) work.current = null;
      if (mounted.current) { setEndedId(run.id); setRunning(false); }
    }
  }
  return <div className="firefox-agent">
    <h3>Qwen ile Firefox'u kullan</h3>
    <p>Qwen bağlı sosyal medya sayfasını ekran görüntüsü ve görünür alanlarla inceler; sekmeler arasında geçer,
      sayfayı kaydırır, izinli düğmelere tıklar ve boş metin alanlarına yazar. Yazma için etkin şirket hesabı kontrol edilir.</p>
    {!compatible && <p>Bu özellik için yardımcı 1.12, Firefox eklentisi 1.5 ve şirketin pencere bağlantısı gerekli.</p>}
    <label className="field">Görevin başlangıç hesabı
      <select value={initial} disabled={disabled || running || !compatible} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Bağlı hesap seçin</option>
        {targets.map((b) => <option key={b.accountId} value={b.accountId}>{b.identityLabel || b.label} · {b.platform}</option>)}
      </select>
    </label>
    <label className="field">Firefox'ta Qwen'e verilecek görev
      <textarea rows={3} maxLength={1000} value={task} disabled={disabled || running}
        onChange={(e) => setTask(e.target.value)} placeholder="Örn. Facebook şirket sayfasını incele; boş gönderi alanını açıp Girne mağazamıza davet metni yaz." />
    </label>
    <div className="expert-actions">
      <button className="primary" disabled={disabled || running || !compatible || !initial || !task.trim() || Boolean(active)} onClick={() => void start()}>
        Qwen Firefox görevini başlat
      </button>
      {(running || active) && <button className="secondary" onClick={() => void stop().catch((e) => setError(e.message))}>
        Firefox görevini durdur
      </button>}
    </div>
    <small>Her görüntü değerlendirmesi yerel AI kotasından bir istek kullanır; görev en fazla 8 adım ve 12 dakika sürer.
      Sayfa görüntüleri panel bağlantısından yerel Qwen'e aktarılır, arşivlenmez. Son paylaşım Yayın takvimi onayından yapılır.</small>
    {phase && <p role="status">{phase}</p>}
    {error && <p role="alert">{error}</p>}
    {steps.length > 0 && <ol aria-label="Qwen Firefox işlem adımları">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
    {answer && <p className="source-excerpt" aria-label="Qwen Firefox görev değerlendirmesi">{answer}</p>}
    {view && <details open><summary>Qwen'in son gördüğü sosyal medya ekranı · {view.target.platform}</summary>
      <p>{view.observation.title} · {view.observation.url}</p>
      <img className="computer-screen" src={`data:image/jpeg;base64,${view.image}`} alt="Qwen'in görev sırasında gördüğü son sosyal medya sayfası; özel alanlar kapatılmıştır" />
    </details>}
  </div>;
}
