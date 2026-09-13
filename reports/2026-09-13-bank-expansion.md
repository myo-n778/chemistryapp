# Chemistry Drill 問題増補（2026-09-13）

## 今回の成果と境界

既存18問を保持し、有機60問・無機60問を追加。experimentシートのA:Hを維持し、I category / J unitを追加する。既存18問の本文・答え・IDは変更しない。有機は⑥「知識・実験・構造決定」78問、無機はタイプD「知識・実験」60問。無機ABC・有機化合物・有機反応の教材は変更しない。

全元教材の有効行は212から332へ増える。同じ知識の逆向き出題は別の知識として数えない。追加した120問で大学受験全体を網羅したとはしない。長文資料・グラフ読解・高度な多段階構造決定・志望校別演習は残る。

## 追加分野とID

| 分野 | 単元 | 追加数 | ID |
|---|---|---:|---|
| 有機 | 異性体 | 7 | org-k-001, org-k-002, org-k-003, org-k-004, org-k-005, org-k-006, org-k-007 |
| 有機 | 構造決定 | 8 | org-k-008, org-k-009, org-k-010, org-k-011, org-k-012, org-k-013, org-k-059, org-k-060 |
| 有機 | 芳香族・分離 | 7 | org-k-014, org-k-015, org-k-016, org-k-017, org-k-018, org-k-019, org-k-020 |
| 有機 | 油脂・洗剤 | 8 | org-k-021, org-k-022, org-k-023, org-k-024, org-k-025, org-k-026, org-k-027, org-k-028 |
| 有機 | 糖 | 4 | org-k-029, org-k-030, org-k-031, org-k-032 |
| 有機 | アミノ酸・タンパク質 | 8 | org-k-033, org-k-034, org-k-035, org-k-036, org-k-037, org-k-038, org-k-039, org-k-040 |
| 有機 | 合成高分子 | 10 | org-k-041, org-k-042, org-k-043, org-k-044, org-k-045, org-k-046, org-k-047, org-k-048, org-k-049, org-k-050 |
| 有機 | 計算 | 5 | org-k-051, org-k-052, org-k-053, org-k-054, org-k-055 |
| 有機 | 反応経路 | 3 | org-k-056, org-k-057, org-k-058 |
| 無機 | 気体・実験 | 11 | inorg-k-001, inorg-k-002, inorg-k-003, inorg-k-004, inorg-k-005, inorg-k-006, inorg-k-007, inorg-k-008, inorg-k-009, inorg-k-010, inorg-k-059 |
| 無機 | 典型元素 | 13 | inorg-k-011, inorg-k-012, inorg-k-013, inorg-k-014, inorg-k-015, inorg-k-016, inorg-k-017, inorg-k-018, inorg-k-019, inorg-k-020, inorg-k-021, inorg-k-022, inorg-k-060 |
| 無機 | 金属・工業 | 12 | inorg-k-023, inorg-k-024, inorg-k-025, inorg-k-026, inorg-k-027, inorg-k-028, inorg-k-029, inorg-k-030, inorg-k-031, inorg-k-032, inorg-k-033, inorg-k-034 |
| 無機 | 系統分離 | 10 | inorg-k-035, inorg-k-036, inorg-k-037, inorg-k-038, inorg-k-039, inorg-k-040, inorg-k-041, inorg-k-042, inorg-k-043, inorg-k-044 |
| 無機 | 酸化還元 | 4 | inorg-k-045, inorg-k-046, inorg-k-047, inorg-k-048 |
| 無機 | 電気分解 | 4 | inorg-k-049, inorg-k-050, inorg-k-051, inorg-k-052 |
| 無機 | 計算 | 6 | inorg-k-053, inorg-k-054, inorg-k-055, inorg-k-056, inorg-k-057, inorg-k-058 |

## 内容照合

原稿はこのタスクで作成した。必要条件・単位を設問に置き、解説には区別点または計算過程を記載。正答欄は1〜4へ分散し、画面側でも既存の選択肢シャッフルを使う。4候補の重複とID重複を機械検査、全問題の条件・正答・解説を自己点検。別担当による独立審査とはしない。

計算再検算：元素分析C:H:O=0.010:0.020:0.010、CH2O式量30と分子量60よりC2H4O2。重合度28000/28=1000、38400/192=200。トリペプチド3×75−2×18=189。油脂分子量3×56×1000/168=1000。水素化0.20×3=0.60mol。電気分解0.010×2×96500=1930C。滴定0.0200×0.0100×5/0.0200=0.0500mol/L。AgCl 0.020×143.5=2.87g。

条件差の確認資料：
- [RSCのアンモニア実験](https://edu.rsc.org/experiments/making-and-testing-ammonia/433.article)：CaOによる乾燥。
- [日本化学会：キサントプロテイン反応の条件と記述差](https://www.jstage.jst.go.jp/article/kakyoshi/64/3/64_KJ00010257719/_article/-char/ja/)：すべての芳香族アミノ酸が同条件で強く呈色するとはしない。
- [有明高専紀要15号](https://www.ariake-nct.ac.jp/wp3/wp-content/uploads/2021/08/kiyo-No.15.pdf)：両性水酸化物と液性による硫化物分離。

## 実装

GASの既存type=experimentが全列をCSVとして返すことをローカル正本で確認。GASコードの変更・再デプロイはしない。フロントでcategoryを分離し、categoryがない既存行はorganicと扱う。無機もタイプ選択後に必要な教材だけ取得し、ABCの失敗でDを止めない。Dの成績はexperiment-inorganic、category=inorganic。有機の既存キーは維持する。

## 検証と反映

TypeScript/Vite、全行のパース・正答対応・選択肢シャッフル、既存有機6タイプの3幅回帰、無機ABCの単元UI回帰を確認。新規出題の全件画面試験は実行中。

実Sheetsはexperiment!A1:J139を読取り、既存18問以外の追加先が空欄で、数式・入力規則・チップがないことを確認。公開フロントを先に更新し、その後Sheetsの追加セルのみを更新・読み戻す予定。

実GAS再接続は従前の許可回答待ちのため試していない。模擬GASでの出題検証と実Sheets読戻しを区別する。実iPad/Safari・本番保存・利用者受入は未確認。APIモードの設定・呼出しは実施しない。


ローカル検証完了：全138問を320px・文字大で順に表示し、正解／不正解を交互に選択。全問の正答強調・解説・Next・最終セッションのcategory/modeを確認。844/1280pxの両カテゴリ、既存有機6タイプ×3幅、無機ABC×3学習モード×4条件も通過。見出しのカテゴリ表示と多原子イオン電荷の表記を修正後、両カテゴリ×3幅を再確認。TypeScript/Vite・差分検査はPASS。試験のGASは模擬応答で、本番POSTは遮断。実シート既存18問のA:Hはミラーと完全一致。
