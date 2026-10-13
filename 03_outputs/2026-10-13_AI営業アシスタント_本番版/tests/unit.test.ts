import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parseCsv, csvToCompanies } from "../lib/csv.ts";
import { isPrivateIp, parsePublicUrl, hostKey } from "../lib/safeurl.ts";
import { htmlToText, pickLinks } from "../lib/site.ts";
import { sanitizeAnalysis } from "../lib/ai.ts";
import { hasOptOut, composeFinal } from "../lib/compose.ts";

process.env.DB_PATH = ":memory:";
process.env.BARKCORE_FAKE_AI = "1";

test("CSV: 引用符・改行・BOM・空行", () => {
  const rows = parseCsv('﻿会社名,サイト\r\n"A, 社","https://a.example"\n\n"B\n社",b.example\n');
  assert.deepEqual(rows, [["会社名", "サイト"], ["A, 社", "https://a.example"], ["B\n社", "b.example"]]);
});

test("CSV: 見出しの別名と、会社名の列が無いときのエラー", () => {
  const ok = csvToCompanies("企業名,URL,メールアドレス\nA社,https://a.example,info@a.example\n,x,y\n");
  assert.equal(ok.items.length, 1);
  assert.equal(ok.items[0].email, "info@a.example");
  assert.ok(csvToCompanies("サイト\nhttps://a.example").error);
  assert.ok(csvToCompanies("会社名\n").error);
});

test("SSRF: 社内・ローカルのアドレスを拒否", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:10.0.0.1"]) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "93.184.216.34"]) assert.equal(isPrivateIp(ip), false, ip);
  assert.equal(parsePublicUrl("http://localhost:3000"), null);
  assert.equal(parsePublicUrl("file:///etc/passwd"), null);
  assert.equal(parsePublicUrl("https://user:pw@example.com"), null);
  assert.equal(parsePublicUrl("intranet"), null);
  assert.equal(hostKey("www.Example.co.jp/about"), "example.co.jp");
});

test("HTML→文章、関連ページの選び方", () => {
  const html = `<html><head><title>テスト社</title><meta name="description" content="説明"></head><body><script>x()</script><h1>見出し</h1><p>本文&amp;続き</p>
  <a href="/company">会社概要</a><a href="/blog/1">ブログ</a><a href="https://other.example/news">外部</a><a href="/news">お知らせ</a><a href="/file.pdf">会社案内</a></body></html>`;
  const t = htmlToText(html);
  assert.equal(t.title, "テスト社");
  assert.ok(t.text.includes("本文&続き"));
  assert.ok(!t.text.includes("x()"));
  const links = pickLinks(html, new URL("https://a.example/")).map((u) => u.pathname);
  assert.deepEqual(links, ["/company", "/news"]);
});

test("AIの出力：出どころが読んだページ以外の事実は捨てる", () => {
  const pages = [{ url: "https://a.example/", title: "", text: "x" }];
  const r = sanitizeAnalysis({
    summary: "s", priority: "weird" as never, reasons: ["1", "2", "3", "4"],
    facts: [{ fact: "ok", source: "https://a.example/" }, { fact: "でっちあげ", source: "https://evil.example/" }],
  }, pages);
  assert.equal(r.priority, "low");
  assert.equal(r.reasons.length, 3);
  assert.deepEqual(r.facts.map((f) => f.fact), ["ok"]);
});

test("文面：署名の連結と配信停止の確認", () => {
  assert.equal(composeFinal(" 本文 ", " 署名 "), "本文\n\n署名");
  assert.equal(hasOptOut("こんにちは", "株式会社X"), false);
  assert.equal(hasOptOut("こんにちは", "ご連絡が不要でしたらご返信ください"), true);
});

test("保存：重複・配信停止・不正・承認の上限と二重承認", async () => {
  const repo = await import("../lib/repo.ts");
  const { db } = await import("../lib/db.ts");
  db().prepare("INSERT INTO orgs (name) VALUES ('A'), ('B')").run();
  const a = repo.addCompany(1, { name: "A社", website: "https://www.a.example/", email: "Info@A.example" });
  assert.ok(a.id);
  assert.equal(repo.addCompany(1, { name: "別名", website: "a.example" }).skipped, "duplicate");
  assert.equal(repo.addCompany(1, { name: "別名2", email: "info@a.example" }).skipped, "duplicate");
  assert.ok(repo.addCompany(2, { name: "A社", website: "a.example" }).id, "別の会社（org）なら同じサイトも登録できる");
  assert.equal(repo.addCompany(1, { name: "X", email: "bad" }).skipped, "invalid");
  assert.equal(repo.addCompany(1, { name: "X", website: "http://localhost" }).skipped, "invalid");
  repo.suppress(1, "no@z.example", "test");
  assert.equal(repo.addCompany(1, { name: "Z", email: "no@z.example" }).skipped, "suppressed");
  repo.suppress(1, "@y.example", "domain");
  assert.equal(repo.addCompany(1, { name: "Y", email: "who@y.example" }).skipped, "suppressed");

  assert.equal(repo.getCompany(2, a.id!), null, "他社のデータは見えない");
  const did = repo.saveDraft(1, a.id!, "件名", "本文");
  assert.equal(repo.approveDraft(2, 1, did), false, "他社の下書きは承認できない");
  assert.equal(repo.approveDraft(1, 1, did), true);
  assert.equal(repo.approveDraft(1, 1, did), false, "二重承認できない");
  assert.equal(repo.approvedToday(1), 1);
  assert.equal(repo.updateDraftText(1, did, "x", "y"), false, "承認後は直せない");
  repo.saveSettings(1, { dailyLimit: 999 });
  assert.equal(repo.getSettings(1).dailyLimit, 50);
});

test("処理の流れ：サイトを読む→採点→下書き（偽のAI）、対象外、サイトなし、読めない", async () => {
  const repo = await import("../lib/repo.ts");
  const { processCompany } = await import("../lib/pipeline.ts");
  process.env.BARKCORE_TEST_ALLOW_LOCAL = "1";
  const srv = http.createServer((req, res) => {
    if (req.url === "/robots.txt") { res.writeHead(404); return res.end(); }
    if (req.url === "/blocked/robots.txt") { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<html><title>店</title><body><p>${"当店は日用品を販売しています。2店舗目を開店しました。".repeat(5)}</p><a href="/company">会社概要</a></body></html>`);
  });
  await new Promise<void>((r) => srv.listen(0, "0.0.0.0", r));
  const port = (srv.address() as { port: number }).port;
  try {
    const ok = repo.addCompany(1, { name: "通常の店", website: `http://127.0.0.2:${port}/`, email: "info@shop.example" });
    await processCompany(1, ok.id!);
    const c = repo.getCompany(1, ok.id!)!;
    assert.equal(c.status, "drafted", c.error);
    assert.equal(c.priority, "high");
    assert.equal(c.facts[0].source, `http://127.0.0.2:${port}/`);
    assert.ok(repo.getDraft(1, c.id)!.body.includes("通常の店"));

    const out = repo.addCompany(1, { name: "out社", website: `http://127.0.0.3:${port}/o`, email: "o@o.example" });
    await processCompany(1, out.id!);
    assert.equal(repo.getCompany(1, out.id!)!.status, "skipped");

    const noSite = repo.addCompany(1, { name: "サイトなし", email: "n@n.example" });
    await processCompany(1, noSite.id!);
    assert.equal(repo.getCompany(1, noSite.id!)!.status, "failed");

    const noMail = repo.addCompany(1, { name: "メールなし", website: `http://127.0.0.4:${port}/m` });
    await processCompany(1, noMail.id!);
    const nm = repo.getCompany(1, noMail.id!)!;
    assert.equal(nm.status, "failed");
    assert.match(nm.error, /メールアドレス/);

    const dead = repo.addCompany(1, { name: "読めない", website: "http://127.0.0.5:1/", email: "d@d.example" });
    await processCompany(1, dead.id!);
    assert.equal(repo.getCompany(1, dead.id!)!.status, "failed");
  } finally {
    srv.close();
    delete process.env.BARKCORE_TEST_ALLOW_LOCAL;
  }
});

test("AIのキー未設定：分かる言葉で失敗し、状態に残る", async () => {
  const repo = await import("../lib/repo.ts");
  const { processCompany } = await import("../lib/pipeline.ts");
  delete process.env.BARKCORE_FAKE_AI;
  delete process.env.ANTHROPIC_API_KEY;
  process.env.BARKCORE_TEST_ALLOW_LOCAL = "1";
  const srv = http.createServer((_q, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end(`<html><body><p>${"文章です。".repeat(40)}</p></body></html>`); });
  await new Promise<void>((r) => srv.listen(0, "0.0.0.0", r));
  const port = (srv.address() as { port: number }).port;
  try {
    const r = repo.addCompany(1, { name: "キーなし", website: `http://127.0.0.6:${port}/`, email: "k@k.example" });
    await processCompany(1, r.id!);
    const c = repo.getCompany(1, r.id!)!;
    assert.equal(c.status, "failed");
    assert.match(c.error, /ANTHROPIC_API_KEY/);
  } finally { srv.close(); delete process.env.BARKCORE_TEST_ALLOW_LOCAL; process.env.BARKCORE_FAKE_AI = "1"; }
});
