---
name: 週末除外Comp対象外Hover表示
overview: 習慣リストの「週末除外」「Comp対象外」ボタンを、OFF時は何も表示せず、その位置をホバーしたときだけオフ状態のボタンが出現する形に変更する。リスト上でON/OFFを直接切り替えられることを維持しつつ、視覚的なノイズを削減する。
todos: []
isProject: false
---

# 週末除外・Comp対象外ボタンの Hover 時のみ表示（OFF時）

## 目的

- 視覚的なノイズを減らす（OFF時は普段何も表示しない）
- **ここで切り替えられる**ことを維持する（編集モーダルに頼らずリスト上で ON/OFF 可能）

## 方針: Hover で OFF ボタンを出現させる

- **ON 時**: 現状通り、色付きボタンを常時表示（週末除外: cyan、Comp対象外: yellow）。クリックで OFF に変更
- **OFF 時**: 通常は何も表示しないが、その位置をホバーするとオフ状態のボタンが出現。クリックで ON に切り替え可能

## 実装の考え方

### 1. コンテナは常に存在

固定幅のコンテナ div は常にレンダリングし、ホバー対象エリアとして確保する。中身（ボタン）の見え方だけを条件で変える。

### 2. OFF 時の挙動

- デフォルト: ボタンエリアを `opacity-0` または `invisible` で非表示にしつつ、クリック可能領域は確保
- ホバー時: `group-hover:` または `hover:` で `opacity-100` / `visible` にし、`text-zinc-500 bg-zinc-800` のオフスタイルを表示

例（週末除外）:

```tsx
<div className="w-[4.5rem] flex justify-end shrink-0 group">
  <button
    type="button"
    onClick={...}
    title="土日祝は任意（進捗に影響しません）"
    className={`
      text-xs px-2 py-0.5 rounded transition-all
      ${parent.exclude_weekends
        ? 'text-cyan-300/90 bg-cyan-900/30'  // ON: 常時表示
        : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'
      }
      ${isConfirmed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
    `}
  >
    週末除外
  </button>
</div>
```

- OFF 時: `opacity-0` で見えなくするが、ボタンは存在するのでクリック可能
- ただし `opacity-0` だとクリック領域も「見えない」ため、ホバーしづらい可能性がある

### 3. より確実な方式: 薄いプレースホルダ + Hover で表示

- OFF 時: ボタンエリアを `min-width` / `min-height` で確保し、`opacity-0` のボタン、または `aria-label` 付きの透明ボタンを配置
- コンテナに `group` を付け、`group-hover:opacity-100` でボタンを表示

**注意**: `opacity-0` の要素はマウスイベントを通常受け取るため、ホバーで表示させるには「そのエリアにマウスが入る」必要がある。何も見えないとホバーしづらいため、以下のどちらかを検討する:

- **A**: ごく薄い境界線やドットを OFF 時も表示し、ホバーしやすいようにする
- **B**: 固定幅の空スペースとして確保し、その範囲にマウスを入れたら表示（ユーザーが「ここに何かある」と学習すれば使える）

ユーザーが「何もないところを hover すると」と述べているため、**B** を採用し、固定幅の透明エリアをホバー対象とする。

### 4. 修正版: 透明だがヒット可能なエリア

```tsx
<div className="w-[4.5rem] flex justify-end shrink-0 group min-h-[1.5rem]">
  <button
    ...
    className={`
      text-xs px-2 py-0.5 rounded transition-opacity
      ${parent.exclude_weekends
        ? 'text-cyan-300/90 bg-cyan-900/30'
        : 'text-zinc-500 bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700'
      }
      ...
    `}
  >
    週末除外
  </button>
</div>
```

`group` は親 div に付け、子の button が `group-hover:opacity-100` で出現。親の div が固定幅なので、その範囲にマウスを入れるとボタンが表示される。

## 変更対象

[habit-list.tsx](gol-web/app/dashboard/habit-list.tsx) 内の「週末除外」「Comp対象外」ボタン約 9 箇所ずつ。

- 各ボタンを含む div に `group` を追加
- OFF 時の className に `opacity-0 group-hover:opacity-100` を追加
- 他スタイル（focus ring 等）は維持

