import { useEffect, useState } from "react";
import type { Company, Media, Platform } from "./types.ts";
import { api } from "./api.ts";
import { prepareCloudMedia } from "./prepareMedia.ts";
import { createZip, readZip } from "../shared/zip.mjs";
import { downloadBytes } from "./packages.ts";
type Resource = { group: string; id: string };
type Index = {
  format: 2;
  exportId: string;
  company: Company;
  resources: Resource[];
  [key: string]: unknown;
};
const json = (data: unknown) => ({
  method: "POST",
  body: JSON.stringify(data),
});
const sha = async (bytes: Uint8Array) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
export function BackupManager({
  company,
  cloud,
}: {
  company: Company;
  cloud: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [restores, setRestores] = useState<
      {
        id: string;
        companyId: string;
        exportId: string;
        completed: number;
        total: number;
        finished: boolean;
      }[]
    >([]),
    [archives, setArchives] = useState<
      { id: string; kind: string; data: unknown }[]
    >([]);
  const refresh = async () => {
    setRestores(await api<typeof restores>("/api/content/restore"));
    setArchives(
      await api<typeof archives>(
        `/api/content/archives?companyId=${company.id}`,
      ),
    );
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [company.id]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function backup() {
    const index = await api<Index>(
      `/api/content/backup/index?companyId=${company.id}`,
    );
    let entries: { name: string; bytes: Uint8Array }[] = [],
      checksums: Record<string, string> = {},
      bytes = 0,
      part = 1;
    const flush = () => {
      if (!entries.length && part > 1) return;
      const payload = [
        { name: "manifest.json", bytes: encode(index) },
        {
          name: "part.json",
          bytes: encode({ exportId: index.exportId, part }),
        },
        { name: "checksums.json", bytes: encode(checksums) },
        ...entries,
      ];
      downloadBytes(
        createZip(payload),
        `sosyal-studio-yedek-${index.exportId}-${part++}.zip`,
      );
      entries = [];
      checksums = {};
      bytes = 0;
    };
    for (let i = 0; i < index.resources.length; i++) {
      const resource = index.resources[i];
      setMessage(
        `Yedek hazırlanıyor: ${i + 1}/${index.resources.length}. İndirmeler bittiğinde bütün ZIP parçalarını birlikte saklayın.`,
      );
      let content: Uint8Array, name: string;
      if (resource.group === "media") {
        const r = await fetch(`/api/content/media/${resource.id}/file`);
        if (!r.ok)
          throw new Error(
            "Yedek görseli okunamadı. Yedek eksik; yeniden başlatın.",
          );
        content = new Uint8Array(await r.arrayBuffer());
        name = `resources/${i}.jpg`;
      } else {
        const r = await api<unknown>(
          `/api/content/backup/part?${new URLSearchParams({ companyId: company.id, ...resource })}`,
        );
        content = encode(r);
        name = `resources/${i}.json`;
      }
      if (content.length > 8 * 1024 * 1024)
        throw new Error("Tek yedek kaydı 8 MB sınırını aşıyor.");
      if (bytes + content.length > 12 * 1024 * 1024) flush();
      checksums[name] = await sha(content);
      entries.push({ name, bytes: content });
      bytes += content.length;
    }
    flush();
    setMessage(
      `Yedek hazır: ${part - 1} ZIP parçası. Tarayıcı çoklu indirme izni istediyse izin verin ve bütün parçaların indiğini kontrol edin.`,
    );
  }
  async function restore(files: File[]) {
    if (!files.length) return;
    let index: Index | null = null;
    const locations = new Map<string, File>();
    let indexText = "";
    for (let f = 0; f < files.length; f++) {
      setMessage(
        `Yedek bütünlüğü kontrol ediliyor: ${f + 1}/${files.length} parça.`,
      );
      const entries = readZip(new Uint8Array(await files[f].arrayBuffer())),
        manifest = entries.find((e) => e.name === "manifest.json");
      if (!manifest) throw new Error("Yedek manifesti bulunamadı.");
      const text = new TextDecoder().decode(manifest.bytes),
        parsed = JSON.parse(text) as Index;
      if (
        parsed.format !== 2 ||
        !Array.isArray(parsed.resources) ||
        parsed.resources.length > 4000
      )
        throw new Error("Yedek biçimi geçersiz.");
      if (indexText && text !== indexText)
        throw new Error("Farklı yedeklere ait ZIP parçaları seçildi.");
      indexText = text;
      index = parsed;
      const checksums = JSON.parse(
        new TextDecoder().decode(
          entries.find((e) => e.name === "checksums.json")?.bytes ||
            new Uint8Array(),
        ),
      );
      for (const e of entries.filter((e) => e.name.startsWith("resources/"))) {
        if (
          !/^resources\/\d+\.(jpg|json)$/.test(e.name) ||
          locations.has(e.name)
        )
          throw new Error("Yedekte tekrar veya geçersiz dosya var.");
        if (checksums[e.name] !== (await sha(e.bytes)))
          throw new Error("Yedek dosyasının SHA-256 özeti uyuşmuyor.");
        locations.set(e.name, files[f]);
      }
    }
    if (!index) throw new Error("Yedek bulunamadı.");
    const descriptors = index.resources;
    for (let i = 0; i < descriptors.length; i++)
      if (
        !locations.has(
          `resources/${i}.${descriptors[i].group === "media" ? "jpg" : "json"}`,
        )
      )
        throw new Error(
          `Yedek eksik: ${i + 1}. kaynak bulunamadı. Bütün ZIP parçalarını seçin.`,
        );
    const fresh = await api<typeof restores>("/api/content/restore");
    const previous = fresh.find(
        (r) => r.exportId === index!.exportId && !r.finished,
      ),
      job =
        previous ||
        (await api<{ id: string; companyId: string }>(
          "/api/content/restore/start",
          json(index),
        ));
    const status = await api<{ completed: string[] }>(
      `/api/content/restore/${job.id}`,
    );
    const done = new Set(status.completed);
    const health = await api<{ database: string }>("/api/health"),
      isCloud = health.database === "d1";
    const platforms = await api<Platform[]>("/api/platforms");
    let cachedFile: File | undefined,
      cached: { name: string; bytes: Uint8Array }[] = [];
    async function get(name: string) {
      const file = locations.get(name)!;
      if (file !== cachedFile) {
        cached = readZip(new Uint8Array(await file.arrayBuffer()));
        cachedFile = file;
      }
      return cached.find((e) => e.name === name)!.bytes;
    }
    const order = [...descriptors.keys()].sort((a, b) => {
      const rank = (r: Resource) =>
        r.group === "media"
          ? 0
          : r.group === "record"
            ? 1
            : r.group === "draft"
              ? 2
              : 3;
      return rank(descriptors[a]) - rank(descriptors[b]);
    });
    for (let n = 0; n < order.length; n++) {
      const i = order[n],
        resource = descriptors[i];
      if (done.has(`${resource.group}:${resource.id}`)) continue;
      setMessage(
        `Yeni şirket kopyasına geri yükleniyor: ${n + 1}/${descriptors.length}. Kesilirse aynı parçaları seçerek devam edebilirsiniz.`,
      );
      if (resource.group === "media") {
        const raw = await get(`resources/${i}.jpg`),
          file = new File([new Uint8Array(raw).buffer], "yedek.jpg", {
            type: "image/jpeg",
          }),
          payload = isCloud ? await prepareCloudMedia(file, platforms) : file;
        const image = await api<Media>(
          `/api/media?companyId=${job.companyId}`,
          {
            method: "POST",
            headers: isCloud ? {} : { "Content-Type": "image/jpeg" },
            body: payload,
          },
        );
        await api(
          `/api/content/restore/${job.id}/part`,
          json({ resource, mediaId: image.id }),
        );
      } else {
        const packet = JSON.parse(
          new TextDecoder().decode(await get(`resources/${i}.json`)),
        );
        await api(`/api/content/restore/${job.id}/part`, json(packet));
      }
    }
    const result = await api<{ note: string; companyId: string }>(
      `/api/content/restore/${job.id}/finish`,
      json({}),
    );
    setMessage(
      result.note +
        ` Yeni şirket kimliği: ${result.companyId}. Şirket listesini yenileyerek açın.`,
    );
  }
  return (
    <section className="backup-manager">
      <p>
        Görseller, taslaklar, kampanyalar, ürünler ve çalışma kayıtları en fazla
        yaklaşık 12 MB içerikli ZIP parçalarına ayrılır. Kaynaklar ve eski yayın
        geçmişi saklanır. Geri yükleme yeni şirket kopyası oluşturur; eski
        paylaşım işleri yeniden yürütülmez.
      </p>
      <p>
        Şifreler, sosyal oturumlar, Firefox profilleri, cihaz anahtarları ve
        model dosyaları içerik yedeğine dahil değildir.
      </p>
      <button
        className="primary"
        disabled={busy}
        onClick={() => void run(backup)}
      >
        Tam içerik yedeğini indir
      </button>
      <label className="field">
        Yedeğin bütün ZIP parçalarını seç
        <input
          type="file"
          multiple
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            void run(() => restore(files));
          }}
        />
      </label>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {restores
        .filter((r) => !r.finished)
        .map((r) => (
          <article key={r.id}>
            <p>
              Yarım geri yükleme: {r.completed}/{r.total}. Aynı yedek
              parçalarını seçerek devam edin.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Yarım geri yükleme kaydı kapatılsın mı? Oluşturulan şirket kopyası silinmez.",
                  )
                )
                  void run(async () => {
                    await api(`/api/content/restore/${r.id}`, {
                      method: "DELETE",
                    });
                  });
              }}
            >
              Geri yükleme kaydını kapat
            </button>
          </article>
        ))}
      <details>
        <summary>Yedekten gelen inceleme arşivleri ({archives.length})</summary>
        <p>
          Bu kayıtlar geçmiş kanıtıdır; AI hafızasına veya yayın kuyruğuna
          otomatik eklenmez.
        </p>
        {archives.map((a) => (
          <details key={a.id}>
            <summary>{a.kind}</summary>
            <pre>{JSON.stringify(a.data, null, 2)}</pre>
          </details>
        ))}
      </details>
    </section>
  );
}
