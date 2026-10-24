import { ClaimReview } from "./ClaimReview.tsx";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { prepareCloudMedia } from "./prepareMedia.ts";
import type { FormEvent } from "react";
import { Modal } from "./Modal.tsx";
import { api, ApiError } from "./api.ts";
import {
  rememberDraft,
  recoverDraft,
  forgetDraft,
  workspacePreference,
} from "./draftRecovery.ts";
import { DraftLibrary } from "./DraftLibrary.tsx";
import { StudioDetails } from "./StudioDetails.tsx";
const AdvertisingWorkspace = lazy(() =>
  import("./AdvertisingWorkspace.tsx").then((m) => ({
    default: m.AdvertisingWorkspace,
  })),
);
const ContentWorkspace = lazy(() =>
  import("./ContentWorkspace.tsx").then((m) => ({
    default: m.ContentWorkspace,
  })),
);
import { downloadDraftPackage } from "./packages.ts";
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
    | "ads"
    | "content"
  >(() => {
    const p = new URL(location.href).searchParams.get("page");
    return [
      "studio",
      "drafts",
      "companies",
      "connections",
      "ai",
      "research",
      "publications",
      "settings",
      "content",
      "ads",
    ].includes(p || "")
      ? (p as "studio")
      : "studio";
  });
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
  const navigationRef = useRef<HTMLElement | null>(null);
  const menuCloseRef = useRef<HTMLButtonElement | null>(null);
  const menuOpenRef = useRef<HTMLButtonElement | null>(null);
  const helpAfterMenu = useRef(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    action: () => void;
  } | null>(null);
  const [aiProposal, setAIProposal] = useState<AITurn | null>(null);
  const [compact, setCompact] = useState(false);
  const routeReady = useRef(false);
  const [routeLoading, setRouteLoading] = useState(true);
  const initialSearch = useRef(new URLSearchParams(location.search));
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  revisionRef.current = revision;
  const [details, setDetails] = useState<Partial<DraftInput>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [conflictDraft, setConflictDraft] = useState<Draft | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const recoveredCompany = useRef("");
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
  const [mediaProgress, setMediaProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const company = companies.find((item) => item.id === companyId);
  const editorEpoch = useRef(0);
  const renderedEpoch = editorEpoch.current;
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
      const requested =
        new URL(location.href).searchParams.get("company") ||
        workspacePreference(user.id);
      setCompanyId(
        list.find((c) => c.id === requested)?.id || list[0]?.id || "",
      );
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
    const changed = (event: Event) => {
      const value = (
        event as CustomEvent<{
          companyId: string;
          platforms: PlatformId[];
          compact: boolean;
        }>
      ).detail;
      if (!value) return;
      setCompanies((rows) =>
        rows.map((c) =>
          c.id === value.companyId
            ? { ...c, preferredPlatforms: value.platforms }
            : c,
        ),
      );
      if (currentCompanyId.current === value.companyId) {
        setCompact(value.compact);
        if (
          !currentPayload.current.text &&
          !currentPayload.current.posts.length
        )
          setSelected(value.platforms);
      }
    };
    window.addEventListener("studio:preferences-changed", changed);
    return () =>
      window.removeEventListener("studio:preferences-changed", changed);
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
    api<{ items: Draft[] }>(
      `/api/content/drafts?companyId=${companyId}&limit=100`,
    )
      .then((result) => {
        if (valid) setDrafts(result.items);
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
  function reset(preserveRecovery = false) {
    editorEpoch.current++;
    if (companyId && !preserveRecovery) forgetDraft(user.id, companyId);
    setRevision(0);
    setDetails({});
    setSaveError("");
    setConflictDraft(null);
    setDraftId(null);
    setDraftName("Yeni gönderi");
    setText("");
    setSelected(company?.preferredPlatforms || initialPlatforms);
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
    setDetails((d) => ({
      ...d,
      review: {
        state: "draft",
        owner: d.review?.owner || "",
        comment: d.review?.comment || "",
      },
    }));
    setDirty(true);
    if (posts.length) setStale(true);
  }
  function brief() {
    return { companyId, text, selected, mediaId: media?.id ?? null };
  }
  function draftInput(): DraftInput {
    return {
      ...details,
      revision,
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
  const currentPayload = useRef<DraftInput>(draftInput());
  currentPayload.current = draftInput();
  const payloadKey = (value: DraftInput) =>
    JSON.stringify({ ...value, revision: undefined });
  async function saveCurrent(asCopy = false) {
    if (savingRef.current)
      throw new Error(
        "Kaydetme sürüyor. Tamamlandıktan sonra yeniden deneyin.",
      );
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    const input: DraftInput = {
      ...currentPayload.current,
      revision: revisionRef.current,
    };
    if (asCopy) {
      delete input.revision;
      input.name = (input.name + " — kopya").slice(0, 120);
      input.review = {
        state: "draft",
        owner: input.review?.owner || "",
        comment: "",
      };
    }
    const targetCompany = input.companyId;
    try {
      const saved = await api<Draft>(
        !asCopy && draftId ? `/api/drafts/${draftId}` : "/api/drafts",
        {
          method: !asCopy && draftId ? "PUT" : "POST",
          body: JSON.stringify(input),
        },
      );
      if (targetCompany === currentCompanyId.current) {
        setDraftId(saved.id);
        setRevision(saved.revision || 0);
        revisionRef.current = saved.revision || 0;
        if (asCopy) {
          setDraftName(saved.name);
          setDetails((current) => ({ ...current, review: saved.review }));
        }
        const unchanged =
          payloadKey(currentPayload.current) === payloadKey(input);
        setDirty(!unchanged && !asCopy);
        if (unchanged || asCopy) forgetDraft(user.id, targetCompany);
        setDrafts((list) => [saved, ...list.filter((d) => d.id !== saved.id)]);
        setConflictDraft(null);
      }
      return saved;
    } catch (e) {
      if (targetCompany === currentCompanyId.current) {
        setSaveError((e as Error).message);
        if (e instanceof ApiError && e.status === 409 && draftId) {
          const latest = await api<Draft>(`/api/drafts/${draftId}`).catch(
            () => null,
          );
          if (targetCompany === currentCompanyId.current)
            setConflictDraft(latest);
        }
      }
      throw e;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    if (!companyId) return;
    workspacePreference(user.id, companyId);
    if (dirty && !rememberDraft(user.id, draftId, currentPayload.current))
      setSaveError(
        "Bu sekmede kurtarma kaydı tutulamadı. Taslağı sunucuya kaydedin veya paketi indirin.",
      );
  }, [companyId, draftId, dirty, JSON.stringify(currentPayload.current)]);
  useEffect(() => {
    if (!dirty || !companyId || isBusy || saving || saveError || conflictDraft)
      return;
    const timer = setTimeout(() => {
      void saveCurrent().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    dirty,
    companyId,
    isBusy,
    saving,
    saveError,
    conflictDraft,
    JSON.stringify(currentPayload.current),
  ]);
  useEffect(() => {
    if (!companyId || recoveredCompany.current === companyId) return;
    recoveredCompany.current = companyId;
    const recovery = recoverDraft(user.id, companyId);
    if (recovery) {
      const d = recovery.input;
      setDraftId(recovery.draftId);
      setRevision(d.revision || 0);
      setDraftName(d.name);
      setText(d.text);
      setSelected(d.selected);
      setPosts(d.posts);
      setSourceRefs(d.sourceRefs || []);
      setMediaFit(d.mediaFit);
      setDetails(d);
      setDirty(true);
      setRecoveryMessage(
        "Bu sekmedeki kaydedilmemiş çalışma geri getirildi. Sunucudaki sürüm kontrol edilerek kaydedilecek.",
      );
      if (d.mediaId)
        void api<Media>(`/api/media/${d.mediaId}`)
          .then((image) => {
            if (
              currentCompanyId.current === companyId &&
              image.companyId === companyId
            )
              setMedia(image);
          })
          .catch(() => {
            if (currentCompanyId.current === companyId)
              setSaveError(
                "Kurtarılan görsele erişilemiyor. Görseli yeniden seçin.",
              );
          });
    } else {
      void api<{ platforms: PlatformId[]; compact: boolean }>(
        `/api/content/preferences?companyId=${companyId}`,
      )
        .then((p) => {
          if (currentCompanyId.current === companyId) {
            setCompact(p.compact);
            if (
              !currentPayload.current.text &&
              !currentPayload.current.posts.length
            )
              setSelected(p.platforms);
          }
        })
        .catch(() => {});
    }
  }, [companyId, user.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (companyId && !savingRef.current) save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
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
  function applyAI(turn: AITurn, reviewed = false) {
    if (posts.length && !reviewed) {
      setAIProposal(turn);
      return;
    }
    const choose = (action: () => void) =>
      reviewed ? action() : guard(action);
    choose(
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
          setDetails({
            originalPosts: turn.posts,
            productRefs: turn.trace?.products || [],
            generation: {
              turnId: turn.id,
              model: turn.model || "",
              expertVersion: turn.expertVersion || "",
              sourceVersion: turn.trace?.sourceVersion || "",
              ...(turn.trace?.durationMs !== undefined
                ? { durationMs: turn.trace.durationMs }
                : {}),
            },
          });
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
    setDetails((d) => ({
      ...d,
      review: {
        state: "draft",
        owner: d.review?.owner || "",
        comment: d.review?.comment || "",
      },
    }));
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
      setMediaProgress({ done: 0, total: 19 });
      const payload = cloud
        ? await prepareCloudMedia(file, platforms, {
            onProgress: (done, total) => setMediaProgress({ done, total }),
          })
        : file;
      const uploaded = await api<Media>(`/api/media?companyId=${companyId}`, {
        method: "POST",
        headers: cloud ? {} : { "Content-Type": file.type },
        body: payload,
      });
      if (uploaded.companyId !== currentCompanyId.current) return;
      setMedia(uploaded);
      setMediaProgress(null);
      changed();
      setNotice({
        text: "Görsel hazır. Platform boyutları önizlemede uygulanır.",
      });
    });
    setMediaProgress(null);
  }
  async function loadDraft(draft: Draft, navigate = true) {
    const epoch = editorEpoch.current;
    const image = draft.mediaId
      ? await api<Media>(`/api/media/${draft.mediaId}`)
      : null;
    if (
      draft.companyId !== currentCompanyId.current ||
      epoch !== editorEpoch.current
    )
      return;
    editorEpoch.current++;
    setRevision(draft.revision || 0);
    setDetails(draft);
    setSaveError("");
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
    if (navigate) setPage("studio");
  }
  function openDraft(draft: Draft, skipGuard = false, navigate = true) {
    const choose = (action: () => void) =>
      skipGuard ? action() : guard(action);
    choose(() => void run("open", () => loadDraft(draft, navigate)));
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
  useEffect(() => {
    if (loading || routeReady.current) return;
    routeReady.current = true;
    const id = initialSearch.current.get("draft");
    if (companyId && id && !recoverDraft(user.id, companyId))
      void api<Draft>(`/api/drafts/${id}`)
        .then((d) => {
          if (d.companyId === currentCompanyId.current)
            return loadDraft(d, false);
          else
            setNotice({
              text: "Taslak seçili şirkete ait değil.",
              error: true,
            });
        })
        .catch((e) => setNotice({ text: e.message, error: true }))
        .finally(() => setRouteLoading(false));
    else setRouteLoading(false);
  }, [loading, companyId]);
  useEffect(() => {
    if (loading || routeLoading || !companyId || !routeReady.current) return;
    const u = new URL(location.href);
    u.searchParams.set("company", companyId);
    u.searchParams.set("page", page);
    if (draftId) u.searchParams.set("draft", draftId);
    else u.searchParams.delete("draft");
    if (u.href !== location.href) history.pushState({}, "", u);
  }, [loading, routeLoading, companyId, page, draftId]);
  useEffect(() => {
    const pop = () => {
      const u = new URL(location.href),
        id = u.searchParams.get("company"),
        target = u.searchParams.get("page") || "studio";
      if (!id || !companies.some((c) => c.id === id)) return;
      if (
        dirty &&
        !window.confirm(
          "Kaydedilmemiş çalışma bu sekmede korunuyor. Bağlantıdaki ekrana geçilsin mi?",
        )
      )
        return;
      const d = u.searchParams.get("draft");
      if (id !== companyId || !d) reset(true);
      setCompanyId(id);
      if (d) {
        setRouteLoading(true);
        void api<Draft>(`/api/drafts/${d}`)
          .then((value) => {
            if (value.companyId === id) return loadDraft(value, false);
          })
          .catch((e) => setNotice({ text: e.message, error: true }))
          .finally(() => setRouteLoading(false));
      }
      if (
        [
          "studio",
          "drafts",
          "companies",
          "connections",
          "ai",
          "research",
          "publications",
          "settings",
          "content",
          "ads",
        ].includes(target)
      )
        setPage(target as typeof page);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [companies, companyId, dirty]);
  const previewId = details.platformMedia?.[activePlatform] || media?.id;
  const previewFit = details.platformFits?.[activePlatform] || mediaFit;
  const canPrepare = Boolean(
    company && text.trim() && selected.length && !isBusy,
  );
  const navItems = [
    { id: "studio", name: "İçerik stüdyosu", icon: PenLine },
    { id: "ai", name: "AI asistanı", icon: Sparkles },
    { id: "drafts", name: "Taslaklar", icon: Layers3 },
    { id: "content", name: "İçerik planı", icon: FileText },
    { id: "ads", name: "Reklam çalışma alanı", icon: Sparkles },
    { id: "companies", name: "Şirketler", icon: Building2 },
    { id: "connections", name: "Hesap bağlantıları", icon: Link2 },
    { id: "research", name: "KKTC ve kaynaklar", icon: FileText },
    { id: "publications", name: "Yayın takvimi", icon: CheckCheck },
    { id: "settings", name: "Ekip ve ayarlar", icon: Settings2 },
  ] as const;
  const navGroups = [
    { name: "Üretim", ids: ["studio", "ai", "drafts"] },
    { name: "Planlama", ids: ["content", "publications", "ads"] },
    { name: "Yönetim", ids: ["companies", "connections", "research", "settings"] },
  ];
  const currentGroup = navGroups.find((group) => group.ids.includes(page))?.name || "Çalışma alanı";
  const pageTitles = {
    studio: "İçerik stüdyosu",
    drafts: "Taslaklar",
    content: "İçerik planı",
    ads: "KKTC reklam çalışma alanı",
    companies: "Şirketler",
    connections: "Hesap bağlantıları",
    ai: "AI asistanı",
    research: "KKTC ve kaynaklar",
    publications: "Yayın takvimi",
    settings: "Ekip ve ayarlar",
  };
  const pageDescriptions = {
    studio: "Kaynak metni ve görseli ekleyin, platformlara uyarlayın ve taslağınızı kaydedin.",
    ai: "Şirket bilgileriyle içerik üretin ve yerel Qwen çalışmalarını yönetin.",
    drafts: "Kaydedilmiş içerikleri inceleyin, düzenleyin ve yayına hazırlayın.",
    content: "Kampanyaları, ürün bilgilerini, içerik takvimini ve ölçümleri bir arada yönetin.",
    ads: "Reklam planlarını, metinlerini ve kaydedilmiş sonuçları birlikte inceleyin.",
    publications: "Hedef hesapları seçin, gönderileri onaylayın ve yayın sonuçlarını izleyin.",
    companies: "Şirket bilgilerini, hedef kitlesini ve marka dilini yönetin.",
    connections: "Şirketin sosyal hesaplarını ve aynı Firefox penceresindeki sekmelerini bağlayın.",
    research: "KKTC profilini, kaynakları ve onaylı şirket bilgilerini güncel tutun.",
    settings: "Kullanıcı yetkilerini ve çalışma alanı ayarlarını yönetin.",
  };
  useEffect(() => {
    if (!mobileMenu) {
      if (helpAfterMenu.current) { helpAfterMenu.current = false; setHelp(true); }
      return;
    }
    const previousFocus = menuOpenRef.current || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Hidden descendants may settle a frame after the drawer's own style.
    // Focus only when the close control can actually receive it.
    let focusFrame = 0;
    const focusClose = () => {
      const control = menuCloseRef.current;
      if (!control?.isConnected) return;
      if (getComputedStyle(control).visibility !== "visible") {
        focusFrame = requestAnimationFrame(focusClose);
        return;
      }
      control.focus();
    };
    focusFrame = requestAnimationFrame(focusClose);
    const closeOnDesktop = window.matchMedia("(min-width: 901px)");
    const onResize = () => { if (closeOnDesktop.matches) setMobileMenu(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobileMenu(false); }
      if (event.key !== "Tab") return;
      const controls = [...(navigationRef.current?.querySelectorAll<HTMLElement>("a[href],button:not(:disabled),select:not(:disabled),[tabindex='0']") || [])]
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    closeOnDesktop.addEventListener("change", onResize);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      closeOnDesktop.removeEventListener("change", onResize);
      if (previousFocus?.isConnected && !document.querySelector('[role="dialog"][aria-modal="true"]')) previousFocus.focus();
    };
  }, [mobileMenu]);

  if (loading || routeLoading || fatalError)
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
    <div className={`app-shell ${compact ? "compact-mode" : ""}`}>
      <a className="skip-link" href="#workspace-content" onClick={(event) => {
        event.preventDefault();
        const content = document.getElementById("workspace-content");
        content?.focus({ preventScroll: true });
        content?.scrollIntoView({ block: "start" });
      }}>Ana içeriğe geç</a>
      {company && (
        <div className="workspace-save-status" role="status">
          <strong>{company.name}</strong>
          <span>{draftName}</span>
          <span>
            {saving
              ? "Kaydediliyor…"
              : saveError
                ? "Kayıt kontrol edilmeli"
                : dirty
                  ? "Değişiklikler bu sekmede korunuyor"
                  : draftId
                    ? "Sunucu kaydı güncel"
                    : "Yeni taslak"}
          </span>
          {dirty && (
            <button
              className="secondary"
              disabled={isBusy || saving}
              onClick={save}
            >
              Kaydet · Ctrl/Cmd+S
            </button>
          )}
        </div>
      )}
      {recoveryMessage && (
        <div className="recovery-banner" role="status">
          {recoveryMessage}
          <button onClick={() => setRecoveryMessage("")}>Kapat</button>
        </div>
      )}
      {saveError && (
        <div className="recovery-banner error" role="alert">
          {saveError}
          <button
            onClick={() => {
              setSaveError("");
              save();
            }}
          >
            Yeniden kaydet
          </button>
          <button
            onClick={() =>
              void run("copy", async () => {
                await saveCurrent(true);
              })
            }
          >
            Kopya kaydet
          </button>
        </div>
      )}
      {aiProposal && (
        <Modal
          title="AI düzenlemelerini karşılaştır"
          wide
          onClose={() => setAIProposal(null)}
        >
          <p>
            Yeni platform metinlerini onayladığınızda mevcut paket değişir.
            Kaynaklar ve görsel yeni yanıttan alınır.
          </p>
          {aiProposal.posts?.map((p) => (
            <div className="form-two" key={p.platform}>
              <label className="field">
                {p.platform} · mevcut
                <textarea
                  readOnly
                  value={
                    posts.find((old) => old.platform === p.platform)?.caption ||
                    ""
                  }
                />
              </label>
              <label className="field">
                {p.platform} · yeni
                <textarea readOnly value={p.caption} />
              </label>
            </div>
          ))}
          <div className="modal-actions">
            <button className="secondary" onClick={() => setAIProposal(null)}>
              Vazgeç
            </button>
            <button
              className="primary"
              onClick={() => {
                const proposal = aiProposal;
                setAIProposal(null);
                applyAI(proposal, true);
              }}
            >
              Yeni paketi stüdyoya aktar
            </button>
          </div>
        </Modal>
      )}
      {conflictDraft && (
        <Modal
          title="Taslak sürümlerini karşılaştır"
          wide
          onClose={() => setConflictDraft(null)}
        >
          <p>
            Çalışmanız korunuyor. Güncel sürümü açabilir veya kendi çalışmanızı
            ayrı kaydedebilirsiniz.
          </p>
          <div className="form-two">
            <label className="field">
              Sizin metniniz
              <textarea readOnly value={text} />
            </label>
            <label className="field">
              Sunucudaki metin
              <textarea readOnly value={conflictDraft.text} />
            </label>
          </div>
          <details>
            <summary>Platform düzenlemelerini karşılaştır</summary>
            <pre>
              {JSON.stringify(
                { sizin: posts, sunucu: conflictDraft.posts },
                null,
                2,
              )}
            </pre>
          </details>
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => {
                const d = conflictDraft;
                setConflictDraft(null);
                setDirty(false);
                setDraftId(d.id);
                setRevision(d.revision || 0);
                setDetails(d);
                setDraftName(d.name);
                setText(d.text);
                setPosts(d.posts);
                setSelected(d.selected);
                setSourceRefs(d.sourceRefs || []);
                setMediaFit(d.mediaFit);
                setSaveError("");
                forgetDraft(user.id, companyId);
                if (d.mediaId)
                  void api<Media>(`/api/media/${d.mediaId}`).then(setMedia);
                else setMedia(null);
              }}
            >
              Sunucudaki sürümü aç
            </button>
            <button
              className="primary"
              disabled={saving}
              onClick={() =>
                void run("copy", async () => {
                  await saveCurrent(true);
                })
              }
            >
              Çalışmamı kopya kaydet
            </button>
          </div>
        </Modal>
      )}

      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Menüyü kapat"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside ref={navigationRef} id="workspace-navigation" role={mobileMenu ? "dialog" : undefined} aria-modal={mobileMenu ? true : undefined} aria-label="Çalışma alanı gezinmesi" className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-brand-row">
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("studio");
            setMobileMenu(false);
          }}
        >
          <div className="logo-mark">
            s<span>•</span>
          </div>
          <span>
            sosyal<span className="logo-light">studio</span>
          </span>
        </a>
        <button ref={menuCloseRef} className="icon-button sidebar-close" aria-label="Gezinmeyi kapat" onClick={() => setMobileMenu(false)}><X size={20} /></button>
        </div>
        <div className="workspace-chip">
          <span className="workspace-avatar">
            <Building2 size={17} />
          </span>
          <div>
            <strong>{company?.name || "Şirket seçilmedi"}</strong>
            <small>
              {companies.length} şirketin çalışma alanı
            </small>
          </div>
        </div>
        <nav aria-label="Ana menü">
          {navGroups.map((group) => <div className="nav-group" key={group.name}>
            <h2>{group.name}</h2>
            {group.ids.map((id) => navItems.find((item) => item.id === id)!)
              .filter((item) => cloud || !["research", "publications", "settings"].includes(item.id))
              .map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                aria-current={page === id ? "page" : undefined}
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
                {page === id && <ChevronRight size={15} className="nav-current-icon" aria-hidden="true" />}
              </button>
            ))}
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="assistant-promo">
            <span className="promo-icon">
              <Sparkles size={19} />
            </span>
            <strong>Platformlara özel içerik</strong>
            <p>
              {aiEnabled
                ? "Kaynak metin ve görselden şirketinize uygun taslaklar hazırlayın."
                : "Manuel ChatGPT aktarımıyla platform metinlerini hazırlayın."}
            </p>
            <button
              onClick={() => {
                setPage(aiEnabled ? "ai" : "studio");
                setMobileMenu(false);
                if (!aiEnabled) {
                  if (mobileMenu) helpAfterMenu.current = true;
                  else setHelp(true);
                }
              }}
            >
              {aiEnabled ? "Asistanı aç" : "Nasıl çalışır?"}{" "}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="sidebar-help" onClick={() => {
            if (mobileMenu) { helpAfterMenu.current = true; setMobileMenu(false); }
            else setHelp(true);
          }}>
            <CircleHelp size={18} /> Kullanım rehberi
          </button>
          <div className="local-status">
            <ShieldCheck size={14} aria-hidden="true" />{" "}
            {cloud
              ? "Veriler Cloudflare üzerinde saklanır"
              : "Veriler bu ortamda saklanır"}
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={mobileMenu || undefined}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuOpenRef}
              className="icon-button mobile-menu"
              aria-label="Menüyü aç"
              aria-expanded={mobileMenu}
              aria-controls="workspace-navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>{currentGroup}</span>
            <ChevronRight size={15} />
            <strong>{pageTitles[page]}</strong>
          </div>
          <div className="topbar-right">
            <div className="user-identity"><strong>{user.name}</strong><span>{user.role === "admin" ? "Yönetici" : "Editör"}</span></div>
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
        <main id="workspace-content" tabIndex={-1}>
          <div className="page-heading">
            <div className="page-heading-copy">
              <h1>{pageTitles[page]}</h1>
              <p>{pageDescriptions[page]}</p>
            </div>
            <div className="company-picker">
              <label htmlFor="company-select">Aktif şirket</label>
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
                    {mediaProgress && (
                      <p role="status">
                        Görsel hazırlanıyor: {mediaProgress.done}/
                        {mediaProgress.total}{" "}
                        <progress
                          value={mediaProgress.done}
                          max={mediaProgress.total}
                        />
                      </p>
                    )}
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
                        <Sparkles size={19} aria-hidden="true" />
                      </span>
                      <h2>İçerik yardımcısı</h2>
                    </div>
                    <p>
                      ChatGPT ile manuel aktarım: şirket ve platform bilgilerini
                      içeren talimatı kopyalayın, aldığınız yanıtı stüdyoya ekleyin.
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
                      <Clipboard size={13} aria-hidden="true" /> API anahtarı gerekmez · Manuel aktarım
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
              {company && (
                <StudioDetails
                  key={company.id}
                  company={company}
                  user={user}
                  platforms={platforms}
                  draftId={draftId}
                  disabled={isBusy}
                  details={details}
                  posts={posts}
                  sourceText={text}
                  media={media}
                  activePlatform={activePlatform}
                  onMedia={(m) => {
                    setMedia(m);
                    changed();
                  }}
                  onChange={(value) => {
                    if (
                      currentCompanyId.current !== company.id ||
                      editorEpoch.current !== renderedEpoch
                    )
                      return;
                    setDetails((current) => ({
                      ...current,
                      ...value,
                      ...(!value.review &&
                      ["approved", "planned"].includes(
                        current.review?.state || "",
                      )
                        ? {
                            review: {
                              state: "draft",
                              owner: current.review?.owner || "",
                              comment: current.review?.comment || "",
                            },
                          }
                        : {}),
                    }));
                    setDirty(true);
                  }}
                  onUpload={upload}
                  cloud={cloud}
                />
              )}
              {company && posts.length > 0 && (
                <ClaimReview
                  companyId={company.id}
                  sourceRefs={sourceRefs}
                  posts={posts}
                />
              )}
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
                                  previewId!,
                                  activePlatform,
                                  previewFit,
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
                              value={previewFit}
                              disabled={!media || isBusy}
                              onChange={(e) => {
                                setDetails((d) => ({
                                  ...d,
                                  platformFits: {
                                    ...d.platformFits,
                                    [activePlatform]: e.target.value as
                                      "contain" | "cover",
                                  },
                                }));
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
                              href={`${mediaPath(previewId!, activePlatform, previewFit)}&download=1`}
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
                  <button
                    className="secondary"
                    disabled={!company || saving || isBusy}
                    onClick={() =>
                      void run("package", async () => {
                        const d = await saveCurrent();
                        await downloadDraftPackage(d);
                      })
                    }
                  >
                    Metin ve görselleri ZIP indir
                  </button>
                  {aiEnabled && (
                    <button
                      className="secondary"
                      disabled={isBusy}
                      onClick={() => setPage("ai")}
                    >
                      Seçili içerikle AI asistanını aç
                    </button>
                  )}

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
                    {cloud && user.role === "admin" && (
                      <button className="primary"
                        disabled={!company || !draftName.trim() || !posts.length || isBusy || saving}
                        onClick={() => void run("publish-prepare", async () => {
                          const before = payloadKey(currentPayload.current);
                          const saved = await saveCurrent();
                          if (saved.companyId !== currentCompanyId.current) return;
                          if (before !== payloadKey(currentPayload.current))
                            throw new Error("Kaydetme sırasında içerik değişti. Güncel içeriği tekrar kaydedip yayına hazırlayın.");
                          setPage("publications");
                          setNotice({ text: "Taslak kaydedildi. Hedef hesapları seçip yayın önizlemesini oluşturun." });
                        })}>
                        Kaydet ve yayına hazırla
                      </button>
                    )}
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
          ) : page === "drafts" && company ? (
            <DraftLibrary
              company={company}
              platforms={platforms}
              user={user}
              onOpen={(d) => openDraft(d)}
              onPublish={cloud && user.role === "admin" ? (d) => guard(() => {
                void run("open", async () => {
                  const expectedEpoch = editorEpoch.current + 1;
                  await loadDraft(d, false);
                  if (d.companyId === currentCompanyId.current && editorEpoch.current === expectedEpoch)
                    setPage("publications");
                });
              }) : undefined}
              onNew={() =>
                guard(() => {
                  reset();
                  setPage("studio");
                })
              }
            />
          ) : page === "ads" && company ? (
            <Suspense
              fallback={<p role="status">Reklam çalışma alanı açılıyor…</p>}
            >
              <AdvertisingWorkspace
                key={company.id}
                company={company}
                user={user}
              />
            </Suspense>
          ) : page === "content" && company ? (
            <Suspense fallback={<p role="status">İçerik planı açılıyor…</p>}>
              <ContentWorkspace
                key={company.id}
                company={company}
                user={user}
                platforms={platforms}
                onOpen={(d) => openDraft(d)}
                onBrief={(brief) =>
                  guard(() => {
                    reset();
                    setText(brief.text);
                    setDetails(brief.details);
                    setSelected(brief.selected);
                    setDirty(true);
                    setPage("studio");
                  })
                }
              />
            </Suspense>
          ) : page === "research" && company ? (
            <ResearchWorkspace key={company.id} company={company} user={user} />
          ) : page === "publications" && company ? (
            <PublicationWorkspace
              key={company.id}
              company={company}
              user={user}
              drafts={drafts}
              initialDraftId={draftId || ""}
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
              initialSelected={selected}
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
            {confirm.title === "Kaydedilmemiş değişiklikler var" && (
              <button
                className="primary"
                disabled={saving || isBusy}
                onClick={() => {
                  const action = confirm.action;
                  void run("save-and-go", async () => {
                    await saveCurrent();
                    setConfirm(null);
                    action();
                  });
                }}
              >
                Kaydet ve devam et
              </button>
            )}
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
