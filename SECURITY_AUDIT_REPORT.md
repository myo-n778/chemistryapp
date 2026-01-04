# セキュリティ・エラー監査レポート

## Summary
- **CRITICAL**: 2件
- **HIGH**: 4件
- **MEDIUM**: 3件
- **LOW**: 2件

## Findings

### CRITICAL

#### 1. GAS URLのハードコード（機密情報漏えいリスク）
**場所**: `src/data/gasLoader.ts:24-26`, `src/config/dataSource.ts:2-3`
**問題**: Google Apps Script URLがソースコードにハードコードされている
**影響**: 
- URLが公開リポジトリに含まれる
- GASスクリプトへの直接アクセスが可能
- 第三者による大量リクエストのリスク
**再現**: リポジトリを閲覧すれば即座に発見可能
**最小修正**:
```typescript
// src/data/gasLoader.ts (環境変数に移行)
const GAS_URLS: Record<Category, string> = {
  organic: import.meta.env.VITE_GAS_URL_ORGANIC || '',
  inorganic: import.meta.env.VITE_GAS_URL_INORGANIC || '',
};
```

#### 2. localStorage JSON.parse のエラーハンドリング不足（改ざんリスク）
**場所**: `src/utils/scoreCalculator.ts:142`
**問題**: JSON.parseのtry-catch内だが、パース結果の検証がない
**影響**: 
- 改ざんされたデータがそのまま使用される可能性
- 不正なデータ構造でアプリがクラッシュ
- 型安全性の欠如
**再現**: localStorageに不正なJSONを設定すれば再現可能
**最小修正**:
```typescript
// src/utils/scoreCalculator.ts:137-148
export const getScoreHistory = (mode?: string, rangeKey?: string): ScoreHistoryEntry[] => {
  try {
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 検証を追加
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(entry => 
        entry && 
        typeof entry.score === 'number' && 
        typeof entry.correctCount === 'number' &&
        typeof entry.totalCount === 'number' &&
        typeof entry.date === 'string'
      );
    }
  } catch (error) {
    console.warn('Failed to get score history from localStorage:', error);
  }
  return [];
};
```

### HIGH

#### 3. 配列境界チェック不足（Array Index Out of Bounds）
**場所**: `src/components/modes/*.tsx` (複数箇所)
**問題**: `compounds[currentIndex]` へのアクセス前に境界チェックがない箇所がある
**影響**: 
- 最後の問題終了後、`currentIndex` が配列長を超える可能性
- undefinedアクセスでクラッシュ
**再現**: 10問終了時の状態遷移で発生しうる
**最小修正**: 各クイズモードで `currentIndex < compounds.length` を確認してからアクセス

#### 4. handleNextRange の境界チェック不足
**場所**: `src/App.tsx` (getFilteredCompounds, handleNextRange)
**問題**: `startIndex + batchSize` が `compounds.length` を超える可能性の検証が不十分
**影響**: 
- 範囲外のスライスで空配列が返る
- Nextボタンが無効化されず、エラー状態になる
**再現**: 最後の範囲（例: 91-100）でNextを押すと発生
**最小修正**:
```typescript
// src/App.tsx: handleNextRange
const handleNextRange = () => {
  if (quizSettings && quizSettings.startIndex !== undefined) {
    let batchSize = 10;
    if (quizSettings.questionCountMode === 'batch-20') {
      batchSize = 20;
    } else if (quizSettings.questionCountMode === 'batch-40') {
      batchSize = 40;
    }
    const nextStartIndex = quizSettings.startIndex + batchSize;
    // 境界チェックを追加
    if (nextStartIndex > compounds.length) {
      return; // 次の範囲が存在しない
    }
    setQuizSettings({
      ...quizSettings,
      startIndex: nextStartIndex
    });
  }
};
```

#### 5. GAS レスポンス検証不足（データ改ざんリスク）
**場所**: `src/data/gasLoader.ts:131-150`
**問題**: JSONパース後のデータ構造検証が不十分
**影響**: 
- 不正なデータ構造でアプリがクラッシュ
- 想定外のデータが表示される
**再現**: GASスクリプトが改ざんされた場合
**最小修正**: レスポンススキーマ検証を追加（型ガード関数）

#### 6. 非同期処理の競合状態（Race Condition）
**場所**: `src/data/dataLoader.ts` (キャッシュ + リトライ)
**問題**: 同時に複数のリクエストが発行される可能性
**影響**: 
- キャッシュ更新の競合
- 不整合な状態
**再現**: 初期ロード時にカテゴリを素早く切り替える
**最小修正**: リクエストの重複を防ぐフラグ/キューイング

### MEDIUM

#### 7. npm audit: esbuild 脆弱性
**場所**: `package.json` (devDependencies)
**問題**: esbuild <=0.24.2 の脆弱性（開発サーバーへの任意リクエスト）
**影響**: 
- 開発環境でのみ影響（本番ビルドには影響なし）
- 開発サーバーが外部からアクセス可能な場合のみリスク
**再現**: `npm audit` で確認済み
**最小修正**: `npm audit fix` (ただし breaking changes の可能性)

#### 8. console.log での情報漏えい
**場所**: 複数ファイル
**問題**: 本番環境でも console.log が残っている
**影響**: 
- ブラウザコンソールにデバッグ情報が露出
- GAS URL、データ構造などの内部情報が露出
**再現**: ブラウザの開発者ツールで確認可能
**最小修正**: 本番ビルド時に console.* を削除（Vite設定で対応可能）

#### 9. タイムアウト処理の不整合
**場所**: `src/data/gasLoader.ts:109`
**問題**: AbortController のタイムアウトが15秒固定
**影響**: 
- 低速回線で頻繁にタイムアウト
- ユーザー体験の低下
**再現**: 低速回線環境
**最小修正**: 環境変数で設定可能にする（デフォルトは現状維持）

### LOW

#### 10. エラーメッセージの情報漏えい
**場所**: `src/data/gasLoader.ts:128, 135`
**問題**: エラーメッセージに内部実装詳細が含まれる
**影響**: 
- 攻撃者への情報提供
**再現**: ネットワークエラー時に確認
**最小修正**: ユーザー向けの汎用メッセージに変更

#### 11. TypeScript の型安全性の一部不足
**場所**: `src/data/gasLoader.ts:131` (`data: any`)
**問題**: `any` 型の使用
**影響**: 
- 型安全性の欠如
- ランタイムエラーの可能性
**再現**: 型定義の不整合
**最小修正**: 適切な型定義を追加

## Patches

### Patch 1: GAS URL の環境変数化

```typescript
// src/data/gasLoader.ts
// 24-26行目を以下に変更

const GAS_URLS: Record<Category, string> = {
  organic: import.meta.env.VITE_GAS_URL_ORGANIC || '',
  inorganic: import.meta.env.VITE_GAS_URL_INORGANIC || '',
};

// 28-30行目に検証を追加
if (!GAS_URLS.organic || !GAS_URLS.inorganic) {
  console.error('GAS URLs are not configured. Please set VITE_GAS_URL_ORGANIC and VITE_GAS_URL_INORGANIC environment variables.');
}
```

```bash
# .env.example を作成
VITE_GAS_URL_ORGANIC=https://script.google.com/macros/s/.../exec
VITE_GAS_URL_INORGANIC=https://script.google.com/macros/s/.../exec
```

### Patch 2: localStorage JSON.parse 検証強化

```typescript
// src/utils/scoreCalculator.ts:137-148
export const getScoreHistory = (mode?: string, rangeKey?: string): ScoreHistoryEntry[] => {
  try {
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('Invalid score history format, resetting');
        localStorage.removeItem(key);
        return [];
      }
      // 各エントリの検証
      const valid = parsed.filter(entry => {
        if (!entry || typeof entry !== 'object') return false;
        return typeof entry.score === 'number' && 
               typeof entry.correctCount === 'number' &&
               typeof entry.totalCount === 'number' &&
               typeof entry.date === 'string' &&
               entry.score >= 0 &&
               entry.correctCount >= 0 &&
               entry.totalCount >= 0;
      });
      return valid;
    }
  } catch (error) {
    console.warn('Failed to get score history from localStorage:', error);
    // 破損データを削除
    const key = mode && rangeKey ? getScoreHistoryKey(mode, rangeKey) : SCORE_HISTORY_KEY;
    localStorage.removeItem(key);
  }
  return [];
};
```

### Patch 3: handleNextRange 境界チェック

```typescript
// src/App.tsx: handleNextRange 関数
const handleNextRange = () => {
  if (!quizSettings || quizSettings.startIndex === undefined) return;
  
  let batchSize = 10;
  if (quizSettings.questionCountMode === 'batch-20') {
    batchSize = 20;
  } else if (quizSettings.questionCountMode === 'batch-40') {
    batchSize = 40;
  }
  
  const nextStartIndex = quizSettings.startIndex + batchSize;
  // 境界チェックを追加
  if (nextStartIndex > compounds.length) {
    return; // 次の範囲が存在しない
  }
  
  setQuizSettings({
    ...quizSettings,
    startIndex: nextStartIndex
  });
};
```

### Patch 4: 配列境界チェック（クイズモード共通）

```typescript
// src/components/modes/StructureToNameQuiz.tsx など
// handleNext 関数内で使用前にチェック

const handleNext = () => {
  if (isProcessingRef.current) return;
  isProcessingRef.current = true;

  if (totalAnswered >= 10) {
    saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
    setIsFinished(true);
  } else if (currentIndex < compounds.length - 1) {
    // 境界チェックを追加
    const nextIndex = currentIndex + 1;
    if (nextIndex >= compounds.length) {
      setIsFinished(true);
      return;
    }
    setCurrentIndex(nextIndex);
    // ... 以下既存コード
  } else {
    saveHighScore(pointScore, score, totalAnswered, mode, rangeKey);
    setIsFinished(true);
  }

  setTimeout(() => {
    isProcessingRef.current = false;
  }, 300);
};
```

## Verification Checklist

### セキュリティ検証

1. **GAS URL の環境変数化確認**
   - [ ] `.env` ファイルが `.gitignore` に含まれている
   - [ ] ビルド時に環境変数が正しく読み込まれる
   - [ ] 環境変数未設定時に適切なエラーが表示される

2. **localStorage 改ざん耐性**
   - [ ] 不正なJSONを設定してもクラッシュしない
   - [ ] 不正データが自動的に削除される
   - [ ] 検証後のデータのみが使用される

3. **GAS レスポンス検証**
   - [ ] 不正なレスポンスでクラッシュしない
   - [ ] エラーハンドリングが適切に動作する

### エラー処理検証

4. **配列境界エラー**
   - [ ] 最後の問題終了後、エラーが発生しない
   - [ ] Nextボタンが正しく無効化される
   - [ ] 範囲外アクセスが発生しない

5. **非同期処理**
   - [ ] 初回ロード時にエラーが発生しない
   - [ ] カテゴリ切り替え時に競合が発生しない
   - [ ] リトライが正しく動作する

### UI/UX検証

6. **モバイル対応**
   - [ ] 画面回転時に状態が保持される
   - [ ] アドレスバー変動で見切れない（100dvh使用確認）
   - [ ] タップ/ダブルタップの多重発火で1問飛ばしが発生しない

7. **PC対応**
   - [ ] クリック/キーボード操作が正しく動作
   - [ ] 画面サイズ変更でレイアウトが崩れない

8. **データ読み込み**
   - [ ] 初回ロード時にエラーが適切に表示される
   - [ ] リトライが動作する
   - [ ] キャッシュが正しく機能する

9. **スコア/ランキング**
   - [ ] スコアが正しく保存される
   - [ ] ランキングが正しく表示される
   - [ ] Nextボタンが正しく動作する

10. **スプレッドシート連携（GAS側の確認が必要）**
    - [ ] 書き込み権限が適切に制限されている
    - [ ] 入力値検証が行われている
    - [ ] CORS設定が適切である

## 追加推奨事項（GAS側）

以下の確認はGASスクリプト側で必要です（今回の監査範囲外ですが重要）：

1. **認証/認可**: GASスクリプトの公開範囲が「全員」になっていないか確認
2. **入力検証**: クライアントからのデータ（score, id等）を検証しているか
3. **書き込み先固定**: 書き込み先シート/列が固定され、任意の範囲に書けない設計か
4. **CORS設定**: 適切なOriginチェックが行われているか
5. **レート制限**: 大量リクエストへの対策があるか

## 結論

**CRITICAL項目（2件）**: 即座に対応が必要。特にGAS URLの環境変数化は優先度が高い。

**HIGH項目（4件）**: 配列境界チェックと非同期処理の競合は、ユーザー体験に直接影響するため、早期対応を推奨。

**MEDIUM/LOW項目**: 順次対応で問題なし。開発環境の脆弱性（esbuild）は本番に影響しないため、優先度は低い。


