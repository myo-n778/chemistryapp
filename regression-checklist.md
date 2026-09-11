# 回帰チェック

検証日: 2026-09-11。Chrome headless / Playwright、localhost、実Sheetsの問題データを模擬GASとして返す。
本番へのPOSTと試験データの送信を遮断。実GAS疎通の証拠と混同しない。

- [x] `npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0` でlockfileを維持。
- [x] `npm run build`、TypeScript検査を通過。大きいチャンク等の既存警告は残る。
- [x] 変更したReact 7ファイルのHooks規則に違反なし。
- [x] 新規ユーザー作成から分野選択へ遷移（変更前はHooks例外で停止）。
- [x] 有機6モード、無機3モードの開始・回答・判定表示。
- [x] ③の種類選択は既存の全分類選択を維持。他の8モードは代表問題で4選択肢。
- [x] B/Cの11〜20問範囲を開始できる。二重sliceなし。各10問を完了し結果画面へ到達、保存要求は各1回（模擬応答・本番送信なし）。
- [x] CSVの引用符内改行・カンマ・二重引用符、TeX列対応、必須列不足エラー。
- [x] 無機7行だけの入力で範囲1〜7を表示し、81〜90は出さない。
- [x] 403は日本語で表示。自動再試行なし、手動再読み込み時だけ再要求。
- [x] 入口の1280×900、390×900表示を確認。横はみ出しなし。
- [x] 通常画面に診断パネルが重ならない。
- [x] 9モードのconsole errorなし。警告は模擬データの空rec/userStatsのみ（意図した試験条件）。
- [x] 化学式をCDN通信なしで表示。
- [x] 新GASの匿名GET: 問題4種・rec・userStatsが200。ローカルChromeで実GASの有機・無機問題を表示。
- [x] 公開フロント `4e739e4`: Actions build/deploy成功、配布JSがローカルと完全一致。有機問題4択表示確認。
- [x] 公開無機画面: ユーザー承認後の再確認でタイプB・11–20の4択表示、回答、Next表示を確認。通信・pageerrorなし、POSTなし。
- [ ] 本番記録保存後のSheets読戻し、公開ランキングの実データ照合。
- [ ] 実iPad / Safariの操作、実音声、教材全問監査。
- [ ] 利用者受入と公開後の回帰。

## 検証再現用の一時証拠

- `/private/tmp/chemistry-regression.cjs` / `chemistry-qa-results.json`
- `/private/tmp/chemistry-before.cjs`（変更前Hooks例外）
- `/private/tmp/chemistry-parser.cjs`（引用符・改行・列マッピング）
- `/private/tmp/chemistry-lint.cjs`（変更範囲のHooks規則）
- `/private/tmp/chemistry-build.log`

一時領域は永続保存ではない。再実行時はSheetsから問題データを読み直す。個人記録は試験データに含めない。
