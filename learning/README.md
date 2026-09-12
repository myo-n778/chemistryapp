# 学習用の選択肢・ポイント

このJSONは2026-09-12に実シートから作成した教材編集用ミラーです。実行時は既存Sheets `chemistry` をGAS経由で読みます。JSONを編集しただけでは公開教材は変わりません。シートの最新値と比較し、対応するセルだけを更新して読み戻します。rec/userStatsは対象外です。

- inorganic.json：既存A:Mに、N learning_point、O/P/Q a/b/c_distractors_json、R a_context、S b_prompt、T c_prompt、U learning_status、V question_id、W b_answerを追加。b_answerはBの正答で、元のD条件と分離。
- reactions.json：A:Eを維持・必要箇所訂正、F product_distractors_json、G reagent_distractors_json、H learning_point、I question_id、J learning_status。
- experiments.json：実シート名はexperiment。A question、B:E候補1〜4、F answer（元の候補番号）、G explanation、H question_id。空の候補は表示せず、元番号を付けたままシャッフルして採点する。
- compounds.json：A:F既存データ、G choice_ids_json、H learning_point。候補IDは文字列配列。今回構造E:Fは変更せず、C74のみキノンへ訂正。

誤答JSONは `[{"text":"候補","reason":"区別するポイント"}]`。正解と重複しない1〜3件とし、化学的に同じ意味の別表現も重複として避けます。理由がポイントと同一なら画面に重ねて表示しません。無機A/Cの色名は全候補に同じ規則で色を付けます。

保留は `learning_status=保留`。無機inorg-082（2NO2+水の反応を他の総括反応と条件分離できない行）、inorg-087（inorg-050と同じZn(OH)2の錯形成）、有機org-r-001/002（org-r-003と重複）を保持したまま出題から外しました。行番号は見出しを含めるとそれぞれ83/88、2/3です。

化合物のマルトースとラクトースは現行図の立体区別が十分でないため互いを誤答にしません。各図そのものの立体化学を全面改修したものではありません。分類はCompoundTypeQuizの明示的な候補規則を使います。

検証：Viteを5173番で起動し、`PLAYWRIGHT_MODULE=<playwrightの絶対パス> node scripts/validate-learning.cjs` を実行します。全行の読込・候補・分類・正解位置の対応を検査します。実内容の第三者審査や実機確認とは区別してください。
