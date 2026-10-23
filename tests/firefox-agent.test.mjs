import test from "node:test";
import assert from "node:assert/strict";
import { firefoxAgent, firefoxAgentInput, firefoxAgentExtensionSource } from "../shared/firefox-agent.mjs";
import { readFile } from "node:fs/promises";
test("Firefox görev politikası dokuz sosyal ağı ve reklamları sınırlar; özel, ödeme ve alan dışı sayfaları reddeder", async () => {
  for (const [platform, url] of Object.entries({ facebook: "https://www.facebook.com/kurgu", instagram: "https://www.instagram.com/kurgu/", x: "https://x.com/kurgu", threads: "https://www.threads.com/@kurgu", linkedin: "https://www.linkedin.com/company/kurgu", pinterest: "https://www.pinterest.com/kurgu", youtube: "https://www.youtube.com/@kurgu", tiktok: "https://www.tiktok.com/@kurgu", tumblr: "https://www.tumblr.com/kurgu" }))
    assert.ok(firefoxAgent.safeURL(url, platform));
  for (const url of ["http://www.facebook.com/kurgu", "https://www.facebook.com.evil.test/kurgu", "https://evil.test/", "https://www.facebook.com/messages", "https://www.facebook.com/settings", "https://www.facebook.com/checkpoint", "https://www.facebook.com/logout.php", "https://www.facebook.com/subscribe", "https://adsmanager.facebook.com/adsmanager/", "https://www.facebook.com:444/kurgu", "https://u:p@www.facebook.com/kurgu"])
    assert.equal(firefoxAgent.safeURL(url, "facebook"), null);
  assert.ok(firefoxAgent.safeURL("https://adsmanager.facebook.com/adsmanager/?act=123", "ads-meta"));
  assert.equal(firefoxAgent.safeURL("https://adsmanager.facebook.com/adsmanager/billing", "ads-meta"), null);
  assert.equal(await readFile("firefox-extension/agent-policy.js", "utf8"), firefoxAgentExtensionSource());
});
test("Qwen kararı gözlenmiş alan ve görev hesaplarıyla sınırlıdır; kod, sahte kimlik ve işlem dışı alanlar kabul edilmez", () => {
  const id = crypto.randomUUID(), accountId = crypto.randomUUID();
  const observation = { controls: [{ id, clickable: false, writable: true }] }, tabs = [{ accountId }];
  const base = { action: "type", elementId: id, accountId: "", text: "Kurgu", message: "Metni yaz." };
  assert.deepEqual(firefoxAgent.decision(base, observation, tabs), base);
  for (const invalid of [ { ...base, action: "eval" }, { ...base, elementId: "#button" }, { ...base, elementId: crypto.randomUUID() },
    { ...base, action: "click", text: "" }, { ...base, text: "", action: "done" }, { ...base, code: "alert(1)" },
    { ...base, action: "switch-tab", elementId: "", text: "", accountId: crypto.randomUUID() } ])
    assert.throws(() => firefoxAgent.decision(invalid, observation, tabs));
  for (const label of ["Paylaş", "Yayınla", "Post", "Send", "Kaydet", "Save", "Hesabı sil", "Follow", "Takip et", "Beğen", "Ödeme", "Bütçe", "Mesajlar"])
    assert.equal(firefoxAgent.clickable(label, "button"), false, label);
  for (const label of ["Gönderi oluştur", "Create post", "İleri", "Geri", "Kapat", "More", "Create", "Search"])
    assert.equal(firefoxAgent.clickable(label, "button"), true, label);
});
test("Firefox görüntü girdisi boyut, şirket, alan ve görsel biçimi denetimlerini korur", () => {
  const companyId = crypto.randomUUID(), accountId = crypto.randomUUID();
  const input = { companyId, runId: crypto.randomUUID(), task: "Sayfayı incele", target: { companyId, accountId, platform: "x", identityLabel: "Kurgu", profileUrl: "https://x.com/kurgu" },
    observation: { id: crypto.randomUUID(), url: "https://x.com/home", title: "Kurgu", text: "", controls: [] },
    image: "/9j/2Q==", tabs: [{ accountId, platform: "x", label: "Kurgu" }], history: [] };
  assert.equal(firefoxAgentInput(input).action, "browser-step");
  for (const invalid of [{ ...input, image: "file:///secret" }, { ...input, image: "/9j/" + "A".repeat(266669) }, { ...input, target: { ...input.target, companyId: crypto.randomUUID() } },
    { ...input, observation: { ...input.observation, url: "https://x.com/i/chat" } }, { ...input, tabs: [] }, { ...input, runId: "other-task" }])
    assert.throws(() => firefoxAgentInput(invalid));
});
