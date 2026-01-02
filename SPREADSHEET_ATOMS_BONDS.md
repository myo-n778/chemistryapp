# スプレッドシート用 Atoms & Bonds データ

以下のデータをスプレッドシートの `atoms` 列と `bonds` 列にコピー&ペーストしてください。

## メタン (id: 1)

**atoms列:**
```
[{"id":"C1","element":"C","x":200,"y":200},{"id":"H1","element":"H","x":110,"y":110},{"id":"H2","element":"H","x":290,"y":110},{"id":"H3","element":"H","x":110,"y":290},{"id":"H4","element":"H","x":290,"y":290}]
```

**bonds列:**
```
[{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"},{"from":"C1","to":"H3","type":"single"},{"from":"C1","to":"H4","type":"single"}]
```

## エタン (id: 2)

**atoms列:**
```
[{"id":"C1","element":"C","x":130,"y":200},{"id":"C2","element":"C","x":270,"y":200},{"id":"H1","element":"H","x":50,"y":200},{"id":"H2","element":"H","x":130,"y":110},{"id":"H3","element":"H","x":130,"y":290},{"id":"H4","element":"H","x":270,"y":110},{"id":"H5","element":"H","x":270,"y":290},{"id":"H6","element":"H","x":350,"y":200}]
```

**bonds列:**
```
[{"from":"C1","to":"C2","type":"single"},{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"},{"from":"C1","to":"H3","type":"single"},{"from":"C2","to":"H4","type":"single"},{"from":"C2","to":"H5","type":"single"},{"from":"C2","to":"H6","type":"single"}]
```

## エチレン（エテン）(id: 5)

**atoms列:**
```
[{"id":"C1","element":"C","x":130,"y":200},{"id":"C2","element":"C","x":270,"y":200},{"id":"H1","element":"H","x":84,"y":110},{"id":"H2","element":"H","x":84,"y":290},{"id":"H3","element":"H","x":316,"y":110},{"id":"H4","element":"H","x":316,"y":290}]
```

**bonds列:**
```
[{"from":"C1","to":"C2","type":"double"},{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"},{"from":"C2","to":"H3","type":"single"},{"from":"C2","to":"H4","type":"single"}]
```

## アセチレン（エチン）(id: 7)

**atoms列:**
```
[{"id":"C1","element":"C","x":130,"y":200},{"id":"C2","element":"C","x":270,"y":200},{"id":"H1","element":"H","x":50,"y":200},{"id":"H2","element":"H","x":350,"y":200}]
```

**bonds列:**
```
[{"from":"C1","to":"C2","type":"triple"},{"from":"C1","to":"H1","type":"single"},{"from":"C2","to":"H2","type":"single"}]
```

## ベンゼン (id: 8)

**atoms列:**
```
[{"id":"C1","element":"C","x":200,"y":80},{"id":"C2","element":"C","x":304,"y":140},{"id":"C3","element":"C","x":304,"y":260},{"id":"C4","element":"C","x":200,"y":320},{"id":"C5","element":"C","x":96,"y":260},{"id":"C6","element":"C","x":96,"y":140},{"id":"H1","element":"H","x":200,"y":20},{"id":"H2","element":"H","x":370,"y":100},{"id":"H3","element":"H","x":370,"y":300},{"id":"H4","element":"H","x":200,"y":380},{"id":"H5","element":"H","x":30,"y":300},{"id":"H6","element":"H","x":30,"y":100}]
```

**bonds列:**
```
[{"from":"C1","to":"C2","type":"double"},{"from":"C2","to":"C3","type":"single"},{"from":"C3","to":"C4","type":"double"},{"from":"C4","to":"C5","type":"single"},{"from":"C5","to":"C6","type":"double"},{"from":"C6","to":"C1","type":"single"},{"from":"C1","to":"H1","type":"single"},{"from":"C2","to":"H2","type":"single"},{"from":"C3","to":"H3","type":"single"},{"from":"C4","to":"H4","type":"single"},{"from":"C5","to":"H5","type":"single"},{"from":"C6","to":"H6","type":"single"}]
```

## メタノール (id: 16)

**atoms列:**
```
[{"id":"C1","element":"C","x":130,"y":200},{"id":"O1","element":"O","x":270,"y":200},{"id":"H1","element":"H","x":50,"y":200},{"id":"H2","element":"H","x":130,"y":110},{"id":"H3","element":"H","x":130,"y":290},{"id":"H4","element":"H","x":350,"y":200}]
```

**bonds列:**
```
[{"from":"C1","to":"O1","type":"single"},{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"},{"from":"C1","to":"H3","type":"single"},{"from":"O1","to":"H4","type":"single"}]
```

## エタノール (id: 17)

**atoms列:**
```
[{"id":"C1","element":"C","x":80,"y":200},{"id":"C2","element":"C","x":200,"y":200},{"id":"O1","element":"O","x":320,"y":200},{"id":"H1","element":"H","x":20,"y":200},{"id":"H2","element":"H","x":80,"y":110},{"id":"H3","element":"H","x":80,"y":290},{"id":"H4","element":"H","x":200,"y":110},{"id":"H5","element":"H","x":200,"y":290},{"id":"H6","element":"H","x":380,"y":200}]
```

**bonds列:**
```
[{"from":"C1","to":"C2","type":"single"},{"from":"C2","to":"O1","type":"single"},{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"},{"from":"C1","to":"H3","type":"single"},{"from":"C2","to":"H4","type":"single"},{"from":"C2","to":"H5","type":"single"},{"from":"O1","to":"H6","type":"single"}]
```

## ホルムアルデヒド (id: 22)

**atoms列:**
```
[{"id":"C1","element":"C","x":130,"y":200},{"id":"O1","element":"O","x":270,"y":200},{"id":"H1","element":"H","x":50,"y":200},{"id":"H2","element":"H","x":130,"y":110}]
```

**bonds列:**
```
[{"from":"C1","to":"O1","type":"double"},{"from":"C1","to":"H1","type":"single"},{"from":"C1","to":"H2","type":"single"}]
```

## 使用方法

1. スプレッドシートの `compounds` シートを開く
2. 該当する化合物の行を探す（idで検索）
3. `atoms` 列に上記のatomsデータをコピー&ペースト
4. `bonds` 列に上記のbondsデータをコピー&ペースト

**注意**: 
- データは1行で入力してください（改行なし）
- スプレッドシートが自動的にJSONを認識する場合があります
- うまくいかない場合は、セルの書式を「テキスト」に設定してから貼り付けてください

## 他の化合物について

上記以外の化合物については、`ATOMS_BONDS_GUIDE.md` を参照して手動で作成するか、既存の類似化合物を参考にして作成してください。

