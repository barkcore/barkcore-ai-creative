import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { CATEGORY_LABEL } from "@/lib/compose.ts";
import { closeReplyAction, setCategoryAction } from "../../actions.ts";
import { DraftEditor } from "../../review/[id]/editor.tsx";

export const dynamic = "force-dynamic";

export default async function ReplyPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const { id } = await params;
  const r = repo.getReply(u.orgId, Number(id));
  if (!r) notFound();
  const c = repo.getCompany(u.orgId, r.companyId);
  if (!c) notFound();
  const s = repo.getSettings(u.orgId);
  const d = repo.getDraft(u.orgId, c.id, "reply");
  const refuse = r.category === "refuse";
  let blocked = "";
  if (refuse) blocked = "営業拒否のため、返信は送りません。";
  else if (s.sendingPaused) blocked = `送信を止めています。${s.pauseReason}`;
  else if (!s.signature.trim()) blocked = "先に「設定」で、メールの最後の文を入れてください。";
  else if (!c.email) blocked = "宛先のメールアドレスがありません。";

  return (
    <>
      <Link className="back" href="/">← 今日にもどる</Link>
      <h1>{c.name} からの返信</h1>
      <p className="lead">AIが内容を分けました。違っていたら直せます。</p>
      <div className="split">
        <div>
          <h2>届いた返信</h2>
          <p className="inbound">{r.body}</p>
          <h2>AIの分類</h2>
          <form action={setCategoryAction}>
            <input type="hidden" name="id" value={r.id} />
            <label htmlFor="category" className="sr">分類</label>
            <select id="category" name="category" className="f" defaultValue={r.category || "interested"}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="actions" style={{ marginTop: 12 }}><button className="btn quiet" type="submit">分類を直す</button></div>
          </form>
          <p className="hint">「営業拒否」にすると、この相手には以後メールを送りません。</p>
          <h2>次にすること</h2>
          <p>{refuse ? "以後の連絡は止めました。終了にしてください。" : r.nextAction || "分類を選んでください。"}</p>
          <form action={closeReplyAction} style={{ marginTop: 24 }}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn plain" type="submit">この件を終了にする</button>
          </form>
        </div>
        <div>
          {d && !refuse ? (
            <DraftEditor
              key={d.id + ":" + d.status}
              draftId={d.id} companyId={c.id} initialSubject={d.subject} initialBody={d.body} signature={s.signature} to={c.email}
              blockedReason={blocked} readOnly={d.status !== "pending"} canRegenerate={false} kind="reply"
            />
          ) : (
            <div><h2>返信の下書き</h2><p className="empty">{refuse ? "営業拒否のため、下書きはありません。" : "下書きはありません。"}</p></div>
          )}
        </div>
      </div>
    </>
  );
}
