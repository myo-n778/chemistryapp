# .env ファイルの設定ガイド

## 手順

### 1. .env ファイルを作成

プロジェクトのルートディレクトリ（`package.json` がある場所）に `.env` という名前のファイルを作成してください。

### 2. 以下の内容をコピーして貼り付けてください

```
VITE_GAS_URL_ORGANIC=https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec
VITE_GAS_URL_INORGANIC=https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec
VITE_SPREADSHEET_ID_ORGANIC=1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0
VITE_SPREADSHEET_ID_INORGANIC=1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0
```

### 3. ファイルを保存

保存後、開発サーバーを再起動してください（既に起動している場合）。

## コマンドラインで作成する方法

ターミナルで以下のコマンドを実行することでも作成できます：

```bash
cd "/Users/damatheta/Desktop/避難/nanahaさん/muki"
cat > .env << 'EOF'
VITE_GAS_URL_ORGANIC=https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec
VITE_GAS_URL_INORGANIC=https://script.google.com/macros/s/AKfycbwCnldwaS5elxrV3Iq0Lv0yqbZ9DYT58Y0LHAVeTBlckAm_TXzHWnyWY0apsTy1TS28/exec
VITE_SPREADSHEET_ID_ORGANIC=1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0
VITE_SPREADSHEET_ID_INORGANIC=1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0
EOF
```

## 確認方法

1. `.env` ファイルが作成されたことを確認：
   ```bash
   ls -la .env
   ```

2. ファイルの内容を確認：
   ```bash
   cat .env
   ```

3. 開発サーバーを起動して、警告が出ないことを確認：
   ```bash
   npm run dev
   ```

## 注意事項

- `.env` ファイルは `.gitignore` に含まれているため、Gitにはコミットされません
- このファイルには機密情報（GAS URL、スプレッドシートID）が含まれます
- 他の環境（本番環境など）で使用する場合は、別途環境変数を設定する必要があります



