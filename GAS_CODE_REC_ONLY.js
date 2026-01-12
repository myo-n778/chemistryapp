/**
 * rec専用 Google Apps Script
 * このコードを新しいGASプロジェクトに貼り付けてください
 * 
 * 【使い方】
 * 1. 新しいスプレッドシートを作成（空でOK）
 * 2. 「拡張機能」→「Apps Script」を開く
 * 3. このコードを貼り付ける
 * 4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」でデプロイ
 * 5. 実行ユーザー：自分、アクセス：全員
 */

function doGet(e) {
  // action=rec 以外はすべて拒否
  if (!e || !e.parameter || e.parameter.action !== 'rec') {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // recシートを開く（既存のスプレッドシートIDを使用）
  var ss = SpreadsheetApp.openById('1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0');
  var sheet = ss.getSheetByName('rec');
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'rec sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    // ヘッダーのみ or データなし
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = values[0];
  var rowsValues = values.slice(1);

  // 全行をオブジェクトに変換
  var rows = rowsValues.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i];
    }
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}
