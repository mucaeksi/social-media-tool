import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const migration = (name) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
const seed = migration("0009_wood_mood.sql");
function database() {
  const db = new DatabaseSync(":memory:");
  for (const name of [
    "0001_studio.sql",
    "0005_social_accounts.sql",
    "0008_social_profiles.sql",
  ])
    db.exec(migration(name));
  return db;
}

test("Wood Mood'un dokuz bağlantısı bir şirkete eklenir ve yeniden uygulama kopya üretmez", () => {
  const db = database();
  try {
    db.exec(seed);
    db.exec(seed);
    const companies = db.prepare("SELECT id,data FROM companies").all();
    assert.equal(companies.length, 1);
    assert.equal(
      JSON.parse(companies[0].data).website,
      "https://woodmoodmobilya.com/tr",
    );
    const accounts = db.prepare("SELECT * FROM social_accounts").all();
    assert.equal(accounts.length, 9);
    assert.equal(new Set(accounts.map((a) => a.platform)).size, 9);
    assert.ok(
      accounts.every(
        (a) => a.company_id === companies[0].id && !a.encrypted_cookies,
      ),
    );
    assert.equal(
      accounts.find((a) => a.platform === "linkedin").profile_url,
      "https://www.linkedin.com/company/145273536",
    );
    assert.equal(
      accounts.find((a) => a.platform === "tumblr").profile_url,
      "https://www.tumblr.com/mobilyawoodmood",
    );
  } finally {
    db.close();
  }
});

test("Var olan Wood Mood hesabının kimliği ve şifreli oturumu korunur, başka şirket değişmez", () => {
  const db = database();
  try {
    db.prepare("INSERT INTO companies VALUES(?,?,?)").run(
      "wood",
      JSON.stringify({ name: "Wood Mood", website: "", tone: "Özel ton" }),
      "2026-01-01",
    );
    db.prepare("INSERT INTO companies VALUES(?,?,?)").run(
      "metal",
      JSON.stringify({ name: "Metalüx" }),
      "2026-01-01",
    );
    const insert = db.prepare(
      "INSERT INTO social_accounts(id,company_id,platform,label,encrypted_cookies,created_at) VALUES(?,?,?,?,?,?)",
    );
    insert.run(
      "old",
      "wood",
      "instagram",
      "Kendi etiketim",
      "encrypted-fixture",
      "2026-01-01",
    );
    insert.run(
      "other",
      "metal",
      "instagram",
      "Diğer firma",
      "other-encrypted-fixture",
      "2026-01-01",
    );
    db.exec(seed);
    db.exec(seed);
    assert.equal(db.prepare("SELECT count(*) AS n FROM companies").get().n, 2);
    const old = db
      .prepare("SELECT * FROM social_accounts WHERE id='old'")
      .get();
    assert.equal(old.profile_url, "https://www.instagram.com/mobilyawoodmood");
    assert.equal(old.encrypted_cookies, "encrypted-fixture");
    assert.equal(old.label, "Kendi etiketim");
    assert.equal(
      JSON.parse(
        db.prepare("SELECT data FROM companies WHERE id='wood'").get().data,
      ).tone,
      "Özel ton",
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM social_accounts WHERE company_id='wood'",
        )
        .get().n,
      9,
    );
    assert.equal(
      db
        .prepare("SELECT profile_url FROM social_accounts WHERE id='other'")
        .get().profile_url,
      "",
    );
  } finally {
    db.close();
  }
});

test("Wood Mood hazırlığı var olan 25 hesap sınırını aşmaz", () => {
  const db = database();
  try {
    db.prepare("INSERT INTO companies VALUES(?,?,?)").run(
      "wood",
      JSON.stringify({ name: "Wood Mood Mobilya" }),
      "2026-01-01",
    );
    const insert = db.prepare(
      "INSERT INTO social_accounts(id,company_id,platform,label,profile_url,created_at) VALUES(?,'wood','x',?,?,?)",
    );
    for (let i = 0; i < 23; i++)
      insert.run(
        `account-${i}`,
        `Sayfa ${i}`,
        `https://x.com/fixture${i}`,
        "2026-01-01",
      );
    db.exec(seed);
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM social_accounts WHERE company_id='wood'",
        )
        .get().n,
      25,
    );
  } finally {
    db.close();
  }
});
