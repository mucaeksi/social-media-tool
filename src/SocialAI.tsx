import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Check,
  Copy,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { LocalAIStatus } from "./LocalAIStatus.tsx";
import { NightLearning } from "./NightLearning.tsx";
import { LocalAIJobs } from "./LocalAIJobs.tsx";
import { FirefoxConnection } from "./FirefoxConnection.tsx";
import { firefoxQuestion, firefoxRequest, firefoxTarget } from "./firefoxBridge.ts";
import type { FirefoxBinding, FirefoxPage } from "./firefoxBridge.ts";
import { api } from "./api.ts";
import type {
  AuthUser,
  Company,
  Platform,
  PlatformId,
  Post,
  Media,
  SourceRef,
} from "./types.ts";
import { prepareCloudMedia } from "./prepareMedia.ts";

type Memory = {
  id: string;
  companyId: string;
  kind: "fact" | "rule" | "example";
  title: string;
  body: string;
  createdAt: string;
};
export type AITurn = {
  sourceRefs?: SourceRef[];
  id: string;
  companyId: string;
  question: string;
  answer: string;
  posts: Post[] | null;
  createdAt: string;
  mediaId?: string | null;
  imageObservation?: string | null;
  expertVersion?: string | null;
  engine?: "local" | "cloudflare";
  model?: string;
};
type Usage = {
  enabled: boolean;
  model: string;
  reservedNeurons: number;
  limits: {
    dailyNeurons: number;
    providerDailyNeurons: number;
    memoryItems: number;
    memoryCharacters: number;
  };
};
const kinds = {
  fact: "Şirket bilgisi",
  rule: "Marka kuralı",
  example: "Onaylı içerik örneği",
} as const;
const date = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));

export function SocialAI({
  company,
  user,
  platforms,
  cloud,
  localAvailable = false,
  initialText,
  initialMedia,
  onApply,
}: {
  company: Company;
  user: AuthUser;
  platforms: Platform[];
  cloud: boolean;
  localAvailable?: boolean;
  initialText: string;
  initialMedia?: Media | null;
  onApply: (turn: AITurn) => void;
}) {
  const [engine, setEngine] = useState<"local" | "cloudflare">(
    localAvailable && user.role === "admin" ? "local" : "cloudflare",
  );
  const [localReady, setLocalReady] = useState(false);
  const [firefox, setFirefox] = useState<FirefoxBinding | null>(null);
  const [includeFirefox, setIncludeFirefox] = useState(false);
  const activeFirefox = firefox?.companyId === company.id ? firefox : null;
  const [entries, setEntries] = useState<Memory[]>([]),
    [turns, setTurns] = useState<AITurn[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null),
    [question, setQuestion] = useState(initialText);
  const [mode, setMode] = useState<"chat" | "posts">("posts"),
    [selected, setSelected] = useState<PlatformId[]>(
      platforms.map((p) => p.id),
    );
  const [attachment, setAttachment] = useState<Media | null>(
    initialMedia?.companyId === company.id ? initialMedia : null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(cloud);
  const [editing, setEditing] = useState<string | null>(null),
    [kind, setKind] = useState<Memory["kind"]>("fact"),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  const memoryTitle = useRef<HTMLInputElement>(null),
    replyEnd = useRef<HTMLDivElement>(null);
  const admin = user.role === "admin";
  async function refresh() {
    const [data, status] = await Promise.all([
      api<{ memory: Memory[]; turns: AITurn[] }>(
        `/api/ai/workspace?companyId=${company.id}`,
      ),
      api<Usage>("/api/ai/status"),
    ]);
    setEntries(data.memory);
    setTurns(data.turns);
    setUsage(status);
  }
  useEffect(() => {
    if (!cloud) return;
    let valid = true;
    Promise.all([
      api<{ memory: Memory[]; turns: AITurn[] }>(
        `/api/ai/workspace?companyId=${company.id}`,
      ),
      api<Usage>("/api/ai/status"),
    ])
      .then(([data, status]) => {
        if (valid) {
          setEntries(data.memory);
          setTurns(data.turns);
          setUsage(status);
        }
      })
      .catch((e: Error) => {
        if (valid) setError(e.message);
      })
      .finally(() => {
        if (valid) setLoading(false);
      });
    return () => {
      valid = false;
    };
  }, [company.id, cloud]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function clearMemoryForm() {
    setEditing(null);
    setTitle("");
    setBody("");
    setKind("fact");
  }
  async function ask() {
    await run(async () => {
      try {
        let requestQuestion = question;
        if (engine === "local" && includeFirefox) {
          if (!activeFirefox) throw new Error("Bu şirkete ait Firefox sekmesini bağlayın veya sekme ekleme seçimini kaldırın.");
          const result = await firefoxRequest<{ page: FirefoxPage }>("read", firefoxTarget(activeFirefox));
          requestQuestion = firefoxQuestion(question, result.page);
        }
        const turn = await api<AITurn>(
          engine === "local" ? "/api/computer/ai/ask" : "/api/ai/ask",
          {
            method: "POST",
            body: JSON.stringify({
              companyId: company.id,
              question: requestQuestion,
              mode,
              mediaId: attachment?.id ?? null,
              ...(mode === "posts" ? { selected } : {}),
            }),
          },
        );
        setTurns((items) => [...items, turn].slice(-20));
        setQuestion("");
        requestAnimationFrame(() =>
          replyEnd.current?.scrollIntoView({
            block: "nearest",
            behavior: "instant",
          }),
        );
      } finally {
        await api<Usage>("/api/ai/status")
          .then(setUsage)
          .catch(() => {});
      }
    });
  }
  async function prepareInFirefox(post: Post) {
    await run(async () => {
      if (!activeFirefox || activeFirefox.platform !== post.platform) throw new Error("Taslağın platformuna ait şirket sekmesini bağlayın.");
      const { page } = await firefoxRequest<{ page: FirefoxPage }>("read", firefoxTarget(activeFirefox));
      if (!page.canPrepare) throw new Error(page.reason);
      const text = [post.caption, post.hashtags.join(" ")].filter(Boolean).join("\n\n");
      await firefoxRequest("prepare", { ...firefoxTarget(activeFirefox), snapshotId: page.id, text });
      setNotice("Firefox araç çubuğundaki Sosyal Studio simgesini açıp hedefi ve taslağı onaylayın. Metin yalnız doğrulanan hedefin boş alanına yerleştirilir. Son paylaşımı Firefox'ta siz yaparsınız; henüz yayın yapılmadı.");
    });
  }
  async function upload(file?: File) {
    if (!file) return;
    await run(async () => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 15 * 1024 * 1024
      )
        throw new Error(
          "JPEG, PNG veya WebP seçin. Görsel en fazla 15 MB olmalı.",
        );
      const payload = await prepareCloudMedia(
        file,
        platforms,
        engine === "local"
          ? { originalMaxSide: 1024, originalQuality: 0.8 }
          : undefined,
      );
      const image = await api<Media>(`/api/media?companyId=${company.id}`, {
        method: "POST",
        body: payload,
      });
      if (image.companyId !== company.id)
        throw new Error("Yüklenen görselin şirketi doğrulanamadı.");
      setAttachment(image);
      setNotice(
        "Görsel eklendi. Özetinizi yazıp içerikleri hazırlayın; AI görseli bu istekte inceleyecek.",
      );
    });
  }
  const example = (turn: AITurn) => {
    clearMemoryForm();
    setKind("example");
    setTitle("Onaylayacağım içerik örneği");
    const content = turn.posts
      ? turn.posts
          .map((p) =>
            [p.caption, p.hashtags.join(" ")].filter(Boolean).join("\n"),
          )
          .join("\n\n")
      : turn.answer;
    if (content.length <= 2000) {
      setBody(content);
      setNotice(
        "Örneği düzenleyip doğrulayın; ardından Hafızaya ekle düğmesine basın.",
      );
    } else
      setNotice(
        "Yanıt 2.000 karakteri aşıyor. Hafıza alanına yalnızca onaylamak istediğiniz bölümü yazın.",
      );
    memoryTitle.current?.focus();
  };
  return (
    <div className="ai-workspace">
      <section className="card ai-overview">
        <div>
          <Sparkles size={22} />
          <h2>Markanızın sosyal medya asistanı</h2>
        </div>
        <p>
          Görselinizi ve kısa özeti verin; asistan her platform için ayrı metin,
          başlık, etiket ve görsel açıklaması hazırlasın.{" "}
          <strong>{company.name}</strong> profilini ve onaylı marka bilgilerini
          kullanır.
        </p>
        <small>
          Şirket hafızası modelin ağırlıklarını değiştirmez. Yanıtları inceleyip
          düzenleyin. Görsel tanıma içeriği anlamaya yardımcı olur. Canlı
          hesap analitiği ve görsel rötuş bu asistanda yoktur. Yerel AI'a
          Firefox eklentisiyle seçtiğiniz sekmenin anlık metnini ekleyebilirsiniz.
        </small>
      </section>
      {!cloud && (
        <p className="browser-message">
          Entegre asistan canlı Cloudflare sürümünde kullanılabilir. Yerel
          geliştirmede gerçek model çağrılmaz.
        </p>
      )}
      {localAvailable && admin && (
        <label className="ai-engine-choice">
          Asistanın çalışacağı yer
          <select
            value={engine}
            disabled={busy}
            onChange={(event) =>
              setEngine(event.target.value as "local" | "cloudflare")
            }
          >
            <option value="local">
              Şirket bilgisayarı · küçük yerel model
            </option>
            <option value="cloudflare">
              Cloudflare · günlük ücretsiz kota
            </option>
          </select>
        </label>
      )}
      {engine === "local" && <LocalAIStatus onReady={setLocalReady} />}
      {engine === "local" && user.role === "admin" && <NightLearning key={`night-${company.id}`} companyId={company.id} />}
      {cloud && admin && engine === "local" && (
        <FirefoxConnection key={`firefox-${company.id}`} companyId={company.id} companyName={company.name} disabled={busy} modelReady={localReady} onBinding={setFirefox} />
      )}
      {engine === "local" && (
        <LocalAIJobs
          key={company.id}
          companyId={company.id}
          onComplete={(turn) =>
            setTurns((s) => [...s.filter((r) => r.id !== turn.id), turn])
          }
        />
      )}
      {usage && engine === "cloudflare" && (
        <div className="ai-budget" aria-label="AI kullanım bütçesi">
          <div>
            <strong>Günlük güvenli bütçe</strong>
            <span>
              {usage.reservedNeurons.toLocaleString("tr-TR")} /{" "}
              {usage.limits.dailyNeurons.toLocaleString("tr-TR")} Neuron
            </span>
          </div>
          <progress
            value={Math.min(usage.reservedNeurons, usage.limits.dailyNeurons)}
            max={usage.limits.dailyNeurons}
          />
          <small>
            Tüm şirketler ortak bütçeyi kullanır. Gösterilen tutar, her istek
            için ayrılan üst sınırdır; hatalı isteklerde de geri verilmez.
            Sağlayıcının ücretsiz kotası günlük{" "}
            {usage.limits.providerDailyNeurons.toLocaleString("tr-TR")} Neuron.
            Yenilenme: 03.00 (Türkiye). Ücretli modele geçilmez.
          </small>
        </div>
      )}
      {error && (
        <p className="browser-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="browser-message" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p className="browser-message">
          <LoaderCircle className="spin" size={17} /> Şirketin AI alanı
          yükleniyor…
        </p>
      ) : (
        <div className="ai-columns">
          <section className="card ai-chat">
            <div className="ai-section-heading">
              <h2>Sosyal medya danışmanı</h2>
              <span>
                {engine === "local"
                  ? "Qwen3.5-9B · Yerel"
                  : "Gemma 4 · Cloudflare"}
              </span>
            </div>
            <p className="ai-subtext">
              {engine === "local"
                ? "Son 20 yanıt hesabınıza ve bu şirkete özel saklanır. Küçük model her istekte şirket hafızasını ve verdiğiniz özeti kullanır; önceki sohbeti otomatik bağlamına almaz."
                : "Son 20 yanıt hesabınıza ve bu şirkete özel saklanır. Yeni danışma yanıtında girdi boyutuna sığan son en fazla 4 konuşma bağlam olarak kullanılır."}
            </p>
            {turns.length > 0 && (
              <button
                className="secondary ai-clear-history"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Bu şirketteki kendi sohbet geçmişiniz silinsin mi? Şirket hafızası korunur.",
                    )
                  )
                    void run(async () => {
                      await api(`/api/ai/history?companyId=${company.id}`, {
                        method: "DELETE",
                      });
                      setTurns([]);
                      setNotice(
                        "Sohbet geçmişiniz silindi; şirket hafızası korundu.",
                      );
                    });
                }}
              >
                <Trash2 size={14} /> Yeni sohbet başlat
              </button>
            )}
            <div className="ai-conversation" aria-label="AI sohbet geçmişi">
              {!turns.length && (
                <div className="ai-empty">
                  <Brain size={32} />
                  <h3>Markanız için birlikte düşünelim.</h3>
                  <p>
                    Önce şirket bilgisi veya iyi bir gönderi örneği
                    ekleyebilirsiniz. Sonra bir içerik isteyin ya da strateji
                    hakkında danışın.
                  </p>
                </div>
              )}
              {turns.map((turn) => (
                <article className="ai-turn" key={turn.id}>
                  <div className="ai-question">
                    <strong>Siz</strong>
                    <p>{turn.question}</p>
                  </div>
                  <div className="ai-answer">
                    <strong>Sosyal medya asistanı</strong>
                    <time dateTime={turn.createdAt}>
                      {date(turn.createdAt)}
                    </time>
                    <p>{turn.answer}</p>
                    {Boolean(turn.sourceRefs?.length) && (
                      <details>
                        <summary>Başvurulan onaylı kaynaklar</summary>
                        {turn.sourceRefs?.map((r) => (
                          <p key={r.factId}>
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.field}
                            </a>
                            : {r.value} · Geçerli: {date(r.validUntil)}
                          </p>
                        ))}
                      </details>
                    )}
                    {turn.imageObservation && (
                      <details className="ai-image-observation">
                        <summary>Görsel inceleme notu</summary>
                        {turn.mediaId && (
                          <img
                            src={`/api/media/${turn.mediaId}/original.jpg`}
                            alt="Bu yanıtta incelenen görsel"
                          />
                        )}
                        <p>
                          {turn.posts?.find((post) => post.alt)?.alt ||
                            "Görsel bu yanıtın hazırlanmasında incelendi."}
                        </p>
                        <small>
                          Bu bir model gözlemidir. Görseldeki yazıları ve ürün
                          ayrıntılarını kontrol edin.
                        </small>
                      </details>
                    )}
                    {turn.posts && (
                      <div className="ai-posts">
                        {turn.posts.map((post) => (
                          <details key={post.platform}>
                            <summary>
                              {
                                platforms.find((p) => p.id === post.platform)
                                  ?.name
                              }
                            </summary>
                            {post.title && <strong>{post.title}</strong>}
                            <p>{post.caption}</p>
                            <small>{post.hashtags.join(" ")}</small>
                            {post.alt && (
                              <p className="ai-alt-text">
                                <strong>Görsel açıklaması:</strong> {post.alt}
                              </p>
                            )}
                            <p className="ai-publication-block">
                              Bu taslak henüz paylaşılmadı. Hedef hesabı Hesap
                              bağlantıları bölümünden açabilirsiniz.
                            </p>
                            {activeFirefox?.platform === post.platform && (
                              <button className="secondary" disabled={busy} onClick={() => void prepareInFirefox(post)}>
                                Taslağı ana Firefox'ta onaya gönder
                              </button>
                            )}
                          </details>
                        ))}
                      </div>
                    )}
                    <div className="ai-answer-actions">
                      {turn.posts && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => onApply(turn)}
                        >
                          <Check size={15} /> Stüdyoya aktar
                        </button>
                      )}
                      <button
                        className="secondary"
                        onClick={() =>
                          void run(async () => {
                            await navigator.clipboard.writeText(
                              turn.posts
                                ? JSON.stringify({ posts: turn.posts }, null, 2)
                                : turn.answer,
                            );
                            setNotice("Yanıt kopyalandı.");
                          })
                        }
                        disabled={busy}
                      >
                        <Copy size={14} /> Kopyala
                      </button>
                      {admin && (
                        <button
                          className="secondary"
                          disabled={busy || !cloud}
                          onClick={() => example(turn)}
                        >
                          <Pencil size={14} /> Örnek olarak düzenle
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              <div ref={replyEnd} />
            </div>
            <form
              className="ai-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void ask();
              }}
            >
              <fieldset className="ai-mode">
                <legend>İstek türü</legend>
                <label>
                  <input
                    type="radio"
                    name="ai-mode"
                    value="chat"
                    checked={mode === "chat"}
                    onChange={() => setMode("chat")}
                    disabled={busy}
                  />{" "}
                  Danış / fikir üret
                </label>
                <label>
                  <input
                    type="radio"
                    name="ai-mode"
                    value="posts"
                    checked={mode === "posts"}
                    onChange={() => setMode("posts")}
                    disabled={busy}
                  />{" "}
                  Platformlara içerik hazırla
                </label>
              </fieldset>
              {mode === "posts" && (
                <fieldset className="ai-platforms">
                  <legend>İçerik hazırlanacak platformlar</legend>
                  {platforms.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setSelected((items) =>
                            e.target.checked
                              ? [...items, p.id]
                              : items.filter((id) => id !== p.id),
                          )
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="ai-image-input">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="visually-hidden"
                  aria-label="AI için görsel yükle"
                  disabled={
                    busy ||
                    !cloud ||
                    !(engine === "local" ? localReady : usage?.enabled)
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    void upload(file);
                  }}
                />
                {attachment && (
                  <img
                    src={`/api/media/${attachment.id}/original.jpg`}
                    alt="Asistana verilen görsel"
                  />
                )}
                <div>
                  <strong>
                    {attachment
                      ? "Görsel bu isteğe eklendi"
                      : "Görsel + kısa özet"}
                  </strong>
                  <p>
                    Görsel incelenir; kaynak dosya ve platform boyutları
                    stüdyoya taşınır. Yalnızca metinle de devam edebilirsiniz.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      busy ||
                      !cloud ||
                      !(engine === "local" ? localReady : usage?.enabled)
                    }
                    onClick={() => fileInput.current?.click()}
                  >
                    <ImagePlus size={16} />
                    {attachment ? "Görseli değiştir" : "Fotoğraf seç"}
                  </button>
                  {attachment && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setAttachment(null)}
                    >
                      Bu istekten kaldır
                    </button>
                  )}
                </div>
              </div>
              <label htmlFor="ai-question">Asistandan ne istersiniz?</label>
              {engine === "local" && activeFirefox && (
                <label className="expert-check">
                  <input type="checkbox" checked={includeFirefox} disabled={busy} onChange={(e) => setIncludeFirefox(e.target.checked)} />
                  {activeFirefox.identityLabel || activeFirefox.label} sekmesini bu istekte oku. Anlık sayfa metni AI'a iletilir ve sohbet kaydına eklenir; onaylı şirket hafızasına eklenmez.
                </label>
              )}
              {engine === "local" && includeFirefox && !activeFirefox && <p role="status">Sekme bağlantısı yok. Yeniden bağlayın veya <button type="button" className="secondary" disabled={busy} onClick={() => setIncludeFirefox(false)}>Sekmeyi bu istekten çıkar</button>.</p>}
              <textarea
                id="ai-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={engine === "local" && includeFirefox ? 2000 : 6000}
                rows={5}
                required
                disabled={
                  busy || !(engine === "local" ? localReady : usage?.enabled)
                }
                placeholder="Görselin konusunu ve ana mesajınızı kısaca yazın. Örn. Yeni seramik koleksiyonumuz geldi. El yapımı kupalarımızı tanıtalım. Fiyat veya kampanya varsa kesin bilgilerini ekleyin."
              />
              <div className="ai-quick-prompts">
                {[
                  "Hedef kitlemize uygun 5 içerik fikri öner.",
                  "Bir haftalık içerik planı öner.",
                  "Markamızın anlatım dilini nasıl geliştirebiliriz?",
                ].map((value) => (
                  <button
                    type="button"
                    key={value}
                    disabled={
                      busy ||
                      !(engine === "local" ? localReady : usage?.enabled)
                    }
                    onClick={() => {
                      setQuestion(value);
                      setMode("chat");
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="ai-composer-footer">
                <small>
                  {question.length.toLocaleString("tr-TR")} / {engine === "local" && includeFirefox ? "2.000" : "6.000"} karakter ·
                  Taslak üretir, paylaşmaz.
                </small>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !(engine === "local" ? localReady : usage?.enabled) ||
                    !question.trim() ||
                    (mode === "posts" && !selected.length)
                  }
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}{" "}
                  {busy
                    ? "Yanıt hazırlanıyor…"
                    : mode === "posts"
                      ? "İçerikleri hazırla"
                      : "Asistana gönder"}
                </button>
              </div>
              {mode === "posts" && (
                <p className="ai-publication-note">
                  Bu adım içerikleri hazırlar. Stüdyoda kontrol edip paylaşımı
                  hesap ekranından tamamlayın. Otomatik yayın bu sürümde yoktur.{" "}
                  <a
                    href="https://github.com/mucaeksi/social-media-tool/blob/main/docs/META_KURULUM.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Meta bağlantısı için kurulum
                  </a>
                </p>
              )}
              {cloud && engine === "cloudflare" && usage && !usage.enabled && (
                <small className="browser-message">
                  Bu ortamda model etkin değil. Şirket hafızasını
                  hazırlayabilirsiniz.
                </small>
              )}
            </form>
          </section>
          <aside className="card ai-memory">
            <div className="ai-section-heading">
              <h2>Şirket hafızası</h2>
              <Brain size={19} />
            </div>
            <p>
              Doğru ürün bilgilerini, marka kurallarını ve onayladığınız gönderi
              örneklerini ekleyin. Yalnızca bu şirketin yanıtlarında kullanılır.
            </p>
            <small>
              {entries.length} / 30 bilgi ·{" "}
              {entries
                .reduce((sum, item) => sum + [...item.body].length, 0)
                .toLocaleString("tr-TR")}{" "}
              / 8.000 karakter. Şifre ve özel hesap bilgisi eklemeyin.
            </small>
            {admin ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api(
                      editing ? `/api/ai/memory/${editing}` : "/api/ai/memory",
                      {
                        method: editing ? "PUT" : "POST",
                        body: JSON.stringify({
                          companyId: company.id,
                          kind,
                          title,
                          body,
                        }),
                      },
                    );
                    clearMemoryForm();
                    await refresh();
                    setNotice(
                      "Şirket hafızası kaydedildi. Sonraki istekte kullanılacak.",
                    );
                  });
                }}
              >
                <label>
                  Bilgi türü
                  <select
                    value={kind}
                    disabled={busy || !cloud}
                    onChange={(e) => setKind(e.target.value as Memory["kind"])}
                  >
                    {Object.entries(kinds).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bilgi başlığı
                  <input
                    ref={memoryTitle}
                    value={title}
                    maxLength={80}
                    required
                    disabled={busy || !cloud}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn. Ürünlerimiz veya kullanılmayacak ifadeler"
                  />
                </label>
                <label>
                  Hafıza içeriği
                  <textarea
                    value={body}
                    maxLength={2000}
                    rows={6}
                    required
                    disabled={busy || !cloud}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Doğrulanmış bilgi veya onaylı içerik örneğini yazın."
                  />
                </label>
                <small>
                  {body.length.toLocaleString("tr-TR")} / 2.000 karakter
                </small>
                <div className="ai-memory-form-actions">
                  <button
                    className="primary"
                    disabled={busy || !cloud || !title.trim() || !body.trim()}
                  >
                    <Plus size={15} />
                    {editing ? "Bilgiyi güncelle" : "Hafızaya ekle"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={clearMemoryForm}
                      disabled={busy}
                    >
                      Vazgeç
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <p>
                Şirket hafızasını yönetici düzenleyebilir. Danışırken mevcut
                bilgiler kullanılır.
              </p>
            )}
            <div className="ai-memory-list">
              {entries.map((item) => (
                <article key={item.id}>
                  <small>{kinds[item.kind]}</small>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  {admin && (
                    <div>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditing(item.id);
                          setKind(item.kind);
                          setTitle(item.title);
                          setBody(item.body);
                          memoryTitle.current?.focus();
                        }}
                      >
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${item.title} bilgisini sil`}
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `“${item.title}” şirket hafızasından silinsin mi?`,
                            )
                          )
                            void run(async () => {
                              await api(
                                `/api/ai/memory/${item.id}?companyId=${company.id}`,
                                { method: "DELETE" },
                              );
                              if (editing === item.id) clearMemoryForm();
                              await refresh();
                            });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
