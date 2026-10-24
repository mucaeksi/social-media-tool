import { STUDIO_VERSION, LOCAL_MODEL_LABEL } from "../shared/features.mjs";
import { AD_GUIDE_VERSION } from "../shared/advertising.mjs";
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { api } from "./api.ts";
import { localErrors } from "../shared/local-ai.mjs";

type Status = {
  skills?: {
    protocol: string; version: string; state: "ready" | "invalid"; checkedAt: string; digest: string | null;
    skills: { id: string; title: string; sha256: string }[];
    lastUse: { task: string; ids: string[]; version: string; digest: string; at: string } | null;
  };
  diagnosticVersion?: string;
  selfTest?: {
    state: string;
    startedAt: string;
    finishedAt: string | null;
    code: string | null;
    steps: { id: string; state: string; durationMs: number | null; code: string | null }[];
  } | null;
  lastRun?: { state: string; at: string; stage: string; code: string | null; durationMs: number | null } | null;
  advertisingVersion?: string;
  memory?: { sources: number; generations: number; bytes: number };
  runtime?: {
    loaded: boolean;
    gpuBytes: number | null;
    modelBytes: number | null;
    context: number | null;
  } | null;
  stage?: string | null;
  model: string;
  phase: string;
  progress: number | null;
  busy: boolean;
  code: string | null;
};
const labels: Record<string, string> = {
  unknown: "Durum kontrol ediliyor",
  ready: "Model dosyası doğrulandı",
  runtime_missing: "İlk kurulum gerekli",
  model_missing: "Küçük model indirilmeli",
  stopped: "AI çalıştırıcısı kapalı",
  installing: "AI çalıştırıcısı kuruluyor",
  downloading: "Küçük model indiriliyor",
  generating: "İçerikler hazırlanıyor",
  learning: "Gece çalışma notu hazırlanıyor",
  testing: "Qwen yanıtları test ediliyor",
  error: "Kurulum kontrol edilmeli",
};
const testLabels: Record<string, string> = { model: "Model ve özet", text: "Gerçek metin yanıtı", posts: "Gönderi JSON biçimi", vision: "Görseli anlama" };
const testStates: Record<string, string> = { running: "Çalışıyor", passed: "Geçti", failed: "Başarısız" };
const errorText = (code: string | null | undefined) =>
  code && Object.hasOwn(localErrors, code) ? localErrors[code as keyof typeof localErrors] : "Tanılama raporunu kontrol edin.";
export function LocalAIStatus({
  onReady,
  advertising = false,
}: {
  onReady: (ready: boolean) => void;
  advertising?: boolean;
}) {
  const [diagnostic, setDiagnostic] = useState("");
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  useEffect(() => {
    let valid = true,
      inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await api<Status>("/api/computer/ai/status");
        if (valid) {
          setStatus(next);
          setError("");
          onReady(
            (next.phase === "ready" || next.phase === "learning") &&
              (!next.skills || next.skills.state === "ready") &&
              (!advertising || next.advertisingVersion === AD_GUIDE_VERSION),
          );
        }
      } catch (e) {
        if (valid) {
          setError((e as Error).message);
          onReady(false);
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      valid = false;
      clearInterval(timer);
    };
  }, [onReady, advertising]);
  async function setup() {
    setPending(true);
    setError("");
    onReady(false);
    try {
      setStatus(
        await api<Status>("/api/computer/ai/setup", { method: "POST" }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function testModel() {
    setPending(true); setError(""); onReady(false);
    try { setStatus(await api<Status>("/api/computer/ai/self-test", { method: "POST" })); }
    catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  }
  async function skillAction(action: "check" | "repair") {
    setPending(true); setError("");
    try {
      const next = await api<Status>(`/api/computer/ai/skills/${action}`, { method: "POST" });
      setStatus(next);
      onReady((next.phase === "ready" || next.phase === "learning") && next.skills?.state === "ready" && (!advertising || next.advertisingVersion === AD_GUIDE_VERSION));
    } catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  }
  return (
    <section className="card local-ai-status" aria-label="Yerel AI durumu">
      <div className="ai-section-heading">
        <strong>Bilgisayarınızda · {LOCAL_MODEL_LABEL}</strong>
        <span>
          {status
            ? labels[status.phase] || labels.unknown
            : "Bağlantı kontrol ediliyor"}
        </span>
      </div>
      <details className="panel-disclosure local-ai-guide">
        <summary>Kurulum ve model bilgileri</summary>
      <p>
        Yardımcı açılınca Ollama başlar ve model bellekte hazır tutulur.
        Yardımcı kapanınca model ve ona ait Ollama süreci kapanır. Cloudflare AI
        kotası kullanılmaz.
      </p>
      <p>
        9B / 4-bit model, 16 GB ekran kartında yaklaşık 7–10 GiB model VRAM
        hedefiyle ayarlanır. Gerçek ölçüm aşağıda gösterilir; ölçüm hedefi
        aşarsa model boşaltılır. Yeni model hazır olduktan sonra eski 4B
        ağırlıkları silinir; şirket hafızası ve hesap girişleri korunur.
      </p>
      <p>
        İlk açılışta AI otomatik kurulur. Çalıştırıcı, model ve knowledge.sqlite
        veritabanı çalıştırdığınız BAT dosyasının yanındaki ai klasöründe
        tutulur. Şirket hafızası Cloudflare’de de korunur; mevcut hesap
        girişleri silinmez.
      </p>
      </details>
      {status?.progress != null && (
        <progress
          value={status.progress}
          max={1}
          aria-label="Model indirme ilerlemesi"
        />
      )}
      {status?.stage && <p role="status">{status.stage}</p>}
      <div aria-label="Qwen sosyal medya becerileri">
        <h3>Qwen'in yüklü becerileri</h3>
        {status?.skills ? <>
          <p role="status">{status.skills.state === "ready"
            ? `${status.skills.skills.length} beceri dosyası doğrulandı · ${status.skills.version}`
            : "Beceri dosyaları doğrulanamadı. İçerik üretmeden önce paketi onarın."}</p>
          <p>Beceriler BAT klasörünün yanındaki <code>ai/skills</code> içinde tutulur; her işte ilgili rehberler yüklenir.</p>
          {status.skills.skills.length > 0 && <details><summary>Yüklü sosyal medya rehberleri</summary>
            <ul>{status.skills.skills.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
          </details>}
          {status.skills.lastUse ? <p>
            Son model yanıtındaki beceriler: {status.skills.lastUse.ids.map((id) => status.skills?.skills.find((s) => s.id === id)?.title || id).join(", ")}.
          </p> : <p>Bu yardımcı oturumunda henüz becerili model yanıtı alınmadı.</p>}
          <small>Dosya bütünlüğü, Qwen'in içerik kalitesini veya gerçek yayın başarısını kanıtlamaz. Modelin ağırlıkları değiştirilmez.</small>
          <div className="expert-actions">
            <button className="secondary" disabled={pending} onClick={() => void skillAction("check")}>Beceri dosyalarını doğrula</button>
            <button className="secondary" disabled={pending || status.busy} onClick={() => void skillAction("repair")}>Beceri paketini onar</button>
          </div>
        </> : <p>Beceri dosyaları ve kullanım kontrolü için yardımcı 1.14 gerekli. Baslat.cmd ile güncellemeyi tamamlayın.</p>}
      </div>
      <p>
        {status?.selfTest?.state === "passed"
          ? "Bu yardımcı oturumunda Qwen metin, gönderi biçimi ve görsel testlerini geçti. İçerik kalitesini ilk gerçek taslakta ayrıca inceleyin."
          : "Model dosyasının bulunması yanıt ürettiğini kanıtlamaz. Gerçek Qwen testi metin, gönderi biçimi ve sabit bir test görseliyle çalışır."}
      </p>
      <button className="secondary"
        disabled={pending || status?.busy || status?.diagnosticVersion !== "local-ai-check-v1"}
        onClick={() => void testModel()}>
        Qwen'i gerçekten test et
      </button>
      {status && status.diagnosticVersion !== "local-ai-check-v1" && <small>Gerçek yanıt testi için yardımcı 1.11 veya üzeri gerekli.</small>}
      {status?.selfTest && <div aria-label="Qwen test sonucu">
        <p role="status">Qwen testi: {testStates[status.selfTest.state] || "Bilinmiyor"}</p>
        <ul>{status.selfTest.steps.map((step) => <li key={step.id}>
          {testLabels[step.id] || "Kontrol"}: {testStates[step.state] || "Bekliyor"}
          {step.durationMs !== null ? ` · ${(step.durationMs / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn` : ""}
        </li>)}</ul>
        {status.selfTest.code && <p role="alert">{errorText(status.selfTest.code)} ({status.selfTest.code})</p>}
      </div>}
      {status?.lastRun?.state === "failed" && <p role="alert">
        Son üretim başarısız · {status.lastRun.stage}: {errorText(status.lastRun.code)} ({status.lastRun.code})
      </p>}
      {status?.memory && (
        <p>
          Yerel hafıza: {status.memory.sources} kaynak,{" "}
          {status.memory.generations} taslak/yanıt ·{" "}
          {(status.memory.bytes / 1024 ** 2).toLocaleString("tr-TR", {
            maximumFractionDigits: 1,
          })}{" "}
          MB. Kaynak metinleri onaylanmadan kesin şirket bilgisi olarak
          kullanılmaz.
        </p>
      )}
      {status && (
        <p>
          {status.runtime
            ? status.runtime.loaded
              ? `Modelin GPU belleği: ${status.runtime.gpuBytes === null ? "ölçülemedi" : (status.runtime.gpuBytes / 1024 ** 3).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " GiB"}${status.runtime.context ? ` · Bağlam: ${status.runtime.context.toLocaleString("tr-TR")} token` : ""}. Bu değer Firefox ve diğer uygulamaları içermez.`
              : "Model şu an bellekte değil; model için ayrılmış GPU belleği 0 GiB."
            : "Ollama bellek ölçümü alınamadı; tüketim sıfır varsayılmadı."}
        </p>
      )}
      {(status?.phase === "generating" || status?.phase === "testing") && (
        <button
          className="secondary"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void api<Status>("/api/computer/ai/cancel", { method: "POST" })
              .then(setStatus)
              .catch((e) => setError(e.message))
              .finally(() => setPending(false));
          }}
        >
          {status.phase === "testing" ? "Qwen testini iptal et" : "Üretimi iptal et"}
        </button>
      )}
      {status?.phase === "error" && (
        <p role="alert">
          {status.code === "GPU_LIMIT"
            ? "Modelin bildirilen GPU belleği 10 GiB hedefini aştı ve model boşaltıldı. Bellek ayarları kontrol edilmeli; model yeniden indirilmez."
            : "Kurulum tamamlanamadı. İnterneti ve boş disk alanını kontrol edip aynı kurulum düğmesiyle tekrar deneyin. Ayrı Ollama kurulumu gerekmez."}
        </p>
      )}
      {advertising &&
        status &&
        status.advertisingVersion !== AD_GUIDE_VERSION && (
          <p role="status">
            Reklam desteği için yardımcı 1.9 veya üzeri gerekli. Açık hesap
            ekranlarını kapatıp güncellemesini tamamlayın; model yeniden
            indirilmez.
          </p>
        )}
      {error && (
        <p className="browser-message error" role="alert">
          {error}
        </p>
      )}
      <button
        className="secondary"
        disabled={pending || status?.busy}
        onClick={() => void setup()}
      >
        {status?.phase === "ready" ? (
          <RefreshCw size={15} />
        ) : (
          <Download size={15} />
        )}{" "}
        {status?.phase === "ready"
          ? "Modeli yeniden doğrula"
          : "Yerel AI kurulumunu başlat"}
      </button>
      <button
        className="secondary"
        onClick={() => {
          const report = JSON.stringify(
            {
              surum: STUDIO_VERSION,
              tarih: new Date().toISOString(),
              model: LOCAL_MODEL_LABEL,
              durum: status && labels[status.phase] ? status.phase : "unknown",
              hata:
                status?.code && /^[A-Z_]{1,60}$/.test(status.code)
                  ? status.code
                  : null,
              ilerleme: status?.progress ?? null,
              gpuBellekBayt: status?.runtime?.gpuBytes ?? null,
              baglam: status?.runtime?.context ?? null,
              qwenTesti: status?.selfTest ?? null,
              sonUretim: status?.lastRun ?? null,
              qwenBecerileri: status?.skills ?? null,
            },
            null,
            2,
          );
          setDiagnostic(report);
          void navigator.clipboard?.writeText(report).catch(() => {});
        }}
      >
        Sorun raporunu kopyala
      </button>
      {diagnostic && (
        <label className="field">
          Güvenli tanılama raporu
          <textarea
            readOnly
            value={diagnostic}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      <small>
        Günde 50 üretim, kullanıcı başına saatte 10 istek. Yardımcı
        güncellenirken açık hesap ekranları ve AI işlemi bitene kadar beklenir.
        Gerçek model kalitesi ilk içerikte kontrol edilmelidir.
      </small>
    </section>
  );
}
