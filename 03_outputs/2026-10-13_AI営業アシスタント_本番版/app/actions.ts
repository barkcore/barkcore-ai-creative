"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { currentUser, login, logout, type User } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { processMany, processCompany } from "@/lib/pipeline.ts";
import { classifyReply, draftEmail, AiNotConfigured, type Analysis } from "@/lib/ai.ts";
import { csvToCompanies } from "@/lib/csv.ts";
import { composeFinal, hasOptOut } from "@/lib/compose.ts";
import { getMailer } from "@/lib/mailer.ts";

async function need(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
const str = (f: FormData, k: string, max = 5000) => String(f.get(k) ?? "").slice(0, max).trim();
const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : NaN; };

// ---- ログイン ----------------------------------------------------------------
export async function loginAction(f: FormData) {
  const ok = await login(str(f, "email", 200), String(f.get("password") ?? ""));
  redirect(ok ? "/" : "/login?e=1");
}
export async function logoutAction() {
  await logout();
  redirect("/login");
}

// ---- 会社の追加 --------------------------------------------------------------
export async function addOneAction(f: FormData) {
  const u = await need();
  const r = repo.addCompany(u.orgId, { name: str(f, "name", 200), website: str(f, "website", 300), email: str(f, "email", 200), source: "manual" });
  if (!r.id) redirect(`/add?e=${r.skipped}&r=${encodeURIComponent(r.reason ?? "")}`);
  repo.audit(u.orgId, u.id, "company_add", `id=${r.id}`);
  after(() => processMany(u.orgId, [r.id!]));
  redirect(`/add?m=one`);
}

export async function importCsvAction(f: FormData) {
  const u = await need();
  const file = f.get("csv");
  if (!(file instanceof File) || file.size === 0) redirect("/add?e=nofile");
  if (file.size > 2_000_000) redirect("/add?e=toobig");
  const { items, error } = csvToCompanies(await file.text());
  if (error) redirect(`/add?e=csv&r=${encodeURIComponent(error)}`);
  const capped = items.slice(0, 500);
  let added = 0, dup = 0, sup = 0, bad = 0;
  const ids: number[] = [];
  for (const it of capped) {
    const r = repo.addCompany(u.orgId, { ...it, source: "csv" });
    if (r.id) { added++; ids.push(r.id); }
    else if (r.skipped === "duplicate") dup++;
    else if (r.skipped === "suppressed") sup++;
    else bad++;
  }
  repo.audit(u.orgId, u.id, "csv_import", `added=${added} dup=${dup} sup=${sup} bad=${bad}`);
  after(() => processMany(u.orgId, ids));
  redirect(`/add?m=csv&a=${added}&d=${dup}&s=${sup}&b=${bad}&t=${items.length - capped.length}`);
}

export async function saveBriefAction(f: FormData) {
  const u = await need();
  repo.saveSettings(u.orgId, { targetText: str(f, "target", 1000), customPrompt: str(f, "custom", 1000) });
  redirect("/add?m=brief");
}

export async function retryAction(f: FormData) {
  const u = await need();
  const id = num(str(f, "id", 20));
  const c = repo.getCompany(u.orgId, id);
  if (!c) redirect("/add");
  if (f.has("website") || f.has("email")) {
    // 手で直した情報で、もう一度調べる
    const website = str(f, "website", 300), email = str(f, "email", 200).toLowerCase();
    const res = repo.updateContact(u.orgId, id, website, email);
    if (res) redirect(`/review/${id}?e=${res}`);
  }
  repo.setCompanyStatus(u.orgId, id, "researching");
  after(() => processCompany(u.orgId, id));
  redirect(`/review/${id}`);
}

export async function skipAction(f: FormData) {
  const u = await need();
  const id = num(str(f, "id", 20));
  const c = repo.getCompany(u.orgId, id);
  if (c) {
    repo.setCompanyStatus(u.orgId, id, "skipped", "見送りにしました");
    const d = repo.getDraft(u.orgId, id);
    if (d && d.status === "pending") repo.setDraftStatus(u.orgId, d.id, "skipped");
    repo.audit(u.orgId, u.id, "skip", `company=${id}`);
  }
  redirect("/");
}

// ---- 下書きの保存・やり直し・承認 -----------------------------------------------
export type SaveRes = { ok: boolean; message: string };

export async function saveDraftAction(draftId: number, subject: string, body: string): Promise<SaveRes> {
  const u = await need();
  const ok = repo.updateDraftText(u.orgId, draftId, subject.slice(0, 120), body.slice(0, 5000));
  return ok ? { ok, message: "保存しました。" } : { ok, message: "この下書きはもう変更できません。" };
}

export async function regenerateAction(companyId: number): Promise<SaveRes & { subject?: string; body?: string }> {
  const u = await need();
  const c = repo.getCompany(u.orgId, companyId);
  if (!c) return { ok: false, message: "会社が見つかりません。" };
  try {
    const s = repo.getSettings(u.orgId);
    const a: Analysis = { summary: c.summary, priority: c.priority === "" ? "low" : c.priority, reasons: c.reasons, facts: c.facts };
    const d = await draftEmail(c, a, { targetText: s.targetText, serviceText: s.serviceText, customPrompt: s.customPrompt });
    const cur = repo.getDraft(u.orgId, companyId);
    if (cur && cur.status === "pending") repo.updateDraftText(u.orgId, cur.id, d.data.subject, d.data.body);
    else repo.saveDraft(u.orgId, companyId, d.data.subject, d.data.body);
    repo.audit(u.orgId, u.id, "ai_redraft", `${d.usage.model} in=${d.usage.input} out=${d.usage.output} company=${companyId}`);
    return { ok: true, message: "書き直しました。内容を確認してください。", subject: d.data.subject, body: d.data.body };
  } catch (e) {
    return { ok: false, message: e instanceof AiNotConfigured ? e.message : "書き直せませんでした。もう一度お試しください。" };
  }
}

export async function approveAction(draftId: number, subject: string, body: string): Promise<SaveRes> {
  const u = await need();
  const d = repo.getDraftById(u.orgId, draftId);
  if (!d) return { ok: false, message: "下書きが見つかりません。" };
  if (d.status !== "pending") return { ok: false, message: "この下書きは、すでに承認済みか見送りです。" };
  const c = repo.getCompany(u.orgId, d.companyId);
  if (!c) return { ok: false, message: "会社が見つかりません。" };
  const s = repo.getSettings(u.orgId);
  if (s.sendingPaused) return { ok: false, message: `送信が止まっています。${s.pauseReason}` };
  if (repo.approvedToday(u.orgId) >= s.dailyLimit) return { ok: false, message: `今日の上限（${s.dailyLimit}通）に達しました。明日また承認できます。` };
  if (!s.signature.trim()) return { ok: false, message: "先に「設定」で、メールの最後の文（会社名・連絡先・配信停止の案内）を入れてください。" };
  if (!hasOptOut(body, s.signature)) return { ok: false, message: "配信停止（ご連絡が不要な場合の案内）が文面にありません。本文か署名に入れてください。" };
  if (!subject.trim() || !body.trim()) return { ok: false, message: "件名と本文を入れてください。" };
  if (!c.email) return { ok: false, message: "宛先のメールアドレスがありません。" };
  if (repo.isSuppressed(u.orgId, c.email)) return { ok: false, message: "この相手は配信停止になっています。" };

  repo.updateDraftText(u.orgId, d.id, subject.slice(0, 120), body.slice(0, 5000));
  if (!repo.approveDraft(u.orgId, u.id, d.id)) return { ok: false, message: "すでに承認済みです。" };
  repo.audit(u.orgId, u.id, "approve", `draft=${d.id} company=${c.id}`);
  if (d.kind === "first") repo.setCompanyStatus(u.orgId, c.id, "approved");

  const mailer = getMailer();
  if (!mailer.configured) {
    return { ok: true, message: "承認しました。メールの送信はまだ設定されていないため、「送信待ち」として保存しました。" };
  }
  const r = await mailer.send({ to: c.email, subject, body: composeFinal(body, s.signature) });
  if (!r.ok) return { ok: true, message: `承認しました。ただ、送れませんでした：${r.reason}` };
  repo.setDraftStatus(u.orgId, d.id, "sent");
  repo.audit(u.orgId, u.id, "sent", `draft=${d.id} id=${r.messageId}`);
  return { ok: true, message: "送りました。" };
}

// ---- 返信 -------------------------------------------------------------------
export async function addReplyAction(f: FormData) {
  const u = await need();
  const companyId = num(str(f, "company", 20));
  const body = str(f, "body", 8000);
  const c = repo.getCompany(u.orgId, companyId);
  if (!c || !body) redirect("/replies?e=1");
  const s = repo.getSettings(u.orgId);
  let category = "", next = "", draft = "";
  try {
    const r = await classifyReply(c, body, { targetText: s.targetText, serviceText: s.serviceText, customPrompt: s.customPrompt });
    category = r.data.category; next = r.data.next_action; draft = r.data.draft_body;
    repo.audit(u.orgId, u.id, "ai_reply", `${r.usage.model} in=${r.usage.input} out=${r.usage.output} company=${c.id}`);
  } catch {
    next = "AIの分類に失敗しました。分類を手で選んでください。";
  }
  const id = repo.addReply(u.orgId, c.id, body, category, next);
  repo.setCompanyStatus(u.orgId, c.id, category === "refuse" ? "closed" : "replied");
  if (category === "refuse") repo.suppress(u.orgId, c.email, "営業拒否の返信");
  if (draft) repo.saveDraft(u.orgId, c.id, `Re: ${c.name}`, draft, "reply");
  redirect(`/replies/${id}`);
}

export async function setCategoryAction(f: FormData) {
  const u = await need();
  const id = num(str(f, "id", 20));
  const category = str(f, "category", 20);
  const r = repo.getReply(u.orgId, id);
  if (!r) redirect("/replies");
  repo.setReplyCategory(u.orgId, id, category);
  const c = repo.getCompany(u.orgId, r.companyId);
  if (c) {
    if (category === "refuse") { repo.suppress(u.orgId, c.email, "営業拒否の返信"); repo.setCompanyStatus(u.orgId, c.id, "closed"); }
    else if (r.category === "refuse") { repo.unsuppress(u.orgId, c.email); repo.setCompanyStatus(u.orgId, c.id, "replied"); }
  }
  redirect(`/replies/${id}`);
}

export async function closeReplyAction(f: FormData) {
  const u = await need();
  const id = num(str(f, "id", 20));
  const r = repo.getReply(u.orgId, id);
  if (r) {
    repo.markReplyHandled(u.orgId, id);
    repo.setCompanyStatus(u.orgId, r.companyId, "closed");
    repo.audit(u.orgId, u.id, "reply_close", `reply=${id}`);
  }
  redirect("/");
}

// ---- 設定 -------------------------------------------------------------------
export async function saveSettingsAction(f: FormData) {
  const u = await need();
  const limit = num(str(f, "limit", 5));
  repo.saveSettings(u.orgId, {
    dailyLimit: Number.isNaN(limit) ? 10 : limit,
    signature: str(f, "signature", 1500),
    serviceText: str(f, "service", 1000),
  });
  repo.audit(u.orgId, u.id, "settings_save");
  redirect("/settings?m=saved");
}

export async function pauseAction(f: FormData) {
  const u = await need();
  const pause = str(f, "pause", 2) === "1";
  repo.setPaused(u.orgId, pause, pause ? "手動で止めています。" : "");
  repo.audit(u.orgId, u.id, pause ? "pause" : "resume");
  redirect("/settings?m=" + (pause ? "paused" : "resumed"));
}
