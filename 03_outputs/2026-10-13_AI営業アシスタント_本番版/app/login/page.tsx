import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loginAction } from "../actions.ts";

export const metadata = { title: "ログイン｜営業アシスタント" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await currentUser()) redirect("/");
  const { e } = await searchParams;
  return (
    <div className="loginbox">
      <h1>ログイン</h1>
      <p className="lead" style={{ marginBottom: 24 }}>メールアドレスとパスワードを入れてください。</p>
      {e ? <div className="notice err" role="alert">！ メールアドレスかパスワードが違います。何度も間違えると、しばらく入れなくなります。</div> : null}
      <form action={loginAction}>
        <label htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">パスワード</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <div className="actions"><button className="btn primary" type="submit">ログインする</button></div>
      </form>
    </div>
  );
}
