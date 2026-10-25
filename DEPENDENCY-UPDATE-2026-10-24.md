# 依存更新の記録（2026-10-24）

KaTeXを0.18.2、Viteを保守対象の6.4.5、Rollupを4.65.0、esbuildを0.25.12へ更新しました。Node22.23.4とNode24対応Actionsへ変更し、PRではビルドと模擬AI/GASテストだけを実行します。

旧loadInorganicReactionsDataは定義以外の参照がなく、その動的import先inorganicQuizLoader.tsだけがxlsxを使用していました。現在のAppはGAS/CSV経路を使用します。この未使用経路とxlsx・型stub @types/xlsxを削除しました。react-katexも実importがなく削除しました。診断画面のmhchemも同一npmパッケージへ統一しました。lockfileにxlsx・react-katex・旧KaTeXは残りません。教材・採点・GAS接続先・保存形式は変更していません。

## 検証

npm ci、TypeScript/Viteビルド、test:ai、test:ai:gas、依存重複と削除結果を確認しました。Chrome headlessの既存ユーザー保存値で無機fixtureを読み、化学式切替・回答・解説・次問をデスクトップと390px幅で確認しました。3問を完了し、問題ログ3件と学習履歴が再読込後も保持されることを確認しました。

## 未確認と反映境界

全外部データ要求を模擬化し、実GAS・AI・生徒データへ接続していません。Safari/iPad実機、全モード・全問題、本番記録保存は未確認です。

本記録はブランチ上の変更です。main merge、GitHub Pages本番deploy、nativeリリースは実施していません。

根拠: https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7
