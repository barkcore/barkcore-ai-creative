---
name: barkcore-hp-production
description: BarkCoreのナレッジを使って会社HP・コーポレートサイト・サービス紹介LPを制作する。不足を1問ずつ確認し、構成と文章、参考2〜3案、詳細なデザイン指示書を経て、PCスマホで動くトップから実装する。アプリの操作画面制作は対象外。
---
# HP制作
作業場所のAGENTS.mdと01_knowledgeの指示に従う。このスキルは手順、料金・ブランド・好みはナレッジが正本。顧客案件の情報を優先し、BarkCoreの自己紹介・実績を顧客に流用しない。
## 進め方：各工程の「作る前」に、指定の資料を必ず開く
作業場所のAGENTS.mdに従い、01_knowledgeは基礎知識として読んでおく。そのうえで、下の各工程は**作り始める前に、指定のファイルを実際に開く**。開いたら、工程の終わりに「読んだ資料：…」を1行で報告する。ここに書いたことを他のファイルへ複製しない。
1. **案件を受け取る。** 先に `02_projects/案件名/` と `01_knowledge/01_brand/brand_summary.md` と `06_workflow/hp-workflow.md` を開く。既知・不足・矛盾を整理。不足があれば `06_workflow/intake/hp.md` を開き、不足を1つずつ質問して回答を待つ。属性を推測で埋めない。重要な未確認が残れば制作を進めない。
2. **構成・主要原稿を作る。** 先に `06_workflow/design-basics.md`（1〜3章）と `05_winning_feedback/checklists/visual-quality.md`（2章）を開く。セクションごとの役割表を作り、構成と主要原稿を示して確認を待つ。商品条件が絡むときは `02_product/offer/hp-plan.md` を開く。
3. **参考を探して2〜3方向を提案する。** 先に `04_assets_references/inspiration_moodboard/index.md` と `research-rules.md`、`design-basics.md`（5章）を開く。一覧に合うものがなければ、research-rulesの4サイトを調べる。理由・取り入れる部分・画像方向を添える。色違いだけの案にしない。
4. **デザイン案を画像で作る。** 先に `04_skills/frontend-design/SKILL.md`、`05_winning_feedback/checklists/ai-look-avoidance.md`、`visual-quality.md`（4〜6章）、`01_brand/colors_fonts/rules.md`、`01_brand/tone_voice/rules.md` を開く。設計メモを作り、定番になっていないか自己点検する。提示前に visual-quality の品質条件で確認し、問題があれば直してから見せる。
5. **本人が1案を選んだら、実装前に審美眼。** 先に `04_skills/barkcore-design-improve/SKILL.md` を開く。45項目診断→最優先3点修正→前後比較→再診断を一巡し、本人に見せて確認を受ける（下の「審美眼」参照）。
6. **詳細指示書を作る。** 先に `06_workflow/design-spec.md` を開く。選ばれた参考を画面で確認し、注釈スクショと寸法・文字・動き・スマホの具体指示を `02_projects/案件名/design-direction.md` へ。観察と提案を分け、確認後に実装へ進む。
7. **トップから実装する。** 先に `06_workflow/quality-skills.md` を開く。トップだけをまずPC・スマホで動く形にし、確認後に残りを作る。実装の依頼がある場合は画像だけで完成にしない。既存リポジトリならその構成に従う。
   実装直後に `04_skills/baseline-ui/SKILL.md` を開いて点検。動きを入れたら `fixing-motion-performance/SKILL.md`、ボタン・フォーム・メニューがあれば `fixing-accessibility/SKILL.md` も開く。
8. **実画面で最終確認する。** 先に `05_winning_feedback/checklists/review.md` と `visual-quality.md`（6章）を開く。PC・スマホの実画面と操作を確認する。確認していない画面・操作は「未検証」と書く。
9. **報告・引き渡し。** 先に `06_workflow/sales-handoff.md` を開く。保存先・試し方・使ったスキル・未検証・次段階を報告し、営業へ渡せる説明メモを添える。
ユーザーの確認は経過時間で代替しない。すべての質問票を一度に配らない。外部公開・送信・契約・既存ファイル上書きはAGENTS.mdどおり内容を示して許可を得る。確認用スクショを実装素材として流用しない。
**途中から再開するときも、いまの工程の「先に開く」資料を開き直す。**

## デザイン案が決まった後の審美眼
全候補に一律で修正をかけず、選択・方向確認済みの1案を対象にする。
HPはデザイン案2〜3案から本人が選んだ1案、自社サービスは提案するUIUX1案を本人が確認した後。
実装前に画像または画面として見られるデザイン案を作り、`04_skills/barkcore-design-improve/SKILL.md` で45項目診断→最優先3点修正→前後比較→45項目再診断を一巡する。
結果と改善後の案を本人に見せ、確認後に詳細指示書を実装用に整えて実装へ進む。実装後の表示・動作チェックは別に行う。
デザイン画像がないのに文章だけで採点しない。具体的な画像・画面を用意できない場合は未実施と説明する。既存ファイルの上書き・外部公開の許可条件は変わらない。
