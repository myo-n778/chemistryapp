# GAS統合版 変更点の要約

## 作成ファイル

- **GAS_CODE_UNIFIED.js**: 3本のGAS（問題CSV / rec / userStats）を1本に統合

## 統合内容

### 既存ファイルからの統合

1. **GAS_CODE.js** から統合:
   - 問題データ取得（CSV形式）
   - recデータ取得（`getAllRecData()`）
   - POST処理（rec追記＋userStats更新）
   - `aggregateUserData()` 関数
   - `updateUserStats()` 関数
   - `backfillUserStatsFromRec()` 関数
   - `convertSheetToCSV()` 関数

2. **GAS_CODE_REC_ONLY.js** から統合:
   - recデータ取得のロジック（`getAllRecData()`）

3. **GAS_CODE_USERSTATS.js** から統合:
   - userStatsデータ取得のロジック（`getAllUserStats()`）

## 主な変更点

### 1. doGet() の処理順序（混線防止）

**重要**: action判定を最優先に処理

```javascript
// 1. action判定（最優先）
if (e.parameter.action) {
  if (action === 'rec') { ... }
  if (action === 'userStats') { ... }
  if (action === 'health') { ... }
}

// 2. actionがない場合のみtype判定
const type = e.parameter.type;
if (!type) {
  return { error: 'Invalid request...' };
}
// 問題データ取得
```

### 2. 返却形式の明確化

- **action=rec**: JSON配列 `[{...},{...}]`（CSVを返さない）
- **action=userStats**: JSON配列 `[{...},{...}]`（CSVを返さない）
- **action=health**: JSON `{ok:true, endpoints:{...}}`
- **type=compounds等**: JSON `{csv:"..."}`（JSON配列を返さない）
- **エラー時**: JSON `{error:"..."}`（HTMLを返さない）

### 3. デフォルト動作の削除

- `/exec` を直叩きしても、勝手にCSVを返さない
- actionもtypeもない場合はエラーを返す

### 4. POST処理の改善

- `recordedAt` は必ず `Date.now()`（ms）で保存
- `recordedAtReadable` を自動生成
- `userStats` の更新は複合キー（`userKey + name`）で判定

### 5. 新機能追加

- **ヘルスチェック**: `?action=health` でエンドポイントの状態を確認

## チェックリスト（満たしている）

- ✅ `action=rec` を叩いた時に `{csv:"..."}` が絶対に返らない
- ✅ `type=compounds` を叩いた時に JSON配列や userStatsエラーが絶対に返らない
- ✅ `action=userStats` を叩いた時に recの配列が返らない
- ✅ action未指定で `/exec` を叩いたら error JSON が返る（勝手にCSVを返さない）
- ✅ POST保存後に userStats が加算更新される（複合キー）

## 直叩きテストURL例

統合GASをデプロイした後、以下のURLで動作確認してください：

### 1. recデータ取得
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=rec
```
**期待される結果**: JSON配列 `[{name:"...", userKey:"...", ...}, ...]`

### 2. userStatsデータ取得
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=userStats
```
**期待される結果**: JSON配列 `[{userKey:"...", name:"...", exp:0, ...}, ...]` または `[]`（データ0件の場合）

### 3. 問題データ取得（compounds）
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?type=compounds&category=organic
```
**期待される結果**: JSON `{csv:"メタン,CH4,..."}`

### 4. ヘルスチェック（任意）
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=health
```
**期待される結果**: JSON `{ok:true, endpoints:{rec:"available", userStats:"available", compounds:"available"}, spreadsheetId:"..."}`

### 5. エラー確認（action/type未指定）
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```
**期待される結果**: JSON `{error:"Invalid request. Use action=rec, action=userStats, action=health, or type=compounds|reactions|experiment|inorganic-new"}`

## デプロイ手順

1. 新しいGASプロジェクトを作成
2. `GAS_CODE_UNIFIED.js` の内容を貼り付ける
3. `SPREADSHEET_ID` を既存のスプレッドシートIDに変更
4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
5. 設定:
   - **説明**: "Chemistry Quiz Unified API"
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 全員
6. WebアプリのURLをコピー
7. フロントエンドの `src/config/gasUrls.ts` を更新:
   - `PROBLEM_BASE_URL`, `REC_BASE_URL`, `STATS_BASE_URL` すべてを同じURLに設定

## 注意事項

- 既存の3本のGASは削除せず、参考として残しておくことを推奨
- 統合GASをデプロイ後、フロントエンドのURL設定を更新する必要がある
- `backfillUserStatsFromRec()` は手動実行が必要（GASエディタから実行）
