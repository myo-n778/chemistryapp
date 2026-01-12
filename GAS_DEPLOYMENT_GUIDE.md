# GAS再デプロイ手順

## 現在の状況

ヘルスチェックにより、以下のURL割当が誤っていることが判明しました：

- **REC_BASE_URL**: userStats専用GASが設定されている（誤り）
- **PROBLEM_BASE_URL**: userStats専用GASが設定されている（誤り）
- **STATS_BASE_URL**: userStats専用GASが正しく設定されている（✓）

## 必要なGASプロジェクト

以下の3つのGASプロジェクトが必要です：

1. **問題データ用GAS** (`GAS_CODE.js`)
   - 用途: 化合物・反応・実験・無機化学データの取得
   - パラメータ: `?type=compounds|reactions|experiment|inorganic-new&category=organic|inorganic`
   - 返却形式: `{csv:"..."}` または CSV文字列

2. **rec専用GAS** (`GAS_CODE_REC_ONLY.js`)
   - 用途: recシートの読み取り
   - パラメータ: `?action=rec`
   - 返却形式: JSON配列 `[{...},{...}]`

3. **userStats専用GAS** (`GAS_CODE_USERSTATS.js`)
   - 用途: userStatsシートの読み取り
   - パラメータ: `?action=userStats`
   - 返却形式: JSON配列 `[{...},{...}]`
   - **✓ 既に正しくデプロイ済み**

## 再デプロイ手順

### 1. 問題データ用GASのデプロイ

1. **新しいGASプロジェクトを作成**
   - Googleドライブで「新規」→「その他」→「Google Apps Script」
   - または、既存のスプレッドシートから「拡張機能」→「Apps Script」

2. **`GAS_CODE.js` の内容をコピー**
   - プロジェクト内の `GAS_CODE.js` ファイルを開く
   - 全内容をコピーして、GASエディタに貼り付ける

3. **スプレッドシートIDを設定**
   - `GAS_CODE.js` 内の `SPREADSHEET_ID` を、問題データが入っているスプレッドシートIDに変更
   - スプレッドシートIDは、URLの `/d/` と `/edit` の間の文字列

4. **デプロイ**
   - 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
   - 設定:
     - **説明**: "Chemistry Quiz Problem Data API"
     - **次のユーザーとして実行**: 自分
     - **アクセスできるユーザー**: 全員
   - 「デプロイ」をクリック

5. **WebアプリのURLをコピー**
   - デプロイ後に表示されるURL（例: `https://script.google.com/macros/s/XXXXX/exec`）をコピー
   - このURLを `PROBLEM_BASE_URL` に設定

### 2. rec専用GASのデプロイ

1. **新しいGASプロジェクトを作成**
   - Googleドライブで「新規」→「その他」→「Google Apps Script」

2. **`GAS_CODE_REC_ONLY.js` の内容をコピー**
   - プロジェクト内の `GAS_CODE_REC_ONLY.js` ファイルを開く
   - 全内容をコピーして、GASエディタに貼り付ける

3. **スプレッドシートIDを設定**
   - `GAS_CODE_REC_ONLY.js` 内の `'1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0'` を、recシートが入っているスプレッドシートIDに変更

4. **デプロイ**
   - 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
   - 設定:
     - **説明**: "Chemistry Quiz Rec Data API"
     - **次のユーザーとして実行**: 自分
     - **アクセスできるユーザー**: 全員
   - 「デプロイ」をクリック

5. **WebアプリのURLをコピー**
   - デプロイ後に表示されるURLをコピー
   - このURLを `REC_BASE_URL` に設定

### 3. userStats専用GASの確認

- **✓ 既に正しくデプロイ済み**
- URL: `https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec`
- このURLは変更不要

## URL設定方法

### 方法1: 環境変数で設定（推奨）

`.env` ファイルを作成（プロジェクトルート）:

```env
VITE_GAS_URL_PROBLEM=https://script.google.com/macros/s/YOUR_PROBLEM_GAS_ID/exec
VITE_GAS_URL_REC=https://script.google.com/macros/s/YOUR_REC_GAS_ID/exec
VITE_GAS_URL_USERSTATS=https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec
```

### 方法2: コードで直接設定

`src/config/gasUrls.ts` を編集:

```typescript
export const PROBLEM_BASE_URL = import.meta.env.VITE_GAS_URL_PROBLEM || 
  'https://script.google.com/macros/s/YOUR_PROBLEM_GAS_ID/exec';

export const REC_BASE_URL = import.meta.env.VITE_GAS_URL_REC || 
  'https://script.google.com/macros/s/YOUR_REC_GAS_ID/exec';

export const STATS_BASE_URL = import.meta.env.VITE_GAS_URL_USERSTATS || 
  'https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec';
```

## 動作確認

1. アプリを起動
2. 画面右上の「GAS エンドポイント ヘルスチェック」パネルを確認
3. すべてのチェックが ✓ になればOK

## エラーが表示される場合

- **REC (rec専用)**: `REC_BASE_URL` が正しく設定されているか確認
- **STATS (userStats専用)**: 既に正しく設定されているはず
- **PROBLEM (問題データ)**: `PROBLEM_BASE_URL` が正しく設定されているか確認

各URLをブラウザで直接開いて、期待される形式が返るか確認してください。
