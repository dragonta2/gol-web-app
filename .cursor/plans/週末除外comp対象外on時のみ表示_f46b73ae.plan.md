---
name: 週末除外Comp対象外ON時のみ表示
overview: 習慣リストの「週末除外」「Comp対象外」ボタンを ON 時のみ表示にし、OFF 時は非表示にすることで視覚的なノイズを大幅に削減する。ON/OFF の切り替えは編集モーダル（既存のチェックボックス）で行い、リスト上の ON ボタンクリックで OFF に戻せる。
todos:
  - id: wrap-weekends-buttons
    content: 週末除外ボタン（約9箇所）を exclude_weekends 条件で囲む & OFF時スタイル削除
    status: pending
  - id: wrap-comp-buttons
    content: Comp対象外ボタン（約9箇所）を exclude_from_complete 条件で囲む & OFF時スタイル削除
    status: pending
  - id: verify-layout
    content: 変更後のレイアウト崩れがないか確認（lint確認）
    status: pending
isProject: false
---

# 週末除外・Comp対象外ボタンの ON 時のみ表示

## 現状の問題

[habit-list.tsx](gol-web/app/dashboard/habit-list.tsx) のリスト行に「週末除外」「Comp対象外」ボタンが常時表示されており、OFF 時も `text-zinc-500 bg-zinc-800` でそこそこ目立つ。習慣が多いと文字量が多くなり見づらい。

## 解決方針: ON 時のみ表示

- **ON 時**: 現状通りの色付きボタンを表示（週末除外: cyan, Comp対象外: yellow）。クリックで OFF に切り替え可能（ボタンが消える）
- **OFF 時**: ボタンごと非表示にする。コンテナ div も含めて条件付きレンダリング
- **ON にしたい場合**: 既存の編集モーダル内にチェックボックスがある（lines 1930-1971）ので、そこから設定

## 変更対象

対象ファイル: [habit-list.tsx](gol-web/app/dashboard/habit-list.tsx)

リスト内のボタンインスタンスが約 9 箇所ずつ（週末除外・Comp対象外の合計約 18 箇所）あり、以下のセクションに分散:

- Good 習慣: 親（子あり）行、親（子なし）行、子習慣行
- Bad 習慣: 同上
- Bonus セクション: 同上（あれば）

## 具体的な変更内容

### 1. 各ボタンの条件付きレンダリング化

現状:

```tsx
<div className="w-[4.5rem] flex justify-end shrink-0">
  <button ...>週末除外</button>
</div>
<div className="w-[5.5rem] flex justify-end shrink-0">
  <button ...>Comp対象外</button>
</div>
```

変更後:

```tsx
{parent.exclude_weekends && (
  <div className="w-[4.5rem] flex justify-end shrink-0">
    <button ...>週末除外</button>
  </div>
)}
{parent.exclude_from_complete && (
  <div className="w-[5.5rem] flex justify-end shrink-0">
    <button ...>Comp対象外</button>
  </div>
)}
```

- `parent` / `child` の区別に注意
- 条件が false のとき、固定幅コンテナ自体を描画しないので、その分の幅が習慣名の表示エリアに還元される

### 2. ON 時スタイルの簡素化

条件付きレンダリングにより OFF スタイルが不要になるため、className の三項演算子を ON スタイルのみに簡素化できる:

```tsx
className={`text-xs px-2 py-0.5 rounded transition-colors ... text-cyan-300/90 bg-cyan-900/30 ${isConfirmed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
```

### 3. モーダルは変更なし

lines 1930-1971 のモーダル内チェックボックス UI はそのまま維持。

## 影響範囲

- リスト表示のみ変更。データ保存・ロジック面は一切変更なし
- レイアウトシフト: ON/OFF 切り替え時に右側の幅が変わるが、編集モーダルからの操作なので通常のフローでは気にならない

