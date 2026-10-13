import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { PRIORITY_LABEL } from "@/lib/compose.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "承認｜営業アシスタント" };

export default async function ReviewList() {
  const u = await currentUser();
  if (!u) redirect("/login");
  const items = repo.listCompanies(u.orgId, "status='drafted'");
  return (
    <>
      <h1>承認する</h1>
      <p className="lead">承認待ちの会社です。優先度の高い順に並んでいます。</p>
      {items.length === 0 ? <p className="empty">いまはありません。</p> : (
        <ul className="rows">
          {items.map((c) => (
            <li key={c.id}>
              <div><span className="co">{c.name}</span><br /><span className="why"><span className={`tag ${c.priority === "high" ? "hi" : "mid"}`}>{PRIORITY_LABEL[c.priority] ?? ""}</span>{c.reasons[0] ?? c.summary}</span></div>
              <Link className="btn quiet" href={`/review/${c.id}`}>承認する</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
