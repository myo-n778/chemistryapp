# Fetchエラー診断情報強化

## 修正概要

CORS/Failed to fetchエラーの再発防止のため、fetch失敗時に詳細な診断情報をconsoleに出力するように修正しました。

## 変更内容

### 対象ファイル

1. **src/data/gasLoader.ts** (problemLoader)
   - `loadCompoundsFromGAS()`
   - `loadReactionsFromGAS()`
   - `loadExperimentsFromGAS()`
   - `loadInorganicReactionsNewFromGAS()`

2. **src/utils/sessionLogger.ts** (recLoader / userStatsLoader)
   - `fetchAllRecData()`
   - `fetchAllUserStats()`

### 追加した診断情報

fetch失敗時（`catch (fetchError)`）および最終的なエラー時（`catch (error)`）に、以下の情報をconsoleに出力：

1. **Used URL**: 実際に使用したURL
2. **Origin**: `window.location.origin`（CORS判定に必要）
3. **Error name**: `error.name`（例: `TypeError`, `NetworkError`）
4. **Error message**: `error.message`
5. **Possible causes**: 固定文「CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.」
6. **Direct test URL**: ブラウザで直接確認できるURL（usedUrlをそのまま表示）

## 修正差分

### 1. problemLoader (gasLoader.ts)

#### loadCompoundsFromGAS()

**fetch失敗時のcatchブロック**:
```typescript
} catch (fetchError) {
  clearTimeout(timeoutId);
  if (fetchError instanceof Error && fetchError.name === 'AbortError') {
    throw new Error('Request timeout: GAS took too long to respond');
  }
  // CORS/Failed to fetch エラーの診断情報を出力
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  console.error(`[${requestId}] Fetch failed - Diagnostic information:`);
  console.error(`[${requestId}] Used URL:`, url);
  console.error(`[${requestId}] Origin:`, origin);
  console.error(`[${requestId}] Error name:`, fetchError instanceof Error ? fetchError.name : 'Unknown');
  console.error(`[${requestId}] Error message:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
  console.error(`[${requestId}] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.`);
  console.error(`[${requestId}] Direct test URL (copy to browser):`, url);
  throw fetchError;
}
```

**最終的なエラー時のcatchブロック**:
```typescript
} catch (error) {
  // エラー時の診断情報を出力（fetch失敗時は既に出力済み）
  if (!(error instanceof Error && error.name === 'AbortError')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
    console.error(`[problemLoader] Failed to load compounds from GAS for ${category}:`, error);
    console.error(`[problemLoader] Used URL:`, `${PROBLEM_BASE_URL}?type=compounds&category=${category}`);
    console.error(`[problemLoader] Origin:`, origin);
    console.error(`[problemLoader] Error name:`, error instanceof Error ? error.name : 'Unknown');
    console.error(`[problemLoader] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[problemLoader] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.`);
    console.error(`[problemLoader] Direct test URL (copy to browser):`, `${PROBLEM_BASE_URL}?type=compounds&category=${category}`);
  }
  // ... 既存の処理 ...
}
```

同様の修正を以下にも適用：
- `loadReactionsFromGAS()`
- `loadExperimentsFromGAS()`
- `loadInorganicReactionsNewFromGAS()`

### 2. recLoader (sessionLogger.ts)

**fetch失敗時のcatchブロック**:
```typescript
let response: Response;
try {
  response = await fetch(GAS_REC_URL, {
    method: 'GET',
    mode: 'cors',
  });
} catch (fetchError) {
  // CORS/Failed to fetch エラーの診断情報を出力
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  console.error(`[${requestId}] Fetch failed - Diagnostic information:`);
  console.error(`[${requestId}] Used URL:`, GAS_REC_URL);
  console.error(`[${requestId}] Origin:`, origin);
  console.error(`[${requestId}] Error name:`, fetchError instanceof Error ? fetchError.name : 'Unknown');
  console.error(`[${requestId}] Error message:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
  console.error(`[${requestId}] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.`);
  console.error(`[${requestId}] Direct test URL (copy to browser):`, GAS_REC_URL);
  throw fetchError;
}
```

**最終的なエラー時のcatchブロック**:
```typescript
} catch (error) {
  // エラー時の診断情報を出力（fetch失敗時は既に出力済み）
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  console.warn('[recLoader] Failed to fetch all rec data:', error);
  console.error('[recLoader] Used URL:', GAS_REC_URL);
  console.error('[recLoader] Origin:', origin);
  console.error('[recLoader] Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('[recLoader] Error message:', error instanceof Error ? error.message : String(error));
  console.error('[recLoader] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.');
  console.error('[recLoader] Direct test URL (copy to browser):', GAS_REC_URL);
  // ... 既存の処理 ...
}
```

### 3. userStatsLoader (sessionLogger.ts)

同様の修正を`fetchAllUserStats()`にも適用。

## 失敗時ログの例

### CORSエラーの場合

```
[problemLoader#compounds#1234567890] Fetch failed - Diagnostic information:
[problemLoader#compounds#1234567890] Used URL: https://script.google.com/macros/s/.../exec?type=compounds&category=organic
[problemLoader#compounds#1234567890] Origin: https://example.com
[problemLoader#compounds#1234567890] Error name: TypeError
[problemLoader#compounds#1234567890] Error message: Failed to fetch
[problemLoader#compounds#1234567890] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.
[problemLoader#compounds#1234567890] Direct test URL (copy to browser): https://script.google.com/macros/s/.../exec?type=compounds&category=organic
```

### ネットワークエラーの場合

```
[recLoader#1234567890] Fetch failed - Diagnostic information:
[recLoader#1234567890] Used URL: https://script.google.com/macros/s/.../exec?action=rec
[recLoader#1234567890] Origin: https://example.com
[recLoader#1234567890] Error name: NetworkError
[recLoader#1234567890] Error message: Network request failed
[recLoader#1234567890] Possible causes: CORS policy violation, network error, redirect loop, or GAS deployment/permission issue.
[recLoader#1234567890] Direct test URL (copy to browser): https://script.google.com/macros/s/.../exec?action=rec
```

## 変更していない箇所（厳守）

- ✅ UI: 変更なし（トースト等も追加していない）
- ✅ 通信仕様: 変更なし（`mode: 'cors'`は維持、`no-cors`は使用しない）
- ✅ ロジック: 変更なし（エラーハンドリングの流れは維持）
- ✅ その他の関数: 変更なし

## 確認項目

1. fetch失敗時に診断情報がconsoleに出力される
2. エラー名・メッセージが正しく表示される
3. Originが正しく表示される
4. 直叩き検証用URLが表示される
5. UIは変更されていない（エラー表示は既存のまま）
