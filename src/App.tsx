import { useEffect, useRef, useState } from "react";
import { prepareCloudMedia } from "./prepareMedia.ts";
import type { FormEvent } from "react";
import { Modal } from "./Modal.tsx";
import { api } from "./api.ts";
import { SocialAccounts } from "./SocialAccounts.tsx";
import { SocialAI } from "./SocialAI.tsx";
import {
  ResearchWorkspace,
  PublicationWorkspace,
  regionalLabels,
} from "./ExpertWorkspace.tsx";
import { WorkspaceSettings } from "./WorkspaceSettings.tsx";
import type { AITurn } from "./SocialAI.tsx";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  Layers3,
  Link2,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PanelLeftClose,
  PenLine,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { Instagram, Linkedin, Youtube } from "./platformMarks.tsx";
import type {
  Company,
  CompanyInput,
  Draft,
  DraftInput,
  Media,
  Platform,
  PlatformId,
  Post,
  AuthUser,
  SourceRef,
} from "./types.ts";

const initialPlatforms: PlatformId[] = [
  "instagram",
  "facebook",
  "linkedin",
  "threads",
];
const blankCompany: CompanyInput = {
  name: "",
  handle: "",
  website: "",
  tone: "Samimi ve profesyonel",
  audience: "",
  keywords: "",
  color: "#326f61",
};
const platformColors: Record<PlatformId, string> = {
  instagram: "#cc467b",
  facebook: "#2873d2",
  x: "#242d31",
  threads: "#343737",
  pinterest: "#c82d3c",
  youtube: "#e44545",
  tiktok: "#293b43",
  linkedin: "#216d9d",
  tumblr: "#35465c",
};
const compactDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
const fullCaption = (post: Post) =>
  [post.caption.trim(), post.hashtags.join(" ")].filter(Boolean).join("\n\n");
const count = (value: string) => [...value].length;
const mediaPath = (id: string, target = "original", fit = "contain") =>
  `/api/media/${id}/${target}.jpg?fit=${fit}`;

function PlatformIcon({ id, size = 18 }: { id: PlatformId; size?: number }) {
  if (id === "instagram") return <Instagram size={size} />;
  if (id === "linkedin") return <Linkedin size={size} />;
  if (id === "youtube") return <Youtube size={size} />;
  return (
    <span
      className={`brand-symbol brand-${id}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {
        (
          {
            facebook: "f",
            x: "𝕏",
            threads: "@",
            pinterest: "P",
            tiktok: "♪",
            tumblr: "t",
          } as Partial<Record<PlatformId, string>>
        )[id]
      }
    </span>
  );
}

export default function App({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout?: () => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cloud, setCloud] = useState(false);
  const [socialBrowser, setSocialBrowser] = useState(false);
  const [companyComputer, setCompanyComputer] = useState(false);
  const [aiEnabled, setAIEnabled] = useState(false);
  const [mediaStorage, setMediaStorage] = useState("r2");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState<
    | "studio"
    | "drafts"
    | "companies"
    | "connections"
    | "ai"
    | "research"
    | "publications"
    | "settings"
  >("studio");
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [companyDialog, setCompanyDialog] = useState<Company | "new" | null>(
    null,
  );
  const [help, setHelp] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    action: () => void;
  } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("Yeni gönderi");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<PlatformId[]>(initialPlatforms);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sourceRefs, setSourceRefs] = useState<SourceRef[]>([]);
  const [media, setMedia] = useState<Media | null>(null);
  const [mediaFit, setMediaFit] = useState<"contain" | "cover">("contain");
  const [activePlatform, setActivePlatform] = useState<PlatformId>("instagram");
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [source, setSource] = useState("");
  const [postRevision, setPostRevision] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const company = companies.find((item) => item.id === companyId);
  const currentCompanyId = useRef(companyId);
  currentCompanyId.current = companyId;
  const activePost = posts.find((post) => post.platform === activePlatform);
  const activeConfig = platforms.find((p) => p.id === activePlatform);
  const isBusy = Boolean(busy);

  async function initialize() {
    setLoading(true);
    setFatalError("");
    try {
      const [list, configs, health] = await Promise.all([
        api<Company[]>("/api/companies"),
        api<Platform[]>("/api/platforms"),
        api<{
          database: string;
          storage?: string;
          socialBrowser?: boolean;
          companyComputer?: boolean;
          ai?: string;
        }>("/api/health"),
      ]);
      setCompanies(list);
      setCloud(health.database === "d1");
      setSocialBrowser(Boolean(health.socialBrowser));
      setCompanyComputer(Boolean(health.companyComputer));
      setAIEnabled(
        health.ai === "cloudflare" || Boolean(health.companyComputer),
      );
      setMediaStorage(health.storage ?? "local");
      setPlatforms(configs);
      setCompanyId(list[0]?.id ?? "");
    } catch (error) {
      setFatalError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => setNotice(null),
      notice.error ? 14000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!companyId) {
      setDrafts([]);
      return;
    }
    let valid = true;
    api<Draft[]>(`/api/drafts?companyId=${companyId}`)
      .then((list) => {
        if (valid) setDrafts(list);
      })
      .catch((error) => {
        if (valid) setNotice({ text: error.message, error: true });
      });
    return () => {
      valid = false;
    };
  }, [companyId]);

  async function run(label: string, action: () => Promise<void>) {
    if (isBusy) return;
    setBusy(label);
    try {
      await action();
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    } finally {
      setBusy("");
    }
  }
  function reset() {
    setDraftId(null);
    setDraftName("Yeni gönderi");
    setText("");
    setSelected(initialPlatforms);
    setPosts([]);
    setSourceRefs([]);
    setMedia(null);
    setMediaFit("contain");
    setActivePlatform("instagram");
    setDirty(false);
    setStale(false);
    setSource("");
    setImportText("");
  }
  function guard(action: () => void) {
    if (dirty)
      setConfirm({
        title: "Kaydedilmemiş değişiklikler var",
        text: "Devam ederseniz bu gönderideki kaydedilmemiş değişiklikler silinir. Saklamak için önce taslağı kaydedin.",
        action,
      });
    else action();
  }
  function changeCompany(id: string) {
    if (id !== companyId)
      guard(() => {
        reset();
        setDrafts([]);
        setCompanyId(id);
      });
  }
  function changed() {
    setDirty(true);
    if (posts.length) setStale(true);
  }
  function brief() {
    return { companyId, text, selected, mediaId: media?.id ?? null };
  }
  function draftInput(): DraftInput {
    return {
      sourceRefs,
      companyId,
      name: draftName,
      text,
      selected,
      posts,
      mediaId: media?.id ?? null,
      mediaFit,
    };
  }
  async function saveCurrent() {
    const saved = await api<Draft>(
      draftId ? `/api/drafts/${draftId}` : "/api/drafts",
      { method: draftId ? "PUT" : "POST", body: JSON.stringify(draftInput()) },
    );
    setDraftId(saved.id);
    setDirty(false);
    setDrafts((list) => [saved, ...list.filter((d) => d.id !== saved.id)]);
    return saved;
  }
  function save() {
    void run("save", async () => {
      await saveCurrent();
      setNotice({ text: "Taslak bu şirketin çalışma alanına kaydedildi." });
    });
  }
  function prepare() {
    const action = () =>
      void run("prepare", async () => {
        const data = await api<{ posts: Post[] }>("/api/prepare", {
          method: "POST",
          body: JSON.stringify(brief()),
        });
        setPosts(data.posts);
        setPostRevision((v) => v + 1);
        setActivePlatform(selected[0]);
        setDirty(true);
        setStale(false);
        setSource("rules");
        setSourceRefs([]);
        setNotice({
          text: "Temel metinler hazır. Özgün uyarlama için ChatGPT asistanını kullanabilirsiniz.",
        });
      });
    if (posts.length)
      setConfirm({
        title: "Platform metinleri yeniden oluşturulsun mu?",
        text: "Mevcut platform düzenlemeleri kaynak metin ve şirket etiketleriyle değiştirilir. Kaydettiğiniz taslak, tekrar kaydedene kadar korunur.",
        action,
      });
    else action();
  }
  async function copy(value: string) {
    if (!navigator.clipboard)
      throw new Error("Pano erişimi yok. Metni seçip elle kopyalayın.");
    await navigator.clipboard.writeText(value);
    setNotice({ text: "Panoya kopyalandı." });
  }
  function generatePrompt() {
    void run("prompt", async () => {
      const result = await api<{ prompt: string }>("/api/prompt", {
        method: "POST",
        body: JSON.stringify(brief()),
      });
      setPrompt(result.prompt);
    });
  }
  function importResult() {
    void run("import", async () => {
      const result = await api<{ posts: Post[] }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ companyId, selected, result: importText }),
      });
      setPosts(result.posts);
      setPostRevision((v) => v + 1);
      setActivePlatform(selected[0]);
      setDirty(true);
      setStale(false);
      setSource("chatgpt-import");
      setSourceRefs([]);
      setImportDialog(false);
      setImportText("");
      setNotice({
        text: "ChatGPT içerikleri aktarıldı. Yayınlamadan önce metinleri ve bilgileri kontrol edin.",
      });
    });
  }
  function applyAI(turn: AITurn) {
    guard(
      () =>
        void run("ai-apply", async () => {
          if (
            turn.companyId !== currentCompanyId.current ||
            !turn.posts?.length
          ) {
            setNotice({
              text: "AI yanıtı farklı bir şirkete ait. Aktarım yapılmadı.",
              error: true,
            });
            return;
          }
          const image = turn.mediaId
            ? await api<Media>(`/api/media/${turn.mediaId}`)
            : null;
          if (
            turn.companyId !== currentCompanyId.current ||
            (image && image.companyId !== turn.companyId)
          )
            throw new Error(
              "AI görseli veya seçili şirket değişti. Aktarım yapılmadı.",
            );
          reset();
          setSourceRefs(turn.sourceRefs || []);
          setMedia(image);
          setText(turn.question);
          setPosts(turn.posts);
          setSelected(turn.posts.map((post) => post.platform));
          setActivePlatform(turn.posts[0].platform);
          setPostRevision((v) => v + 1);
          setSource(turn.engine === "local" ? "local-ai" : "cloudflare-ai");
          setDirty(true);
          setPage("studio");
          setNotice({
            text: image
              ? "AI içerikleri ve görseli stüdyoya aktarıldı. Son kontrolü yapıp taslağı kaydedin."
              : "AI içerikleri stüdyoya aktarıldı. Metinleri kontrol edin, görsel ekleyin ve taslağı kaydedin.",
          });
        }),
    );
  }
  function editPost(
    field: keyof Omit<Post, "platform" | "hashtags">,
    value: string,
  ) {
    setPosts((items) =>
      items.map((post) =>
        post.platform === activePlatform ? { ...post, [field]: value } : post,
      ),
    );
    setDirty(true);
  }
  async function upload(file?: File) {
    if (!file || !companyId || isBusy) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      setNotice({
        text: "JPEG, PNG veya WebP yükleyin. Dosya en fazla 15 MB olmalı.",
        error: true,
      });
      return;
    }
    await run("upload", async () => {
      const payload = cloud ? await prepareCloudMedia(file, platforms) : file;
      const uploaded = await api<Media>(`/api/media?companyId=${companyId}`, {
        method: "POST",
        headers: cloud ? {} : { "Content-Type": file.type },
        body: payload,
      });
      setMedia(uploaded);
      changed();
      setNotice({
        text: "Görsel hazır. Platform boyutları önizlemede uygulanır.",
      });
    });
  }
  function openDraft(draft: Draft) {
    guard(
      () =>
        void run("open", async () => {
          const image = draft.mediaId
            ? await api<Media>(`/api/media/${draft.mediaId}`)
            : null;
          setDraftId(draft.id);
          setDraftName(draft.name);
          setText(draft.text);
          setSelected(draft.selected);
          setPosts(draft.posts);
          setSourceRefs(draft.sourceRefs || []);
          setPostRevision((v) => v + 1);
          setMedia(image);
          setMediaFit(draft.mediaFit);
          setActivePlatform(draft.selected[0]);
          setDirty(false);
          setStale(false);
          setSource("saved");
          setPage("studio");
        }),
    );
  }
  function exportDraft() {
    void run("export", async () => {
      const saved = await saveCurrent();
      const response = await fetch(`/api/drafts/${saved.id}/export`);
      if (!response.ok) throw new Error("Dışa aktarma tamamlanamadı.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${saved.name.replace(/[^\p{L}\p{N}_-]/gu, "-")}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({
        text: "Metin paketi indirildi. Görselleri önizlemeden ayrıca indirebilirsiniz.",
      });
    });
  }
  const canPrepare = Boolean(
    company && text.trim() && selected.length && !isBusy,
  );
  const navItems = [
    { id: "studio", name: "İçerik stüdyosu", icon: PenLine },
    { id: "ai", name: "AI asistanı", icon: Sparkles },
    { id: "drafts", name: "Taslaklar", icon: Layers3 },
    { id: "companies", name: "Şirketler", icon: Building2 },
    { id: "connections", name: "Hesap bağlantıları", icon: Link2 },
    { id: "research", name: "KKTC ve kaynaklar", icon: FileText },
    { id: "publications", name: "Yayın takvimi", icon: CheckCheck },
    { id: "settings", name: "Ekip ve ayarlar", icon: Settings2 },
  ] as const;
  const pageTitles = {
    studio: "İçerik stüdyosu",
    drafts: "Taslaklar",
    companies: "Şirketler",
    connections: "Hesap bağlantıları",
    ai: "AI asistanı",
    research: "KKTC ve kaynaklar",
    publications: "Yayın takvimi",
    settings: "Ekip ve ayarlar",
  };

  if (loading || fatalError)
    return (
      <div className="loading-screen">
        <div className="logo-mark">
          s<span>•</span>
        </div>
        {fatalError ? (
          <>
            <h2>Uygulamaya bağlanılamadı</h2>
            <p>{fatalError}</p>
            <button className="primary" onClick={() => void initialize()}>
              Yeniden dene
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>Çalışma alanınız hazırlanıyor…</p>
          </>
        )}
      </div>
    );

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Menüyü kapat"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("studio");
          }}
        >
          <div className="logo-mark">
            s<span>•</span>
          </div>
          <span>
            sosyal<span className="logo-light">studio</span>
          </span>
        </a>
        <div className="workspace-label">ÇALIŞMA ALANI</div>
        <div className="workspace-chip">
          <span className="workspace-avatar">
            <Building2 size={17} />
          </span>
          <div>
            <strong>Marka merkeziniz</strong>
            <small>
              {companies.length} şirket ·{" "}
              {cloud ? "Cloudflare çalışma alanı" : "yerel çalışma alanı"}
            </small>
          </div>
        </div>
        <nav aria-label="Ana menü">
          {navItems
            .filter(
              (i) =>
                cloud ||
                !["research", "publications", "settings"].includes(i.id),
            )
            .map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                onClick={() => {
                  setPage(id);
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} />
                <span>{name}</span>
                {id === "drafts" && drafts.length > 0 && (
                  <span className="nav-count">{drafts.length}</span>
                )}
                {page === id && <span className="nav-dot" />}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="assistant-promo">
            <span className="promo-icon">
              <Sparkles size={19} />
            </span>
            <strong>Fikrinize yeni bir dil.</strong>
            <p>
              {aiEnabled
                ? "Şirketinizi tanıyan asistanla her platforma özel içerikler hazırlayın."
                : "ChatGPT ile her platforma özel içerikler hazırlayın."}
            </p>
            <button
              onClick={() => {
                setPage(aiEnabled ? "ai" : "studio");
                if (!aiEnabled) setHelp(true);
              }}
            >
              {aiEnabled ? "Asistanı aç" : "Nasıl çalışır?"}{" "}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="sidebar-help" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Kullanım rehberi
          </button>
          <div className="local-status">
            <span />{" "}
            {cloud
              ? "Veriler Cloudflare üzerinde saklanır"
              : "Veriler bu ortamda saklanır"}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Menüyü aç"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Çalışma alanı</span>
            <ChevronRight size={15} />
            <strong>{pageTitles[page]}</strong>
          </div>
          <div className="topbar-right">
            <span className="mode-badge">
              <span /> Hazırlama modu
            </span>
            <button
              className="icon-button help-top"
              aria-label="Yardım"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={20} />
            </button>
            <div
              className="profile-avatar"
              title={`${user.name} — ${user.role === "admin" ? "Yönetici" : "Editör"}`}
            >
              {user.name.slice(0, 1).toLocaleUpperCase("tr")}
            </div>
            {onLogout && (
              <button
                className="icon-button"
                aria-label="Çıkış yap"
                onClick={onLogout}
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "studio"
                  ? "FİKİRDEN PAYLAŞIMA"
                  : "MARKANIZ İÇİN TEK ÇALIŞMA ALANI"}
              </div>
              <h1>
                {page === "studio" ? (
                  <>
                    Bir içerik, <span>birçok hikâye.</span>
                  </>
                ) : (
                  pageTitles[page]
                )}
              </h1>
              <p>
                {page === "studio"
                  ? "İçeriğinizi bir kez hazırlayın. Her platformda kendi dilinizle anlatın."
                  : page === "drafts"
                    ? "Fikirleriniz kaybolmasın. Hazırladığınız içeriklere kaldığınız yerden devam edin."
                    : page === "companies"
                      ? "Her şirketin kimliği, anlatımı ve içerikleri kendi alanında."
                      : page === "ai"
                        ? "Markanızın bilgileriyle düşünün, platformlara uygun içerik hazırlayın."
                        : "Şirketinizi seçin, sosyal hesaplarınıza uzak tarayıcıdan giriş yapın."}
              </p>
            </div>
            <div className="company-picker">
              <label htmlFor="company-select">AKTİF ŞİRKET</label>
              <div>
                <span
                  className="company-dot"
                  style={{ background: company?.color ?? "#326f61" }}
                >
                  {company?.name.slice(0, 1).toLocaleUpperCase("tr") ?? (
                    <Building2 size={16} />
                  )}
                </span>
                <select
                  id="company-select"
                  aria-label="Aktif şirket"
                  value={companyId}
                  disabled={!companies.length || isBusy}
                  onChange={(e) => changeCompany(e.target.value)}
                >
                  {!companies.length && (
                    <option value="">Şirket ekleyin</option>
                  )}
                  {companies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
          </div>

          {!companies.length && page !== "companies" && page !== "settings" ? (
            <div className="welcome-card">
              <div className="welcome-art">
                <Building2 size={42} />
                <span>
                  <Plus size={16} />
                </span>
              </div>
              <div className="eyebrow">İLK ADIM</div>
              <h2>
                {user.role === "editor"
                  ? "Henüz şirket erişimi atanmadı."
                  : "Önce markanızla tanışalım."}
              </h2>
              <p>
                {user.role === "editor"
                  ? "Yöneticiniz Ekip ve ayarlar ekranından şirket erişiminizi atayabilir."
                  : "Şirketinizin adını, hedef kitlesini ve anlatım dilini ekleyin. Sonra tüm platformlar için aynı alanda içerik hazırlayın."}
              </p>
              {user.role === "admin" && (
                <button
                  className="primary"
                  onClick={() => setCompanyDialog("new")}
                >
                  <Plus size={17} /> İlk şirketimi ekle
                </button>
              )}
              <small>Her şirketin taslakları ve görselleri ayrı tutulur.</small>
            </div>
          ) : page === "studio" ? (
            <>
              <div className="flow-bar">
                <div className="flow-step current">
                  <span>01</span>
                  <strong>İçeriğini hazırla</strong>
                  <small>Fikir ve görsel</small>
                </div>
                <ChevronRight size={17} />
                <div className={`flow-step ${posts.length ? "current" : ""}`}>
                  <span>02</span>
                  <strong>Platformlara uyarla</strong>
                  <small>Her mecraya özel</small>
                </div>
                <ChevronRight size={17} />
                <div
                  className={`flow-step ${draftId && !dirty ? "current" : ""}`}
                >
                  <span>03</span>
                  <strong>Kontrol et ve kaydet</strong>
                  <small>Son söz sizde</small>
                </div>
              </div>
              <div className="studio-grid">
                <div className="editor-column">
                  <section className="card compose-card">
                    <div className="card-heading">
                      <div className="section-title">
                        <span className="title-icon">
                          <PenLine size={18} />
                        </span>
                        <h2>Gönderinizin başlangıç noktası</h2>
                      </div>
                      <span className="subtle-pill">{company?.name}</span>
                    </div>
                    <div className="field">
                      <label htmlFor="draft-name">Taslak adı</label>
                      <input
                        id="draft-name"
                        value={draftName}
                        maxLength={120}
                        disabled={isBusy}
                        placeholder="Örn. Yeni koleksiyon duyurusu"
                        onChange={(e) => {
                          setDraftName(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </div>
                    <div className="field source-field">
                      <div className="label-row">
                        <label htmlFor="source-text">
                          Neyi paylaşmak istersiniz?
                        </label>
                        <span>Kaynak içerik</span>
                      </div>
                      <textarea
                        id="source-text"
                        value={text}
                        maxLength={8000}
                        disabled={isBusy}
                        onChange={(e) => {
                          setText(e.target.value);
                          changed();
                        }}
                        placeholder="Yeni bir ürün, güzel bir haber ya da anlatmaya değer bir fikir…\n\nAna mesajınızı ve mutlaka yer almasını istediğiniz ayrıntıları yazın."
                      />
                      <div className="textarea-footer">
                        <span>
                          <FileText size={13} /> İyi bir içerik, iyi bir fikirle
                          başlar.
                        </span>
                        <span>
                          {text.length.toLocaleString("tr-TR")} / 8.000
                        </span>
                      </div>
                    </div>
                    <div
                      className={`upload-zone ${dropActive ? "drag-active" : ""} ${media ? "has-media" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropActive(true);
                      }}
                      onDragLeave={() => setDropActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropActive(false);
                        void upload(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={fileInput}
                        className="visually-hidden"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isBusy}
                        aria-label="Gönderi görseli yükle"
                        onChange={(e) => {
                          void upload(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      {media ? (
                        <>
                          <img
                            src={mediaPath(media.id)}
                            alt="Gönderiye eklenen görsel"
                          />
                          <div>
                            <strong>Görseliniz hazır</strong>
                            <span>
                              {media.width} × {media.height} piksel
                            </span>
                            <button
                              className="text-button"
                              disabled={isBusy}
                              onClick={() => fileInput.current?.click()}
                            >
                              Görseli değiştir
                            </button>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="Görseli kaldır"
                            disabled={isBusy}
                            onClick={() => {
                              setMedia(null);
                              changed();
                            }}
                          >
                            <X size={17} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="upload-button"
                          disabled={isBusy}
                          onClick={() => fileInput.current?.click()}
                        >
                          <span className="upload-icon">
                            {busy === "upload" ? (
                              <LoaderCircle className="spin" size={22} />
                            ) : (
                              <ImagePlus size={23} />
                            )}
                          </span>
                          <span>
                            <strong>
                              Görsel ekleyin <span>veya buraya sürükleyin</span>
                            </strong>
                            <small>
                              JPEG, PNG, WebP · En fazla 15 MB / 40 MP
                            </small>
                          </span>
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                    <p className="field-note">
                      Görseller platform boyutlarına hazırlanır. Yapay zekâ
                      rötuşu ve video üretimi bu sürüme dahil değildir.
                    </p>
                  </section>
                  <section className="card platform-card">
                    <div className="card-heading">
                      <div>
                        <h2>Nerede paylaşacaksınız?</h2>
                        <p>Bu gönderi için platformları seçin.</p>
                      </div>
                      <span className="count-pill">
                        {selected.length} / {platforms.length} seçili
                      </span>
                    </div>
                    <div className="platform-grid">
                      {platforms.map((p) => (
                        <button
                          key={p.id}
                          aria-pressed={selected.includes(p.id)}
                          disabled={isBusy}
                          className={`platform-option ${selected.includes(p.id) ? "selected" : ""}`}
                          onClick={() => {
                            setSelected((items) =>
                              items.includes(p.id)
                                ? items.filter((id) => id !== p.id)
                                : [...items, p.id],
                            );
                            setPosts((items) =>
                              items.filter((post) => post.platform !== p.id),
                            );
                            changed();
                          }}
                        >
                          <span
                            className="platform-logo"
                            style={{
                              color: platformColors[p.id],
                              background: `${platformColors[p.id]}0d`,
                            }}
                          >
                            <PlatformIcon id={p.id} />
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.kind}</small>
                          </span>
                          <span className="checkbox-mark">
                            {selected.includes(p.id) && (
                              <Check size={12} strokeWidth={3} />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="platform-footer">
                      <span>
                        <ShieldCheck size={15} /> Yalnızca seçili şirketin
                        içerikleri hazırlanır.
                      </span>
                      <button
                        className="primary"
                        disabled={!canPrepare}
                        onClick={prepare}
                      >
                        {busy === "prepare" ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <WandSparkles size={17} />
                        )}{" "}
                        Temel metinleri hazırla
                      </button>
                    </div>
                  </section>
                </div>
                <aside className="right-column">
                  {aiEnabled && (
                    <section className="card studio-ai-entry">
                      <Sparkles size={22} />
                      <h2>Panelin içinde hazırlayın.</h2>
                      <p>
                        Şirket hafızasını kullanan sosyal medya asistanıyla
                        içerik üretin; sonucu kontrol için stüdyoya aktarın.
                      </p>
                      <button
                        className="primary"
                        disabled={isBusy}
                        onClick={() => setPage("ai")}
                      >
                        AI asistanını aç <ArrowRight size={16} />
                      </button>
                    </section>
                  )}
                  <section className="assistant-card">
                    <div className="assistant-top">
                      <span className="assistant-icon">
                        <Sparkles size={23} />
                      </span>
                      <span className="assistant-label">
                        YARATICI YARDIMCINIZ
                      </span>
                      <span className="tiny-spark">✳</span>
                    </div>
                    <h2>
                      Bir fikrin
                      <br />
                      <em>her platforma uygun hâli.</em>
                    </h2>
                    <p>
                      ChatGPT ile metninizi her platformun diline, kitlesine ve
                      formatına göre yeniden hazırlayın.
                    </p>
                    <ol>
                      <li>
                        <span>1</span>
                        <div>
                          <strong>Talimatı oluşturun</strong>
                          <small>Şirketinizin dili otomatik eklensin.</small>
                        </div>
                      </li>
                      <li>
                        <span>2</span>
                        <div>
                          <strong>ChatGPT’ye yapıştırın</strong>
                          <small>Kendi hesabınızla yanıt alın.</small>
                        </div>
                      </li>
                      <li>
                        <span>3</span>
                        <div>
                          <strong>Sonucu buraya aktarın</strong>
                          <small>Her metni ayrı ayrı düzenleyin.</small>
                        </div>
                      </li>
                    </ol>
                    <button
                      className="assistant-button"
                      disabled={!canPrepare}
                      onClick={generatePrompt}
                    >
                      {busy === "prompt" ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}{" "}
                      ChatGPT talimatı oluştur <ArrowUpRight size={17} />
                    </button>
                    <button
                      className="import-button"
                      disabled={!company || !selected.length || isBusy}
                      onClick={() => setImportDialog(true)}
                    >
                      <Clipboard size={15} /> Yanıtı içe aktar
                    </button>
                    <div className="assistant-note">
                      <span /> API anahtarı gerekmez · Manuel aktarım
                    </div>
                  </section>
                  <section className="tip-card">
                    <span className="tip-icon">
                      <CircleHelp size={19} />
                    </span>
                    <div>
                      <strong>Küçük bir içerik ipucu</strong>
                      <p>
                        Her platformda aynı metni kullanmak yerine aynı fikri
                        farklı biçimlerde anlatın. Önce fayda, sonra çağrı.
                      </p>
                    </div>
                  </section>
                  <section className="publishing-note">
                    <Link2 size={18} />
                    <div>
                      <strong>Yayınlamaya giden bir adım</strong>
                      <p>
                        Bu sürüm içerik hazırlama içindir. Hesaplara otomatik
                        gönderim henüz bağlı değil.
                      </p>
                      <button onClick={() => setPage("connections")}>
                        Hesapları aç <ArrowRight size={13} />
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
              <section className="card results-card">
                <div className="card-heading">
                  <div>
                    <div className="section-title">
                      <span className="title-icon">
                        <CheckCheck size={19} />
                      </span>
                      <h2>Platforma özel içerikler</h2>
                    </div>
                    <p>
                      Metinleri son kez gözden geçirin, kendi dokunuşunuzu
                      ekleyin.
                    </p>
                  </div>
                  {posts.length > 0 && (
                    <span className="source-pill">
                      {source === "chatgpt-import"
                        ? "ChatGPT’den aktarıldı"
                        : source === "local-ai"
                          ? "Yerel AI ile hazırlandı"
                          : source === "cloudflare-ai"
                            ? "Cloudflare AI ile hazırlandı"
                            : source === "rules"
                              ? "Temel şablon"
                              : "Kaydedilmiş içerik"}
                    </span>
                  )}
                </div>
                {stale && (
                  <div className="inline-warning">
                    <CircleAlert size={17} />
                    <span>
                      Kaynak metin, şirket bilgisi, görsel veya platform seçimi
                      değişti. Hazırlanmış metinleri gözden geçirin; gerekirse
                      yeniden oluşturun.
                    </span>
                  </div>
                )}
                {!posts.length ? (
                  <div className="empty-results">
                    <div className="stacked-icons">
                      <span>
                        <Instagram size={23} />
                      </span>
                      <span>
                        <FileText size={24} />
                      </span>
                      <span>
                        <Linkedin size={23} />
                      </span>
                    </div>
                    <strong>Her platform için doğru kelimeler.</strong>
                    <p>
                      Kaynak içeriğinizi yazıp temel metinleri hazırlayın
                      <br />
                      veya ChatGPT yanıtını içe aktarın.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="result-tabs"
                      role="tablist"
                      aria-label="Platform içerikleri"
                    >
                      {posts.map((post) => (
                        <button
                          role="tab"
                          id={`tab-${post.platform}`}
                          aria-controls="platform-editor"
                          aria-selected={activePlatform === post.platform}
                          key={post.platform}
                          className={
                            activePlatform === post.platform ? "active" : ""
                          }
                          onClick={() => setActivePlatform(post.platform)}
                        >
                          <PlatformIcon id={post.platform} size={16} />
                          {platforms.find((p) => p.id === post.platform)?.name}
                        </button>
                      ))}
                    </div>
                    {activePost && activeConfig ? (
                      <div
                        className="result-layout"
                        id="platform-editor"
                        role="tabpanel"
                        aria-labelledby={`tab-${activePlatform}`}
                      >
                        <div className="post-editor">
                          <div className="editor-label">
                            <strong>{activeConfig.name} metni</strong>
                            <button
                              className="text-button"
                              disabled={isBusy}
                              onClick={() =>
                                void run("copy", () =>
                                  copy(fullCaption(activePost)),
                                )
                              }
                            >
                              <Copy size={14} /> Kopyala
                            </button>
                          </div>
                          {activeConfig.titleLimit && (
                            <div className="field">
                              <label htmlFor="post-title">
                                Başlık{" "}
                                <span className="muted">
                                  ({activeConfig.titleLimit} karakter)
                                </span>
                              </label>
                              <input
                                id="post-title"
                                disabled={isBusy}
                                value={activePost.title}
                                maxLength={500}
                                onChange={(e) =>
                                  editPost("title", e.target.value)
                                }
                              />
                            </div>
                          )}
                          <label
                            className="visually-hidden"
                            htmlFor="post-caption"
                          >
                            Platform gönderi metni
                          </label>
                          <textarea
                            id="post-caption"
                            value={activePost.caption}
                            maxLength={70000}
                            disabled={isBusy}
                            onChange={(e) =>
                              editPost("caption", e.target.value)
                            }
                          />
                          <div
                            className={`character-count ${count(fullCaption(activePost)) > activeConfig.limit ? "over-limit" : ""}`}
                          >
                            {count(fullCaption(activePost)).toLocaleString(
                              "tr-TR",
                            )}{" "}
                            / {activeConfig.limit.toLocaleString("tr-TR")}{" "}
                            karakter{" "}
                            <span>
                              · Etiketler dahil
                              {activePlatform === "x" ? " · Yaklaşık" : ""}
                            </span>
                          </div>
                          <div className="field">
                            <label htmlFor="post-tags">
                              Etiketler{" "}
                              <span className="muted">Boşlukla ayırın</span>
                            </label>
                            <input
                              id="post-tags"
                              key={`${activePlatform}-${postRevision}`}
                              disabled={isBusy}
                              defaultValue={activePost.hashtags.join(" ")}
                              placeholder="#marka #yenilik"
                              onChange={(e) => {
                                const value = e.target.value;
                                setPosts((items) =>
                                  items.map((post) =>
                                    post.platform === activePlatform
                                      ? {
                                          ...post,
                                          hashtags: value
                                            .split(/\s/)
                                            .filter(Boolean),
                                        }
                                      : post,
                                  ),
                                );
                                setDirty(true);
                              }}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="post-alt">
                              Görsel açıklaması{" "}
                              <span className="muted">
                                Erişilebilirlik için
                              </span>
                            </label>
                            <input
                              id="post-alt"
                              disabled={isBusy}
                              value={activePost.alt}
                              maxLength={2000}
                              placeholder="Görselde ne olduğunu kısaca anlatın"
                              onChange={(e) => editPost("alt", e.target.value)}
                            />
                          </div>
                          <div className="editor-hint">
                            <CircleHelp size={15} />
                            <p>
                              {activeConfig.hint}
                              {activeConfig.needsVideo && (
                                <strong>
                                  {activePlatform === "youtube"
                                    ? " YouTube için ayrıca video dosyası gerekir."
                                    : " TikTok için uygun video veya fotoğraf akışı gerekir."}
                                </strong>
                              )}
                              {["instagram", "pinterest"].includes(
                                activePlatform,
                              ) &&
                                !media && (
                                  <strong>
                                    {" "}
                                    Bu içerik için görsel ekleyin.
                                  </strong>
                                )}
                            </p>
                          </div>
                        </div>
                        <div className="preview-column">
                          <div className="preview-heading">
                            <span>GÖRSEL ÖNİZLEMESİ</span>
                            <span>
                              {activeConfig.width} × {activeConfig.height}
                            </span>
                          </div>
                          {media ? (
                            <div className="preview-image-wrap">
                              <img
                                src={mediaPath(
                                  media.id,
                                  activePlatform,
                                  mediaFit,
                                )}
                                alt={
                                  activePost.alt ||
                                  `${activeConfig.name} için boyutlandırılmış görsel`
                                }
                                style={{
                                  aspectRatio: `${activeConfig.width}/${activeConfig.height}`,
                                }}
                              />
                            </div>
                          ) : (
                            <div className="preview-placeholder">
                              <ImagePlus size={30} />
                              <p>
                                Görsel eklediğinizde
                                <br />
                                burada önizlenecek.
                              </p>
                              <span>{activeConfig.format}</span>
                            </div>
                          )}
                          <div className="preview-controls">
                            <label htmlFor="media-fit">Boyutlandırma</label>
                            <select
                              id="media-fit"
                              value={mediaFit}
                              disabled={!media || isBusy}
                              onChange={(e) => {
                                setMediaFit(
                                  e.target.value as "contain" | "cover",
                                );
                                setDirty(true);
                              }}
                            >
                              <option value="contain">
                                Sığdır · Beyaz dolgu
                              </option>
                              <option value="cover">
                                Doldur · Ortadan kırp
                              </option>
                            </select>
                          </div>
                          {media && (
                            <a
                              className="secondary download-image"
                              href={`${mediaPath(media.id, activePlatform, mediaFit)}&download=1`}
                              download
                            >
                              <ArrowDownToLine size={15} /> Görseli indir
                            </a>
                          )}
                          <small className="preview-note">
                            Merkezden kırpma içeriği kesebilir. İndirmeden önce
                            görseli kontrol edin.
                          </small>
                        </div>
                      </div>
                    ) : (
                      <p className="inline-warning">
                        Görüntülemek için bir platform sekmesi seçin.
                      </p>
                    )}
                  </>
                )}
                <div className="save-bar">
                  <div>
                    <span className={dirty ? "unsaved-dot" : "saved-dot"} />
                    <span>
                      {dirty
                        ? "Kaydedilmemiş değişiklikler"
                        : draftId
                          ? "Taslak kaydedildi"
                          : "Otomatik yayın yapılmaz"}
                    </span>
                  </div>
                  <div>
                    <button
                      className="secondary"
                      disabled={!company || !posts.length || isBusy}
                      onClick={exportDraft}
                    >
                      <Download size={16} /> Metinleri indir
                    </button>
                    <button
                      className="primary"
                      disabled={!company || !draftName.trim() || isBusy}
                      onClick={save}
                    >
                      {busy === "save" ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Save size={16} />
                      )}{" "}
                      Taslağı kaydet
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : page === "companies" ? (
            <>
              <div className="section-toolbar">
                <span>{companies.length} şirket profili</span>
                <button
                  className="primary"
                  disabled={isBusy || user.role !== "admin"}
                  onClick={() => setCompanyDialog("new")}
                >
                  <Plus size={17} /> Şirket ekle
                </button>
              </div>
              <div className="company-cards">
                {companies.map((item) => (
                  <section className="card company-card" key={item.id}>
                    <div className="company-card-top">
                      <span
                        className="large-avatar"
                        style={{ background: item.color }}
                      >
                        {item.name.slice(0, 1).toLocaleUpperCase("tr")}
                      </span>
                      {companyId === item.id && (
                        <span className="active-badge">Aktif şirket</span>
                      )}
                    </div>
                    <h2>{item.name}</h2>
                    <span className="muted">
                      {item.handle || "Hesap adı eklenmedi"}
                    </span>
                    <p>
                      {item.audience ||
                        "Hedef kitlenizi ekleyerek daha isabetli içerik talimatları oluşturun."}
                    </p>
                    <div className="tone-pill">
                      {item.tone || "Anlatım dili eklenmedi"}
                    </div>
                    <div className="company-actions">
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => setCompanyDialog(item)}
                      >
                        <Settings2 size={15} /> Düzenle
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`${item.name} şirketini sil`}
                        disabled={isBusy}
                        onClick={() =>
                          setConfirm({
                            title: `${item.name} silinsin mi?`,
                            text: "Bu şirketin tüm taslakları, görselleri ve kayıtlı sosyal hesap oturumları kalıcı olarak silinir. Bu işlem geri alınamaz.",
                            action: () =>
                              void run("delete-company", async () => {
                                await api(`/api/companies/${item.id}`, {
                                  method: "DELETE",
                                });
                                const remaining = companies.filter(
                                  (c) => c.id !== item.id,
                                );
                                setCompanies(remaining);
                                if (item.id === companyId) {
                                  reset();
                                  setCompanyId(remaining[0]?.id ?? "");
                                }
                                setNotice({
                                  text: "Şirket ve bu şirkete ait kayıtlar silindi.",
                                });
                              }),
                          })
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </section>
                ))}
                <button
                  className="add-company-card"
                  onClick={() => setCompanyDialog("new")}
                >
                  <span>
                    <Plus size={26} />
                  </span>
                  <strong>Yeni bir şirket ekleyin</strong>
                  <small>Her marka için ayrı bir çalışma alanı</small>
                </button>
              </div>
            </>
          ) : page === "drafts" ? (
            <>
              <div className="section-toolbar">
                <span>
                  {company?.name} · {drafts.length} kayıtlı taslak
                </span>
                <button
                  className="primary"
                  disabled={isBusy}
                  onClick={() =>
                    guard(() => {
                      reset();
                      setPage("studio");
                    })
                  }
                >
                  <Plus size={17} /> Yeni gönderi
                </button>
              </div>
              {!drafts.length ? (
                <section className="card empty-page">
                  <Layers3 size={40} />
                  <h2>Fikirlerinize burada yer var.</h2>
                  <p>
                    Kaydettiğiniz taslaklar seçili şirket altında listelenir.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setPage("studio")}
                  >
                    İçerik stüdyosuna git <ArrowRight size={16} />
                  </button>
                </section>
              ) : (
                <div className="draft-list">
                  {drafts.map((draft) => (
                    <article key={draft.id} className="card draft-card">
                      <div className="draft-thumb">
                        {draft.mediaId ? (
                          <img src={mediaPath(draft.mediaId)} alt="" />
                        ) : (
                          <FileText size={25} />
                        )}
                      </div>
                      <div className="draft-details">
                        <h2>{draft.name}</h2>
                        <p>{draft.text || "Kaynak metin eklenmedi."}</p>
                        <div>
                          <span>{compactDate(draft.updatedAt)}</span>
                          <span className="draft-platforms">
                            {draft.selected.map((id) => (
                              <span
                                key={id}
                                title={platforms.find((p) => p.id === id)?.name}
                                style={{ color: platformColors[id] }}
                              >
                                <PlatformIcon id={id} size={14} />
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => openDraft(draft)}
                      >
                        Düzenle <ArrowUpRight size={15} />
                      </button>
                      <button
                        className="icon-button danger"
                        disabled={isBusy}
                        aria-label={`${draft.name} taslağını sil`}
                        onClick={() =>
                          setConfirm({
                            title: "Taslak silinsin mi?",
                            text: `“${draft.name}” kaydı kalıcı olarak silinir.`,
                            action: () => {
                              if (draft.id === draftId && dirty) {
                                setNotice({
                                  text: "Önce açık taslağın değişikliklerini kaydedin veya yeni gönderiye geçin.",
                                  error: true,
                                });
                                return;
                              }
                              void run("delete-draft", async () => {
                                await api(`/api/drafts/${draft.id}`, {
                                  method: "DELETE",
                                });
                                setDrafts((list) =>
                                  list.filter((d) => d.id !== draft.id),
                                );
                                if (draft.id === draftId) reset();
                                setNotice({ text: "Taslak silindi." });
                              });
                            },
                          })
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : page === "research" && company ? (
            <ResearchWorkspace key={company.id} company={company} user={user} />
          ) : page === "publications" && company ? (
            <PublicationWorkspace
              key={company.id}
              company={company}
              user={user}
              drafts={drafts}
            />
          ) : page === "settings" ? (
            <WorkspaceSettings
              user={user}
              companies={companies}
              company={company}
            />
          ) : page === "ai" && company ? (
            <SocialAI
              key={company.id}
              company={company}
              user={user}
              platforms={platforms}
              cloud={cloud}
              localAvailable={companyComputer}
              initialText={text}
              initialMedia={media}
              onApply={applyAI}
            />
          ) : (
            <>
              <SocialAccounts
                company={company}
                platforms={platforms}
                user={user}
                enabled={socialBrowser}
                computerEnabled={companyComputer}
                posts={posts}
                icon={(id) => <PlatformIcon id={id} size={24} />}
              />
            </>
          )}
          <footer className="page-footer">
            <span>
              sosyalstudio <span>·</span> Markanızın her yerdeki sesi.
            </span>
            <span>İçerikler siz onaylamadan hiçbir yere gönderilmez.</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div
          className={`toast ${notice.error ? "toast-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? <CircleAlert size={20} /> : <Check size={20} />}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label="Bildirimi kapat"
            onClick={() => setNotice(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {companyDialog && (
        <CompanyForm
          company={companyDialog === "new" ? undefined : companyDialog}
          busy={isBusy}
          onClose={() => {
            if (!isBusy) setCompanyDialog(null);
          }}
          onSave={(input) =>
            void run("company", async () => {
              const editing = companyDialog !== "new";
              const result = await api<Company>(
                editing
                  ? `/api/companies/${companyDialog.id}`
                  : "/api/companies",
                {
                  method: editing ? "PUT" : "POST",
                  body: JSON.stringify(input),
                },
              );
              setCompanies((list) =>
                editing
                  ? list.map((item) => (item.id === result.id ? result : item))
                  : [...list, result],
              );
              if (!companyId) {
                setCompanyId(result.id);
                setPage("studio");
              }
              if (result.id === companyId && posts.length) setStale(true);
              setCompanyDialog(null);
              setNotice({
                text: editing
                  ? "Şirket profili güncellendi."
                  : "Şirket eklendi. Aktif şirket menüsünden geçiş yapabilirsiniz.",
              });
            })
          }
        />
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="modal-description">{confirm.text}</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirm(null)}>
              Vazgeç
            </button>
            <button
              className="primary"
              onClick={() => {
                const action = confirm.action;
                setConfirm(null);
                action();
              }}
            >
              Devam et
            </button>
          </div>
        </Modal>
      )}
      {prompt !== null && (
        <Modal
          title="ChatGPT talimatınız hazır"
          wide
          onClose={() => setPrompt(null)}
        >
          <p className="modal-description">
            Talimatı kopyalayıp kendi ChatGPT sohbetinize yapıştırın. Görsel
            gerekiyorsa ChatGPT’ye ayrıca yükleyin. Yanıtı JSON olarak alın ve
            panele aktarın.
          </p>
          <textarea
            className="prompt-area"
            aria-label="ChatGPT talimatı"
            value={prompt}
            readOnly
          />
          <div className="modal-actions prompt-actions">
            <a
              className="secondary"
              href="https://chatgpt.com/"
              target="_blank"
              rel="noreferrer"
            >
              ChatGPT’yi aç <ExternalLink size={15} />
            </a>
            <button
              className="primary"
              disabled={isBusy}
              onClick={() => void run("copy", () => copy(prompt))}
            >
              <Copy size={16} /> Talimatı kopyala
            </button>
          </div>
          <button
            className="text-button import-next"
            onClick={() => {
              setPrompt(null);
              setImportDialog(true);
            }}
          >
            Yanıtı aldım, içe aktaracağım <ArrowRight size={15} />
          </button>
        </Modal>
      )}
      {importDialog && (
        <Modal
          title="ChatGPT yanıtını içe aktar"
          wide
          onClose={() => {
            if (!isBusy) setImportDialog(false);
          }}
        >
          <p className="modal-description">
            ChatGPT’nin ürettiği JSON yanıtını tamamıyla yapıştırın.{" "}
            {selected.length} seçili platformun tamamı gerekli. Mevcut platform
            düzenlemeleri bu yanıtla değiştirilir.
          </p>
          <textarea
            className="prompt-area"
            aria-label="ChatGPT JSON yanıtı"
            placeholder={
              '{"posts":[{"platform":"instagram","title":"","caption":"Gönderi metni","hashtags":["#marka"],"alt":""}]}'
            }
            value={importText}
            disabled={isBusy}
            maxLength={200000}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={isBusy}
              onClick={() => setImportDialog(false)}
            >
              Vazgeç
            </button>
            <button
              className="primary"
              disabled={!importText.trim() || isBusy}
              onClick={importResult}
            >
              {busy === "import" ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <ArrowDownToLine size={16} />
              )}{" "}
              Kontrol et ve aktar
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Sosyal Studio nasıl kullanılır?"
          wide
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              Şirketlerin sosyal medya içeriklerini birbirine karıştırmadan,
              Türkçe bir panelde hazırlayın.
            </p>
            <ol>
              <li>
                <strong>Şirketinizi ekleyin.</strong> Marka adı, hedef kitle,
                anlatım dili ve anahtar kelimeler ChatGPT talimatına eklenir.
              </li>
              <li>
                <strong>Kaynak metin ve görsel ekleyin.</strong> Paylaşılacak
                bilgileri yazıp hedef platformları seçin.
              </li>
              <li>
                <strong>Metinleri hazırlayın.</strong> Temel şablon kaynak
                metninizi korur ve etiketleri ekler; yapay zekâ ile yeniden
                yazmaz. Özgün uyarlama için talimatı ChatGPT’de çalıştırıp JSON
                sonucunu içe aktarın.
              </li>
              <li>
                <strong>Önizleyin ve kaydedin.</strong> Başlık, metin, etiketler
                ve görsel açıklamasını düzenleyin. Görselleri platform
                boyutunda, metinleri JSON olarak indirin.
              </li>
            </ol>
            <div className="help-note">
              <ShieldCheck size={19} />
              <p>
                {cloud
                  ? `Taslaklar Cloudflare D1, görseller ${mediaStorage === "d1" ? "Cloudflare D1" : "Cloudflare R2"} üzerinde saklanır. Kullanıcı adı ve şifreyle giriş yapılır; hesapları yönetici oluşturur. Yetkili kullanıcılar aynı şirket ve taslak alanını kullanır; şirket bazında kullanıcı yetkileri henüz yoktur. Görseller tarayıcıda hazırlanıp Cloudflare'e yüklenir.${mediaStorage === "r2" ? " Görsel depolama sınırı 10 GB; aylık işlem sınırları 1 milyon Class A ve 10 milyon Class B’dir." : ""}`
                  : "Taslaklar ve görseller bu ortamın yerel diskinde saklanır. Önemli içeriklerinizi ortam silinmeden önce dışa aktarın."}{" "}
                Sosyal hesap girişi, bulut tarayıcısı etkinse Hesap bağlantıları
                ekranındadır. Toplu otomatik yayınlama henüz yoktur. ChatGPT
                oturumunuza erişilmez.
              </p>
            </div>
            <p className="muted">
              Karakter sınırları düzenleme yardımcısıdır. Özellikle X’in
              ağırlıklı sayımı ve platformların güncel kuralları gerçek yayın
              aşamasında ayrıca doğrulanmalıdır.
            </p>
          </div>
          <div className="modal-actions">
            <button className="primary" onClick={() => setHelp(false)}>
              Anladım <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CompanyForm({
  company,
  busy,
  onClose,
  onSave,
}: {
  company?: Company;
  busy: boolean;
  onClose: () => void;
  onSave: (data: CompanyInput) => void;
}) {
  const [form, setForm] = useState<CompanyInput>(
    company
      ? {
          ...company,
          regional: {
            languages: "Türkçe",
            timezone: "Asia/Famagusta",
            ...company.regional,
          },
        }
      : {
          ...blankCompany,
          regional: { languages: "Türkçe", timezone: "Asia/Famagusta" },
        },
  );
  function field<K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) {
    setForm((before) => ({ ...before, [key]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ ...form, name: form.name.trim() });
  }
  return (
    <Modal
      title={company ? "Şirket profilini düzenle" : "Yeni şirket ekle"}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <p className="modal-description">
          Bu bilgiler, şirketinizin içerik dilini oluşturur. Hesap şifresi veya
          erişim anahtarı girmeyin.
        </p>
        <fieldset disabled={busy} className="company-form">
          <div className="form-two">
            <div className="field">
              <label htmlFor="company-name">
                Şirket adı <span className="required">*</span>
              </label>
              <input
                id="company-name"
                value={form.name}
                maxLength={80}
                required
                placeholder="Örn. Atlas Tasarım"
                onChange={(e) => field("name", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="company-handle">Marka kullanıcı adı</label>
              <input
                id="company-handle"
                value={form.handle}
                maxLength={60}
                placeholder="@atlas.tasarim"
                onChange={(e) => field("handle", e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="company-website">Web sitesi</label>
            <input
              id="company-website"
              type="url"
              value={form.website}
              maxLength={250}
              placeholder="https://ornek.com"
              onChange={(e) => field("website", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="company-tone">Anlatım dili</label>
            <input
              id="company-tone"
              value={form.tone}
              maxLength={300}
              placeholder="Samimi, ilham veren ve sade"
              onChange={(e) => field("tone", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="company-audience">Hedef kitle</label>
            <textarea
              id="company-audience"
              value={form.audience}
              maxLength={500}
              placeholder="Kime sesleniyorsunuz? İlgi alanları ve ihtiyaçları neler?"
              onChange={(e) => field("audience", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="company-keywords">
              Anahtar kelimeler <span className="muted">Virgülle ayırın</span>
            </label>
            <input
              id="company-keywords"
              value={form.keywords}
              maxLength={500}
              placeholder="tasarım, sürdürülebilirlik, dekorasyon"
              onChange={(e) => field("keywords", e.target.value)}
            />
          </div>
          <div className="color-field">
            <span>KKTC uzman profili</span>
          </div>
          {Object.entries(regionalLabels).map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={`regional-${key}`}>{label}</label>
              <textarea
                id={`regional-${key}`}
                maxLength={
                  key === "languages"
                    ? 100
                    : key === "currency" || key === "hours"
                      ? 200
                      : ["delivery", "contact", "restrictions"].includes(key)
                        ? 400
                        : 300
                }
                value={
                  form.regional?.[
                    key as keyof NonNullable<CompanyInput["regional"]>
                  ] || ""
                }
                onChange={(e) =>
                  field("regional", { ...form.regional, [key]: e.target.value })
                }
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="regional-timezone">
              İçerik takvimi saat dilimi
            </label>
            <select
              id="regional-timezone"
              value={form.regional?.timezone || "Asia/Famagusta"}
              onChange={(e) =>
                field("regional", {
                  ...form.regional,
                  timezone: e.target.value,
                })
              }
            >
              <option value="Asia/Famagusta">KKTC — Asia/Famagusta</option>
              <option value="Europe/Istanbul">Türkiye — Europe/Istanbul</option>
            </select>
          </div>
          <div className="color-field">
            <label htmlFor="company-color">Marka rengi</label>
            <input
              id="company-color"
              type="color"
              value={form.color}
              onChange={(e) => field("color", e.target.value)}
            />
            <span>{form.color}</span>
          </div>
        </fieldset>
        <div className="modal-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Vazgeç
          </button>
          <button
            className="primary"
            type="submit"
            disabled={busy || !form.name.trim()}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            {company ? "Değişiklikleri kaydet" : "Şirketi oluştur"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
