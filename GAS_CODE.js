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
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          error: 'Invalid type. Use "compounds" or "reactions"' 
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

