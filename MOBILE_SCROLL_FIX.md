# スマホ表示の横スクロール・見切れ問題修正

## 修正概要

iPhone幅（375px前後）で横スクロールが出ないように、原因要素を特定して最小差分で修正しました。

## 原因特定

### 1. PublicRankingPanel（ランキングテーブル）
- **問題**: `.ranking-table`に`min-width: 700px`（通常）、`min-width: 600px`（768px以下）、`min-width: 550px`（480px以下）が設定されている
- **影響**: スマホ幅（375px）では親要素（`.public-ranking-panel`）を超えてはみ出す
- **修正**: `.public-ranking-panel`と`.ranking-scroll-container`に`width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加

### 2. ModeSelector（モード選択グリッド）
- **問題**: `.mode-selector`と`.mode-grid`に`max-width: 1000px`が設定されているが、`width: 100%`が無い
- **影響**: paddingを含めた幅計算で親要素を超える可能性
- **修正**: `width: 100%`、`box-sizing: border-box`を追加

### 3. Quiz（クイズコンテナ・選択肢グリッド）
- **問題**: `.options-container`と`.options-container-structure`のgridが`repeat(2, 1fr)`で、長いテキストがはみ出す可能性
- **影響**: flex/grid子要素がテキストで押し広げられる
- **修正**: `grid-template-columns: repeat(2, minmax(0, 1fr))`に変更、`width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加

### 4. UserStatsPanel（ユーザー統計パネル）
- **問題**: `.stats-grid`が`repeat(2, 1fr)`で、長いテキストがはみ出す可能性
- **影響**: flex/grid子要素がテキストで押し広げられる
- **修正**: `grid-template-columns: repeat(2, minmax(0, 1fr))`に変更、`width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加

## 変更ファイル一覧

1. **src/App.css**
   - グローバルCSSのベース強化（`box-sizing`、画像/メディアのはみ出し防止、長い文字列の折り返し）

2. **src/components/PublicRankingPanel.css**
   - `.public-ranking-panel`: `width: 100%`、`box-sizing: border-box`を追加
   - `.ranking-scroll-container`: `max-width: 100%`、`box-sizing: border-box`を追加

3. **src/components/ModeSelector.css**
   - `.mode-selector`: `width: 100%`、`box-sizing: border-box`を追加
   - `.mode-grid`: `width: 100%`、`box-sizing: border-box`を追加
   - `.mode-grid-container`: `width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加

4. **src/components/Quiz.css**
   - `.quiz-container`: `max-width: 100%`、`box-sizing: border-box`を追加
   - `.options-container`: `grid-template-columns: repeat(2, minmax(0, 1fr))`に変更、`width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加
   - `.options-container-structure`: 同様の修正
   - `.quiz-header`: `width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加、子要素に`min-width: 0`を追加

5. **src/components/UserStatsPanel.css**
   - `.user-stats-panel`: `width: 100%`、`box-sizing: border-box`を追加
   - `.stats-grid`: `grid-template-columns: repeat(2, minmax(0, 1fr))`に変更、`width: 100%`、`max-width: 100%`、`box-sizing: border-box`を追加

## CSS差分

### src/App.css

```css
/* 追加 */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* 画像・メディアのはみ出し防止 */
img,
svg,
video,
canvas {
  max-width: 100%;
  height: auto;
}

/* 長い文字列の折り返し（必要に応じて適用） */
.breakable {
  overflow-wrap: anywhere;
  word-break: break-word;
}
```

### src/components/PublicRankingPanel.css

```css
.public-ranking-panel {
  /* 追加 */
  width: 100%; /* スマホ幅で親要素に収まる */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}

.ranking-scroll-container {
  /* 追加 */
  max-width: 100%; /* 親要素を超えない */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}
```

### src/components/ModeSelector.css

```css
.mode-selector {
  /* 追加 */
  width: 100%; /* スマホ幅で親要素に収まる */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}

.mode-grid {
  /* 追加 */
  width: 100%; /* スマホ幅で親要素に収まる */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}

.mode-grid-container {
  /* 追加 */
  width: 100%; /* 親要素に収まる */
  max-width: 100%; /* 親要素を超えない */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}
```

### src/components/Quiz.css

```css
.quiz-container {
  /* 追加 */
  max-width: 100%; /* 親要素を超えない */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}

.options-container {
  /* 変更 */
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* minmax(0, 1fr)で横はみ出し防止 */
  /* 追加 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.options-container-structure {
  /* 同様の修正 */
}

.quiz-header {
  /* 追加 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.quiz-header > * {
  min-width: 0; /* flex子要素がテキストで押し広げられるのを防ぐ */
}
```

### src/components/UserStatsPanel.css

```css
.user-stats-panel {
  /* 追加 */
  width: 100%; /* スマホ幅で親要素に収まる */
  box-sizing: border-box; /* paddingを含めた幅計算 */
}

.stats-grid {
  /* 変更 */
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* minmax(0, 1fr)で横はみ出し防止 */
  /* 追加 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
```

## iPhone幅での確認手順

1. **ブラウザのDevToolsでiPhone幅（375px）に設定**
   - Chrome DevTools: `Cmd+Shift+M`（Mac）または`Ctrl+Shift+M`（Windows）
   - デバイスモードで「iPhone 12 Pro」または「iPhone SE」を選択

2. **横スクロールの確認**
   - ページを横にスクロールできるか確認
   - 横スクロールが出ないことを確認

3. **縦スクロールの確認**
   - ページを下までスクロールできるか確認
   - ボタン/一覧が消えないことを確認

4. **主要画面での確認**
   - トップ画面（カテゴリ選択）
   - モード選択画面
   - クイズ画面
   - ランキング表示
   - ユーザー統計表示

5. **DevToolsで原因要素の確認（必要に応じて）**
   ```javascript
   // 横スクロールの原因要素を検出
   Array.from(document.querySelectorAll('*')).filter(el => el.scrollWidth > el.clientWidth)
   ```

## 変更していない箇所（厳守）

- ✅ コンポーネントのロジック: 変更なし
- ✅ データ取得: 変更なし
- ✅ 画面構成: 変更なし（レイアウトの意味は維持）
- ✅ 自動整形/大規模リファクタ: 禁止（原因箇所に限定した最小パッチ）

## 期待される結果

- ✅ iPhone幅（375px）で横スクロールが出ない
- ✅ 画面下まで縦スクロールで到達できる
- ✅ ボタン/一覧が消えない
- ✅ ランキングテーブルは横スクロール可能（`.ranking-scroll-container`内のみ）
- ✅ その他の要素は親要素に収まる
