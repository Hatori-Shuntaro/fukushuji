# 復習寺

選択式の一問一答でテスト勉強を進めるブラウザアプリです。

公開URL:

```text
https://hatori-shuntaro.github.io/fukushuji/
```

GitHubリポジトリ:

```text
https://github.com/Hatori-Shuntaro/fukushuji
```

## 機能

- 試験カテゴリごとの問題管理
- 選択式の一問一答
- お気に入り登録
- 問題ごとのメモ
- セッション中の正解数、不正解数、正答率
- Supabase設定時のメールログインとPC/スマホ同期
- Supabase未設定時のローカルデモ保存

## ローカル起動

```bash
python3 -m http.server 5173
```

ブラウザで `http://localhost:5173` を開きます。

同じWi-Fi上のスマホから確認する場合は、PCのIPアドレスを使って
`http://<PCのIPアドレス>:5173` にアクセスします。

## Supabase設定

1. Supabaseで新しいプロジェクトを作成します。
2. SQL Editorで `supabase-schema.sql` を実行します。
3. Authentication > Providers で Email を有効にします。
4. Authentication > URL Configuration に公開URLを登録します。
5. `app-config.js` にProject URLとanon public keyを設定します。

このリポジトリをGitHub Pagesで使う場合、SupabaseのRedirect URLsに以下を追加します。

```text
https://hatori-shuntaro.github.io/fukushuji/
```

```js
window.FUKUSHUJI_CONFIG = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key"
};
```

`SUPABASE_ANON_KEY` は公開してよいanon keyのみを使います。service role keyは入れないでください。

## インターネット公開

静的ファイルを配信できるホスティングに、以下のファイルを公開します。

- `index.html`
- `styles.css`
- `app.js`
- `app-config.js`

公開後、SupabaseのAuthentication設定で、その公開URLをSite URLまたはRedirect URLsに追加してください。

## GitHub Pagesで公開

GitHubにリポジトリを作成して、このフォルダのファイルをアップロードします。

GitHub Pagesの設定:

1. GitHubのリポジトリ画面を開きます。
2. Settings > Pages を開きます。
3. Build and deployment の Source を `Deploy from a branch` にします。
4. Branch を `main`、Folder を `/ (root)` にして保存します。
5. 数分後に表示されるURLが公開URLです。

公開URLの形式は通常この形です。

```text
https://<github-user-name>.github.io/<repository-name>/
```
