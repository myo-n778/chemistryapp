# doGet()修正差分

## 修正概要

`GAS_CODE_UNIFIED.js`の`doGet()`関数のみを最小差分で修正しました。

## 変更内容

### 1. categoryのデフォルト値を削除（混線防止）

**変更前（36行目）**:
```javascript
const category = String(params.category || '').trim() || 'organic';
```

**変更後（36行目）**:
```javascript
const category = String(params.category || '').trim();
```

**理由**: `category`は問題データ取得では使用されていないため、デフォルト値を削除して混線を防止。

---

### 2. typeが空の場合のエラーメッセージを修正

**変更前（82-88行目）**:
```javascript
if (!type) {
  // actionもtypeもない場合はエラー（勝手にCSVを返さない）
  return ContentService
    .createTextOutput(JSON.stringify({ 
      error: 'Invalid request. Use action=rec, action=userStats, or type=compounds|reactions|experiment|inorganic-new' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**変更後（82-89行目）**:
```javascript
if (!type) {
  // typeが空ならエラー（混線防止：デフォルトにしない）
  return ContentService
    .createTextOutput(JSON.stringify({ 
      error: 'type is required. Use type=compounds|reactions|experiment|inorganic-new' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**理由**: 要件4に従い、`type`が空の場合のエラーメッセージを「type is required」に変更。

---

## 既に実装済み（変更なし）

### ✅ パラメータの正規化（30-36行目）
```javascript
// パラメータの安全化（eが無い/parameterが無い場合に落ちない）
var params = (e && e.parameter) ? e.parameter : {};

// パラメータの正規化（String().trim()で統一）
const action = String(params.action || '').trim();
const type = String(params.type || '').trim();
const category = String(params.category || '').trim();
```

### ✅ ヘルスチェック削除済み
- `action === 'health'`分岐は既に削除済み（前回の修正で）

### ✅ action優先→typeの順序維持（39-79行目）
```javascript
// 【重要】action判定を最優先（type判定より先に処理）
if (action) {
  // 1) action=rec → recデータ取得（JSON配列）
  if (action === 'rec') { ... }
  
  // 2) action=userStats → userStatsデータ取得（JSON配列）
  if (action === 'userStats') { ... }
  
  // 無効なaction
  return ContentService.createTextOutput(JSON.stringify({ 
    error: 'Invalid action. Use "rec" or "userStats". For problem data, use type parameter.' 
  }))...
}

// 【重要】actionがない場合のみtype判定（問題CSV）
if (!type) { ... }
```

### ✅ typeのデフォルト化防止（82-89行目）
- `type`が空ならエラーを返す（デフォルトにしない）
- `type`が不正ならエラーを返す（150-156行目）

---

## 変更ファイル

- **GAS_CODE_UNIFIED.js**: `doGet()`関数のみ修正（2箇所、計2行の変更）
  1. `category`のデフォルト値削除（36行目）
  2. `type`が空の場合のエラーメッセージ修正（86行目）

## 変更していない箇所（厳守）

- ✅ `doPost()`: 一切変更なし
- ✅ `getAllRecData()`: 変更なし
- ✅ `getAllUserStats()`: 変更なし
- ✅ `convertSheetToCSV()`: 変更なし
- ✅ `updateUserStats()`: 変更なし
- ✅ `aggregateUserData()`: 変更なし
- ✅ その他の関数: 変更なし

---

## 確認項目

修正後の動作確認：

### ✅ /exec?action=rec
**期待**: JSON配列 `[{...},{...}]` が返る

### ✅ /exec?action=userStats
**期待**: JSON配列 `[{...},{...}]` または `[]` が返る

### ✅ /exec?type=compounds
**期待**: JSON `{"csv":"..."}` が返る

### ✅ /exec（action/type無し）
**期待**: JSON `{"error":"type is required. Use type=compounds|reactions|experiment|inorganic-new"}` が返る

### ✅ action=health
**期待**: 存在しない（`{"error":"Invalid action. Use \"rec\" or \"userStats\"..."}` が返る）

---

## 差分サマリー

- **変更行数**: 2行
- **削除**: `|| 'organic'`（categoryのデフォルト値）
- **変更**: エラーメッセージ（`'Invalid request...'` → `'type is required...'`）
- **影響範囲**: `doGet()`関数のみ（他の関数は一切変更なし）
