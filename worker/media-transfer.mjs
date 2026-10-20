import { createD1Media } from "./d1-media.mjs";
import { createR2Media } from "./r2-media.mjs";
import { objectKey, jpegDimensions } from "./media.mjs";
import { computerError } from "../shared/computer-protocol.mjs";
export async function transferMedia(c, account, mediaId, fit = "contain") {
  const media = await c.get("store").media(mediaId);
  if (!media || media.companyId !== account.companyId)
    throw computerError(400, "Görsel bu şirkete ait değil.");
  const bucket =
    media.storage === "d1"
      ? createD1Media(c.env.DB)
      : createR2Media(c.env.DB, c.env.MEDIA);
  const object = await bucket.get(
    objectKey(account.companyId, mediaId, `${account.platform}_${fit}`),
  );
  if (!object) throw computerError(404, "Görsel dosyası bulunamadı.");
  const reader = object.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 600000)
        throw computerError(
          413,
          "Firefox aktarımı için platform görseli en fazla 600 KB olmalı. Görseli daha küçük boyutta yeniden yükleyin.",
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const v of chunks) {
    bytes.set(v, at);
    at += v.length;
  }
  jpegDimensions(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
