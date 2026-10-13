import dns from "node:dns/promises";
import net from "node:net";

// 会社のサイトを読みに行くとき、社内ネットワークなどを覗かせないための確認（SSRF対策）。
// テスト専用：自分のPC上の試験用サイトを読めるようにする。本番では絶対に設定しない。
const allowLocal = () => process.env.BARKCORE_TEST_ALLOW_LOCAL === "1";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
    return l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe8") || l.startsWith("fe9") || l.startsWith("fea") || l.startsWith("feb");
  }
  return true;
}

export function parsePublicUrl(raw: string): URL | null {
  let text = raw.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = "https://" + text;
  let u: URL;
  try { u = new URL(text); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (allowLocal()) return u;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return null;
  if (!h.includes(".") && !net.isIP(h) && !h.startsWith("[")) return null;
  return u;
}

export async function assertPublicHost(u: URL): Promise<void> {
  if (allowLocal()) return;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("このアドレスは読み込めません");
    return;
  }
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("このアドレスは読み込めません");
  }
}

export function hostKey(raw: string): string {
  const u = parsePublicUrl(raw);
  return u ? u.hostname.toLowerCase().replace(/^www\./, "") : "";
}
