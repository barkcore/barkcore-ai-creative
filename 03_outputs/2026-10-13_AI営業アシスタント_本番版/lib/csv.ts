// 依存を増やさないための小さなCSV読み取り（ダブルクォート・改行入りの欄に対応）
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string[]> = {
  name: ["会社名", "名称", "企業名", "name", "company"],
  website: ["サイト", "url", "website", "ホームページ", "hp", "web", "サイトurl"],
  email: ["メール", "メールアドレス", "email", "e-mail", "mail"],
  industry: ["業種", "industry", "事業内容"],
  location: ["所在地", "住所", "location", "address", "都道府県"],
};

export type CsvCompany = { name: string; website: string; email: string; industry: string; location: string };

export function csvToCompanies(text: string): { items: CsvCompany[]; error?: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { items: [], error: "表の1行目に見出し（会社名・サイトなど）と、2行目以降に会社が必要です。" };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    idx[key] = head.findIndex((h) => names.map((n) => n.toLowerCase()).includes(h));
  }
  if (idx.name < 0) return { items: [], error: "「会社名」の列が見つかりません。1行目の見出しを確認してください。" };
  const items = rows.slice(1).map((r) => ({
    name: (r[idx.name] ?? "").trim(),
    website: idx.website >= 0 ? (r[idx.website] ?? "").trim() : "",
    email: idx.email >= 0 ? (r[idx.email] ?? "").trim() : "",
    industry: idx.industry >= 0 ? (r[idx.industry] ?? "").trim() : "",
    location: idx.location >= 0 ? (r[idx.location] ?? "").trim() : "",
  })).filter((x) => x.name);
  return { items };
}
