import { readSite } from "./site.ts";
import { analyzeCompany, draftEmail, AiNotConfigured, type Brief } from "./ai.ts";
import * as repo from "./repo.ts";

function brief(orgId: number): Brief {
  const s = repo.getSettings(orgId);
  return { targetText: s.targetText, serviceText: s.serviceText, customPrompt: s.customPrompt };
}

// 1社ぶんの「サイトを読む → 調査・採点 → 営業文の下書き」。失敗しても画面に理由が出るよう、状態に残す。
export async function processCompany(orgId: number, companyId: number): Promise<void> {
  const c = repo.getCompany(orgId, companyId);
  if (!c) return;
  repo.setCompanyStatus(orgId, companyId, "researching");
  try {
    if (!c.website) throw new Error("サイトのアドレスがありません。手で情報を入れてください。");
    const pages = await readSite(c.website);
    const b = brief(orgId);
    const a = await analyzeCompany(c, pages, b);
    repo.saveAnalysis(orgId, companyId, a.data);
    repo.audit(orgId, null, "ai_analyze", `${a.usage.model} in=${a.usage.input} out=${a.usage.output} company=${companyId}`);
    if (a.data.priority === "out") {
      repo.setCompanyStatus(orgId, companyId, "skipped", "対象外と判断しました（理由は調査メモを見てください）");
      return;
    }
    if (!c.email) {
      repo.setCompanyStatus(orgId, companyId, "failed", "メールアドレスが見つかりません。手で入れるか、フォーム・電話の候補に回してください。");
      return;
    }
    const d = await draftEmail(c, a.data, b);
    repo.saveDraft(orgId, companyId, d.data.subject, d.data.body);
    repo.audit(orgId, null, "ai_draft", `${d.usage.model} in=${d.usage.input} out=${d.usage.output} company=${companyId}`);
    repo.setCompanyStatus(orgId, companyId, "drafted");
  } catch (e) {
    const msg = e instanceof AiNotConfigured ? e.message : e instanceof Error ? e.message : "うまく処理できませんでした";
    repo.setCompanyStatus(orgId, companyId, "failed", msg);
  }
}

// 順番に（同時に走らせすぎない）処理する
const running = new Set<string>();
export async function processMany(orgId: number, ids: number[]): Promise<void> {
  for (const id of ids) {
    const k = `${orgId}:${id}`;
    if (running.has(k)) continue;
    running.add(k);
    try { await processCompany(orgId, id); } finally { running.delete(k); }
  }
}
