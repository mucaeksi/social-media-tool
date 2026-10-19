import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { api } from "./api.ts";

type Status = {
  model: string;
  phase: string;
  progress: number | null;
  busy: boolean;
  code: string | null;
};
const labels: Record<string, string> = {
  unknown: "Durum kontrol ediliyor",
  ready: "Yerel model hazır",
  runtime_missing: "İlk kurulum gerekli",
  model_missing: "Küçük model indirilmeli",
  stopped: "AI çalıştırıcısı kapalı",
  installing: "AI çalıştırıcısı kuruluyor",
  downloading: "Küçük model indiriliyor",
  generating: "İçerikler hazırlanıyor",
  error: "Kurulum kontrol edilmeli",
};
export function LocalAIStatus({
  onReady,
}: {
  onReady: (ready: boolean) => void;
}) {
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
          onReady(next.phase === "ready");
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
  }, [onReady]);
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
  return (
    <section className="card local-ai-status" aria-label="Yerel AI durumu">
      <div className="ai-section-heading">
        <strong>Bilgisayarınızda · Qwen3.5-4B · 4-bit</strong>
        <span>
          {status
            ? labels[status.phase] || labels.unknown
            : "Bağlantı kontrol ediliyor"}
        </span>
      </div>
      <p>
        Küçük model yalnızca içerik istediğinizde çalışır; son işlemden 2 dakika
        sonra bellekten çıkarılır. Şirket hafızası ve taslaklar Cloudflare’de
        saklanır. Cloudflare AI kotası kullanılmaz.
      </p>
      <p>
        İlk kurulum Windows’ta Ollama çalıştırıcısını ve birkaç GB’lık modeli
        indirir. Hesap girişleriniz korunur. Bilgisayar ve yardımcı açık
        kalmalı.
      </p>
      {status?.progress != null && (
        <progress
          value={status.progress}
          max={1}
          aria-label="Model indirme ilerlemesi"
        />
      )}
      {status?.phase === "error" && (
        <p role="alert">
          Kurulum tamamlanamadı. İnternet/WinGet durumunu kontrol edin.
          Gerekirse{" "}
          <a
            href="https://ollama.com/download/windows"
            target="_blank"
            rel="noreferrer"
          >
            resmi Ollama kurulumunu
          </a>{" "}
          yapıp tekrar deneyin.
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
      <small>
        Günde 50 üretim, kullanıcı başına saatte 10 istek. Yardımcı
        güncellenirken açık hesap ekranları ve AI işlemi bitene kadar beklenir.
        Gerçek model kalitesi ilk içerikte kontrol edilmelidir.
      </small>
    </section>
  );
}
