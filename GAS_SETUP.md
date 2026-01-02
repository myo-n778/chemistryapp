# Google Apps Script (GAS) セットアップガイド

このアプリは、Googleスプレッドシートから直接データを読み込むことができます。スプレッドシートでデータを編集すると、アプリに反映されます。

## メリット・デメリット

### メリット
- **修正が容易**: スプレッドシートで直接編集できる
- **リアルタイム更新**: スプレッドシートを更新すると、アプリに即座に反映される
- **共同編集**: 複数人で同時に編集可能

### デメリット
- **読み込みが遅い**: API呼び出しが必要なため、CSVより遅い
- **インターネット接続必須**: オフラインでは使用できない
- **セットアップが必要**: GASのデプロイが必要

## セットアップ手順

### 1. Googleスプレッドシートの準備

1. 新しいGoogleスプレッドシートを作成
2. スプレッドシートIDをコピー（URLの `/d/` と `/edit` の間の文字列）
   - 例: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - スプレッドシートID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

3. シート名を設定:
   - `compounds` シート: 化合物データ
   - `reactions` シート: 反応データ

4. データ形式は `README_DATA.md` を参照してください

### 2. Google Apps Script の作成

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を選択
2. **`GAS_CODE.js` ファイルの内容をコピーして貼り付けて保存**（推奨）
   
   または、以下のコードを貼り付けて保存:

```javascript
/**
 * スプレッドシートからデータを取得してJSON形式で返す
 */
function doGet(e) {
  const type = e.parameter.type || 'compounds';
  const category = e.parameter.category || 'organic';
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;
  let csvData;
  
  try {
    if (type === 'compounds') {
      sheet = spreadsheet.getSheetByName('compounds');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'compounds sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else if (type === 'reactions') {
      sheet = spreadsheet.getSheetByName('reactions');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'reactions sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Invalid type' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ csv: csvData }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * シートをCSV形式に変換
 */
function convertSheetToCSV(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return '';
  
  // ヘッダー行
  const headers = data[0];
  const csvRows = [headers.join(',')];
  
  // データ行
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // 空行をスキップ
    if (row.every(cell => cell === '' || cell === null)) continue;
    
    // セルの値をエスケープ（カンマや改行を含む場合）
    const escapedRow = row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const cellStr = String(cell);
      // カンマ、改行、ダブルクォートを含む場合はエスケープ
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    });
    
    csvRows.push(escapedRow.join(','));
  }
  
  return csvRows.join('\n');
}
```

### 3. GASのデプロイ

1. エディタ右上の「デプロイ」→「新しいデプロイ」をクリック
2. 種類の選択で「ウェブアプリ」を選択
3. 設定:
   - **説明**: 任意（例: "Chemistry Quiz Data API"）
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 「全員」を選択（重要！）
4. 「デプロイ」をクリック
5. **WebアプリのURL**をコピー（例: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`）

### 4. アプリの設定

1. `src/config/dataSource.ts` を開く
2. `DATA_SOURCE` を `'gas'` に変更
3. `GAS_URLS` にデプロイしたURLを設定:

```typescript
export const DATA_SOURCE: DataSource = 'gas';

export const GAS_URLS: Record<Category, string> = {
  organic: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  inorganic: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
};
```

### 5. CORS対応（必要に応じて）

GASのWebアプリはデフォルトでCORSに対応していますが、問題が発生する場合は:

1. GASエディタで「デプロイ」→「デプロイを管理」
2. アクティブなデプロイを選択して「編集」
3. 「次のユーザーとして実行」を「自分」に設定
4. 「アクセスできるユーザー」を「全員」に設定
5. 再デプロイ

## 使用方法

1. スプレッドシートでデータを編集
2. アプリをリロード（ブラウザの更新ボタン）
3. 新しいデータが読み込まれます

## トラブルシューティング

### データが読み込まれない

- GASのURLが正しいか確認
- スプレッドシートのシート名が `compounds` と `reactions` になっているか確認
- ブラウザのコンソールでエラーメッセージを確認

### CORSエラーが発生する

- GASのデプロイ設定で「アクセスできるユーザー」を「全員」に設定
- GASコードを再デプロイ

### 読み込みが遅い

- これは正常な動作です。GASはAPI呼び出しのため、CSVより遅くなります
- データはキャッシュされるため、2回目以降は少し速くなります

## CSVに戻す場合

`src/config/dataSource.ts` の `DATA_SOURCE` を `'csv'` に戻してください。

