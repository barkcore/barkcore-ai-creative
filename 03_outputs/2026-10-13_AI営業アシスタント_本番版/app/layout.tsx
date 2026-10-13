import type { Metadata, Viewport } from "next";
import "./globals.css";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { MainNav, TabBar } from "./nav.tsx";

export const metadata: Metadata = { title: "営業アシスタント", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  let quota: React.ReactNode = null;
  if (user) {
    const s = repo.getSettings(user.orgId);
    const n = repo.approvedToday(user.orgId);
    const alert = s.sendingPaused || n >= s.dailyLimit;
    quota = s.sendingPaused
      ? <>送信は停止中です</>
      : <>本日の承認 <b>{n}</b> / {s.dailyLimit}通</>;
    quota = <div className={alert ? "quota alert" : "quota"} id="quota" aria-live="polite">{quota}</div>;
  }
  return (
    <html lang="ja">
      <body>
        <header className="top">
          <div className="name">営業アシスタント</div>
          {user ? <MainNav /> : <div style={{ flex: 1 }} />}
          {quota}
        </header>
        <main id="main">{children}</main>
        {user ? <TabBar /> : null}
      </body>
    </html>
  );
}
