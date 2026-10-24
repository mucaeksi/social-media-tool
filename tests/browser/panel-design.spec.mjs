import { test, expect } from "@playwright/test";

test("Gruplandırılmış panel, klavye gezinmesi ve mobil çekmece aynı şirket bağlamını korur", async ({ page, request }, testInfo) => {
  const company = await (await request.post("/api/companies", { data: {
    name: "Ada Atölye", tone: "Açık ve sade", audience: "KKTC", color: "#2b6c55",
  } })).json();
  try {
    const draft = await (await request.post("/api/drafts", { data: {
      companyId: company.id, name: "Yeni koleksiyon · ilk paylaşım", text: "Yeni koleksiyon için ilk paylaşım metnini hazırlıyoruz.",
      selected: ["facebook", "instagram", "linkedin"], mediaId: null, mediaFit: "contain",
      posts: [{ platform: "facebook", title: "İlk paylaşım", caption: "Yeni koleksiyon için ilk paylaşım taslağı.", hashtags: [], alt: "" }],
    } })).json();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/?company=${company.id}&page=studio&draft=${draft.id}`);
    const nav = page.getByRole("navigation", { name: "Ana menü" });
    await expect(page.getByRole("heading", { name: "İçerik stüdyosu", exact: true })).toBeVisible();
    for (const name of ["Üretim", "Planlama", "Yönetim"]) await expect(nav.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "İçerik stüdyosu", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Aktif şirket")).toHaveCount(1);
    await expect(page.getByLabel("Aktif şirket")).toHaveValue(company.id);
    await page.getByRole("link", { name: "Ana içeriğe geç", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#workspace-content")).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("panel-masaustu.png"), animations: "disabled" });
    await nav.getByRole("button", { name: /^Taslaklar/ }).click();
    await expect(page).toHaveURL(/page=drafts/);
    await expect(page.getByRole("heading", { name: draft.name, exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("panel-taslaklar.png"), animations: "disabled" });
    await page.goBack();
    await expect(page.getByRole("heading", { name: "İçerik stüdyosu", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Menüyü aç", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: "Responsive yerleşim yatay taşma üretmemeli" }).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("panel-mobil.png"), animations: "disabled" });
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await expect(page.getByRole("button", { name: "Gezinmeyi kapat", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("#workspace-navigation").contains(document.activeElement))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("panel-mobil-menu.png"), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Menüyü aç", exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await nav.getByRole("button", { name: "Şirketler", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Şirketler", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menüyü aç", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("Aktif şirket")).toHaveValue(company.id);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: "Responsive yerleşim yatay taşma üretmemeli" }).toBe(true);
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await page.getByRole("button", { name: "Kullanım rehberi", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))).toBe(true);
    await page.getByRole("dialog").getByRole("button", { name: "Pencereyi kapat", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    await expect(page.getByRole("button", { name: "Gezinmeyi kapat", exact: true })).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator(".mobile-menu")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".main-shell")).not.toHaveAttribute("inert", "");
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  } finally { await request.delete(`/api/companies/${company.id}`); }
});
