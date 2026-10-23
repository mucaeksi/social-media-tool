import { useCallback, useEffect, useRef, useState } from "react";
import { adProviders } from "../shared/advertising.mjs";
import { api } from "./api.ts";
import { FirefoxAgent } from "./FirefoxAgent.tsx";
import {
  firefoxRequest,
  firefoxTarget,
  firefoxTabChoice,
  firefoxQuestion,
} from "./firefoxBridge.ts";
import type { FirefoxBinding, FirefoxPage, FirefoxStatus } from "./firefoxBridge.ts";

type Account = {
  id: string;
  companyId: string;
  label: string;
  platform: string;
  profileUrl: string;
};
type Tab = {
  id: number;
  title: string;
  url: string;
  active: boolean;
  pinned: boolean;
  panel: boolean;
};
export function FirefoxConnection({
  companyId,
  companyName,
  disabled,
  modelReady,
  onBinding,
  onStatus,
  registeredAccounts,
  compact = false,
}: {
  companyId: string;
  companyName: string;
  disabled: boolean;
  modelReady: boolean;
  onBinding: (binding: FirefoxBinding | null) => void;
  onStatus?: (status: FirefoxStatus | null) => void;
  registeredAccounts?: Account[];
  compact?: boolean;
}) {
  const callbacks = useRef({ onBinding, onStatus });
  callbacks.current = { onBinding, onStatus };
  const currentCompany = useRef(companyId);
  currentCompany.current = companyId;
  const [status, setStatus] = useState<FirefoxStatus | null>(null),
    [accounts, setAccounts] = useState<Account[]>([]),
    [accountId, setAccountId] = useState("");
  const [page, setPage] = useState<FirefoxPage | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [connectionError, setConnectionError] = useState(""),
    [tabsError, setTabsError] = useState("");
  const [tabTask, setTabTask] = useState("");
  const [tabAnswer, setTabAnswer] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setAccountId("");
  }, [companyId]);
  useEffect(() => {
    if (registeredAccounts) {
      setAccounts(registeredAccounts.filter((a) => a.companyId === companyId));
      return;
    }
    setAccounts([]);
    let valid = true;
    void api<Account[]>(`/api/social/accounts?companyId=${companyId}`)
      .then((rows) => {
        if (valid) setAccounts(rows.filter((a) => a.companyId === companyId));
      })
      .catch((e: Error) => {
        if (valid) setError(e.message);
      });
    return () => {
      valid = false;
    };
  }, [companyId, registeredAccounts]);
  const refresh = useCallback(async () => {
    let next: FirefoxStatus;
    try {
      next = await firefoxRequest<FirefoxStatus>("status");
      if (typeof next.version !== "string") throw new Error("Firefox eklentisi durumu doğrulanamadı. Eklentiyi güncelleyip paneli yenileyin.");
    } catch (e) {
      if (mounted.current && currentCompany.current === companyId) {
        setStatus(null);
        setTabs([]);
        setTabsError("");
        setPage(null);
        setConnectionError((e as Error).message);
        callbacks.current.onBinding(null);
        callbacks.current.onStatus?.(null);
      }
      throw e;
    }
    if (!mounted.current || currentCompany.current !== companyId) return null;
    setConnectionError("");
    setStatus(next);
    callbacks.current.onStatus?.(next);
    const binding = next.binding?.companyId === companyId ? next.binding : null;
    callbacks.current.onBinding(binding);
    if (!binding) setPage(null);
    if (next.window?.companyId === companyId) {
      try {
        const result = await firefoxRequest<{ tabs: Tab[] }>("tabs", { companyId });
        if (!Array.isArray(result.tabs)) throw new Error("Firefox sekme listesi doğrulanamadı. Eklenti sürümünü kontrol edin.");
        if (mounted.current && currentCompany.current === companyId) {
          setTabs(result.tabs);
          setTabsError("");
        }
      } catch (e) {
        if (mounted.current && currentCompany.current === companyId) {
          setTabs([]);
          setTabsError((e as Error).message);
        }
      }
    }
    else { setTabs([]); setTabsError(""); }
    return binding;
  }, [companyId]);
  useEffect(() => {
    setStatus(null);
    setPage(null);
    setConnectionError("");
    setTabsError("");
    setNotice("");
    setError("");
    callbacks.current.onStatus?.(null);
    callbacks.current.onBinding(null);
    let active = true, inFlight = false;
    const check = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try { await refresh(); }
      catch { /* refresh reports connection failure without conflating it with the tab list. */ }
      finally { inFlight = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 5000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
      onBinding(null);
    } finally {
      setBusy(false);
    }
  }
  async function runTabTask(inspect = false) {
    setTabAnswer("");
    const current = (await firefoxRequest<{ tabs: Tab[] }>("tabs", { companyId })).tabs;
    if (!Array.isArray(current)) throw new Error("Firefox sekme listesi doğrulanamadı.");
    const list = current.filter((t) => !t.panel).map((t) => {
      let site = "";
      try { site = new URL(t.url).hostname; } catch { /* internal tab */ }
      return { tabId: t.id, title: t.title.slice(0, 120), site };
    });
    const result = await api<{ answer: string }>("/api/computer/ai/select-tab", {
      method: "POST", body: JSON.stringify({ companyId, question: tabTask, tabs: list }),
    });
    if (!mounted.current || currentCompany.current !== companyId) return;
    const tabId = firefoxTabChoice(result.answer, current);
    await firefoxRequest("select-tab", { companyId, tabId });
    setPage(null);
    const selected = await refresh();
    setNotice(`Seçilen sekmeye geçildi: ${current.find((t) => t.id === tabId)?.title || "Sekme"}.`);
    if (inspect) {
      if (!selected || selected.tabId !== tabId)
        throw new Error("AI sekmeyi buldu. Okumak için Açık hesap sekmelerini topluca bağla düğmesinden bu hesabı da onaylayın.");
      const read = await firefoxRequest<{ page: FirefoxPage }>("read", firefoxTarget(selected));
      setPage(read.page);
      const response = await api<{ answer: string }>("/api/computer/ai/ask", {
        method: "POST", body: JSON.stringify({ companyId, mode: "chat", mediaId: null, question: firefoxQuestion(tabTask, read.page) }),
      });
      if (mounted.current) setTabAnswer(response.answer);
    }
  }
  const binding =
    status?.binding?.companyId === companyId ? status.binding : null;
  const bindingKey = (b: FirefoxBinding) =>
    b.platform.startsWith("ads-")
      ? `${b.accountId}:${b.platform}`
      : b.accountId;
  const connected = (
    status?.bindings || (status?.binding ? [status.binding] : [])
  ).filter((b) => b.companyId === companyId);
  return (
    <section className="card firefox-connection">
      <h2>Ana Firefox · Eklenti bağlantısı</h2>
      <p>
        <strong>Windows'ta otomatik kurulum:</strong> Güncel Baslat.cmd, aynı
        klasöre Firefox Developer Edition kurar ve eklentiyi ona ait profilde
        etkinleştirir. Açılan Firefox'ta bu paneli kullan. Sosyal hesaplara bir
        kez giriş yapman yeterlidir; kişisel Firefox'un değiştirilmez.
      </p>
      <p>
        Açık sosyal hesap sekmelerini tek seferde bulup birlikte bağla.
        Eklenti onayından sonra bağlantı durumu kendiliğinden güncellenir;
        AI görevine uygun sekmeye geçebilir. Aynı platformda birden fazla
        hesap varsa hangi sekmenin kullanılacağı onay ekranında gösterilir.
      </p>
      <p>
        Firefox'ta hesaplara giriş yaptıysanız aşağıdaki <b>Açık hesap sekmelerini topluca bağla</b>{" "}
        düğmesine basın, ardından Firefox araç çubuğundaki <b>Sosyal Studio</b> simgesinden
        sekmeleri birlikte onaylayın. Bu bağlantı paylaşım yapmaz.
        Firefox yeniden başlatıldığında veya site yeni bir sekmede açıldığında bağlantı onayını yenileyin.
      </p>
      <details>
        <summary>Eklentiyi kur · kişisel Firefox için elle kurulum</summary>
        <ol>
          <li>
            <a href="/indir/sosyal-studio-firefox.zip?v=1.5.0" download>
              Eklenti paketini indir
            </a>{" "}
            ve ZIP'i bir klasöre çıkar.
          </li>
          <li>
            Firefox adres çubuğuna{" "}
            <code>about:debugging#/runtime/this-firefox</code> yaz.
          </li>
          <li>
            “Geçici eklenti yükle” düğmesinden klasördeki{" "}
            <code>manifest.json</code> dosyasını seç; paneli yenile.
          </li>
        </ol>
        <p>
          Normal Firefox'ta bu yükleme tarayıcı yeniden başlatılana kadar
          geçerlidir. Paket henüz Mozilla tarafından imzalanmış değildir. Kalıcı
          imzalı dağıtım ve ESR seçeneği:{" "}
          <a
            href="/indir/FIREFOX_EKLENTISI.md"
            target="_blank"
            rel="noreferrer"
          >
            Kurulum belgesi
          </a>
          .
        </p>
      </details>
      <div className="expert-actions">
        <button
          disabled={disabled || busy || !accounts.some((a) => a.profileUrl)}
          onClick={() => void run(async () => {
            const available = status || await firefoxRequest<FirefoxStatus>("status");
            if (!/^1\.(?:[4-9]|[1-9]\d+)\./.test(available.version))
              throw new Error("Toplu bağlantı için Firefox eklentisi 1.4 veya üzeri gerekli. Güncel yardımcı/eklenti paketini kullanın.");
            await firefoxRequest("connect-workspace", { companyId, companyName });
            await refresh();
            setNotice("Firefox araç çubuğundaki Sosyal Studio simgesini açın. Bulunan hesap sekmelerini birlikte onaylayın; bağlantı burada otomatik güncellenir.");
          })}
        >
          Açık hesap sekmelerini topluca bağla
        </button>
        <button
          className="secondary"
          disabled={disabled || busy}
          onClick={() =>
            void run(async () => {
              await refresh();
            })
          }
        >
          Eklenti bağlantısını kontrol et
        </button>
        {status?.window && (
          <button
            className="secondary"
            disabled={disabled || busy}
            onClick={() =>
              void run(async () => {
                await firefoxRequest("disconnect");
                await refresh();
              })
            }
          >
            Bağlantıyı kes
          </button>
        )}
      </div>
      {status && (
        <p>
          Eklenti {status.version} · {connected.length} hesap sekmesi bağlı
          {status.pending
            ? " · Firefox araç çubuğundaki Sosyal Studio simgesinden isteği onayla; sonra bağlantıyı kontrol et."
            : ""}
        </p>
      )}
      {!status && <p role={connectionError ? "alert" : "status"}>
        {connectionError || "Eklenti bağlantısı kontrol ediliyor…"}
      </p>}
      {tabsError && <p role="alert">Sekme listesi yenilenemedi: {tabsError} Bağlantıyı yeniden kontrol edin.</p>}
      {status?.version === "1.0.0" && (
        <p role="status">
          Çoklu hesap bağlantısı için Eklentiyi kur bölümünden 1.5.0 paketini
          indirip yeniden yükle. İlk sürüm yalnız son bağlanan hesabı tutar.
        </p>
      )}
      <FirefoxAgent key={companyId} companyId={companyId} companyName={companyName} status={status} disabled={disabled || busy} />
      <details open={!compact}>
        <summary>Sekme araçları ve tek tek hesap bağlantısı</summary>
      {connected.length > 0 && (
        <label className="field">
          Çalışılacak bağlı hesap sekmesi
          <select
            value={binding ? bindingKey(binding) : ""}
            disabled={disabled || busy || status?.version === "1.0.0"}
            onChange={(e) =>
              void run(async () => {
                const b = connected.find(
                  (b) => bindingKey(b) === e.target.value,
                )!;
                await firefoxRequest("select-target", firefoxTarget(b));
                setPage(null);
                await refresh();
              })
            }
          >
            <option value="" disabled>
              Bağlı hesaplardan birini seç
            </option>
            {connected.map((b) => (
              <option key={bindingKey(b)} value={bindingKey(b)}>
                {b.identityLabel || b.label} ·{" "}
                {adProviders.find((p) => "ads-" + p.id === b.platform)?.name ||
                  b.platform}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className="secondary"
        disabled={disabled || busy}
        onClick={() =>
          void run(async () => {
            await firefoxRequest("connect-window", { companyId, companyName });
            setNotice(
              "Sosyal Studio eklenti simgesinden panelin bulunduğu Firefox penceresini onayla; sonra bağlantıyı kontrol et.",
            );
          })
        }
      >
        Bu Firefox penceresini bağla
      </button>
      {status?.window?.companyId === companyId && (
        <>
          <label className="field">
            Bu penceredeki tüm sekmeler
            <select
              value={tabs.find((t) => t.active)?.id ?? ""}
              disabled={disabled || busy}
              onChange={(e) =>
                void run(async () => {
                  await firefoxRequest("select-tab", {
                    companyId,
                    tabId: Number(e.target.value),
                  });
                  setPage(null);
                  await refresh();
                })
              }
            >
              <option value="" disabled>
                Sekmeleri yenile
              </option>
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.pinned ? "📌 " : ""}
                  {t.title}
                  {t.panel ? " · Panel" : ""} · {t.url}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary"
            disabled={disabled || busy}
            onClick={() =>
              void run(async () => {
                await refresh();
              })
            }
          >
            Pencerenin sekmelerini yenile
          </button>
          <label className="field">
            AI hangi sekmeye geçsin?
            <input
              value={tabTask}
              maxLength={500}
              disabled={disabled || busy}
              onChange={(e) => setTabTask(e.target.value)}
              placeholder="Örn. LinkedIn şirket sekmesine geç"
            />
          </label>
          <button
            className="secondary"
            disabled={disabled || busy || !modelReady || !tabTask.trim()}
            onClick={() =>
              void run(() => runTabTask())
            }
          >
            AI ile sekmeye geç
          </button>
          <button className="secondary" disabled={disabled || busy || !modelReady || !tabTask.trim()}
            onClick={() => void run(() => runTabTask(true))}>
            Sekmeyi seç ve AI ile incele
          </button>
          {tabAnswer && <div className="source-excerpt" aria-label="Firefox görev yanıtı">{tabAnswer}</div>}
          <small>
            AI ile seçimde bu pencerenin sekme başlıkları ve site adları modele
            gönderilir; sayfaların içeriği bu seçim sırasında okunmaz. Yerel AI
            üretim kotasından bir istek kullanır. İnceleme seçilirse bağlı
            sayfanın güncel metni ikinci bir istekle değerlendirilir.
          </small>
          <p>
            Yeni açılan ve sabitlenmiş sekmeler bu listeye alınır. Eşleştirilmiş
            sekmeye geçince ilgili hesap seçilir; diğer bağlı hesaplar korunur.
            Giriş ve özel mesaj sayfalarının içeriği AI'a okunmaz.
          </p>
        </>
      )}
      <h3>Yeni hesap sekmesi ekle</h3>
      <label className="field">
        Eklenecek kayıtlı hedef hesap / şirket sayfası
        <select
          value={accountId}
          disabled={disabled || busy}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">Bir hedef seç</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.profileUrl}>
              {a.label} · {a.platform}
              {!a.profileUrl ? " · Sayfa adresi eksik" : ""}
            </option>
          ))}
        </select>
      </label>
      <p>
        Hedef adres Hesap bağlantıları bölümünden kaydedilir. LinkedIn için{" "}
        <code>/company/…</code> şirket sayfası gerekir. Şahsi profilini hedef
        olarak kaydetme.
      </p>
      <button
        className="secondary"
        disabled={disabled || busy || !accountId}
        onClick={() =>
          void run(async () => {
            await firefoxRequest("connect", {
              target: { companyId, companyName, accountId },
            });
            setPage(null);
            setNotice(
              "Firefox araç çubuğundaki Sosyal Studio eklentisinden yeni hesap sekmesini onayla; sonra bağlantıyı kontrol et. Önceden bağlanan hesaplar korunur.",
            );
            setStatus((s) => (s ? { ...s, pending: true } : null));
          })
        }
      >
        Hesabın Firefox sekmesini ekle
      </button>
      {binding && (
        <>
          <p>
            <strong>Hedef:</strong>{" "}
            <a href={binding.profileUrl} target="_blank" rel="noreferrer">
              {binding.profileUrl}
            </a>
          </p>
          <div className="expert-actions">
            <button
              className="secondary"
              disabled={disabled || busy}
              onClick={() =>
                void run(async () => {
                  const b = await refresh();
                  if (!b) throw new Error("Sekmeyi yeniden bağla.");
                  await firefoxRequest("focus", firefoxTarget(b));
                })
              }
            >
              Bağlı sekmeye git
            </button>
            <button
              className="secondary"
              disabled={disabled || busy}
              onClick={() =>
                void run(async () => {
                  const b = await refresh();
                  if (!b) throw new Error("Sekmeyi yeniden bağla.");
                  const r = await firefoxRequest<{ page: FirefoxPage }>(
                    "read",
                    firefoxTarget(b),
                  );
                  setPage(r.page);
                })
              }
            >
              Sekmeyi oku / hedefi kontrol et
            </button>
          </div>
          {page && (
            <details open>
              <summary>{page.title}</summary>
              <p>{page.url}</p>
              <p className="source-excerpt">{page.text}</p>
              <p>{page.reason}</p>
            </details>
          )}
        </>
      )}
      </details>
      {busy && <p role="status">Firefox bağlantısı kontrol ediliyor…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <small>
        Bağlı sekmeler görev sırasında okunabilir; giriş ve özel mesaj ekranları
        okunmaz. Otomatik paylaşım, Yayın takvimi bölümündeki içerik önizlemesi
        ve ayrı toplu yayın onayıyla başlatılır.
      </small>
    </section>
  );
}
