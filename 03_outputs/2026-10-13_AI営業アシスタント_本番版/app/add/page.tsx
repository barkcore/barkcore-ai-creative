import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { STATUS_LABEL } from "@/lib/compose.ts";
import { addOneAction, importCsvAction, saveBriefAction } from "../actions.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "会社の追加｜営業アシスタント" };

type SP = { m?: string; e?: string; r?: string; a?: string; d?: string; s?: string; b?: string; t?: string };
const ERRS: Record<string, string> = {
  nofile: "ファイルを選んでください。", toobig: "ファイルが大きすぎます（2MBまで）。", csv: "", duplicate: "", suppressed: "", invalid: "",
};

export default async function Add({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const sp = await searchParams;
  const s = repo.getSettings(u.orgId);
  const all = repo.listCompanies(u.orgId);
  return (
    <>
      <Link className="back" href="/">← 今日にもどる</Link>
      <h1>会社を追加する</h1>
      <p className="lead">方法をひとつ選んでください。追加した会社は、AIがサイトを読んで調べ、営業文の下書きまで作ります。</p>

      {sp.m === "one" ? <div className="notice ok" role="status">追加しました。調べています（約1分）。</div> : null}
      {sp.m === "brief" ? <div className="notice ok" role="status">条件を保存しました。これから調べる会社の採点に使います。</div> : null}
      {sp.m === "csv" ? (
        <div className="notice ok" role="status">
          {sp.a}社を追加しました。調べています。{Number(sp.d) ? ` 重複${sp.d}社、` : ""}{Number(sp.s) ? ` 配信停止${sp.s}社、` : ""}{Number(sp.b) ? ` 読めない行${sp.b}件、` : ""}{Number(sp.t) ? ` 500社を超えた${sp.t}社は入れていません。` : ""}
        </div>
      ) : null}
      {sp.e ? <div className="notice err" role="alert">！ {sp.r || ERRS[sp.e] || "追加できませんでした。"}</div> : null}

      <div className="split">
        <div>
          <h2>探したい会社の条件</h2>
          <form action={saveBriefAction}>
            <label htmlFor="target">どんな会社に営業したいですか</label>
            <textarea id="target" name="target" className="short" style={{ minHeight: "8em" }} defaultValue={s.targetText} maxLength={1000} placeholder="例：関東の物流会社。従業員10〜100名くらい。手作業が多そうな会社。" />
            <label htmlFor="custom">AIへの追加のお願い（なくても大丈夫です）</label>
            <textarea id="custom" name="custom" className="short" style={{ minHeight: "5em" }} defaultValue={s.customPrompt} maxLength={1000} placeholder="例：サイトが古い、または問い合わせが電話だけの会社を高く評価してください。" />
            <p className="hint">会社の自動検索は、まだ使えません。下のCSVか1社追加で入れた会社を、この条件で採点します。</p>
            <div className="actions"><button className="btn primary" type="submit">この条件を保存する</button></div>
          </form>
        </div>
        <div>
          <h2>CSVを読み込む</h2>
          <form action={importCsvAction}>
            <label htmlFor="csv">会社名・サイト・メールアドレスが入った表（CSV）</label>
            <input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
            <p className="hint">1行目に「会社名」「サイト」「メール」（あれば「業種」「所在地」）の見出しを入れてください。500社まで。同じ会社と配信停止済みの相手は自動でのぞきます。</p>
            <div className="actions"><button className="btn" type="submit">読み込んで調べる</button></div>
          </form>
          <h2>ひとつだけ入れる</h2>
          <form action={addOneAction}>
            <label htmlFor="name">会社名</label>
            <input id="name" name="name" type="text" required maxLength={200} />
            <label htmlFor="website">会社のサイトのアドレス</label>
            <input id="website" name="website" type="text" placeholder="https://" maxLength={300} />
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" maxLength={200} />
            <p className="hint">会社が公開している営業用・問い合わせ用のアドレスだけを入れてください。</p>
            <div className="actions"><button className="btn" type="submit">追加して調べる</button></div>
          </form>
        </div>
      </div>

      <section className="group" style={{ marginTop: 64 }} aria-labelledby="all">
        <h2 id="all">登録した会社<small>{all.length}社</small></h2>
        {all.length === 0 ? <p className="empty">まだありません。</p> : (
          <ul className="rows">
            {all.map((c) => (
              <li key={c.id}>
                <div><span className="co">{c.name}</span><br /><span className="why">{STATUS_LABEL[c.status] ?? c.status}{c.error ? `：${c.error}` : ""}</span></div>
                <Link className="btn quiet" href={`/review/${c.id}`}>開く</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
