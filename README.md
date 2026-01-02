# 有機化学クイズアプリ

有機化合物の構造式を表示し、名称を当てるクイズ形式の学習アプリです。

## 機能

- 有機化合物の構造式をSVGで表示
- 4択クイズ形式で名称を選択
- 正解/不正解の即座なフィードバック
- スコアと正答率の表示
- レスポンシブデザイン対応

## インストール

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

## ビルド

```bash
npm run build
```

## GitHub Pagesでの公開

このアプリはGitHub Pagesで公開できます。

### 自動デプロイ（推奨）

1. GitHubリポジトリの設定を開く:
   - リポジトリページで「Settings」→「Pages」に移動
   - 「Source」で「GitHub Actions」を選択

2. `main` ブランチにプッシュすると、自動的にデプロイされます:
   ```bash
   git push origin main
   ```

3. デプロイが完了すると、以下のURLでアクセスできます:
   ```
   https://myo-n778.github.io/chemistryapp/
   ```

### 手動デプロイ

1. ビルドを実行:
   ```bash
   npm run build
   ```

2. `dist` フォルダの内容を `gh-pages` ブランチにプッシュ

注意: 自動デプロイを使用する場合は手動デプロイは不要です。

## 含まれる化合物

- メタン
- エタン
- エチレン
- アセチレン
- ベンゼン
- メタノール
- エタノール
- ホルムアルデヒド

## 技術スタック

- React 18
- TypeScript
- Vite
- CSS3

