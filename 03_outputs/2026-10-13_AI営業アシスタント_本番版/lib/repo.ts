import { db } from "./db.ts";
import type { Analysis, Priority, ReplyCategory } from "./ai.ts";
import { hostKey } from "./safeurl.ts";

export type Settings = {
  dailyLimit: number; targetText: string; customPrompt: string; serviceText: string; signature: string;
  sendingPaused: boolean; pauseReason: string;
};
export type Company = {
  id: number; name: string; website: string; email: string; industry: string; location: string; source: string;
  status: string; priority: Priority | ""; summary: string; reasons: string[]; facts: { fact: string; source: string }[];
  error: string; createdAt: string; updatedAt: string;
};
export type Draft = { id: number; companyId: number; kind: string; subject: string; body: string; status: string };
export type Reply = { id: number; companyId: number; body: string; category: ReplyCategory | ""; nextAction: string; handled: boolean; receivedAt: string };

type Row = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "");

function toCompany(r: Row): Company {
  return {
    id: Number(r.id), name: s(r.name), website: s(r.website), email: s(r.email), industry: s(r.industry), location: s(r.location),
    source: s(r.source), status: s(r.status), priority: s(r.priority) as Company["priority"], summary: s(r.summary),
    reasons: JSON.parse(s(r.reasons) || "[]"), facts: JSON.parse(s(r.facts) || "[]"), error: s(r.error),
    createdAt: s(r.created_at), updatedAt: s(r.updated_at),
  };
}
const toDraft = (r: Row): Draft => ({ id: Number(r.id), companyId: Number(r.company_id), kind: s(r.kind), subject: s(r.subject), body: s(r.body), status: s(r.status) });
const toReply = (r: Row): Reply => ({
  id: Number(r.id), companyId: Number(r.company_id), body: s(r.body), category: s(r.category) as Reply["category"],
  nextAction: s(r.next_action), handled: !!r.handled, receivedAt: s(r.received_at),
});

// ---- 設定 -------------------------------------------------------------------
export const DEFAULT_SERVICE =
  "HP制作・業務システム・スマホアプリの開発。ITが苦手な会社の、いちばん身近な相談相手として、手作業や手戻りを減らす提案をする。";

export function getSettings(orgId: number): Settings {
  const d = db();
  d.prepare("INSERT OR IGNORE INTO settings (org_id, service_text) VALUES (?, ?)").run(orgId, DEFAULT_SERVICE);
  const r = d.prepare("SELECT * FROM settings WHERE org_id = ?").get(orgId) as Row;
  return {
    dailyLimit: Number(r.daily_limit), targetText: s(r.target_text), customPrompt: s(r.custom_prompt), serviceText: s(r.service_text),
    signature: s(r.signature), sendingPaused: !!r.sending_paused, pauseReason: s(r.pause_reason),
  };
}

export function saveSettings(orgId: number, p: Partial<Pick<Settings, "dailyLimit" | "targetText" | "customPrompt" | "serviceText" | "signature">>) {
  getSettings(orgId);
  const cur = getSettings(orgId);
  const n = { ...cur, ...p };
  db().prepare(
    "UPDATE settings SET daily_limit=?, target_text=?, custom_prompt=?, service_text=?, signature=? WHERE org_id=?",
  ).run(Math.min(Math.max(Math.trunc(n.dailyLimit) || 1, 1), 50), n.targetText, n.customPrompt, n.serviceText, n.signature, orgId);
}

export function setPaused(orgId: number, paused: boolean, reason = "") {
  db().prepare("UPDATE settings SET sending_paused=?, pause_reason=? WHERE org_id=?").run(paused ? 1 : 0, reason, orgId);
}

// ---- 会社 -------------------------------------------------------------------
export function isSuppressed(orgId: number, email: string): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return !!db().prepare("SELECT 1 FROM suppression WHERE org_id=? AND (email=? OR email=?)").get(orgId, e, "@" + domain);
}

export type NewCompany = { name: string; website?: string; email?: string; industry?: string; location?: string; source?: string };
export type AddResult = { id?: number; skipped?: "duplicate" | "suppressed" | "invalid"; reason?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function addCompany(orgId: number, c: NewCompany): AddResult {
  const name = c.name.trim().slice(0, 200);
  if (!name) return { skipped: "invalid", reason: "会社名が空です" };
  const email = (c.email ?? "").trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return { skipped: "invalid", reason: "メールアドレスの形が正しくありません" };
  const website = (c.website ?? "").trim();
  const host = website ? hostKey(website) : "";
  if (website && !host) return { skipped: "invalid", reason: "サイトのアドレスが正しくありません" };
  if (isSuppressed(orgId, email)) return { skipped: "suppressed", reason: "配信停止の相手です" };
  try {
    const r = db().prepare(
      "INSERT INTO companies (org_id, name, website, host, email, industry, location, source) VALUES (?,?,?,?,?,?,?,?)",
    ).run(orgId, name, website, host, email, (c.industry ?? "").trim(), (c.location ?? "").trim(), c.source ?? "manual");
    return { id: Number(r.lastInsertRowid) };
  } catch (e) {
    if (String(e).includes("UNIQUE")) return { skipped: "duplicate", reason: "すでに登録されています" };
    throw e;
  }
}

export function getCompany(orgId: number, id: number): Company | null {
  const r = db().prepare("SELECT * FROM companies WHERE org_id=? AND id=?").get(orgId, id) as Row | undefined;
  return r ? toCompany(r) : null;
}

export function listCompanies(orgId: number, where = "1=1", params: (string | number)[] = []): Company[] {
  const rows = db().prepare(
    `SELECT * FROM companies WHERE org_id=? AND ${where}
     ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'mid' THEN 1 WHEN 'low' THEN 2 ELSE 3 END, id`,
  ).all(orgId, ...params) as Row[];
  return rows.map(toCompany);
}

export function setCompanyStatus(orgId: number, id: number, status: string, error = "") {
  db().prepare("UPDATE companies SET status=?, error=?, updated_at=datetime('now') WHERE org_id=? AND id=?").run(status, error, orgId, id);
}

export function saveAnalysis(orgId: number, id: number, a: Analysis) {
  db().prepare(
    "UPDATE companies SET priority=?, summary=?, reasons=?, facts=?, updated_at=datetime('now') WHERE org_id=? AND id=?",
  ).run(a.priority, a.summary, JSON.stringify(a.reasons), JSON.stringify(a.facts), orgId, id);
}

export function updateCompanyInfo(orgId: number, id: number, p: { summary: string; reasons: string[] }) {
  db().prepare("UPDATE companies SET summary=?, reasons=?, updated_at=datetime('now') WHERE org_id=? AND id=?")
    .run(p.summary, JSON.stringify(p.reasons), orgId, id);
}

export function updateContact(orgId: number, id: number, website: string, email: string): string {
  const host = website ? hostKey(website) : "";
  if (website && !host) return "site";
  if (email && !EMAIL_RE.test(email)) return "email";
  try {
    db().prepare("UPDATE companies SET website=?, host=?, email=?, updated_at=datetime('now') WHERE org_id=? AND id=?").run(website, host, email, orgId, id);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return "dup";
    throw e;
  }
  return "";
}

// ---- 下書き -----------------------------------------------------------------
export function saveDraft(orgId: number, companyId: number, subject: string, body: string, kind = "first"): number {
  const old = db().prepare("SELECT id FROM drafts WHERE org_id=? AND company_id=? AND kind=? AND status='pending'").get(orgId, companyId, kind) as Row | undefined;
  if (old) {
    db().prepare("UPDATE drafts SET subject=?, body=?, updated_at=datetime('now') WHERE id=?").run(subject, body, old.id as number);
    return Number(old.id);
  }
  return Number(db().prepare("INSERT INTO drafts (org_id, company_id, kind, subject, body) VALUES (?,?,?,?,?)").run(orgId, companyId, kind, subject, body).lastInsertRowid);
}

export function getDraftById(orgId: number, id: number): Draft | null {
  const r = db().prepare("SELECT * FROM drafts WHERE org_id=? AND id=?").get(orgId, id) as Row | undefined;
  return r ? toDraft(r) : null;
}

export function getDraft(orgId: number, companyId: number, kind = "first"): Draft | null {
  const r = db().prepare("SELECT * FROM drafts WHERE org_id=? AND company_id=? AND kind=? ORDER BY id DESC LIMIT 1").get(orgId, companyId, kind) as Row | undefined;
  return r ? toDraft(r) : null;
}

export function updateDraftText(orgId: number, id: number, subject: string, body: string): boolean {
  const r = db().prepare("UPDATE drafts SET subject=?, body=?, updated_at=datetime('now') WHERE org_id=? AND id=? AND status='pending'").run(subject, body, orgId, id);
  return Number(r.changes) === 1;
}

export function approveDraft(orgId: number, userId: number, id: number): boolean {
  const r = db().prepare(
    "UPDATE drafts SET status='approved', approved_by=?, approved_at=datetime('now') WHERE org_id=? AND id=? AND status='pending'",
  ).run(userId, orgId, id);
  return Number(r.changes) === 1;
}

export function setDraftStatus(orgId: number, id: number, status: string) {
  db().prepare("UPDATE drafts SET status=?, updated_at=datetime('now') WHERE org_id=? AND id=?").run(status, orgId, id);
}

// 本日の承認（送信の設定ができたら「送信」の数に切り替える）
export function approvedToday(orgId: number): number {
  const r = db().prepare(
    "SELECT COUNT(*) AS n FROM drafts WHERE org_id=? AND status IN ('approved','sent') AND date(approved_at,'localtime') = date('now','localtime')",
  ).get(orgId) as Row;
  return Number(r.n);
}

// ---- 返信 -------------------------------------------------------------------
export function addReply(orgId: number, companyId: number, body: string, category: string, nextAction: string): number {
  return Number(db().prepare("INSERT INTO replies (org_id, company_id, body, category, next_action) VALUES (?,?,?,?,?)").run(orgId, companyId, body, category, nextAction).lastInsertRowid);
}
export function getReply(orgId: number, id: number): Reply | null {
  const r = db().prepare("SELECT * FROM replies WHERE org_id=? AND id=?").get(orgId, id) as Row | undefined;
  return r ? toReply(r) : null;
}
export function listOpenReplies(orgId: number): (Reply & { companyName: string })[] {
  const rows = db().prepare(
    "SELECT r.*, c.name AS company_name FROM replies r JOIN companies c ON c.id=r.company_id WHERE r.org_id=? AND r.handled=0 ORDER BY r.id DESC",
  ).all(orgId) as Row[];
  return rows.map((r) => ({ ...toReply(r), companyName: s(r.company_name) }));
}
export function markReplyHandled(orgId: number, id: number) {
  db().prepare("UPDATE replies SET handled=1 WHERE org_id=? AND id=?").run(orgId, id);
}
export function setReplyCategory(orgId: number, id: number, category: string) {
  db().prepare("UPDATE replies SET category=? WHERE org_id=? AND id=?").run(category, orgId, id);
}

// 「営業拒否」のときは、以後その相手（メールアドレス）に送らない
export function suppress(orgId: number, email: string, reason: string) {
  if (!email) return;
  db().prepare("INSERT OR IGNORE INTO suppression (org_id, email, reason) VALUES (?,?,?)").run(orgId, email.toLowerCase(), reason);
}

export function unsuppress(orgId: number, email: string) {
  if (!email) return;
  db().prepare("DELETE FROM suppression WHERE org_id=? AND email=?").run(orgId, email.toLowerCase());
}

export function audit(orgId: number, userId: number | null, action: string, detail = "") {
  db().prepare("INSERT INTO audit (org_id, user_id, action, detail) VALUES (?,?,?,?)").run(orgId, userId, action, detail.slice(0, 500));
}
