# 統合GASデプロイ手順

## 重要：GASエディタでの注意事項

統合GAS（`GAS_CODE_UNIFIED.js`）をデプロイする際、**既存のGASファイル（GAS_CODE.js、GAS_CODE_REC_ONLY.js、GAS_CODE_USERSTATS.js）と一緒に配置しないでください**。

### エラーが発生する場合

**エラー**: `SyntaxError: Identifier 'SPREADSHEET_ID' has already been declared`

**原因**: GASエディタに複数のファイルがあり、同じ変数名（`SPREADSHEET_ID`）が重複宣言されている

**解決方法**:
1. **推奨**: 新しいGASプロジェクトを作成し、`GAS_CODE_UNIFIED.js`のみを配置
2. **既存プロジェクトを使用する場合**: 既存のファイル（GAS_CODE.js等）を削除または別のファイル名に変更

## デプロイ手順

### 方法1: 新しいGASプロジェクトを作成（推奨）

1. **新しいGASプロジェクトを作成**
   - Googleドライブで「新規」→「その他」→「Google Apps Script」
   - または、[script.google.com](https://script.google.com) から「新しいプロジェクト」

2. **ファイル名を変更**
   - デフォルトの `コード.gs` を `unify` または `GAS_CODE_UNIFIED` に変更（任意）

3. **コードを貼り付け**
   - `GAS_CODE_UNIFIED.js` の全内容をコピー
   - GASエディタに貼り付ける

4. **SPREADSHEET_ID を確認**
   - 20行目の `SPREADSHEET_ID` が正しいスプレッドシートIDになっているか確認
   - 現在の値: `'1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0'`

5. **デプロイ**
   - 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択
   - 設定:
     - **説明**: "Chemistry Quiz Unified API"
     - **次のユーザーとして実行**: 自分
     - **アクセスできるユーザー**: 全員
   - 「デプロイ」をクリック

6. **WebアプリのURLをコピー**
   - デプロイ後に表示されるURLをコピー
   - 例: `https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec`

### 方法2: 既存のGASプロジェクトを使用する場合

1. **既存ファイルを削除またはリネーム**
   - `GAS_CODE.js` → 削除または `GAS_CODE_OLD.js` にリネーム
   - `GAS_CODE_REC_ONLY.js` → 削除または `GAS_CODE_REC_ONLY_OLD.js` にリネーム
   - `GAS_CODE_USERSTATS.js` → 削除または `GAS_CODE_USERSTATS_OLD.js` にリネーム

2. **新しいファイルを作成**
   - 「ファイル」→「新規」→「スクリプト」
   - ファイル名: `unify` または `GAS_CODE_UNIFIED`

3. **コードを貼り付け**
   - `GAS_CODE_UNIFIED.js` の全内容をコピー
   - 新しいファイルに貼り付ける

4. **以降は方法1の手順4-6と同じ**

## フロントエンドの設定

統合GASをデプロイした後、フロントエンドの `src/config/gasUrls.ts` を更新してください。

**既に更新済み**: 統合GASのURLが設定されています。

```typescript
const UNIFIED_GAS_URL = 'https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec';

export const PROBLEM_BASE_URL = UNIFIED_GAS_URL;
export const REC_BASE_URL = UNIFIED_GAS_URL;
export const STATS_BASE_URL = UNIFIED_GAS_URL;
```

## 動作確認

以下のURLで動作確認してください：

1. **recデータ取得**
   ```
   https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?action=rec
   ```
   期待: JSON配列 `[{...},{...}]`

2. **userStatsデータ取得**
   ```
   https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?action=userStats
   ```
   期待: JSON配列 `[{...},{...}]` または `[]`

3. **問題データ取得**
   ```
   https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?type=compounds&category=organic
   ```
   期待: JSON `{csv:"メタン,CH4,..."}`

4. **ヘルスチェック**
   ```
   https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?action=health
   ```
   期待: JSON `{ok:true, endpoints:{...}}`

## トラブルシューティング

### SPREADSHEET_ID 重複エラー

**症状**: `SyntaxError: Identifier 'SPREADSHEET_ID' has already been declared`

**解決方法**:
1. GASエディタで他のファイル（GAS_CODE.js等）を削除
2. または、新しいGASプロジェクトを作成して統合GASのみを配置

### 既存の3本のGASはどうする？

- **削除**: 統合GASが動作確認できたら削除してOK
- **バックアップ**: 念のため別のGASプロジェクトにコピーして保存しておくことを推奨
