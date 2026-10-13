import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/compose.ts";
import { logoutAction } from "./actions.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "今日｜営業アシスタント" };

export default async function Today() {
  const u = await currentUser();
  if (!u) redirect("/login");
  const s = repo.getSettings(u.orgId);
  const n = repo.approvedToday(u.orgId);
  const replies = repo.listOpenReplies(u.orgId);
  const drafted = repo.listCompanies(u.orgId, "status='drafted'");
  const working = repo.listCompanies(u.orgId, "status IN ('researching','failed')");
  const blocked = s.sendingPaused || n >= s.dailyLimit;
  const noMail = !s.signature.trim();

  return (
    <>
      <h1>今日やること</h1>
      <p className="lead">上から順に、返信、承認、確認が必要なものの順で並んでいます。</p>

      {s.sendingPaused ? (
        <div className="notice err" role="alert">！ 送信を止めています。{s.pauseReason}<Link href="/settings"> 理由と再開のしかたを見る</Link></div>
      ) : n >= s.dailyLimit ? (
        <div className="notice warn">今日の承認は上限（{s.dailyLimit}通）までです。明日の朝からまた承認できます。残りは明日に回せます。</div>
      ) : null}
      {noMail ? (
        <div className="notice warn">メールの最後の文（会社名・連絡先・配信停止の案内）がまだ入っていません。承認の前に<Link href="/settings">「設定」</Link>で入れてください。</div>
      ) : null}

      <section className="group" aria-labelledby="g1">
        <h2 id="g1">返信が来ています<small>{replies.length}件</small></h2>
        {replies.length === 0 ? <p className="empty">いまはありません。返信が届いたら<Link href="/replies">「返信」</Link>に貼り付けてください。</p> : (
          <ul className="rows">
            {replies.map((r, i) => (
              <li key={r.id}>
                <div>
                  <span className="co">{r.companyName}</span><br />
                  <span className="why"><span className={`tag ${r.category === "refuse" || r.category === "not_now" ? "mid" : "hi"}`}>{CATEGORY_LABEL[r.category] ?? "未分類"}</span>{r.body.slice(0, 40).replace(/\s+/g, " ")}</span>
                </div>
                <Link className={i === 0 ? "btn primary" : "btn quiet"} href={`/replies/${r.id}`}>返信案を見る</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="group" aria-labelledby="g2">
        <h2 id="g2">承認する<small>{drafted.length}件</small></h2>
        {drafted.length === 0 ? <p className="empty">いまはありません。会社を追加すると、AIが調べて下書きを作ります。</p> : (
          <>
            <ul className="rows">
              {drafted.slice(0, 3).map((c, i) => (
                <li key={c.id}>
                  <div>
                    <span className="co">{c.name}</span><br />
                    <span className="why"><span className={`tag ${c.priority === "high" ? "hi" : "mid"}`}>{PRIORITY_LABEL[c.priority] ?? ""}</span>{c.reasons[0] ?? c.summary}</span>
                  </div>
                  <Link className={!blocked && i === 0 ? "btn primary" : "btn quiet"} href={`/review/${c.id}`}>{blocked ? "内容を見る" : "承認する"}</Link>
                </li>
              ))}
            </ul>
            {drafted.length > 3 ? <p className="why" style={{ marginTop: 12 }}>ほか{drafted.length - 3}件は<Link href="/review">「承認」</Link>の一覧から開けます。</p> : null}
          </>
        )}
      </section>

      {working.length > 0 ? (
        <section className="group" aria-labelledby="g3">
          <h2 id="g3">調べている・確認が必要<small>{working.length}件</small></h2>
          <ul className="rows">
            {working.map((c) => (
              <li key={c.id}>
                <div>
                  <span className="co">{c.name}</span><br />
                  <span className="why">{c.status === "researching" ? "調べています（約1分）" : <><span className="tag bad">！</span>{c.error || "うまく処理できませんでした"}</>}</span>
                </div>
                <Link className="btn quiet" href={`/review/${c.id}`}>{c.status === "researching" ? "見る" : "直す"}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="actions"><Link className="btn primary" href="/add">会社を追加する</Link>
        <form action={logoutAction}><button className="btn plain" type="submit">ログアウト</button></form></div>
    </>
  );
}
