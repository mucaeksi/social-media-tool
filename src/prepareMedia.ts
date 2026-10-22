import type { Platform } from "./types.ts";

function encode(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality = 0.88,
): Promise<Blob> {
  if ("convertToBlob" in canvas)
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Görsel JPEG olarak hazırlanamadı.")),
      "image/jpeg",
      quality,
    ),
  );
}

export async function prepareCloudMedia(
  file: File,
  platforms: Platform[],
  options: {
    originalMaxSide?: number;
    originalQuality?: number;
    worker?: boolean;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<FormData> {
  if (
    options.worker !== false &&
    typeof document !== "undefined" &&
    typeof Worker === "function" &&
    typeof OffscreenCanvas === "function"
  ) {
    return new Promise<FormData>((resolve, reject) => {
      const worker = new Worker(new URL("./media-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event) => {
        const m = event.data;
        if (m.type === "progress") options.onProgress?.(m.done, m.total);
        else {
          worker.terminate();
          if (m.type === "error") reject(new Error(m.message));
          else {
            const form = new FormData();
            for (const entry of m.entries)
              form.append(entry.key, entry.blob, `${entry.key}.jpg`);
            resolve(form);
          }
        }
      };
      worker.onerror = () => {
        worker.terminate();
        reject(
          new Error(
            "Görsel hazırlama işçisi başlatılamadı. Güncel tarayıcıyla yeniden deneyin.",
          ),
        );
      };
      worker.postMessage({
        file,
        platforms,
        options: {
          originalMaxSide: options.originalMaxSide,
          originalQuality: options.originalQuality,
          worker: false,
        },
      });
    });
  }
  if (typeof createImageBitmap !== "function")
    throw new Error(
      "Bu tarayıcı görsel hazırlamayı desteklemiyor. Güncel bir tarayıcı deneyin.",
    );
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Görsel okunamadı. Geçerli bir JPEG, PNG veya WebP dosyası deneyin.",
    );
  }
  try {
    if (image.width * image.height > 40_000_000)
      throw new Error("Görsel en fazla 40 megapiksel olabilir.");
    const form = new FormData();
    const scale = Math.min(
      1,
      (options.originalMaxSide ?? 2560) / Math.max(image.width, image.height),
    );
    const targets = [
      {
        key: "original",
        width: Math.max(1, Math.round(image.width * scale)),
        height: Math.max(1, Math.round(image.height * scale)),
        fit: "contain",
      },
      ...platforms.flatMap((p) =>
        ["contain", "cover"].map((fit) => ({
          key: `${p.id}_${fit}`,
          width: p.width,
          height: p.height,
          fit,
        })),
      ),
    ];
    let total = 0;
    for (const target of targets) {
      const canvas =
        typeof OffscreenCanvas === "function"
          ? new OffscreenCanvas(target.width, target.height)
          : Object.assign(document.createElement("canvas"), {
              width: target.width,
              height: target.height,
            });
      const ctx = canvas.getContext("2d") as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
      if (!ctx) throw new Error("Tarayıcı görsel hazırlamayı desteklemiyor.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const ratio =
        target.fit === "cover"
          ? Math.max(target.width / image.width, target.height / image.height)
          : Math.min(target.width / image.width, target.height / image.height);
      const width = image.width * ratio,
        height = image.height * ratio;
      ctx.drawImage(
        image,
        (target.width - width) / 2,
        (target.height - height) / 2,
        width,
        height,
      );
      const blob = await encode(
        canvas,
        target.key === "original" ? (options.originalQuality ?? 0.88) : 0.88,
      );
      canvas.width = 0;
      canvas.height = 0;
      total += blob.size;
      if (blob.size > 4 * 1024 * 1024 || total > 15 * 1024 * 1024)
        throw new Error(
          "Hazırlanan görseller çok büyük. Daha küçük bir kaynak görsel deneyin.",
        );
      form.append(target.key, blob, `${target.key}.jpg`);
      options.onProgress?.(targets.indexOf(target) + 1, targets.length);
    }
    return form;
  } finally {
    image.close();
  }
}
