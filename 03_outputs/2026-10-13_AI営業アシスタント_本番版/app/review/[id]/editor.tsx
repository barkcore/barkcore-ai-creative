"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { approveAction, regenerateAction, saveDraftAction } from "../../actions.ts";

type Props = {
  draftId: number; companyId: number; initialSubject: string; initialBody: string; signature: string; to: string;
  blockedReason: string; readOnly: boolean; canRegenerate: boolean; kind: string;
};

export function DraftEditor(p: Props) {
  const [subject, setSubject] = useState(p.initialSubject);
  const [body, setBody] = useState(p.initialBody);
  const [status, setStatus] = useState("自動で保存しています。");
  const [done, setDone] = useState<null | { ok: boolean; message: string }>(null);
  const [busy, start] = useTransition();
  const dlg = useRef<HTMLDialogElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = ta.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 4 + "px"; }
  }, [body]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (p.readOnly) return;
    setStatus("保存しています…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await saveDraftAction(p.draftId, subject, body);
      setStatus(r.message);
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [subject, body, p.draftId, p.readOnly]);

  const disabled = p.readOnly || !!p.blockedReason || !!done?.ok;
  const finalText = `${body.trim()}\n\n${p.signature.trim()}`;

  return (
    <div>
      <h2>{p.kind === "reply" ? "返信の下書き" : "営業メールの下書き"}</h2>
      <label htmlFor="subj">件名</label>
      <input id="subj" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={p.readOnly || !!done?.ok} maxLength={120} />
      <label htmlFor="body">本文</label>
      <textarea id="body" ref={ta} value={body} onChange={(e) => setBody(e.target.value)} disabled={p.readOnly || !!done?.ok} maxLength={5000} />
      <p className="saved" role="status">{status}</p>
      {p.signature ? <div className="sig" aria-label="メールの最後に自動で付く文">{p.signature}</div> : null}
      {p.signature ? <p className="hint">この文は、送るときに自動で最後に付きます（「設定」で変えられます）。</p> : null}
      {done ? <div className={`notice ${done.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 24, marginBottom: 0 }}>{done.ok ? "" : "！ "}{done.message}</div> : null}
      {p.blockedReason && !done ? <div className="notice warn" style={{ marginTop: 24, marginBottom: 0 }}>{p.blockedReason}</div> : null}
      <div className="actions">
        <button className="btn primary" type="button" disabled={disabled || busy} onClick={() => dlg.current?.showModal()}>承認して送る</button>
        {p.canRegenerate ? (
          <button className="btn" type="button" disabled={p.readOnly || busy || !!done?.ok} onClick={() => start(async () => {
            setStatus("AIが書き直しています…");
            const r = await regenerateAction(p.companyId);
            if (r.ok && r.subject !== undefined && r.body !== undefined) { setSubject(r.subject); setBody(r.body); }
            setStatus(r.message);
          })}>AIにやり直させる</button>
        ) : null}
      </div>

      <dialog ref={dlg} aria-labelledby="dh">
        <h2 id="dh">この内容で送りますか</h2>
        <p><b>宛先</b>　{p.to}</p>
        <p><b>件名</b>　{subject}</p>
        <pre>{finalText}</pre>
        <div className="actions">
          <button className="btn primary" type="button" disabled={busy} onClick={() => start(async () => {
            const r = await approveAction(p.draftId, subject, body);
            setDone(r);
            dlg.current?.close();
          })}>{busy ? "送信中…" : "この内容で送る"}</button>
          <button className="btn plain" type="button" disabled={busy} onClick={() => dlg.current?.close()}>もどって直す</button>
        </div>
      </dialog>
    </div>
  );
}
