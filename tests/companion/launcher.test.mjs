import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { extractRelease } from "../../companion/release.mjs";

const manifest = JSON.parse(await readFile("dist/indir/sosyal-studio-bilgisayar.json"));
const files = extractRelease(
  await readFile("dist/indir/sosyal-studio-bilgisayar.zip"),
  manifest.version,
);
const launchers = ["Kur-ve-Baslat.cmd", "Baslat.cmd"];

test("Windows ZIP başlatıcıları BOM olmadan yalnız CRLF satır sonları içerir", () => {
  for (const name of launchers) {
    const bytes = files.get(`companion/${name}`);
    assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
    const text = bytes.toString("utf8");
    assert.ok(text.startsWith("@echo off\r\n"), name);
    assert.doesNotMatch(text.replaceAll("\r\n", ""), /[\r\n]/, name);
  }
});

for (const name of launchers) {
  for (const nodeInstalled of [false, true]) {
    test(`Windows cmd: ${name}, Node.js ${nodeInstalled ? "kurulu" : "eksik"}`, {
      skip: process.platform !== "win32",
      timeout: 20_000,
    }, async (t) => {
      const root = await mkdtemp(join(tmpdir(), "sosyal-launcher-"));
      t.after(() => rm(root, { recursive: true, force: true }));
      const directory = join(root, "Türkçe kurulum klasörü");
      await mkdir(directory);
      await writeFile(join(directory, name), files.get(`companion/${name}`));
      // Execute the packaged batch in real cmd.exe, without pairing or opening accounts.
      await writeFile(join(directory, "launch.mjs"), `
        console.log("STUDIO_LAUNCH_OK " + process.argv.slice(2).join(" "));
        console.log("STUDIO_ROOT=" + JSON.stringify(process.env.STUDIO_DATA_DIR));
        process.exitCode = 7;
      `);
      const env = { ...process.env };
      env.STUDIO_DATA_DIR = join(root, "unrelated-directory");
      for (const key of Object.keys(env)) if (/^path$/i.test(key)) delete env[key];
      const system32 = join(process.env.SystemRoot, "System32");
      env.PATH = nodeInstalled ? `${dirname(process.execPath)};${system32}` : system32;
      const result = await new Promise((resolve, reject) => {
        const child = spawn(join(system32, "cmd.exe"), ["/d", "/c", `${name} --launcher-fixture`], {
          cwd: directory,
          env,
          timeout: 15_000,
        });
        const output = [];
        child.stdout.on("data", (chunk) => output.push(chunk));
        child.stderr.on("data", (chunk) => output.push(chunk));
        child.once("error", reject);
        child.once("close", (code) => resolve({ code, output: Buffer.concat(output).toString("utf8") }));
        child.stdin.end("\r\n");
      });
      assert.doesNotMatch(result.output, /is not recognized/i);
      assert.equal(result.code, nodeInstalled ? 7 : 1, result.output);
      if (nodeInstalled) {
        assert.match(result.output, /STUDIO_LAUNCH_OK --launcher-fixture/);
        const rootLine = result.output.match(/STUDIO_ROOT=(.+)/);
        assert.equal(resolve(JSON.parse(rootLine[1])), resolve(directory));
      } else {
        assert.match(result.output, /Node\.js 24 veya üzeri LTS gerekli/);
        assert.doesNotMatch(result.output, /STUDIO_LAUNCH_OK/);
      }
    });
  }
}
