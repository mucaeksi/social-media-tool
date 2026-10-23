const state = document.querySelector("#status"),
  container = document.querySelector("#requests");
let busy = false;
async function call(message) {
  const value = await browser.runtime.sendMessage(message);
  if (!value?.ok)
    throw new Error(value?.error || "Eklenti bağlantısı kurulamadı.");
  return value;
}
async function act(message) {
  if (busy) return;
  busy = true;
  for (const b of document.querySelectorAll("button")) b.disabled = true;
  try {
    await call(message);
    await refresh();
  } catch (e) {
    state.textContent = e.message;
  } finally {
    busy = false;
    for (const b of document.querySelectorAll("button")) b.disabled = false;
  }
}
function node(tag, text, root) {
  const el = document.createElement(tag);
  el.textContent = text;
  root.append(el);
  return el;
}
async function refresh() {
  const data = await call({ action: "popup-state" });
  container.replaceChildren();
  state.textContent = data.requests.length
    ? "Bekleyen isteği inceleyin."
    : `${data.count} panel bağlantısı etkin. Yeni bağlantıyı panelde AI asistanı → Ana Firefox bölümünden başlatın.`;
  for (const r of data.requests) {
    const section = node("section", "", container);
    node("strong", r.target.companyName, section);
    node(
      "p",
      "Yalnız panelin bulunduğu Firefox penceresindeki tüm sekmeleri listeleme ve aralarında geçiş izni verilir. Başka pencereler kullanılmaz.",
      section,
    );
    if (r.target.profileUrl) {
      node("p", `${r.target.platform} · Hedef: ${r.target.label}`, section);
      const link = node("a", r.target.profileUrl, section);
      link.href = r.target.profileUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    let tabs, identity, identityId;
    if (r.action === "connect") {
      node("label", "Kullanılacak açık sekme", section);
      tabs = node("select", "", section);
      for (const t of r.choices) {
        const o = node(
          "option",
          `${t.pinned ? "📌 " : ""}${t.title} · ${t.url}`,
          tabs,
        );
        o.value = String(t.id);
      }
      if (!r.choices.length)
        node(
          "p",
          "İlgili sosyal ağı normal Firefox'ta açıp İstekleri yenile düğmesine basın.",
          section,
        );
      node("label", "Hedef şirket sayfasının ekrandaki tam adı", section);
      identity = node("input", "", section);
      identity.value = r.target.companyName;
      identity.maxLength = 100;
      if (r.target.platform.startsWith("ads-")) {
        node("label", "Reklam panelinde görünen hesap kimliği", section);
        identityId = node("input", "", section);
        identityId.maxLength = 50;
        node(
          "p",
          "Hesap adını ve kimliğini reklam panelinden kontrol edin. Bütçe, yayın ve ödeme bu bağlantıdan yürütülmez.",
          section,
        );
      }
      if (!r.target.platform.startsWith("ads-"))
        node(
          "p",
          "Kişisel profilinizi seçmeyin. Facebook'ta şirket profiline geçin; LinkedIn'de şirket sayfasının yönetici görünümünü açın.",
          section,
        );
    } else if (r.action === "publish-batch") {
      node(
        "p",
        "Aşağıdaki gönderiler, belirtilen hesap ve sayfalarda otomatik YAYINLANACAK. Panel ve hesap sekmeleri aynı pencerede açık kalmalı. Reklam veya ödeme işlemi yapılmaz.",
        section,
      );
      for (const entry of r.entries) {
        node(
          "strong",
          `${entry.target.platform} · ${entry.target.identityLabel}`,
          section,
        );
        const link = node("a", entry.target.profileUrl, section);
        link.href = entry.target.profileUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        node(
          "p",
          `${entry.job.snapshot.media.length} fotoğraf · ${new Date(entry.job.scheduled_at).toLocaleString("tr-TR", { timeZone: entry.job.timezone })}`,
          section,
        );
        node("pre", entry.job.snapshot.text, section);
      }
      node(
        "p",
        "Sonucu belirsiz gönderi yeniden gönderilmez. Form veya hesap eşleşmiyorsa o hedef durdurulur.",
        section,
      );
    } else if (r.action === "prepare") {
      node(
        "p",
        "Bu metin yalnız doğrulanan şirket hedefinin boş gönderi alanına yerleştirilecek. Son paylaşımı Firefox'ta siz yaparsınız.",
        section,
      );
      if (r.target.identityId)
        node(
          "p",
          `Reklam hesabı: ${r.target.identityLabel} · ${r.target.identityId}`,
          section,
        );
      node("pre", r.text, section);
    }
    const approve = node(
      "button",
      r.action === "connect-window"
        ? "Bu Firefox penceresini bağla"
        : r.action === "connect"
          ? "Bu sekmeyi bağla"
          : r.action === "publish-batch"
            ? "Bu hesaplarda otomatik yayını onayla"
            : "Metni taslağa yerleştir",
      section,
    );
    approve.disabled = r.action === "connect" && !r.choices.length;
    approve.onclick = () =>
      void act({
        action: "approve",
        id: r.id,
        ...(tabs
          ? {
              tabId: Number(tabs.value),
              identityLabel: identity.value,
              ...(identityId ? { identityId: identityId.value } : {}),
            }
          : {}),
      });
    const reject = node("button", "Reddet", section);
    reject.onclick = () => void act({ action: "reject", id: r.id });
  }
}
document.querySelector("#refresh").onclick = () =>
  void refresh().catch((e) => {
    state.textContent = e.message;
  });
document.querySelector("#revoke").onclick = () =>
  void act({ action: "revoke" });
void refresh().catch((e) => {
  state.textContent = e.message;
});
