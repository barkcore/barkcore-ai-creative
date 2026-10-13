import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db.ts";

const COOKIE = "bc_session";
const DAYS = 14;

export type User = { id: number; orgId: number; email: string; name: string };

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), 64);
  const want = Buffer.from(keyHex, "hex");
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// ログインの失敗が続いたら少し待たせる（総当たり対策。単一プロセス用）
const fails = new Map<string, { n: number; until: number }>();
export function tooManyFails(email: string): boolean {
  const f = fails.get(email.toLowerCase());
  return !!f && f.n >= 5 && Date.now() < f.until;
}
function noteFail(email: string) {
  const k = email.toLowerCase();
  const f = fails.get(k);
  const n = f && Date.now() < f.until ? f.n + 1 : 1;
  fails.set(k, { n, until: Date.now() + 15 * 60_000 });
}

export async function login(email: string, password: string): Promise<boolean> {
  if (tooManyFails(email)) return false;
  const row = db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email.trim().toLowerCase()) as
    { id: number; password_hash: string } | undefined;
  // ユーザーがいなくても同じ時間をかけて、存在の有無を悟らせない
  const ok = row ? verifyPassword(password, row.password_hash) : (verifyPassword(password, "scrypt$00$00"), false);
  if (!ok) { noteFail(email); return false; }
  fails.delete(email.toLowerCase());
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 86400_000).toISOString();
  db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha(token), row!.id, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400,
  });
  return true;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(t));
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const row = db().prepare(
    `SELECT u.id, u.org_id, u.email, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
  ).get(sha(t)) as { id: number; org_id: number; email: string; name: string; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { id: row.id, orgId: row.org_id, email: row.email, name: row.name };
}
