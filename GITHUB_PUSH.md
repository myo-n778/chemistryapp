# GitHubへのプッシュ手順

## 方法1: Personal Access Tokenを使用（推奨）

1. GitHubでPersonal Access Tokenを作成:
   - https://github.com/settings/tokens にアクセス
   - "Generate new token (classic)" をクリック
   - スコープで `repo` にチェック
   - トークンを生成してコピー

2. 以下のコマンドを実行:
```bash
git push -u origin main
```
ユーザー名: `myo-n778`
パスワード: （Personal Access Tokenを貼り付け）

## 方法2: SSHキーを使用

1. SSHキーを生成（まだ持っていない場合）:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. SSHキーをGitHubに追加:
   - https://github.com/settings/keys にアクセス
   - "New SSH key" をクリック
   - `~/.ssh/id_ed25519.pub` の内容をコピーして追加

3. リモートURLをSSHに変更:
```bash
git remote set-url origin git@github.com:myo-n778/antigravity.git
git push -u origin main
```

## 方法3: GitHub CLIを使用

```bash
gh auth login
git push -u origin main
```

## 現在の状態

- ✅ リポジトリは初期化済み
- ✅ 初回コミット済み
- ✅ リモートリポジトリ（myo-n778/antigravity）設定済み
- ✅ プッシュ完了（2025-12-31時点）
