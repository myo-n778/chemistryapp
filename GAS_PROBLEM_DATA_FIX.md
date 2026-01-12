# 問題データ取得修正内容

## 修正概要

統合GAS（`GAS_CODE_UNIFIED.js`）の`doGet()`関数で、問題データ（compounds/reactions/experiment/inorganic-new）が正しく返るように修正しました。

## 変更差分

### 1. パラメータ取得の統一と正規化

**変更前**:
```javascript
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  
  if (params.action) {
    const action = params.action;
    // ...
  }
  const type = params.type;
  const category = params.category || 'organic';
}
```

**変更後**:
```javascript
function doGet(e) {
  // パラメータの安全化（eが無い/parameterが無い場合に落ちない）
  var params = (e && e.parameter) ? e.parameter : {};
  
  // パラメータの正規化（String().trim()で統一）
  const action = String(params.action || '').trim();
  const type = String(params.type || '').trim();
  const category = String(params.category || '').trim() || 'organic';
  
  // 【重要】action判定を最優先（type判定より先に処理）
  if (action) {
    // ...
  }
}
```

**変更箇所**: `doGet()`関数の冒頭（パラメータ取得部分）

---

### 2. ヘルスチェック(action=health)の削除

**削除したコード**:
```javascript
// 3) action=health → ヘルスチェック情報
if (action === 'health') {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var recSheet = spreadsheet.getSheetByName('rec');
    var userStatsSheet = spreadsheet.getSheetByName('userStats');
    var compoundsSheet = spreadsheet.getSheetByName('compounds');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        endpoints: {
          rec: recSheet ? 'available' : 'not found',
          userStats: userStatsSheet ? 'available' : 'not found',
          compounds: compoundsSheet ? 'available' : 'not found'
        },
        spreadsheetId: SPREADSHEET_ID
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false,
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**変更箇所**: `doGet()`関数内の`action === 'health'`分岐を削除

---

### 3. エラーメッセージからhealthを削除

**変更前**:
```javascript
error: 'Invalid action. Use "rec", "userStats", or "health". For problem data, use type parameter.'
error: 'Invalid request. Use action=rec, action=userStats, action=health, or type=compounds|reactions|experiment|inorganic-new'
```

**変更後**:
```javascript
error: 'Invalid action. Use "rec" or "userStats". For problem data, use type parameter.'
error: 'Invalid request. Use action=rec, action=userStats, or type=compounds|reactions|experiment|inorganic-new'
```

**変更箇所**: エラーメッセージ内の`health`参照を削除

---

### 4. コメントからhealthを削除

**変更前**:
```javascript
 * - GET ?action=health → ヘルスチェック情報
```

**変更後**:
```javascript
 * （healthの記述を削除）
```

**変更箇所**: ファイル冒頭のAPI仕様コメント

---

## 変更後の該当関数（doGetの問題データ分岐）

```javascript
function doGet(e) {
  // パラメータの安全化（eが無い/parameterが無い場合に落ちない）
  var params = (e && e.parameter) ? e.parameter : {};
  
  // パラメータの正規化（String().trim()で統一）
  const action = String(params.action || '').trim();
  const type = String(params.type || '').trim();
  const category = String(params.category || '').trim() || 'organic';
  
  // 【重要】action判定を最優先（type判定より先に処理）
  if (action) {
    // 1) action=rec → recデータ取得（JSON配列）
    if (action === 'rec') {
      // ... rec取得処理 ...
    }
    
    // 2) action=userStats → userStatsデータ取得（JSON配列）
    if (action === 'userStats') {
      // ... userStats取得処理 ...
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
    // actionもtypeもない場合はエラー（勝手にCSVを返さない）
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Invalid request. Use action=rec, action=userStats, or type=compounds|reactions|experiment|inorganic-new' 
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
```

## 検証URLと期待結果

統合GASをデプロイした後、以下のURLで動作確認してください：

### A) compoundsデータ取得
```
https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?type=compounds&category=organic
```
**期待結果**: 
- Content-Type: `application/json`
- レスポンス: `{"csv":"id,name,formula,..."}` （JSON形式）
- エラーや配列にならない

### B) reactionsデータ取得
```
https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?type=reactions
```
**期待結果**: 
- Content-Type: `application/json`
- レスポンス: `{"csv":"..."}` （JSON形式）

### C) experimentデータ取得
```
https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?type=experiment
```
**期待結果**: 
- Content-Type: `application/json`
- レスポンス: `{"csv":"..."}` （JSON形式）

### D) inorganic-newデータ取得
```
https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec?type=inorganic-new
```
**期待結果**: 
- Content-Type: `application/json`
- レスポンス: `{"csv":"..."}` （JSON形式）

### エラー時の確認
```
https://script.google.com/macros/s/AKfycbz5Tsfh3Ky6Wim2IB0Gsw68C5z-p8nwKXaCSpGOIUL2kh-DgVek3C3iXvAbSw0kqmeE5A/exec
```
**期待結果**: 
- Content-Type: `application/json`
- レスポンス: `{"error":"Invalid request. Use action=rec, action=userStats, or type=compounds|reactions|experiment|inorganic-new"}`
- HTMLは返さない

## 変更ファイル

- **GAS_CODE_UNIFIED.js**: `doGet()`関数のみ修正
  - パラメータ取得の統一と正規化
  - ヘルスチェック分岐の削除
  - エラーメッセージの更新

## 変更していない箇所（厳守）

- ✅ `doPost()`: 一切変更なし
- ✅ `action=rec` / `action=userStats`: 返却形式・ロジック変更なし
- ✅ `getAllRecData()` / `getAllUserStats()`: 変更なし
- ✅ `convertSheetToCSV()`: 変更なし
- ✅ `aggregateUserData()` / `updateUserStats()` / `backfillUserStatsFromRec()`: 変更なし
