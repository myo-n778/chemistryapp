/**
 * userStats専用 Google Apps Script
 * このコードを新しいGASプロジェクトに貼り付けてください
 *
 * 【使い方】
 * 1. 新しいスプレッドシートを作成（空でOK、または既存のスプレッドシートを使用）
 * 2. 「拡張機能」→「Apps Script」を開く
 * 3. このコードを貼り付ける
 * 4. SPREADSHEET_ID を既存のスプレッドシートIDに変更（userStatsシートが存在するスプレッドシート）
 * 5. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」でデプロイ
 * 6. 実行ユーザー：自分、アクセス：全員
 *
 * 【注意】
 * - このGASは読み取り専用（doGetのみ）
 * - userStatsの更新は問題データ用GAS（GAS_CODE.js）のdoPostで行う
 */

// スプレッドシートID（既存のスプレッドシートIDに変更してください）
const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';

/**
 * userStats取得専用エンドポイント
 * action=userStats の場合は userStats シートを返す
 */
function doGet(e) {
  // action=userStats 以外はすべて拒否
  if (!e || !e.parameter || e.parameter.action !== 'userStats') {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'invalid request. Use action=userStats' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const allUserStats = getAllUserStats(); // UserStatsRow[] の配列
    return ContentService
      .createTextOutput(JSON.stringify(allUserStats))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.toString(),
        stack: error.stack 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * userStats シートの全データを取得
 */
function getAllUserStats() {
  try {
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
      Logger.log('Failed to open spreadsheet: ' + error.toString());
      return [];
    }
    
    var sheet = spreadsheet.getSheetByName('userStats');
    if (!sheet) {
      Logger.log('userStats sheet not found');
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return []; // ヘッダーのみ
    }
    
    // ヘッダーをスキップ
    var rows = data.slice(1);
    
    // 全行をオブジェクトに変換
    var result = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      // 列構造: userKey(0), name(1), isPublic(2), exp(3), totalCorrect(4), totalQuestions(5), sess(6), lastAt(7), updatedAt(8)
      result.push({
        userKey: String(row[0] || ''), // 必ず文字列として扱う
        name: row[1] || '',
        isPublic: row[2] !== undefined ? row[2] : false,
        exp: row[3] || 0,
        totalCorrect: row[4] || 0,
        totalQuestions: row[5] || 0,
        sess: row[6] || 0,
        lastAt: row[7] || 0,
        updatedAt: row[8] || 0
      });
    }
    
    return result;
  } catch (error) {
    Logger.log('Failed to get all userStats: ' + error.toString());
    return [];
  }
}
