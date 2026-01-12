/**
 * スプレッドシートからデータを取得してJSON形式で返す
 * このコードをGoogle Apps Scriptエディタに貼り付けてください
 */
function doGet(e) {
  // 1) rec取得専用エンドポイント（最優先で処理）
  //    - action=rec の場合は type を一切参照しない
  //    - CSV ではなく「配列JSON」をそのまま返す
  if (e && e.parameter && e.parameter.action === 'rec') {
    const allRecData = getAllRecData(); // RecRow[] の配列
    return ContentService
      .createTextOutput(JSON.stringify(allRecData))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 2) 以下は問題データ用API（type検証あり）
  //    - /exec?action=rec 以外のときのみ到達
  const type = e.parameter.type || 'compounds';
  const category = e.parameter.category || 'organic';
  
  // スプレッドシートID（必要に応じて変更）
  const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
  
  let spreadsheet;
  try {
    // スプレッドシートを開く
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Failed to open spreadsheet: ' + error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  let sheet;
  let csvData;
  
  try {
    if (type === 'compounds') {
      sheet = spreadsheet.getSheetByName('compounds');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'compounds sheet not found. Available sheets: ' + 
                   spreadsheet.getSheets().map(s => s.getName()).join(', ') 
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
                   spreadsheet.getSheets().map(s => s.getName()).join(', ') 
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
                   spreadsheet.getSheets().map(s => s.getName()).join(', ') 
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
                   spreadsheet.getSheets().map(s => s.getName()).join(', ') 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      csvData = convertSheetToCSV(sheet);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Invalid type. Use "compounds", "reactions", "experiment", or "inorganic-new". For rec data, use action=rec' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
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
 * recシートへの書き込み処理
 */
function doPost(e) {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Failed to open spreadsheet: ' + error.toString() 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let sheet = spreadsheet.getSheetByName('rec');
    if (!sheet) {
      // recシートが存在しない場合は作成
      sheet = spreadsheet.insertSheet('rec');
      // ヘッダー行を追加（要求仕様に合わせた列構造 + 集計用のcorrectCount/totalCount + 可読性向上用recordedAtReadable）
      sheet.appendRow([
        'name', 'userKey', 'mode',
        'EXP', 'LV', 'tenAve', 'allAve',
        'sess', 'cst', 'mst', 'last', 'isPublic', 'recordedAt',
        'correctCount', 'totalCount', // 集計用の列（内部使用）
        'recordedAtReadable' // 可読性向上用（YYYY/MM/DD HH:MM形式）
      ]);
    } else {
      // 既存シートの場合、recordedAtReadable列が存在するか確認
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (headers.length < 16 || headers[15] !== 'recordedAtReadable') {
        // recordedAtReadable列が存在しない場合は追加
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
    
    // 同一ユーザーの過去データを集計
    const userKey = data.userKey || '';
    const aggregated = aggregateUserData(sheet, userKey, data);
    
    // recordedAtReadableを計算
    var recordedAt = data.timestamp || Date.now();
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
    
    // 新しい行を追加（要求仕様に合わせた列構造 + 集計用のcorrectCount/totalCount + 可読性向上用recordedAtReadable）
    sheet.appendRow([
      data.displayName || '', // name
      userKey, // userKey
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
      recordedAt, // recordedAt
      data.correctCount || 0, // correctCount（集計用）
      data.totalCount || 0, // totalCount（集計用）
      recordedAtReadable // recordedAtReadable（可読性向上用）
    ]);
    
    // userStats シートを更新（加算更新）
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
 * ユーザーデータを集計（過去データから EXP, LV, tenAve, allAve, sess, cst, mst, last を計算）
 */
function aggregateUserData(sheet, userKey, currentData) {
  try {
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
    
    // ヘッダーをスキップして、同一ユーザーの行を取得
    const rows = data.slice(1);
    const userRows = rows.filter(function(row) {
      return row[1] === userKey; // userKeyは1列目（0-indexed）
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
    let totalCorrectCount = 0;
    let totalQuestionCount = 0;
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
    
    // 過去10セッションのtenAveを計算（最新10件のcorrectCount/totalCountから計算）
    const recent10 = sortedRows.slice(-10); // 最新10件（古い順にソート済みなので、最後の10件）
    let recent10Correct = 0;
    let recent10Total = 0;
    for (var i = 0; i < recent10.length; i++) {
      var row = recent10[i];
      recent10Correct += row[13] || 0; // correctCount
      recent10Total += row[14] || 0; // totalCount
    }
    // 現在のセッションを含めて計算（10件以下なら全て、10件以上なら最新10件）
    recent10Correct += currentCorrectCount;
    recent10Total += currentTotalCount;
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
    
    let cst = 0;
    let mst = 0;
    let currentStreak = 0;
    
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
 * recシートから最新行を取得（GETリクエストでも対応）
 * @param {string} userKey - ユーザーキー
 * @param {string} mode - オプション: 'organic' または 'inorganic' でフィルタ
 */
function getLatestRecRow(userKey, mode) {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
      return null;
    }
    
    let sheet = spreadsheet.getSheetByName('rec');
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return null; // ヘッダーのみ
    }
    
    // ユーザーキーでフィルタし、最新の行を取得
    const rows = data.slice(1); // ヘッダーをスキップ
    var userRows = rows.filter(function(row) {
      return row[1] === userKey; // userKeyは1列目（0-indexed）
    });
    
    // mode でフィルタ（オプション）
    if (mode) {
      // modeは 'organic-xxx' または 'inorganic-xxx' 形式なので、先頭部分で判定
      userRows = userRows.filter(function(row) {
        var rowMode = row[2] || ''; // modeは2列目
        return rowMode.indexOf(mode) === 0;
      });
    }
    
    if (userRows.length === 0) {
      return null;
    }
    
    // タイムスタンプ（12列目: recordedAt）でソートし、最新を取得
    var sortedRows = userRows.sort(function(a, b) {
      var timestampA = a[12] || 0;
      var timestampB = b[12] || 0;
      return timestampB - timestampA;
    });
    
    var latestRow = sortedRows[0];
    
    // オブジェクトに変換（新しい列構造に対応）
    // 列構造: name(0), userKey(1), mode(2), EXP(3), LV(4), tenAve(5), allAve(6), sess(7), cst(8), mst(9), last(10), isPublic(11), recordedAt(12)
    return {
      name: latestRow[0] || '',
      userKey: latestRow[1] || '',
      mode: latestRow[2] || '',
      EXP: latestRow[3] || 0,
      LV: latestRow[4] || 0,
      tenAve: latestRow[5] || 0,
      allAve: latestRow[6] || 0,
      sess: latestRow[7] || 0,
      cst: latestRow[8] || 0,
      mst: latestRow[9] || 0,
      last: latestRow[10] || '',
      isPublic: latestRow[11] !== undefined ? latestRow[11] : false,
      recordedAt: latestRow[12] || 0
    };
  } catch (error) {
    return null;
  }
}

/**
 * recシートの全データを取得（クライアント側でフィルタ・抽出を行う）
 */
function getAllRecData() {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
      return [];
    }
    
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
        userKey: row[1] || '',
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
 * 公開ランキングを取得（isPublic=trueのユーザーの最新行のみ、allAve降順）
 * @param {string} modeFilter - オプション: 'organic' または 'inorganic' でフィルタ
 */
function getPublicRankingLatest(modeFilter) {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (error) {
      return [];
    }
    
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
    
    // isPublic=true の行のみフィルタ
    var publicRows = rows.filter(function(row) {
      return row[11] === true; // isPublicは11列目（0-indexed）
    });
    
    if (publicRows.length === 0) {
      return [];
    }
    
    // mode でフィルタ（オプション）
    if (modeFilter) {
      // modeは 'organic-xxx' または 'inorganic-xxx' 形式なので、先頭部分で判定
      publicRows = publicRows.filter(function(row) {
        var rowMode = row[2] || ''; // modeは2列目
        return rowMode.indexOf(modeFilter) === 0;
      });
    }
    
    if (publicRows.length === 0) {
      return [];
    }
    
    // userKeyごとに最新行のみを抽出
    var userLatestMap = {};
    for (var i = 0; i < publicRows.length; i++) {
      var row = publicRows[i];
      var userKey = row[1]; // userKeyは1列目
      var recordedAt = row[12] || 0; // recordedAtは12列目
      
      // 列構造: name(0), userKey(1), mode(2), EXP(3), LV(4), tenAve(5), allAve(6), sess(7), cst(8), mst(9), last(10), isPublic(11), recordedAt(12), correctCount(13), totalCount(14)
      if (!userLatestMap[userKey] || recordedAt > userLatestMap[userKey].recordedAt) {
        userLatestMap[userKey] = {
          name: row[0] || '',
          userKey: userKey,
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
          recordedAt: recordedAt
        };
      }
    }
    
    // allAve降順でソート（同率の場合はsess → lastで安定ソート）
    var ranking = [];
    for (var userKey in userLatestMap) {
      ranking.push(userLatestMap[userKey]);
    }
    ranking.sort(function(a, b) {
      var allAveA = a.allAve || 0;
      var allAveB = b.allAve || 0;
      if (allAveB !== allAveA) {
        return allAveB - allAveA; // allAve降順
      }
      // 同率の場合
      var sessA = a.sess || 0;
      var sessB = b.sess || 0;
      if (sessB !== sessA) {
        return sessB - sessA; // sess降順
      }
      // さらに同率の場合
      var lastA = a.last || '';
      var lastB = b.last || '';
      return lastB.localeCompare(lastA); // last降順（日付文字列）
    });
    
    return ranking;
  } catch (error) {
    return [];
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
    for (let i = 1; i < data.length; i++) {
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
 * userStats シートの全データを取得
 * 注意: この関数は問題データ用GAS（GAS_CODE.js）でも使用される（backfillUserStatsFromRec等）
 * userStats専用GAS（GAS_CODE_USERSTATS.js）とは別の実装
 */
function getAllUserStats() {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
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

/**
 * userStats を更新（加算更新）
 * userId = userKey + name の複合キーで行を特定
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
 * 既存の rec データから userStats を初期生成（1回限りの実行）
 * 実行方法: GASエディタで backfillUserStatsFromRec() を実行
 */
function backfillUserStatsFromRec() {
  try {
    const SPREADSHEET_ID = '1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0';
    
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
    for (var userKey in userStatsMap) {
      var stats = userStatsMap[userKey];
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
