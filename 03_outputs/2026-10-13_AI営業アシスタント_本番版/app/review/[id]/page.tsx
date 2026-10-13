import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { PRIORITY_LABEL } from "@/lib/compose.ts";
import { retryAction, skipAction } from "../../actions.ts";
import { DraftEditor } from "./editor.tsx";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { site: "サイトのアドレスの形が正しくありません。", email: "メールアドレスの形が正しくありません。", dup: "同じサイトかメールアドレスの会社がすでにあります。" };

export default async function Review({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const { id } = await params;
  const { e } = await searchParams;
  const c = repo.getCompany(u.orgId, Number(id));
  if (!c) notFound();
  const s = repo.getSettings(u.orgId);
  const d = repo.getDraft(u.orgId, c.id);
  const n = repo.approvedToday(u.orgId);

  const working = c.status === "researching";
  const failed = c.status === "failed";
  const approved = c.status === "approved";
  let blocked = "";
  if (s.sendingPaused) blocked = `送信を止めています。${s.pauseReason}`;
  else if (n >= s.dailyLimit) blocked = `今日の承認は上限（${s.dailyLimit}通）までです。明日また承認できます。`;
  else if (!s.signature.trim()) blocked = "先に「設定」で、メールの最後の文（会社名・連絡先・配信停止の案内）を入れてください。";
  else if (!c.email) blocked = "宛先のメールアドレスがありません。";
  else if (repo.isSuppressed(u.orgId, c.email)) blocked = "この相手は配信停止になっています。";

  return (
    <>
      <Link className="back" href="/">← 今日にもどる</Link>
      <h1>{c.name} を承認する</h1>
      <p className="lead">内容を読んで、必要なら文章を直してください。「承認して送る」を押すまで、メールは送られません。</p>

      {e && ERR[e] ? <div className="notice err" role="alert">！ {ERR[e]}</div> : null}
      {working ? <div className="notice warn" role="status"><span className="spin" aria-hidden="true" />調べています（約1分）。ほかの会社は、いまのまま見られます。このページを開き直すと、結果が出ます。</div> : null}
      {failed ? <div className="notice err" role="alert">！ {c.error || "うまく処理できませんでした。"}</div> : null}
      {c.status === "skipped" ? <div className="notice warn">{c.error || "見送りにしています。"}</div> : null}
      {approved ? <div className="notice ok" role="status">承認済みです。送信待ちとして保存されています。</div> : null}

      <div className="split">
        <div>
          <h2>この会社</h2>
          <dl className="facts">
            <dt>業種</dt><dd>{c.industry || "未入力"}</dd>
            <dt>所在地</dt><dd>{c.location || "未入力"}</dd>
            <dt>サイト</dt><dd>{c.website || "未入力"}</dd>
            <dt>連絡先</dt><dd>{c.email || "未入力"}</dd>
          </dl>
          {c.summary ? <><h2>会社の概要</h2><p>{c.summary}</p></> : null}
          {c.reasons.length > 0 ? (
            <>
              <h2>営業する理由 {c.priority ? <span className={`tag ${c.priority === "high" ? "hi" : "mid"}`}>{PRIORITY_LABEL[c.priority]}</span> : null}</h2>
              <ul className="memo">{c.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          ) : null}
          {c.facts.length > 0 ? (
            <>
              <h2>メールに使った事実と出どころ</h2>
              <ul className="memo">{c.facts.map((f, i) => <li key={i}>{f.fact} ― <a href={f.source} target="_blank" rel="noopener noreferrer">出どころのページ</a></li>)}</ul>
              <p className="hint">出どころは公開されているページだけです。事実が違っていたら、右の文章を直してください。</p>
            </>
          ) : null}
          {failed || c.status === "skipped" ? (
            <>
              <h2>情報を直して、もう一度調べる</h2>
              <form action={retryAction}>
                <input type="hidden" name="id" value={c.id} />
                <label htmlFor="website">サイトのアドレス</label>
                <input id="website" name="website" type="text" defaultValue={c.website} />
                <label htmlFor="email">メールアドレス</label>
                <input id="email" name="email" type="email" defaultValue={c.email} />
                <div className="actions"><button className="btn" type="submit">もう一度調べる</button></div>
              </form>
            </>
          ) : null}
          {!approved && c.status !== "closed" ? (
            <form action={skipAction} style={{ marginTop: 24 }}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn plain" type="submit">見送る</button>
            </form>
          ) : null}
        </div>
        <div>
          {d ? (
            <DraftEditor
              key={d.id + ":" + d.status}
              draftId={d.id} companyId={c.id} initialSubject={d.subject} initialBody={d.body} signature={s.signature} to={c.email}
              blockedReason={blocked} readOnly={d.status !== "pending"} canRegenerate={!!c.summary} kind="first"
            />
          ) : (
            <div><h2>営業メールの下書き</h2><p className="empty">{working ? "下書きができるまで、お待ちください。" : "下書きはまだありません。"}</p></div>
          )}
        </div>
      </div>
    </>
  );
}
