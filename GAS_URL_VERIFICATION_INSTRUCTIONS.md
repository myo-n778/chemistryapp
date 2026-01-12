# GAS URL検証手順

## 現在の状況
ログ分析により、rec専用URLが正しく設定されていない可能性があります。
以下の手順で各URLを直接検証してください。

## 検証手順

### 1. 問題データ用URLの検証
ブラウザで以下のURLを開いてください：
```
https://script.google.com/macros/s/AKfycbxU4eANa9Q0t77ZftT2EFHvGfGSHloB1e0G3IZ86bk5uBZVII-IY_9FDpV8t1AkZtxh_w/exec?type=compounds&category=organic
```

**期待される結果**:
- `{"csv":"メタン,CH4,..."}` のようなJSON形式
- または CSV文字列

**実際の結果を教えてください**:
- [ ] JSON形式でCSVデータが返る
- [ ] エラーメッセージが返る
- [ ] HTML（ログイン画面など）が返る
- [ ] その他（具体的に）

---

### 2. rec専用URLの検証
以下の2つのURLをそれぞれ開いてください：

#### A) URL 1
```
https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec?action=rec
```

**期待される結果**:
- `[{...},{...}]` のようなJSON配列（recデータ）
- または `{"error":"..."}` エラー

**実際の結果を教えてください**:
- [ ] JSON配列が返る（recデータ）
- [ ] `{"error":"invalid request. Use action=userStats"}` が返る
- [ ] その他（具体的に）

#### B) URL 2
```
https://script.google.com/macros/s/AKfycbzYBUA5VdUzyGu83FxL-DZ1O_DZogjV149BVaDrbLiH8t4m-IyljrfX1p4EsrIe2gZ8zw/exec?action=rec
```

**期待される結果**:
- `[{...},{...}]` のようなJSON配列（recデータ）
- または `{"error":"..."}` エラー

**実際の結果を教えてください**:
- [ ] JSON配列が返る（recデータ）
- [ ] `{"error":"invalid request. Use action=userStats"}` が返る
- [ ] その他（具体的に）

---

### 3. userStats専用URLの検証
以下の2つのURLをそれぞれ開いてください：

#### A) URL 1
```
https://script.google.com/macros/s/AKfycbz3dAJzhk6TcRMwHIg-NJvpJ2xiv_utZoQt_I9m5_ZN-usWeL1kpWbLkkJ1k51jSJUK_Q/exec?action=userStats
```

**期待される結果**:
- `[{...},{...}]` のようなJSON配列（userStatsデータ）
- または `[]` 空配列（データがまだ無い場合）

**実際の結果を教えてください**:
- [ ] JSON配列が返る（userStatsデータ）
- [ ] `[]` 空配列が返る
- [ ] エラーメッセージが返る
- [ ] その他（具体的に）

#### B) URL 2
```
https://script.google.com/macros/s/AKfycbzYBUA5VdUzyGu83FxL-DZ1O_DZogjV149BVaDrbLiH8t4m-IyljrfX1p4EsrIe2gZ8zw/exec?action=userStats
```

**期待される結果**:
- `[{...},{...}]` のようなJSON配列（userStatsデータ）
- または `[]` 空配列（データがまだ無い場合）

**実際の結果を教えてください**:
- [ ] JSON配列が返る（userStatsデータ）
- [ ] `[]` 空配列が返る
- [ ] エラーメッセージが返る
- [ ] その他（具体的に）

---

## 重要な質問

1. **rec専用GASは別のURLにデプロイされていますか？**
   - もし別のURLがある場合は、そのURLを教えてください。

2. **GAS_CODE_REC_ONLY.js は新しいGASプロジェクトとしてデプロイしましたか？**
   - デプロイした場合、そのURLを教えてください。
   - まだデプロイしていない場合は、デプロイしてください。

3. **問題データ用GAS（GAS_CODE.js）は正しくデプロイされていますか？**
   - デプロイURLが `AKfycbxU4eANa9Q0t77ZftT2EFHvGfGSHloB1e0G3IZ86bk5uBZVII-IY_9FDpV8t1AkZtxh_w/exec` で正しいですか？

---

## 次のステップ
検証結果を教えていただければ、正しいURL設定に修正します。
