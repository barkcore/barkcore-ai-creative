// メール送信の差し込み口。まだ送信方法（Zoho・Gmail・その他）が決まっていないため、
// 初期状態は「未設定」で、送ろうとしても何も送らず理由を返す。
export type SendInput = { to: string; subject: string; body: string };
export type SendResult = { ok: true; messageId: string } | { ok: false; reason: string };

export interface Mailer {
  readonly configured: boolean;
  send(input: SendInput): Promise<SendResult>;
}

export const notConfiguredMailer: Mailer = {
  configured: false,
  async send() {
    return { ok: false, reason: "メールの送信はまだ設定されていません。" };
  },
};

export function getMailer(): Mailer {
  return notConfiguredMailer;
}
