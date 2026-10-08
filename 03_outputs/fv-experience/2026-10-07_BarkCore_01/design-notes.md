# ファーストビューの制作メモ

更新日：2026-10-07
用途：BarkCoreの事業紹介ホームページ用のPC版デザイン画像。
判断理由：既存資料に事業の説明と業務システムのサブスク収入を目指す方針があるため、会社の活動を紹介する入口としました。目標は以前の資料に記載された希望であり、達成済みではありません。

## 使った情報
- `01_knowledge/01_brand/company_profile.md`「理念・価値観」：言葉にできていない思いや希望を読み取る姿勢。出典S1。
- `01_knowledge/01_brand/brand_summary.md`：仕事を楽にするツールとホームページの制作。出典S1。
- `01_knowledge/01_brand/tone_voice/rules.md`：やさしく、落ち着いた丁寧な表現。出典S6・S8。
- `01_knowledge/01_brand/colors_fonts/rules.md`：信頼感がありつつ固くなりすぎない好み、ゴシック系。出典S5・S8。
- 元の出典位置は `01_knowledge/01_brand/source-map.md` に記録。

## コピーと提案の区別
主見出し：「仕事の困りごとを、話すところから。」
補足：「言葉にしづらい思いも、一緒に整理。仕事を楽にするツールやホームページをつくります。」
導入：「ITが苦手な会社の、身近な相談相手。」
社名：「株式会社BarkCore」。ヘッダーのBarkCoreは文字表記で、ロゴの制定ではありません。
見出し、ナビゲーション、「相談する」ボタンはAIによる表現の提案です。問い合わせ窓口や導線の実装はしていません。
温かい白、濃い青緑、淡い緑、控えめなテラコッタは今回だけの配色提案です。ブランドの確定ルールには戻していません。
紙が整理されたデジタルカードにつながる抽象的なイラストは、手作業を楽にする方向性を表した提案で、実際の製品画面ではありません。

## 生成プロンプト
Use case: ui-mockup. Create one polished Japanese desktop homepage first-view design image, landscape 16:9 within 1920x1080, for 株式会社BarkCore. Exact text: wordmark as plain typeset text "BarkCore"; small company label "株式会社BarkCore"; large headline split two lines "仕事の困りごとを、" "話すところから。"; subtitle "言葉にしづらい思いも、一緒に整理。" "仕事を楽にするツールやホームページをつくります。"; small eyebrow "ITが苦手な会社の、身近な相談相手。". Header navigation "私たちについて" "できること", button "相談する". Generous editorial whitespace, warm off-white background, dark blue-green typography, gentle pale green and muted terracotta accents (proposed colors, not established brand). Japanese gothic sans-serif typography, approachable calm trustworthy sophisticated composition. Left 55% typography, right 45% tasteful abstract illustration of paper sheets becoming connected neat digital cards, small plant-like organic forms, no people, no fabricated face or logo. Illustration expresses reducing manual work, no actual product screenshots or numeric metrics. No testimonials, awards, clients, prices, proven expertise, fake credentials. Ensure all Japanese text is accurate and not clipped. Only render specified copy. One full-bleed finished webpage hero mockup, no browser chrome, no device frame, no annotations.

内蔵image_genで生成。HPの実装・公開は対象外です。
