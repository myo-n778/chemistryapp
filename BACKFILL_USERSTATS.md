# userStats シートの初期生成手順

`userStats`シートが空の場合、既存の`rec`データから`userStats`を生成する必要があります。

## 方法1: GASエディタから手動実行（推奨）

1. **問題データ用GAS（GAS_CODE.js）を開く**
   - Google Apps Scriptエディタで`GAS_CODE.js`を開く
   - スプレッドシートID: `1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0`

2. **`backfillUserStatsFromRec()`関数を実行**
   - エディタ上部の関数選択ドロップダウンから`backfillUserStatsFromRec`を選択
   - 「実行」ボタンをクリック
   - 初回実行時は承認が必要な場合があります（「権限を確認」→「詳細」→「安全でないページに移動」）

3. **実行結果を確認**
   - 実行ログに「Backfill completed. N users processed.」と表示される
   - スプレッドシートの`userStats`シートにデータが生成されていることを確認

## 方法2: ブラウザのコンソールから実行（開発用）

```javascript
// 問題データ用GASのURLに直接アクセスして実行
// 注意: この方法はGAS側でdoGetにbackfill機能を追加する必要がある
```

## 確認

実行後、以下を確認してください：

1. **userStatsシートにデータが生成されている**
   - スプレッドシートの`userStats`シートを開く
   - ヘッダー行: `userKey, name, isPublic, exp, totalCorrect, totalQuestions, sess, lastAt, updatedAt`
   - データ行が存在することを確認

2. **フロントエンドでuserStatsが取得できる**
   - ブラウザの開発者ツールでコンソールを開く
   - `STATS_BASE_URL?action=userStats`にアクセス
   - JSON配列が返り、要素数が0でないことを確認

## トラブルシューティング

### userStatsシートが存在しない場合

`backfillUserStatsFromRec()`関数内で`getUserStatsSheet()`が呼ばれ、シートが自動的に作成されます。

### データが正しく生成されない場合

1. `rec`シートにデータが存在することを確認
2. `rec`シートの列構造が正しいことを確認（name, userKey, mode, correctCount, totalCount, recordedAt等）
3. GASの実行ログを確認してエラーがないか確認
