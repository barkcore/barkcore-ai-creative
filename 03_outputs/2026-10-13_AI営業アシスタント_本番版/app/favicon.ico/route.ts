// ロゴは作らない方針のため、アイコンは用意しない（404の記録が残らないよう空で返す）
export function GET() {
  return new Response(null, { status: 204 });
}
