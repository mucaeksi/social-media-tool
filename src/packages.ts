import { createZip } from "../shared/zip.mjs";
import type { Draft } from "./types.ts";
export function downloadBytes(
  bytes: Uint8Array | string,
  name: string,
  type = "application/zip",
) {
  const data = typeof bytes === "string" ? bytes : new Uint8Array(bytes).buffer;
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function downloadDraftPackage(draft: Draft) {
  const entries: { name: string; bytes: Uint8Array | string }[] = [
    { name: "taslak.json", bytes: JSON.stringify(draft, null, 2) },
    {
      name: "OKU.txt",
      bytes:
        "İçerik hazırlık paketidir. Metin, alt açıklaması ve görselleri platformda inceleyin. Bu indirme paylaşım yapmaz.",
    },
  ];
  let bytes = 0,
    part = 1;
  const flush = () => {
    if (!entries.length) return;
    downloadBytes(
      createZip(entries),
      `sosyal-studio-${draft.id}-${part++}.zip`,
    );
    entries.length = 0;
    bytes = 0;
  };
  for (const post of draft.posts) {
    entries.push({
      name: `${post.platform}/metin.txt`,
      bytes: [
        post.title,
        post.caption,
        post.hashtags.join(" "),
        "Görsel açıklaması: " + post.alt,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const assets = draft.gallery?.length
      ? draft.gallery
      : [
          {
            mediaId: draft.platformMedia?.[post.platform] || draft.mediaId,
            alt: post.alt,
          },
        ];
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (!asset.mediaId) continue;
      const fit = draft.platformFits?.[post.platform] || draft.mediaFit;
      const r = await fetch(
        `/api/media/${asset.mediaId}/${post.platform}.jpg?fit=${fit}`,
      );
      if (!r.ok)
        throw new Error(
          "Paket görseli indirilemedi. Önceki parçalar korunur; yeniden deneyin.",
        );
      const image = new Uint8Array(await r.arrayBuffer());
      if (bytes + image.length > 12 * 1024 * 1024) flush();
      entries.push(
        { name: `${post.platform}/${i + 1}.jpg`, bytes: image },
        { name: `${post.platform}/${i + 1}-aciklama.txt`, bytes: asset.alt },
      );
      bytes += image.length;
    }
  }
  flush();
}
