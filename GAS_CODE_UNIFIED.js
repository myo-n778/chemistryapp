/**
 * 統合 Google Apps Script（問題CSV / rec / userStats を1本で運用）
 * 
 * 【重要】このファイルは単独で動作します。他のGASファイル（GAS_CODE.js等）と一緒に配置しないでください。
 * SPREADSHEET_ID が重複宣言エラーになる可能性があります。
 * 
 * 【使い方】
 * 1. 新しいGASプロジェクトを作成（既存のGAS_CODE.js等は削除または別プロジェクトに移動）
 * 2. このコードを貼り付ける（このファイルのみ）
 * 3. SPREADSHEET_ID を既存のスプレッドシートIDに変更
 * 4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」でデプロイ
 * 5. 実行ユーザー：自分、アクセス：全員
 * 
 * 【API仕様】
 * - GET ?action=rec → JSON配列（recデータ）
 * - GET ?action=userStats → JSON配列（userStatsデータ）
 * - GET ?type=compounds|reactions|experiment|inorganic-new → {csv:"..."}
 * - POST → recに追記＋userStatsを加算更新
 */

// スプレッドシートID（既存のスプレッドシートIDに変更してください）
// 【注意】GASエディタに他のファイル（GAS_CODE.js等）がある場合、SPREADSHEET_IDが重複宣言エラーになります。
// このファイルを単独で使用するか、他のファイルを削除してください。
const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';

/**
 * GETリクエスト処理（混線防止のためaction判定を最優先）
 */
function doGet(e) {
  // パラメータの安全化（eが無い/parameterが無い場合に落ちない）
  var params = (e && e.parameter) ? e.parameter : {};
  
  // パラメータの正規化（String().trim()で統一）
  const action = String(params.action || '').trim();
  const type = String(params.type || '').trim();
  const category = String(params.category || '').trim();
  
  // 【重要】action判定を最優先（type判定より先に処理）
  if (action) {
    
    // 1) action=rec → recデータ取得（JSON配列）
    if (action === 'rec') {
      try {
        const allRecData = getAllRecData();
        return ContentService
          .createTextOutput(JSON.stringify(allRecData))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'Failed to get rec data: ' + error.toString() 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 2) action=userStats → userStatsデータ取得（JSON配列）
    if (action === 'userStats') {
      try {
        const allUserStats = getAllUserStats();
        return ContentService
          .createTextOutput(JSON.stringify(allUserStats))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'Failed to get userStats data: ' + error.toString() 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 無効なaction
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Invalid action. Use "rec" or "userStats". For problem data, use type parameter.' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 【重要】actionがない場合のみtype判定（問題CSV）
  if (!type) {
    // typeが空ならエラー（混線防止：デフォルトにしない）
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'type is required. Use type=compounds|reactions|experiment|inorganic-new' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 問題データ取得（CSV形式）
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Failed to open spreadsheet: ' + error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var sheet;
  var csvData;
  
  try {
    if (type === 'compounds') {
      sheet = spreadsheet.getSheetByName('compounds');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'compounds sheet not found. Available sheets: ' + 
                   spreadsheet.getSheets().map(function(s) { return s.getName(); }).join(', ') 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else if (type === 'reactions') {
      sheet = spreadsheet.getSheetByName('reactions');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'reactions sheet not found. Available sheets: ' + 
                   spreadsheet.getSheets().map(function(s) { return s.getName(); }).join(', ') 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else if (type === 'experiment') {
      sheet = spreadsheet.getSheetByName('experiment');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'experiment sheet not found. Available sheets: ' + 
                   spreadsheet.getSheets().map(function(s) { return s.getName(); }).join(', ') 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else if (type === 'inorganic-new') {
      sheet = spreadsheet.getSheetByName('inorganic');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'inorganic sheet not found. Available sheets: ' + 
                   spreadsheet.getSheets().map(function(s) { return s.getName(); }).join(', ') 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Invalid type. Use "compounds", "reactions", "experiment", or "inorganic-new". For rec/userStats data, use action parameter.' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // CSV形式で返す（{csv:"..."}）
    return ContentService
      .createTextOutput(JSON.stringify({ csv: csvData }))
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
 * POSTリクエスト処理（recに追記＋userStatsを加算更新）
 */
function doPost(e) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    var sheet = spreadsheet.getSheetByName('rec');
  if (!sheet) {
    // recシートが存在しない場合は作成
    sheet = spreadsheet.insertSheet('rec');
    // ヘッダー行を追加
    sheet.appendRow([
      'name', 'userKey', 'mode',
      'EXP', 'LV', 'tenAve', 'allAve',
      'sess', 'cst', 'mst', 'last', 'isPublic', 'recordedAt',
      'correctCount', 'totalCount',
      'recordedAtReadable'
    ]);
  } else {
    // 既存シートの場合、recordedAtReadable列が存在するか確認
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < 16 || headers[15] !== 'recordedAtReadable') {
      var lastCol = sheet.getLastColumn();
      if (lastCol < 16) {
        sheet.getRange(1, 16).setValue('recordedAtReadable');
        // 既存データに対してrecordedAtReadableを計算
        var sheetData = sheet.getDataRange().getValues();
        if (sheetData.length > 1) {
          for (var i = 1; i < sheetData.length; i++) {
            var recordedAt = sheetData[i][12] || 0;
            var recordedAtReadable = '';
            if (recordedAt) {
              try {
                var date = new Date(recordedAt);
                if (!isNaN(date.getTime())) {
                  var year = date.getFullYear();
                  var month = String(date.getMonth() + 1).padStart(2, '0');
                  var day = String(date.getDate()).padStart(2, '0');
                  var hours = String(date.getHours()).padStart(2, '0');
                  var minutes = String(date.getMinutes()).padStart(2, '0');
                  recordedAtReadable = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
                }
              } catch (e) {
                // 日付変換に失敗した場合は空文字列
              }
            }
            sheet.getRange(i + 1, 16).setValue(recordedAtReadable);
          }
        }
      }
    }
  }
  
  // POSTデータを取得
  const postData = e.postData ? e.postData.contents : '';
  if (!postData) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'No post data' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = JSON.parse(postData);
  
  // recordedAtは必ずms（Date.now）で保存
  var recordedAt = data.timestamp || Date.now();
  
  // recordedAtReadableを計算
  var recordedAtReadable = '';
  if (recordedAt) {
    try {
      var date = new Date(recordedAt);
      if (!isNaN(date.getTime())) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        recordedAtReadable = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
      }
    } catch (e) {
      // 日付変換に失敗した場合は空文字列
    }
  }
  
  // 同一ユーザーの過去データを集計（複合キー: userKey + name）
  const userKey = data.userKey || '';
  const displayName = data.displayName || '';
  const aggregated = aggregateUserData(sheet, userKey, displayName, data);
  
  // recに新しい行を追加
  sheet.appendRow([
    data.displayName || '', // name
    String(userKey), // userKey（必ず文字列として保存）
    data.mode || '', // mode
    aggregated.EXP, // EXP
    aggregated.LV, // LV
    aggregated.tenAve, // tenAve
    aggregated.allAve, // allAve
    aggregated.sess, // sess
    aggregated.cst, // cst
    aggregated.mst, // mst
    aggregated.last, // last
    data.isPublic !== undefined ? data.isPublic : false, // isPublic
    recordedAt, // recordedAt（必ずms）
    data.correctCount || 0, // correctCount
    data.totalCount || 0, // totalCount
    recordedAtReadable // recordedAtReadable
  ]);
  
  // userStats シートを更新（加算更新、複合キー userKey + name）
  updateUserStats(spreadsheet, userKey, {
    name: data.displayName || '',
    isPublic: data.isPublic !== undefined ? data.isPublic : false,
    correctCount: data.correctCount || 0,
    totalCount: data.totalCount || 0,
    lastAt: recordedAt
  });
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
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
 * recシートの全データを取得（JSON配列）
 */
function getAllRecData() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    var sheet = spreadsheet.getSheetByName('rec');
    if (!sheet) {
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
      // 列構造: name(0), userKey(1), mode(2), EXP(3), LV(4), tenAve(5), allAve(6), sess(7), cst(8), mst(9), last(10), isPublic(11), recordedAt(12), correctCount(13), totalCount(14), recordedAtReadable(15)
      var recordedAt = row[12] || 0;
      var recordedAtReadable = '';
      if (recordedAt) {
        try {
          var date = new Date(recordedAt);
          if (!isNaN(date.getTime())) {
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            var hours = String(date.getHours()).padStart(2, '0');
            var minutes = String(date.getMinutes()).padStart(2, '0');
            recordedAtReadable = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
          }
        } catch (e) {
          // 日付変換に失敗した場合は空文字列
        }
      }
      
      result.push({
        name: row[0] || '',
        userKey: String(row[1] || ''), // 必ず文字列として正規化
        mode: row[2] || '',
        EXP: row[3] || 0,
        LV: row[4] || 0,
        tenAve: row[5] || 0,
        allAve: row[6] || 0,
        sess: row[7] || 0,
        cst: row[8] || 0,
        mst: row[9] || 0,
        last: row[10] || '',
        isPublic: row[11] !== undefined ? row[11] : false,
        recordedAt: recordedAt,
        correctCount: row[13] || 0,
        totalCount: row[14] || 0,
        recordedAtReadable: recordedAtReadable || row[15] || ''
      });
    }
    
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * userStats シートの全データを取得（JSON配列）
 */
function getAllUserStats() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    var sheet = spreadsheet.getSheetByName('userStats');
    if (!sheet) {
      return []; // シートが存在しない場合は空配列を返す（エラーにしない）
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
    return [];
  }
}

/**
 * ユーザーデータを集計（過去データから EXP, LV, tenAve, allAve, sess, cst, mst, last を計算）
 * 複合キー（userKey + name）で同一ユーザーを判定
 * @param {Sheet} sheet - recシート
 * @param {string} userKey - ユーザーキー（文字列として正規化）
 * @param {string} displayName - ユーザー名（displayName/name）
 * @param {Object} currentData - 現在のセッションデータ
 */
function aggregateUserData(sheet, userKey, displayName, currentData) {
  try {
    // userKeyとdisplayNameを文字列として正規化（trimも入れる）
    var normalizedUserKey = String(userKey || '').trim();
    var normalizedDisplayName = String(displayName || '').trim();
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      // データが無い場合は現在のデータのみで初期化
      return {
        EXP: currentData.correctCount || 0,
        LV: Math.floor((currentData.correctCount || 0) / 100) + 1,
        tenAve: currentData.accuracy || 0,
        allAve: currentData.accuracy || 0,
        sess: 1,
        cst: currentData.accuracy === 1.0 ? 1 : 0,
        mst: currentData.accuracy === 1.0 ? 1 : 0,
        last: currentData.date || new Date().toISOString().split('T')[0]
      };
    }
    
    // ヘッダーをスキップして、同一ユーザーの行を取得（複合キー: userKey + name）
    const rows = data.slice(1);
    const userRows = rows.filter(function(row) {
      // 列構造: name(0), userKey(1), ...
      var rowUserKey = String(row[1] || '').trim();
      var rowName = String(row[0] || '').trim();
      return rowUserKey === normalizedUserKey && rowName === normalizedDisplayName;
    });
    
    if (userRows.length === 0) {
      // 過去データが無い場合は現在のデータのみで初期化
      return {
        EXP: currentData.correctCount || 0,
        LV: Math.floor((currentData.correctCount || 0) / 100) + 1,
        tenAve: currentData.accuracy || 0,
        allAve: currentData.accuracy || 0,
        sess: 1,
        cst: currentData.accuracy === 1.0 ? 1 : 0,
        mst: currentData.accuracy === 1.0 ? 1 : 0,
        last: currentData.date || new Date().toISOString().split('T')[0]
      };
    }
    
    // 過去データを集計（correctCount/totalCountから正確に計算）
    // 列構造: name(0), userKey(1), mode(2), EXP(3), LV(4), tenAve(5), allAve(6), sess(7), cst(8), mst(9), last(10), isPublic(11), recordedAt(12), correctCount(13), totalCount(14)
    
    // 過去の行を recordedAt でソート（古い順）
    const sortedRows = userRows.sort(function(a, b) {
      const timestampA = a[12] || 0; // recordedAt
      const timestampB = b[12] || 0;
      return timestampA - timestampB; // 古い順にソート
    });
    
    // 全セッションのcorrectCountとtotalCountを集計
    var totalCorrectCount = 0;
    var totalQuestionCount = 0;
    for (var i = 0; i < sortedRows.length; i++) {
      var row = sortedRows[i];
      totalCorrectCount += row[13] || 0; // correctCount
      totalQuestionCount += row[14] || 0; // totalCount
    }
    
    // 現在のセッションデータを追加
    const currentCorrectCount = currentData.correctCount || 0;
    const currentTotalCount = currentData.totalCount || 0;
    totalCorrectCount += currentCorrectCount;
    totalQuestionCount += currentTotalCount;
    
    // セッション数を計算
    const sess = userRows.length + 1; // 現在のセッションを含む
    
    // allAveを計算（全セッション合算の正解数 / 全セッション合算の問題数）
    const allAve = totalQuestionCount > 0 ? totalCorrectCount / totalQuestionCount : 0;
    
    // 過去10セッションのtenAveを計算（最新10セッションに厳密に）
    // currentを含めて最大10件になるように計算
    var sessionsForTenAve = sortedRows.slice(); // 過去のセッション（古い順）
    sessionsForTenAve.push({
      13: currentCorrectCount, // correctCount
      14: currentTotalCount    // totalCount
    }); // currentを最後に追加
    
    // 末尾10件だけを使用（11件以上ある場合は最古を落とす）
    var recent10 = sessionsForTenAve.slice(-10);
    
    var recent10Correct = 0;
    var recent10Total = 0;
    for (var i = 0; i < recent10.length; i++) {
      var row = recent10[i];
      recent10Correct += row[13] || 0; // correctCount
      recent10Total += row[14] || 0; // totalCount
    }
    const tenAve = recent10Total > 0 ? recent10Correct / recent10Total : 0;
    
    // EXPを計算（全セッションの合計正解数）
    const EXP = totalCorrectCount;
    
    // LVを計算
    const LV = Math.floor(EXP / 100) + 1;
    
    // 連続正解数の計算（セッション単位で計算）
    // 過去の行を新しい順に並べ替えて、連続正解セッションを計算
    const sortedRowsNewest = sortedRows.slice().sort(function(a, b) {
      const timestampA = a[12] || 0;
      const timestampB = b[12] || 0;
      return timestampB - timestampA; // 新しい順
    });
    
    var cst = 0;
    var mst = 0;
    var currentStreak = 0;
    
    // 過去のセッションから連続正解数を計算
    for (var i = 0; i < sortedRowsNewest.length; i++) {
      var row = sortedRowsNewest[i];
      var rowCorrectCount = row[13] || 0;
      var rowTotalCount = row[14] || 0;
      if (rowTotalCount > 0 && rowCorrectCount === rowTotalCount) {
        // 100%正解のセッション
        currentStreak++;
        mst = Math.max(mst, currentStreak);
      } else {
        // 間違いがあったセッション
        currentStreak = 0;
      }
    }
    
    // 現在のセッションを含めて計算
    if (currentTotalCount > 0 && currentCorrectCount === currentTotalCount) {
      // 100%正解
      currentStreak++;
      cst = currentStreak;
      mst = Math.max(mst, currentStreak);
    } else {
      // 間違いがあった
      cst = 0;
    }
    
    // lastを更新（現在のdate）
    const last = currentData.date || new Date().toISOString().split('T')[0];
    
    return {
      EXP: EXP,
      LV: LV,
      tenAve: tenAve,
      allAve: allAve,
      sess: sess,
      cst: cst,
      mst: mst,
      last: last
    };
  } catch (error) {
    // エラー時は現在のデータのみで初期化
    return {
      EXP: currentData.correctCount || 0,
      LV: Math.floor((currentData.correctCount || 0) / 100) + 1,
      tenAve: currentData.accuracy || 0,
      allAve: currentData.accuracy || 0,
      sess: 1,
      cst: currentData.accuracy === 1.0 ? 1 : 0,
      mst: currentData.accuracy === 1.0 ? 1 : 0,
      last: currentData.date || new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * userStats シートを取得または作成
 */
function getUserStatsSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('userStats');
  if (!sheet) {
    // userStatsシートが存在しない場合は作成
    sheet = spreadsheet.insertSheet('userStats');
    // ヘッダー行を追加
    sheet.appendRow([
      'userKey', 'name', 'isPublic', 'exp', 'totalCorrect', 'totalQuestions', 'sess', 'lastAt', 'updatedAt'
    ]);
  }
  return sheet;
}

/**
 * userStats を更新（加算更新、複合キー userKey + name）
 * @param {Spreadsheet} spreadsheet - スプレッドシートオブジェクト
 * @param {string} userKey - ユーザーキー（文字列として正規化）
 * @param {Object} data - 更新データ { name, isPublic, correctCount, totalCount, lastAt }
 */
function updateUserStats(spreadsheet, userKey, data) {
  try {
    var sheet = getUserStatsSheet(spreadsheet);
    var normalizedUserKey = String(userKey); // 必ず文字列として正規化
    var normalizedName = String(data.name || ''); // nameも文字列として正規化
    var targetUserId = normalizedUserKey + '|' + normalizedName; // 複合キー
    
    // 既存データを取得
    var sheetData = sheet.getDataRange().getValues();
    var userRowIndex = -1;
    
    // userId（userKey + name）で検索（ヘッダーをスキップ）
    for (var i = 1; i < sheetData.length; i++) {
      var rowUserKey = String(sheetData[i][0] || ''); // userKeyは0列目
      var rowName = String(sheetData[i][1] || ''); // nameは1列目
      var rowUserId = rowUserKey + '|' + rowName; // 複合キー
      if (rowUserId === targetUserId) {
        userRowIndex = i;
        break;
      }
    }
    
    var now = Date.now();
    
    if (userRowIndex >= 0) {
      // 既存行を更新（加算更新）
      var row = sheetData[userRowIndex];
      // 列構造: userKey(0), name(1), isPublic(2), exp(3), totalCorrect(4), totalQuestions(5), sess(6), lastAt(7), updatedAt(8)
      var currentExp = row[3] || 0;
      var currentTotalCorrect = row[4] || 0;
      var currentTotalQuestions = row[5] || 0;
      var currentSess = row[6] || 0;
      
      // 加算更新
      var newExp = currentExp + (data.correctCount || 0);
      var newTotalCorrect = currentTotalCorrect + (data.correctCount || 0);
      var newTotalQuestions = currentTotalQuestions + (data.totalCount || 0);
      var newSess = currentSess + 1;
      
      // 上書き更新
      sheet.getRange(userRowIndex + 1, 2).setValue(data.name || ''); // name
      sheet.getRange(userRowIndex + 1, 3).setValue(data.isPublic !== undefined ? data.isPublic : false); // isPublic
      sheet.getRange(userRowIndex + 1, 4).setValue(newExp); // exp
      sheet.getRange(userRowIndex + 1, 5).setValue(newTotalCorrect); // totalCorrect
      sheet.getRange(userRowIndex + 1, 6).setValue(newTotalQuestions); // totalQuestions
      sheet.getRange(userRowIndex + 1, 7).setValue(newSess); // sess
      sheet.getRange(userRowIndex + 1, 8).setValue(data.lastAt || now); // lastAt
      sheet.getRange(userRowIndex + 1, 9).setValue(now); // updatedAt
    } else {
      // 新規作成
      var newExp = data.correctCount || 0;
      var newTotalCorrect = data.correctCount || 0;
      var newTotalQuestions = data.totalCount || 0;
      var newSess = 1;
      
      sheet.appendRow([
        normalizedUserKey, // userKey
        data.name || '', // name
        data.isPublic !== undefined ? data.isPublic : false, // isPublic
        newExp, // exp
        newTotalCorrect, // totalCorrect
        newTotalQuestions, // totalQuestions
        newSess, // sess
        data.lastAt || now, // lastAt
        now // updatedAt
      ]);
    }
  } catch (error) {
    Logger.log('Failed to update userStats: ' + error.toString());
  }
}

/**
 * シートをCSV形式に変換
 */
function convertSheetToCSV(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return '';
    
    // ヘッダー行
    const headers = data[0];
    const csvRows = [headers.join(',')];
    
    // データ行
    for (var i = 1; i < data.length; i++) {
      const row = data[i];
      // 空行をスキップ
      if (row.every(function(cell) { 
        return cell === '' || cell === null || cell === undefined; 
      })) {
        continue;
      }
      
      // セルの値をエスケープ（カンマや改行を含む場合）
      const escapedRow = row.map(function(cell) {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell);
        // カンマ、改行、ダブルクォートを含む場合はエスケープ
        if (cellStr.indexOf(',') !== -1 || 
            cellStr.indexOf('\n') !== -1 || 
            cellStr.indexOf('"') !== -1) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      });
      
      csvRows.push(escapedRow.join(','));
    }
    
    return csvRows.join('\n');
  } catch (error) {
    throw new Error('Failed to convert sheet to CSV: ' + error.toString());
  }
}

/**
 * 既存の rec データから userStats を初期生成（1回限りの実行）
 * 実行方法: GASエディタで backfillUserStatsFromRec() を実行
 */
function backfillUserStatsFromRec() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var recSheet = spreadsheet.getSheetByName('rec');
    
    if (!recSheet) {
      Logger.log('rec sheet not found');
      return;
    }
    
    var recData = recSheet.getDataRange().getValues();
    if (recData.length < 2) {
      Logger.log('No rec data found');
      return;
    }
    
    // ヘッダーをスキップ
    var rows = recData.slice(1);
    
    // userId（userKey + name）ごとに集計
    var userStatsMap = {};
    
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      // 列構造: name(0), userKey(1), mode(2), EXP(3), LV(4), tenAve(5), allAve(6), sess(7), cst(8), mst(9), last(10), isPublic(11), recordedAt(12), correctCount(13), totalCount(14), recordedAtReadable(15)
      var userKey = String(row[1] || ''); // 必ず文字列として正規化
      var name = String(row[0] || ''); // nameも文字列として正規化
      var userId = userKey + '|' + name; // 複合キー
      var isPublic = row[11] !== undefined ? row[11] : false;
      var correctCount = row[13] || 0;
      var totalCount = row[14] || 0;
      var recordedAt = row[12] || 0;
      
      if (!userKey) {
        continue; // userKeyが空の行はスキップ
      }
      
      if (!userStatsMap[userId]) {
        userStatsMap[userId] = {
          userKey: userKey,
          name: name,
          isPublic: isPublic,
          exp: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          sess: 0,
          lastAt: 0
        };
      }
      
      // 加算
      userStatsMap[userId].exp += correctCount;
      userStatsMap[userId].totalCorrect += correctCount;
      userStatsMap[userId].totalQuestions += totalCount;
      userStatsMap[userId].sess += 1;
      
      // 最新の recordedAt を保持
      if (recordedAt > userStatsMap[userId].lastAt) {
        userStatsMap[userId].lastAt = recordedAt;
        userStatsMap[userId].name = name; // 最新のnameを使用
        userStatsMap[userId].isPublic = isPublic; // 最新のisPublicを使用
      }
    }
    
    // userStats シートを取得または作成
    var userStatsSheet = getUserStatsSheet(spreadsheet);
    
    // 既存データをクリア（ヘッダーを除く）
    var existingData = userStatsSheet.getDataRange().getValues();
    if (existingData.length > 1) {
      userStatsSheet.deleteRows(2, existingData.length - 1);
    }
    
    // 集計結果を書き込み
    var now = Date.now();
    for (var userId in userStatsMap) {
      var stats = userStatsMap[userId];
      userStatsSheet.appendRow([
        stats.userKey,
        stats.name,
        stats.isPublic,
        stats.exp,
        stats.totalCorrect,
        stats.totalQuestions,
        stats.sess,
        stats.lastAt,
        now // updatedAt
      ]);
    }
    
    Logger.log('Backfill completed. ' + Object.keys(userStatsMap).length + ' users processed.');
  } catch (error) {
    Logger.log('Error in backfillUserStatsFromRec: ' + error.toString());
  }
}
