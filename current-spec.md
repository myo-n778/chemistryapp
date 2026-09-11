# Chemistry Drill 現行仕様

更新: 2026-09-11。取得元 `main` / `20efce4`。今回の修正はローカルのみ。

## 目的と範囲

有機6モード・無機3モードの化学演習。ユーザー、学習記録、採点・効果音の既存方式を維持する。
今回の範囲は起動・問題取得・無機CSV対応・学習入口の改善。本番公開、GAS編集、Sheets更新は含まない。

## 接続と正本

- フロント: `src/`。React 18 / TypeScript / Vite。
- 問題ソース: Google Sheets `chemistry`、ID `1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0`。
- タブ: compounds / reactions / experiment / inorganic / rec / userStats。
- URL正本: `src/config/gasUrls.ts`。提示URLと既定値が一致。
- PROBLEM / REC / STATSは既定で同じ統合GAS。環境変数で上書き可能。
- 記録POSTはPROBLEMへ送信する既存仕様。RECは記録GET、STATSは成績GET。
- `GAS_CODE_UNIFIED.js` はローカルの統合候補。公開ソースとの同一性は未確認。
- `.env.txt`、`名称未設定.txt`、古い説明書のURLは現行設定ではない。
- `.github/workflows/deploy.yml` はmainへのpushで公開する設定。今回pushしていない。

## 復旧後の挙動

- 全Hooks実行後にユーザー未選択の画面を分岐し、作成・選択後もHooks順序を変えない。
- GASモードでは問題取得の失敗を空配列・古いCSV・旧localStorageの成功で隠さない。
- 同一の並行GETは共有し、15秒でタイムアウト。自動再試行はせず、画面で「再読み込み」を選ぶ。
- 分野を離れた後の応答は画面状態へ反映しない。読み込み中も分野選択へ戻れる。
- 無機シートは見出し名で対応。現行の equation_tex / reactants_tex / products_tex / conditions / observations / reaction_ja / reaction_before_ja / reaction_after_ja と旧列名を受け付ける。
- CSVの引用符内改行・カンマ・二重引用符を保持する。未知の必須列はエラーにする。
- 無機の固定90件を廃止し、回答欄のある出題可能な行を数える（確認時A90 / B41 / C77）。
- 出題範囲はAppだけで切り出す。B/Cの二重sliceを廃止。選択肢は出題範囲とは別に全シート行を母集団とする。
- 構造式モードは構造式が有効な化合物を数える。
- KaTeX mhchemはインストール済みKaTeXから同梱。実行時CDNを不要とする。
- 入口は日本語の分野選択を先に配置。記録・ランキングは折りたたみ。診断パネルは `?diagnostics` 指定時のみ。

## 外部とデータの未解決事項

- 旧URLは匿名GETで403。2026-09-11 20:04以降、ユーザーの新デプロイURLへローカルを切替。問題4種・記録・成績GETは200。有機・無機の実問題をローカルChromeで表示確認済み。
- 公開フロントは未更新。実記録POSTとSheets読戻しは未確認。
- 読取したシートは化合物74、反応34、実験18、無機90のデータ行。機能試験での件数と教材内容の正確さは別。
- inorganic!E2:E3に酸との反応に対応しない「酸素発生（助燃性）」が含まれる。内容監査待ち、シート未変更。
- 本番記録保存、公開ランキング、実iPad/Safari、教材全問の正確性、利用者受入は未確認。
- 古い個別GASファイルは参考用として残す。最新仕様と矛盾する場合は本書を優先。
