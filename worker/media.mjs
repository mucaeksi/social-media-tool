import { platforms } from "../server/platforms.mjs";

export const mediaTargets = [
  { key: "original", width: null, height: null },
  ...platforms.flatMap((p) =>
    ["contain", "cover"].map((fit) => ({
      key: `${p.id}_${fit}`,
      width: p.width,
      height: p.height,
    })),
  ),
];

function fail(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

// Validate JPEG framing and dimensions without running a native codec in a Worker.
// The browser creates metadata-free JPEGs and both fitted/cropped variants.
export function jpegDimensions(bytes) {
  if (
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes.at(-2) !== 0xff ||
    bytes.at(-1) !== 0xd9
  )
    fail("Geçerli bir JPEG dosyası gerekli.");
  let offset = 2,
    width = 0,
    height = 0;
  while (offset < bytes.length - 2) {
    if (bytes[offset] !== 0xff) fail("JPEG başlığı okunamadı.");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda) break;
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      continue;
    if (offset + 2 > bytes.length) fail("Eksik JPEG başlığı.");
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length)
      fail("Hatalı JPEG bölüm uzunluğu.");
    if (marker === 0xe1)
      fail("Görsel üstverisi temizlenmeli. Görseli panelden yeniden yükleyin.");
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) fail("Eksik JPEG boyut bilgisi.");
      height = bytes[offset + 3] * 256 + bytes[offset + 4];
      width = bytes[offset + 5] * 256 + bytes[offset + 6];
    }
    offset += length;
  }
  if (!width || !height || width * height > 40_000_000)
    fail("Görsel boyutları geçersiz veya 40 megapiksel sınırı aşıldı.");
  return { width, height };
}

export async function parseMediaForm(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16 * 1024 * 1024)
    throw Object.assign(new Error("Görsel paketi 16 MB sınırını aşıyor."), {
      status: 413,
    });
  const form = await request.formData();
  if ([...form.keys()].length !== mediaTargets.length)
    fail("Görsel paketi eksik. Panelden yeniden yükleyin.");
  const images = [];
  let total = 0,
    original;
  for (const target of mediaTargets) {
    const file = form.get(target.key);
    if (!file || typeof file === "string" || file.type !== "image/jpeg")
      fail("Görsel paketi JPEG biçiminde olmalı.");
    total += file.size;
    if (file.size > 4 * 1024 * 1024 || total > 16 * 1024 * 1024)
      throw Object.assign(new Error("Görsel paketi boyut sınırını aşıyor."), {
        status: 413,
      });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = jpegDimensions(bytes);
    if (
      target.width &&
      (size.width !== target.width || size.height !== target.height)
    )
      fail(`${target.key}: görsel hedef boyutları eşleşmiyor.`);
    if (target.key === "original") {
      if (size.width > 2560 || size.height > 2560)
        fail("Kaynak görselin uzun kenarı en fazla 2560 piksel olmalı.");
      original = size;
    }
    images.push({ key: target.key, bytes });
  }
  return { images, ...original };
}

export const objectKey = (companyId, mediaId, target) =>
  `companies/${companyId}/${mediaId}/${target}.jpg`;
export async function removeCompanyObjects(bucket, companyId) {
  let cursor;
  do {
    const page = await bucket.list({
      prefix: `companies/${companyId}/`,
      cursor,
    });
    if (page.objects.length)
      await bucket.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
