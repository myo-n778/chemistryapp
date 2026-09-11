# 接続設定（2026-09-11確認）

現行の正本は `current-spec.md` と `src/config/gasUrls.ts`。
旧説明書のURLをそのまま使用しないこと。

## 既定の構成

- 問題シート: `1QxRAbYbN0tA3nmBgT7yL4HhnIPqW_QeFFkzGKkDLda0`
- 統合GAS: `https://script.google.com/macros/s/AKfycbzrE_jL_GT0Iqia4nLclzOMg0HHdQFUKDKUfR7uCFAdJ0h62hEGt5sD0MFqSuEjPqRDRA/exec`
- ローカルGASの候補正本: `GAS_CODE_UNIFIED.js`。公開中のソースとの一致は未確認。

`.env`なしで上の既定URLを使用する。`.env.txt` と `名称未設定.txt` はViteの環境設定として読み込まれない。
必要な場合だけ `.env.local` で以下を指定し、開発サーバーを再起動／本番ビルドを再生成する。

```dotenv
VITE_GAS_URL_PROBLEM=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
VITE_GAS_URL_REC=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
VITE_GAS_URL_USERSTATS=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

`VITE_GAS_URL_ORGANIC` と `VITE_GAS_URL_INORGANIC` は現行URL解決に使われない。
`VITE_`変数はブラウザ配布物へ埋め込まれるため秘密情報を入れない。
記録POSTは現行実装では `VITE_GAS_URL_PROBLEM` 側へ送られる。REC変数は記録GET専用。
分離デプロイを使う場合は、この違いを確認してから変更すること。

## 起動と検証

```bash
npm ci
npm run dev -- --host 127.0.0.1
npm run build
```

通常の学習画面では開発用診断パネルは出さない。
診断が必要な場合だけURL末尾に `?diagnostics` を付ける（記録・成績・問題のGETが発生する）。

## 接続確認の履歴

2026-09-11 旧URLの問題GETはHTTP 403。
ログインなしChromeでも「アクセス権が必要です」を確認した。
スプレッドシートは接続済みDrive経由で読取可能。

GAS管理画面で、対象デプロイID、有効な版、実行ユーザー、アクセス対象を確認する必要がある。
ソース編集だけでは既存デプロイへ反映されないため、対応する公開版を確認する。
このアプリのGASには問題だけでなく記録・成績GETもある。アクセス対象を広げる前に、
記録データの公開範囲を確認する。今回、Codexによる公開設定変更・GAS再デプロイ・Sheets書込は実施していない。

同日20:04以降、ユーザー再デプロイの新URLで問題4種類・rec・userStatsのGETがすべてHTTP 200。
ローカル修正版も新URLへ切り替え、有機・無機の実問題がChromeで表示されることを確認した。
GitHub Pagesのフロントは未反映、実記録POSTとSheets読戻しは未確認。
