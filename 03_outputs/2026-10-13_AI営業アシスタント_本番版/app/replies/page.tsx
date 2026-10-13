import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { CATEGORY_LABEL } from "@/lib/compose.ts";
import { addReplyAction } from "../actions.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "返信｜営業アシスタント" };

export default async function Replies({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const { e } = await searchParams;
  const open = repo.listOpenReplies(u.orgId);
  const targets = repo.listCompanies(u.orgId, "status IN ('approved','replied','drafted')");
  return (
    <>
      <h1>返信</h1>
      <p className="lead">届いた返信を貼り付けると、AIが内容を分けて、次にすることと返信案を出します。</p>
      {e ? <div className="notice err" role="alert">！ 会社と返信の文章を入れてください。</div> : null}
      <div className="split">
        <div>
          <h2>返信が来ています<span className="why"> {open.length}件</span></h2>
          {open.length === 0 ? <p className="empty">いまはありません。</p> : (
            <ul className="rows">
              {open.map((r) => (
                <li key={r.id}>
                  <div><span className="co">{r.companyName}</span><br /><span className="why"><span className="tag hi">{CATEGORY_LABEL[r.category] ?? "未分類"}</span>{r.body.slice(0, 30).replace(/\s+/g, " ")}</span></div>
                  <Link className="btn quiet" href={`/replies/${r.id}`}>開く</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2>返信を貼り付ける</h2>
          <form action={addReplyAction}>
            <label htmlFor="company">どの会社からですか</label>
            <select id="company" name="company" className="f" required defaultValue="">
              <option value="" disabled>選んでください</option>
              {targets.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label htmlFor="body">返信の文章</label>
            <textarea id="body" name="body" className="short" style={{ minHeight: "10em" }} required maxLength={8000} />
            <p className="hint">メールの自動取り込みは、送信の設定のあとに使えるようになります。</p>
            <div className="actions"><button className="btn primary" type="submit">AIに分けてもらう</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
