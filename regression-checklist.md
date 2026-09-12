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

## 文字サイズ変更の検証（2026-09-11 23時台）

- [x] TypeScript/Vite、git diff --check。
- [x] 全5段階の選択状態、文字サイズが順に増加、再読込後の保存。
- [x] 1280×900 / 390×900 / 844×390の無機Bで問題・選択肢を維持して変更、回答・Next、極大のページ横はみ出しなし。
- [x] 既存9モード開始・回答、無機B/C第2範囲、7件の実件数。
- [x] コンソールのアプリ例外なし。模擬rec/userStatsが空の既知警告のみ。
- [ ] 模擬403の手動再読み込み後、alert待ちが時間切れ。以前の通過結果と区別し今回未解決。
- [ ] 今回の公開反映、実iPad/Safari、本番保存、利用者受入。
- 証拠: /private/tmp/chemistry-font-test.cjs、chemistry-font-test.log、chemistry-font-regression.log、chemistry-font-error.log、chemistry-font-build.log。

## 三段階変更の検証（2026-09-11）

- [x] 小・中・大のroot文字サイズ16/20/24px、旧6種類の保存値（無効値を含む）移行、再読み込みで選択維持。
- [x] 320/768/1280px幅×9モードで入口・モード・範囲設定・問題・化学式切替・回答後の解説の枠内表示。
- [x] ユーザー一覧・作成、記録欄、ALL問題数設定、10問完了後の結果へ到達。本番保存は遮断し模擬POST各1回。
- [x] ユーザー向け旧TeX表示・極小・極大ラベルを除去（履歴・内部説明は保持）。
- [ ] 実iPad/Safari・公開反映・全問題の表示網羅。任意の端末・全データに対する無条件の保証ではない。
- 証拠: /private/tmp/chemistry-three-test.cjs、chemistry-three-test.log、chemistry-three-extra.cjs、chemistry-three-extra.log、chemistry-three-storage.cjs、chemistry-three-summary-320.png。

- [x] 最終順位行の折返し・日付改行後、結果画面3幅の自動検査と320px画像目視を通過。TypeScript/Vite・diff検査通過。

- [x] 通常表示中央配置: 無機A/B/C、320/1280pxで中央位置・折返し・化学式との切替・選択肢維持・アプリ例外なしを確認。画像目視済み。切替時の微小な高さ差はあり、完全固定高さではない。証拠 /private/tmp/chemistry-center-test.log。

## 2026-09-12 異常画面のボタン修正（ローカル、未公開）

読込中・通信エラー・空データ画面はstatus-panel/status-actionへ分離。固定54×24pxの演習ボタンを継承せず、自動幅高さ・中央配置・狭幅縦並びにした。修正前は枠内22pxに文字43/53pxの縦はみ出しを再現。320×900・844×390・1280×900の小中大で読込中・15秒タイムアウトの文字Range四辺と枠を照合し、全9組通過。模擬再読込→モード選択、画像目視、TypeScript/Vite・diffも通過。実通信・実iPad・公開は未確認。GAS/Sheets・通信処理・採点は未変更。前段の異常画面・縦方向の確認漏れはAIFT-20260912-001へ記録。

## 2026-09-12 色見本の検証

- [x] TypeScript/Viteビルド、色名ホワイトリスト、未知値無視、長い色名優先、旧CSV互換。
- [x] 正解以外の選択肢への正解色の流用なし、未記載の色名追加なし、表示時期3種。
- [x] Chrome 320×900 / 844×390 / 1280×900、無機A/B/Cの表示と回答、文字サイズ大。枠外文字検査PASS。
- [x] 320px幅の回答後画像を目視。長い式は従来どおり枠内横スクロール。
- [x] Sheets I1:M91の全値、A:H保持、文字列書式・入力規則読み戻し。既存GAS GETで新列取得。
- [ ] Sheetsネイティブ画面の目視（ブラウザ制御の起動でtrusted Node process exited unexpectedly）。
- [ ] 公開フロント、実iPad/Safari、実物の色との照合、教材全問内容監査、独立検証、利用者受入。

## 2026-09-12 公開反映完了

ユーザーの公開依頼により、色見本・三段階文字サイズ・中央配置・異常画面ボタンを5cd207bとしてmainへpush。GitHub Actions 34652838751成功。公開URL https://myo-n778.github.io/chemistryapp/ のJS/CSSがローカルdistと完全一致。公開サイトのChrome 390px幅・文字大・実GASデータで無機Aの11–20を開始し、4択・回答・色見本5個・解説・横はみ出しなしを確認し画像目視も通過。ブラウザ実行エラーなし。本番POSTは遮断し保存しなかった。Sheets追加列は先行反映済み、今回GAS/Sheetsは未変更。実iPad/Safari、全問内容、実記録保存、利用者受入は未確認。以前の未公開表記は各作業時点の履歴。

## 2026-09-12 通常表示の化学式添字

通常表示の無機問題・選択肢・解説の化学式をHTML sub/supで描画。Cl2→Cl₂、2H2→2H₂、Ca(OH)2→Ca(OH)₂。係数・水和物の先頭数は通常サイズ。Ca2+やFe3+の単原子イオン、NH4+、SO4^2-の明示的電荷を上付き表示。多原子イオンの電荷数はSO4^2-のように^で明示する。元素記号として成立する式だけを処理し、日付・温度・pH・英単語・既存Unicode添字は保持。色見本と共存し、TeX表示は既存KaTeXへ渡す。シートの原文・採点値・保存処理は未変更。
検証：TS/Viteとdiff通過。組成数・係数・括弧・水和物・電荷・通常数値の単体検証、320/844/1280pxの無機ABCの回答・色表示・旧データ互換・表示時期・枠検査通過。320px画像で添字の高さと通常係数を目視。初回は閉じ括弧後の数を候補抽出できず、抽出規則を修正して再検証した。実iPad/Safariと利用者受入は未確認。

公開確認：1f40e69を同じGitHub Pagesへ反映、Actions 34664033258成功。公開JS/CSSとdistの一致、公開アプリに検証用化学式を読ませた320px幅で下付き位置・通常係数・色表示・回答と解説・枠内表示を確認。検証用データはブラウザ内だけで使用しSheetsは未変更。

## 教材洗練（2026-09-12）

- [x] scripts/validate-learning.cjs：全行候補整合、正解位置到達、採点ID、無機A88/B40/C66、反応32・実験18・化合物74。
- [x] 分類：エステルを油脂、単糖・アミノ酸を高分子、ハロゲン化アルカンをアルカンにしない。
- [x] 9モード×3画面幅の回答・次問・ポイント表示、文字大、横はみ出し確認。
- [x] 新列欠損・不正JSONで明示エラー。保留を出題しない。
- [x] Sheets変更セル読み戻し、構造E:F保持、rec/userStats無変更。
- [ ] 実iPad/Safari・実記録保存・独立教材審査・利用者受入。

- [x] 分類実験の1–10/11–18は指定どおりの先頭、最後の範囲8問。
- [x] 最終公開6b679ce、Actions成功、JS/CSS一致、実GASの正解・ポイント・分類・4番目採点・サイズ変更で配置保持。


## 2026-09-12 無機単元3モードの検証

- [x] TypeScript/Vite、git diff --check。
- [x] 90既存IDが重複なく分類。保留除外A88/B40/C66、シート行順変更後も単元定義順。
- [x] 単元内ランダムは選択単元だけ、全体ランダムは全適格問題から重複なし。反復で全IDの抽出を確認。未分類追加IDの表示、単元別rangeKey分離。
- [x] Chrome 320×900 / 844×390 / 1280×900、A/B/C×3モード開始・回答・ポイント・選択肢位置保持。文字大、設定ボタンの横はみ出しなし、320px画像目視。
- [x] A/B/Cの最初の出題可能単元を完了し、結果→次の単元→1問目→回答を確認。本番POSTは遮断、模擬保存各1回。
- [x] 有機6モードの320px・文字大で開始・3問回答・次問・ポイントと枠を回帰確認。
- [ ] 実iPad/Safari、実保存先への記録、利用者受入、別担当による独立検証。

再現：npm run dev 起動後、PLAYWRIGHT_MODULEを設定して node scripts/validate-inorganic-units.cjs。記録の実送信は遮断する。証拠は /private/tmp/chemistry-units-validation.log、chemistry-units-organic.log、chemistry-units-build.log。公開結果は後続追記。


公開確認：9b7119aを同じGitHub Pagesへ反映。Actions 34673977769成功。公開JS/CSSがローカルdistと一致し、公開Chrome・実GASでA/B/C×3モードの開始・回答・覚えるポイントを確認。単元順Aの先頭は炭酸カルシウム＋塩酸。390px・文字大の公開画像を目視。本番POSTは遮断。Sheets/GASは今回変更せず、実iPad/Safari・実保存・独立検証・利用者受入は未確認。
