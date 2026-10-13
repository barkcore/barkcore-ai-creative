import { assertPublicHost, parsePublicUrl } from "./safeurl.ts";

export type Page = { url: string; title: string; text: string };

const UA = "BarkCoreSalesBot/0.1 (company research; contact via site owner request)";
const MAX_BYTES = 600_000;
const MAX_TEXT = 6000;

export function htmlToText(html: string): { title: string; description: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ?? "";
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const text = decode(body).replace(/[ \t　]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { title: decode(title), description: decode(description), text };
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const LINK_HINTS = /(company|about|corporate|profile|outline|gaiyou|news|info|recruit|career|service|business|会社|企業|概要|事業|お知らせ|ニュース|採用|求人|サービス)/i;

export function pickLinks(html: string, base: URL, limit = 3): URL[] {
  const out: URL[] = [];
  const seen = new Set<string>([base.href]);
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    const label = m[2].replace(/<[^>]+>/g, "").trim();
    let u: URL;
    try { u = new URL(m[1], base); } catch { continue; }
    if (u.host !== base.host || !/^https?:$/.test(u.protocol)) continue;
    if (/\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?)$/i.test(u.pathname)) continue;
    u.hash = "";
    if (seen.has(u.href)) continue;
    if (LINK_HINTS.test(u.pathname) || LINK_HINTS.test(label)) { seen.add(u.href); out.push(u); }
  }
  return out;
}

async function robotsAllows(u: URL): Promise<boolean> {
  try {
    const r = new URL("/robots.txt", u);
    await assertPublicHost(r);
    const res = await fetch(r, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(5000), redirect: "error" });
    if (!res.ok) return true;
    const text = (await res.text()).slice(0, 50_000);
    let applies = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      const [k, ...rest] = line.split(":");
      const v = rest.join(":").trim();
      if (/^user-agent$/i.test(k)) applies = v === "*" || /barkcore/i.test(v);
      else if (applies && /^disallow$/i.test(k) && v && (v === "/" || u.pathname.startsWith(v))) return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function getHtml(u: URL): Promise<string> {
  let cur = u;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(cur);
    const res = await fetch(cur, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const next = parsePublicUrl(new URL(res.headers.get("location")!, cur).href);
      if (!next) throw new Error("移動先を読み込めません");
      cur = next;
      continue;
    }
    if (!res.ok) throw new Error(`サイトを読み込めませんでした（${res.status}）`);
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct)) throw new Error("ページ以外のデータでした");
    const reader = res.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    const buf = Buffer.concat(chunks);
    const charset = /charset=([\w-]+)/i.exec(ct)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString("latin1"))?.[1] ?? "utf-8";
    try { return new TextDecoder(charset).decode(buf); } catch { return buf.toString("utf8"); }
  }
  throw new Error("移動が多すぎて読み込めませんでした");
}

// トップページと、会社概要・お知らせ・採用などの関連ページを最大4枚読む。
export async function readSite(website: string): Promise<Page[]> {
  const top = parsePublicUrl(website);
  if (!top) throw new Error("サイトのアドレスが正しくありません");
  if (!(await robotsAllows(top))) throw new Error("このサイトは自動での読み取りを許可していません");
  const topHtml = await getHtml(top);
  const first = htmlToText(topHtml);
  const pages: Page[] = [{ url: top.href, title: first.title, text: (first.description + "\n" + first.text).slice(0, MAX_TEXT) }];
  for (const link of pickLinks(topHtml, top)) {
    try {
      const html = await getHtml(link);
      const p = htmlToText(html);
      pages.push({ url: link.href, title: p.title, text: p.text.slice(0, MAX_TEXT) });
    } catch { /* 読めないページは飛ばす */ }
  }
  if (pages.every((p) => p.text.length < 80)) throw new Error("サイトから文章を読み取れませんでした");
  return pages;
}
