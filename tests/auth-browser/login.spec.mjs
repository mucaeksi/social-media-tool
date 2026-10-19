import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const username = "yonetici@example.test",
  password = "Tarayici.Deneme.2026!",
  origin = "http://127.0.0.1:8788";
test("Türkçe giriş: hatalı şifre, güvenli oturum, yenileme, şirket kaydı ve çıkış", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tekrar merhaba." }),
  ).toBeVisible();
  expect((await page.request.get("/api/companies")).status()).toBe(401);
  await page.screenshot({
    path: "test-results/giris-masaustu.png",
    fullPage: true,
  });
  await page.getByLabel("Kullanıcı adı veya e-posta").fill(username);
  await page.getByLabel("Şifre", { exact: true }).fill("yanlis-sifre");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Kullanıcı adı veya şifre hatalı.",
  );
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Şifreyi göster", exact: true })
    .click();
  await expect(page.getByLabel("Şifre", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "studio_session",
  );
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "studio_session",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
  await page.getByRole("button", { name: "Şirketler", exact: false }).click();
  await page.getByRole("button", { name: "Şirket ekle", exact: true }).click();
  await page.getByLabel("Şirket adı").fill("Şifreli oturum denemesi");
  await page
    .getByRole("button", { name: "Şirketi oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Aktif şirket" }),
  ).toContainText("Şifreli oturum denemesi");
  await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .selectOption({ label: "Şifreli oturum denemesi" });
  const companyId = await page
    .getByRole("combobox", { name: "Aktif şirket" })
    .inputValue();
  expect(
    (
      await page.request.delete(`/api/companies/${companyId}`, {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(204);
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(
    page.getByRole("button", { name: "Giriş yap", exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.get("/api/companies", {
        headers: { Cookie: `studio_session=${cookie.value}` },
      })
    ).status(),
  ).toBe(401);
});
test("Mobil giriş ve yönetici yetkisi: editör oluşturulur, yönetici API'sine erişemez", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Giriş yap", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/giris-mobil.png",
    fullPage: true,
  });
  const login = await page.request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: { username, password },
  });
  expect(login.status()).toBe(200);
  const name = `editor-${randomUUID()}`;
  const created = await page.request.post("/api/admin/users", {
    headers: { Origin: origin },
    data: {
      username: name,
      email: `${name}@example.test`,
      name: "Deneme editörü",
      role: "editor",
      password,
    },
  });
  expect(created.status()).toBe(201);
  await page.request.post("/api/auth/logout", { headers: { Origin: origin } });
  await page.getByLabel("Kullanıcı adı veya e-posta").fill(name);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
  expect((await page.request.get("/api/admin/users")).status()).toBe(403);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
