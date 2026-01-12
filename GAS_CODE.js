/**
 * スプレッドシートからデータを取得してJSON形式で返す
 * このコードをGoogle Apps Scriptエディタに貼り付けてください
 */
function doGet(e) {
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
    } else if (type === 'rec') {
      // recシートから最新行を取得（userKeyパラメータが必要）
      const userKey = e.parameter.userKey;
      if (!userKey) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            error: 'userKey parameter is required' 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const latestRow = getLatestRecRow(userKey);
      if (!latestRow) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            data: null 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ 
          data: latestRow 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Invalid type. Use "compounds", "reactions", "experiment", "inorganic-new", or "rec"' 
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
      // ヘッダー行を追加
      sheet.appendRow([
        'userKey', 'displayName', 'mode', 'category', 'rangeKey',
        'correctCount', 'totalCount', 'pointScore', 'accuracy', 'date', 'timestamp'
      ]);
    }
    
    // POSTデータを取得
    const postData = e.postData ? e.postData.contents : '';
    if (!postData) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'No post data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = JSON.parse(postData);
    
    // 新しい行を追加
    sheet.appendRow([
      data.userKey || '',
      data.displayName || '',
      data.mode || '',
      data.category || '',
      data.rangeKey || '',
      data.correctCount || 0,
      data.totalCount || 0,
      data.pointScore || 0,
      data.accuracy || 0,
      data.date || new Date().toISOString().split('T')[0],
      data.timestamp || Date.now()
    ]);
    
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
 * recシートから最新行を取得（GETリクエストでも対応）
 */
function getLatestRecRow(userKey) {
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
    const userRows = rows.filter(row => row[0] === userKey); // userKeyは0列目
    if (userRows.length === 0) {
      return null;
    }
    
    // タイムスタンプ（10列目）でソートし、最新を取得
    const sortedRows = userRows.sort((a, b) => {
      const timestampA = a[10] || 0;
      const timestampB = b[10] || 0;
      return timestampB - timestampA;
    });
    
    const latestRow = sortedRows[0];
    
    // オブジェクトに変換
    return {
      userKey: latestRow[0] || '',
      displayName: latestRow[1] || '',
      mode: latestRow[2] || '',
      category: latestRow[3] || '',
      rangeKey: latestRow[4] || '',
      correctCount: latestRow[5] || 0,
      totalCount: latestRow[6] || 0,
      pointScore: latestRow[7] || 0,
      accuracy: latestRow[8] || 0,
      date: latestRow[9] || '',
      timestamp: latestRow[10] || 0
    };
  } catch (error) {
    return null;
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

