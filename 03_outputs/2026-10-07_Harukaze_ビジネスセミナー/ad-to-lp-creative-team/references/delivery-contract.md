# 納品形式

会話と `00_README.md` のパック名は「Harukaze式AIクリエイティブ組織構築パック」に統一する。専用フォルダ名もこの名称とする。同名フォルダがある場合は上書きせず末尾へ連番を付ける。

選択した案件に応じ、`02_OUTPUT/A_business_seminar/`、`B_beauty/`、`C_kids_english/` を作成。自分の商品は `02_OUTPUT/D_custom_product/` へ保存し、案件名はbriefとREADMEに記録する。同ジャンルで再制作する場合は既存物を勝手に上書きせず、別バージョンへ保存。

```text
00_README.md                 成果物リンク・開き方・完成/未完成
01_strategy/brief.md         練習設定または商品事実・出典・仮説・禁止事項
01_strategy/message-map.md  3広告→1LPの接続
01_strategy/design-direction.md  Harukaze式の設計根拠
03_ads/ad-copy.md            広告3案の全文
03_ads/prompts.md            生成指示・使用ツール・モデルの確認状況
03_ads/outputs/             実画像（生成できたときのみ）
04_lp/copy.md                LP完成原稿
04_lp/index.html             PC/スマホ対応デモLP
04_lp/assets/               実装用素材
05_qa/quality-report.md     導線整合表・画像と表示の検品・未検証・要確認
```

不要な空フォルダは作らない。HTMLは相対パスで画像を参照し、特定PCの絶対パスに依存しない。READMEにローカルの開き方を記載。A/B/Cは架空の練習案件、自分の商品は確認用制作物と区別し、どちらも実申込・販売・公開はしていないことを伝える。
