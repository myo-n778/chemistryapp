# GAS URL 直叩き検証手順

以下の3つのURLをブラウザで直接開いて、期待されるレスポンス形式を確認してください。

## A) 問題データ取得

**URL**: `PROBLEM_BASE_URL?type=compounds`

**完全URL例**:
```
https://script.google.com/macros/s/AKfycbxU4eANa9Q0t77ZftT2EFHvGfGSHloB1e0G3IZ86bk5uBZVII-IY_9FDpV8t1AkZtxh_w/exec?type=compounds
```

**期待されるレスポンス**:
- JSON形式: `{ csv: "メタン,CH4,..." }` または CSV文字列
- メタン等の化合物データが含まれる
- `csv` フィールドが存在する

**検証項目**:
- [ ] JSON形式で返ってくる
- [ ] `csv` フィールドが存在する
- [ ] CSV内容に化合物名（メタン等）が含まれる
- [ ] HTML（ログイン画面）が返ってこない

---

## B) recデータ取得

**URL**: `REC_BASE_URL?action=rec`

**完全URL例**:
```
https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec?action=rec
```

**期待されるレスポンス**:
- JSON配列: `[{ name: "...", userKey: "...", ... }, ...]`
- `csv` フィールドが**存在しない**
- recデータのフィールド（name, userKey, mode, EXP, LV等）が含まれる

**検証項目**:
- [ ] JSON配列が返ってくる
- [ ] `csv` フィールドが**存在しない**
- [ ] 配列要素に `userKey`, `name`, `mode` などのrecフィールドが含まれる
- [ ] HTML（ログイン画面）が返ってこない

---

## C) userStatsデータ取得

**URL**: `STATS_BASE_URL?action=userStats`

**完全URL例**:
```
https://script.google.com/macros/s/AKfycbzYBUA5VdUzyGu83FxL-DZ1O_DZogjV149BVaDrbLiH8t4m-IyljrfX1p4EsrIe2gZ8zw/exec?action=userStats
```

**期待されるレスポンス**:
- JSON配列: `[{ userKey: "...", name: "...", exp: 0, ... }, ...]`
- `csv` フィールドが**存在しない**
- userStatsデータのフィールド（userKey, name, exp, totalCorrect等）が含まれる

**検証項目**:
- [ ] JSON配列が返ってくる
- [ ] `csv` フィールドが**存在しない**
- [ ] 配列要素に `userKey`, `name`, `exp`, `totalCorrect` などのuserStatsフィールドが含まれる
- [ ] HTML（ログイン画面）が返ってこない

---

## 混線検知ログ例

### 問題データ取得でrec/userStatsが返ってきた場合

```
[problemLoader#compounds#1234567890] ERROR: Received rec/userStats data instead of problem data.
[problemLoader#compounds#1234567890] First item keys: ["userKey", "name", "mode", ...]
[problemLoader#compounds#1234567890] Used URL: PROBLEM_BASE_URL?type=compounds
```

### rec取得でCSVが返ってきた場合

```
[recLoader#1234567890] ERROR: Received CSV data instead of rec data. This means problem data API was called instead of rec API.
[recLoader#1234567890] Response contains csv field (first 100 chars): メタン,CH4,...
[recLoader#1234567890] Used URL: REC_BASE_URL?action=rec
```

### userStats取得でCSVが返ってきた場合

```
[userStatsLoader#1234567890] ERROR: Received CSV data instead of userStats data. This means problem data API was called instead of userStats API.
[userStatsLoader#1234567890] Response contains csv field (first 100 chars): メタン,CH4,...
[userStatsLoader#1234567890] Used URL: STATS_BASE_URL?action=userStats
```

### HTML（ログイン画面）が返ってきた場合

```
[recLoader#1234567890] ERROR: Received HTML instead of JSON. This may be a login page or error page.
[recLoader#1234567890] Used URL: REC_BASE_URL?action=rec
```

---

## URL定数の定義場所

- `src/config/gasUrls.ts`: 3つのURL定数（PROBLEM_BASE_URL, REC_BASE_URL, STATS_BASE_URL）を一元管理
- `src/config/dataSource.ts`: GAS_URLS（後方互換性のためPROBLEM_BASE_URLを参照）
- `src/data/gasLoader.ts`: 問題データ取得はPROBLEM_BASE_URLのみ使用
- `src/utils/sessionLogger.ts`: rec取得はREC_BASE_URL、userStats取得はSTATS_BASE_URLのみ使用
