const state = document.querySelector("#status"),
  container = document.querySelector("#requests");
let busy = false;
let captureGranted = false;
async function call(message) {
  const value = await browser.runtime.sendMessage(message);
  if (!value?.ok)
    throw new Error(value?.error || "Eklenti bağlantısı kurulamadı.");
  return value;
}
async function act(message, refreshAfterError = false) {
  if (busy) return;
  busy = true;
  for (const b of document.querySelectorAll("button")) b.disabled = true;
  try {
    await call(message);
    await refresh();
  } catch (e) {
    if (refreshAfterError) await refresh().catch(() => {});
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
  captureGranted = await browser.permissions.contains({ origins: ["<all_urls>"] });
  const data = await call({ action: "popup-state" });
  container.replaceChildren();
  state.textContent = data.requests.length
    ? "Bekleyen isteği inceleyin."
    : `${data.count} panel bağlantısı etkin. Yeni bağlantıyı panelde AI asistanı → Ana Firefox bölümünden başlatın.`;
  for (const r of data.requests) {
    const section = node("section", "", container);
    node("strong", r.target.companyName, section);
    if (r.error) node("p", r.error, section).setAttribute("role", "alert");
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
    let tabs, identity, identityId, workspace;
    if (r.action === "agent-start") {
      node("p", "Qwen bu görev boyunca aşağıdaki sosyal medya sekmelerini görüntüleyebilir, okuyabilir, kaydırabilir, izinli düğmelere tıklayabilir ve boş metin alanlarına yazabilir. En fazla 8 adım ve 12 dakika. Son yayın mevcut yayın kuyruğundan onaylanır.", section);
      node("pre", r.task, section);
      for (const b of r.bindings) node("p", `${b.target.platform} · ${b.target.identityLabel || b.target.label}`, section);
      node("p", "İlk kullanımda Firefox ekran görüntüsü izni ister. Görüntüler özel alanlar kapatıldıktan sonra yerel Qwen'e panel bağlantısından aktarılır; arşivlenmez.", section);
    } else if (r.action === "connect-workspace") {
      node("p", "Önerilen açık sekmeleri ve ekranda görünen şirket adlarını kontrol edip aşağıdaki ‘Seçili hesap sekmelerini birlikte bağla’ düğmesine basın. Bu bağlantı onayı paylaşım yapmaz; tamamlanınca panele dönülür.", section);
      workspace = [];
      for (const row of r.accounts) {
        const group = node("div", "", section);
        node("strong", `${row.target.label} · ${row.target.platform}`, group);
        const link = node("a", row.target.profileUrl, group);
        link.href = row.target.profileUrl; link.target = "_blank"; link.rel = "noreferrer";
        const label = node("label", "Açık hesap sekmesi", group);
        const select = node("select", "", label);
        node("option", row.choices.length ? "Bu hesabı atla / sekme seç" : "Uygun açık sekme bulunamadı", select).value = "";
        for (const t of row.choices) node("option", `${t.title} · ${t.url}`, select).value = String(t.id);
        select.value = row.suggestedTabId === null ? "" : String(row.suggestedTabId);
        const nameLabel = node("label", "Sayfanın ekranda görünen tam adı", group);
        const name = node("input", "", nameLabel);
        name.value = row.identityLabel; name.maxLength = 100;
        workspace.push({ accountId: row.target.accountId, select, name });
      }
    } else if (r.action === "connect") {
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
        : r.action === "agent-start"
          ? "Qwen'e bu sosyal medya görevini ver"
        : r.action === "connect-workspace"
          ? "Seçili hesap sekmelerini birlikte bağla"
        : r.action === "connect"
          ? "Bu sekmeyi bağla"
          : r.action === "publish-batch"
            ? "Bu hesaplarda otomatik yayını onayla"
            : "Metni taslağa yerleştir",
      section,
    );
    approve.disabled = r.action === "connect" && !r.choices.length;
    approve.onclick = () => {
      const message = {
        action: "approve",
        id: r.id,
        ...(workspace ? { selections: workspace.filter((r) => r.select.value).map((r) => ({ accountId: r.accountId, tabId: Number(r.select.value), identityLabel: r.name.value })) } : {}),
        ...(tabs
          ? {
              tabId: Number(tabs.value),
              identityLabel: identity.value,
              ...(identityId ? { identityId: identityId.value } : {}),
            }
          : {}),
      };
      if (r.action === "agent-start") {
        if (captureGranted) { void act(message); return; }
        // Called directly from the toolbar button gesture. Firefox needs this
        // optional origin grant for captureTab; the executor still enforces the
        // frozen social targets, page policy and window on every operation.
        void browser.permissions.request({ origins: ["<all_urls>"] }).then((granted) => {
          if (!granted) throw new Error("Ekran görüntüsü izni verilmedi; Firefox görevi başlamadı.");
          captureGranted = true;
          return act(message);
        }).catch((e) => { state.textContent = e.message; });
      } else void act(message, r.action === "publish-batch");
    };
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
