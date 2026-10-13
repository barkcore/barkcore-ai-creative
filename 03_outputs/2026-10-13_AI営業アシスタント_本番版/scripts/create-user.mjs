// 使い方：npm run create-user -- メールアドレス 表示名
// パスワードは画面で聞きます（履歴・ログに残しません）。
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { SCHEMA } from "../lib/schema.ts";

const [email, name] = process.argv.slice(2);
if (!email || !name) { console.error("使い方: npm run create-user -- メールアドレス 表示名"); process.exit(1); }

const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(file), { recursive: true });

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

const pw = process.env.NEW_USER_PASSWORD ?? (await ask("パスワード（10文字以上）: "));
if (pw.length < 10) { console.error("パスワードは10文字以上にしてください。"); process.exit(1); }

const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(SCHEMA);

let org = db.prepare("SELECT id FROM orgs ORDER BY id LIMIT 1").get();
if (!org) org = { id: Number(db.prepare("INSERT INTO orgs (name) VALUES (?)").run("BarkCore").lastInsertRowid) };
const salt = crypto.randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
try {
  db.prepare("INSERT INTO users (org_id, email, name, password_hash) VALUES (?,?,?,?)").run(org.id, email.trim().toLowerCase(), name, hash);
  console.log(`作成しました: ${email}`);
} catch (e) {
  console.error(String(e).includes("UNIQUE") ? "そのメールアドレスはすでにあります。" : String(e));
  process.exit(1);
}
