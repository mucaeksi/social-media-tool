import type { Platform } from "./types.ts";

function encode(canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob> {
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
  options: { originalMaxSide?: number; originalQuality?: number } = {},
): Promise<FormData> {
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
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const ctx = canvas.getContext("2d");
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
    }
    return form;
  } finally {
    image.close();
  }
}
