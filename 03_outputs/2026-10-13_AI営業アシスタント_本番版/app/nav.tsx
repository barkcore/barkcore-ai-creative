"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "今日", short: "今日", match: (p: string) => p === "/" },
  { href: "/review", label: "承認", short: "承認", match: (p: string) => p.startsWith("/review") },
  { href: "/replies", label: "返信", short: "返信", match: (p: string) => p.startsWith("/replies") },
  { href: "/add", label: "会社の追加", short: "追加", match: (p: string) => p.startsWith("/add") },
  { href: "/settings", label: "設定", short: "設定", match: (p: string) => p.startsWith("/settings") },
];

export function MainNav() {
  const path = usePathname();
  return (
    <nav className="main" aria-label="メニュー">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.match(path) ? "page" : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="メニュー（スマホ）">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.match(path) ? "page" : undefined}>{i.short}</Link>
      ))}
    </nav>
  );
}
