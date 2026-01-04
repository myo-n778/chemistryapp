# 無機化学モード別Excel列使用一覧

## データ読み込み経路

### モードA（反応 → 生成物）
- **Excelファイル**: 
  - 優先: `無機反応一覧_最新版_TEXモード_JK整形.xlsx`
  - フォールバック: `無機反応一覧_最新版_問題文付き_TEX整形.xlsx`
- **シート名**: `問題バンク_TEX`（優先）または同等列を持つシート
- **読み込み関数**: `inorganicQuizLoader.ts` → `loadInorganicQuizQuestions()`

### モードB〜G（その他のモード）
- **Excelファイル**: `reactions.xlsx`
- **シート名**: 
  - 一覧モード: 最初のシート（通常はSheet1）
  - TEX形式モード: "TEX"や"TeX"を含むシート名
- **読み込み関数**: `inorganicLoader.ts` → `loadInorganicReactions()`

---

## 各モードの使用列・フィールド一覧

### モードA：反応 → 生成物

#### 新形式（J列=反応物、K列=生成物）
- **問題文（反応物）**: J列 → `reactants_desc` / `equation_tex_mhchem`
- **選択肢1**: K列 → `products_desc`（JSON配列の0番目）
- **選択肢2**: L列 → `products_desc`（JSON配列の1番目）
- **選択肢3**: M列 → `products_desc`（JSON配列の2番目）
- **選択肢4**: N列 → `products_desc`（JSON配列の3番目）
- **正解番号**: O列（インデックス14） → `conditions` / `answer_hint`（0-indexed）
- **解説**: P列（インデックス15） → `notes`

#### 旧形式（A列=問題文、B〜E列=選択肢）
- **問題文**: A列 → `reactants_desc` / `equation_tex_mhchem`
- **選択肢1**: B列 → `products_desc`（JSON配列の0番目）
- **選択肢2**: C列 → `products_desc`（JSON配列の1番目）
- **選択肢3**: D列 → `products_desc`（JSON配列の2番目）
- **選択肢4**: E列 → `products_desc`（JSON配列の3番目）
- **正解番号**: F列 → `conditions` / `answer_hint`（0-indexed）
- **解説**: G列 → `notes`

#### 表示内容
- **問題文エリア**: 反応物（J列またはA列）のみ + 矢印（→）
- **選択肢**: 生成物（K〜N列またはB〜E列）をTeX形式で表示
- **正解表示**: 選択肢の正解をTeX形式で表示
- **解説**: `notes`をTeX形式で表示

---

### モードB：反応 → 観察

#### 使用列（reactions.xlsxの一覧モードシート）
- **問題文（反応物）**: `reactants_desc`列 または `equation_tex`列
- **正解（観察）**: `observations`列
- **図表示**: `tags_norm`列（配列）

#### 誤答生成
- 同`tags_norm`または同`family`から誤答を生成

#### 表示内容
- **問題文エリア**: 反応物（`reactants_desc`）または反応式（`equation_tex`）
- **図**: `tags_norm`に基づくSVG表示（InorganicVisualViewer）
- **選択肢**: `observations`から生成（正解1つ + 誤答3つ）
- **正解表示**: `observations`

---

### モードC：条件 → 結果（分岐）

#### 使用列（reactions.xlsxの一覧モードシート）
- **問題文（条件）**: `conditions`列
- **反応ファミリー**: `family`列（表示用に日本語変換）
- **正解（生成物）**: `products_desc`列
- **バリアント**: `variant`列（表示用に日本語変換）
- **解説**: `notes`列

#### 誤答生成
- 同`family`の別`variant`から誤答を生成
- 不足する場合は通常の誤答生成を使用

#### 表示内容
- **問題文エリア**: 反応の種類（`family`を日本語変換）+ 条件（`conditions`）
- **選択肢**: `products_desc`から生成（正解1つ + 誤答3つ）
- **正解表示**: `products_desc` + 反応式（`equation_tex_mhchem`または`equation_tex`）
- **解説**: `notes` + 反応パターン（`variant`を日本語変換）

---

### モードD：図を見て答える

#### サブモードD-1：図 → 物質
- **問題文（図）**: `tags_norm`列 + `observations`列
- **正解（生成物）**: `products_desc`列

#### サブモードD-2：図 → 反応式
- **問題文（図）**: `tags_norm`列
- **正解（反応式）**: `equation_tex_mhchem`列 または `equation_tex`列

#### サブモードD-3：図 → 観察
- **問題文（図）**: `tags_norm`列
- **正解（観察）**: `observations`列

#### 誤答生成
- 同`tags_norm`または同`family`から誤答を生成

#### 表示内容
- **問題文エリア**: 図（`tags_norm`に基づくSVG表示、InorganicVisualViewer）
- **選択肢**: サブモードに応じて`products_desc`、`equation_tex`、`observations`から生成
- **正解表示**: サブモードに応じた正解フィールド

---

### モードE：空欄補充（語を選ぶ）

#### サブモードE-1：生成物
- **問題文**: `reactants_desc`列
- **空欄（正解）**: `products_desc`列

#### サブモードE-2：観察語
- **問題文**: `reactants_desc`列 + `products_desc`列
- **空欄（正解）**: `observations`列

#### サブモードE-3：条件・操作
- **問題文**: `reactants_desc`列
- **空欄（正解）**: `conditions`列 または `operation`列

#### 誤答生成
- 各サブモードの正解フィールドから誤答を生成

#### 表示内容
- **問題文エリア**: 反応物 + 空欄（______）
- **選択肢**: サブモードに応じたフィールドから生成（正解1つ + 誤答3つ）
- **正解表示**: サブモードに応じた正解フィールド

---

### モードF：式 → 意味

#### 使用列（reactions.xlsxの一覧モードシート）
- **問題文（反応式）**: `equation_tex_mhchem`列 または `equation_tex`列
- **正解**: `observations`列 または `products_desc`列（ランダム選択）

#### 誤答生成
- 正解フィールドから誤答を生成

#### 表示内容
- **問題文エリア**: 反応式（`equation_tex_mhchem`または`equation_tex`をTeX形式で表示）
- **選択肢**: `observations`または`products_desc`から生成（正解1つ + 誤答3つ）
- **正解表示**: 選択された正解フィールド

---

### モードG：識別・比較

#### 使用列（reactions.xlsxの一覧モードシート）
- **問題文**: `tags_norm`列 または `observations`列（ランダム選択）
- **選択肢タイプ**: `equation_tex_mhchem`列 / `equation_tex`列 または `reactants_desc`列（ランダム選択）
- **判定**: `tags_norm`列 / `family`列

#### 誤答生成
- 同`tags_norm`または同`family`から誤答を生成

#### 表示内容
- **問題文エリア**: 
  - `tags_norm`の場合: 図（SVG表示、InorganicVisualViewer）
  - `observations`の場合: 観察テキスト
- **選択肢**: 
  - `equation`タイプ: `equation_tex_mhchem`または`equation_tex`をTeX形式で表示
  - `reactants`タイプ: `reactants_desc`をテキストで表示
- **正解表示**: 選択肢タイプに応じた正解フィールド

---

## Excel列名とInorganicReactionフィールドの対応

### reactions.xlsx（一覧モードシート）の列名
以下の列名が使用されます（ヘッダー行から自動検出）：
- `id`: ID
- `topic`: 分野
- `type`: 反応タイプ
- `equation_tex`: プレーン表示用反応式
- `reactants_desc`: 反応前物質の説明
- `products_desc`: 反応後物質の説明
- `conditions`: 条件
- `operation`: 操作
- `observations`: 観察
- `notes`: 補足
- `family`: 反応ファミリー
- `variant`: ファミリー内の違い
- `difficulty`: 難易度
- `state_tags`: 元データ由来の状態タグ
- `tags_norm`: 規格化タグ（配列）
- `ask_types_json`: 出題タイプ候補（配列）
- `question_templates_json`: 問題文テンプレート（オブジェクト）
- `answer_hint`: 解答種別ヒント
- `equation_tex_mhchem`: mhchem形式の反応式（TEX形式モードシートからマージ）

### 問題バンク_TEXシートの列
- **新形式**: J列（反応物）、K列（生成物1）、L列（生成物2）、M列（生成物3）、N列（生成物4）、O列（正解番号）、P列（解説）
- **旧形式**: A列（問題文）、B列（選択肢1）、C列（選択肢2）、D列（選択肢3）、E列（選択肢4）、F列（正解番号）、G列（解説）

---

## まとめ表

| モード | Excelファイル | シート名 | 問題文 | 選択肢 | 正解 | 解説 | その他 |
|--------|--------------|----------|--------|--------|------|------|--------|
| A | TEXモード_JK整形.xlsx<br>（または問題文付き_TEX整形.xlsx） | 問題バンク_TEX | J列（反応物）<br>またはA列 | K〜N列<br>またはB〜E列 | O列（正解番号）<br>またはF列 | P列<br>またはG列 | - |
| B | reactions.xlsx | 一覧モードシート | `reactants_desc`<br>または`equation_tex` | `observations`から生成 | `observations` | - | `tags_norm`（図表示） |
| C | reactions.xlsx | 一覧モードシート | `conditions`<br>+ `family` | `products_desc`から生成 | `products_desc` | `notes` | `variant`（反応パターン） |
| D | reactions.xlsx | 一覧モードシート | `tags_norm`<br>（図表示） | サブモード依存 | サブモード依存 | - | D-1: `products_desc`<br>D-2: `equation_tex`<br>D-3: `observations` |
| E | reactions.xlsx | 一覧モードシート | `reactants_desc` | サブモード依存 | サブモード依存 | `notes` | E-1: `products_desc`<br>E-2: `observations`<br>E-3: `conditions`/`operation` |
| F | reactions.xlsx | 一覧モードシート | `equation_tex_mhchem`<br>または`equation_tex` | `observations`<br>または`products_desc` | `observations`<br>または`products_desc` | - | - |
| G | reactions.xlsx | 一覧モードシート | `tags_norm`<br>または`observations` | `equation_tex`<br>または`reactants_desc` | 選択肢タイプ依存 | - | `family`（判定用） |

