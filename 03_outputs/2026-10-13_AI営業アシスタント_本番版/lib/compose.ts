// 送る文面＝本文＋署名。署名（会社名・連絡先・配信停止の案内）は全メールに必ず付ける。
export function composeFinal(body: string, signature: string): string {
  return `${body.trim()}\n\n${signature.trim()}`;
}

export const OPT_OUT_HINT = "今後のご連絡が不要でしたら、このメールにその旨をご返信ください。";

export function hasOptOut(body: string, signature: string): boolean {
  return /不要|配信停止|停止/.test(body + "\n" + signature);
}

export const PRIORITY_LABEL: Record<string, string> = { high: "優先度：高", mid: "優先度：中", low: "優先度：低", out: "対象外" };
export const CATEGORY_LABEL: Record<string, string> = {
  interested: "興味あり", document: "資料希望", meeting: "打ち合わせ希望", not_now: "今は不要", refuse: "営業拒否", auto: "自動返信",
};
export const STATUS_LABEL: Record<string, string> = {
  new: "未調査", researching: "調査中", drafted: "承認待ち", approved: "承認済み（送信待ち）", skipped: "見送り・対象外",
  replied: "返信あり", closed: "終了", failed: "要確認",
};
