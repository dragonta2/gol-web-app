# .cursor/rules

このフォルダのルールは Cursor が自動で読み込みます。

## 実装時の準拠ルール

- **`implementation-react.mdc`**: React/Next.js の実装・リファクタ時に `react-best-practices.mdc` に準拠するよう指示するルール（`.tsx` / `.ts` / `.jsx` / `.js` で常時適用）

- **`react-best-practices.mdc`**: Vercel の React/Next.js パフォーマンスベストプラクティス（シンボリックリンク、下記参照）

## シンボリックリンク

`react-best-practices.mdc` は親ディレクトリの共通ルールへのシンボリックリンクです。
作り直す場合は以下を実行してください。

```bash
ln -s /Users/ta2/ALL-DTA2/.cursor/rules/react-best-practices.mdc /Users/ta2/ALL-DTA2/Develop/dta2/gol/web-app/.cursor/rules/react-best-practices.mdc
```

### コマンドの意味

- **`ln`**: リンクを作るコマンド（link の略）

- **`-s`**: シンボリックリンク（symlink）を作るオプション。実体ファイルをコピーせず、「別のパスを指し示す」だけのファイルを作る。実体を更新するとリンク先からも同じ内容が見える。`-s` を付けないとハードリンク（同じ inode を共有する別名）になり、別ディレクトリや別ファイルシステムには作れない。

- **第1引数（パス1）**: リンクの**参照先**（実体ファイルの絶対パス）

- **第2引数（パス2）**: リンク**そのもの**を置く場所（このフォルダ内の `react-best-practices.mdc` という名前で作る）

（`web-app` が別のパスにある場合は、第2引数のパスを適宜変更してください。）
