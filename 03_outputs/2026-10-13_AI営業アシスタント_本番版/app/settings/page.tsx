import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import * as repo from "@/lib/repo.ts";
import { getMailer } from "@/lib/mailer.ts";
import { pauseAction, saveSettingsAction } from "../actions.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "設定｜営業アシスタント" };

const MSG: Record<string, string> = { saved: "保存しました。", paused: "送信を止めました。", resumed: "送信を再開しました。" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  const { m } = await searchParams;
  const s = repo.getSettings(u.orgId);
  const mailer = getMailer();
  return (
    <>
      <Link className="back" href="/">← 今日にもどる</Link>
      <h1>設定</h1>
      <p className="lead">変更は「保存する」を押すと反映されます。</p>
      {m && MSG[m] ? <div className="notice ok" role="status">{MSG[m]}</div> : null}

      <form action={saveSettingsAction}>
        <div className="setrow"><div><b>営業用のメールボックス</b><p className="hint">ふだんのメールとは分けて使います</p></div>
          <div>{mailer.configured ? "つながっています" : "まだつながっていません。"}<p className="hint">メールの送信方法が決まるまで、承認した文面は「送信待ち」として保存されます。</p></div></div>
        <div className="setrow"><div><b>1日に承認できる数の上限</b></div>
          <div><label htmlFor="limit" className="sr">上限</label><input id="limit" name="limit" type="number" min={1} max={50} defaultValue={s.dailyLimit} style={{ maxWidth: "6em" }} /> 通<p className="hint">はじめは5〜10通をおすすめします。</p></div></div>
        <div className="setrow"><div><b>メールの最後の文</b><p className="hint">会社名・連絡先・配信停止の案内。すべてのメールに必ず付きます。</p></div>
          <div><label htmlFor="signature" className="sr">メールの最後の文</label>
            <textarea id="signature" name="signature" className="short" style={{ minHeight: "9em" }} defaultValue={s.signature} maxLength={1500} placeholder={"株式会社BarkCore 森\n（住所・電話番号・メールアドレス）\n今後のご連絡が不要でしたら、このメールにその旨をご返信ください。"} /></div></div>
        <div className="setrow"><div><b>私たちのサービスの説明</b><p className="hint">AIが営業文を書くときの材料になります。確認できていない実績・料金は書かないでください。</p></div>
          <div><label htmlFor="service" className="sr">サービスの説明</label>
            <textarea id="service" name="service" className="short" style={{ minHeight: "7em" }} defaultValue={s.serviceText} maxLength={1000} /></div></div>
        <div className="actions"><button className="btn primary" type="submit">保存する</button></div>
      </form>

      <section className="group" style={{ marginTop: 64 }}>
        <h2>送信の停止</h2>
        <p className="why" style={{ margin: "8px 0 16px" }}>{s.sendingPaused ? `いま止めています。${s.pauseReason}` : "いまは止めていません。届かなかったメールが多いときなどは、ここで止められます。"}</p>
        <form action={pauseAction}>
          <input type="hidden" name="pause" value={s.sendingPaused ? "0" : "1"} />
          <button className="btn quiet" type="submit">{s.sendingPaused ? "送信を再開する" : "送信を止める"}</button>
        </form>
        <p className="hint" style={{ marginTop: 16 }}>届かなかったメールが全体の3%を超えたら自動で止める仕組みは、メールの送信をつなぐときに入れます。</p>
      </section>
    </>
  );
}
