# AIへのプロンプト指示メモ

## 汎用テンプレ -------------

お願いします！

-------------

すべてaddして、commitまでおこなって

-------------

実装時のルールはここのファイルの内容に準拠してね。
/Users/ta2/Develop/speee/o-manu/o-manu-frontend/dev-context.md

-------------

これを実装して

-------------

まだ実行しないでね、方針を教えて

-------------

イシューを修正して

-------------

GitHub CLI を使用して、GitHubのPRを作成して！！

すぐにPR作らないで、一旦確認をして！

==================

・PRのURL
【URL】

・タイトル
【compareブランチ名】【イシューのタイトル】

baseブランチ
demo

compareブランチ
【compareブランチ名】


PRメッセージの形式は以下の形式で(md記法で)

###
【イシューID】

### What
何をしたいのか？

### How
どのようにやったのか？

### Goal
どういう状態にしているか？

### Non-Goal
対応していないこと

### Ref
画面スクリーンショットの貼り付け（これAI側でできる？？）

-------------


## 2601 -------------

### 260117-土 -------------

260117-土




### 260116-金 -------------

このファイルにもさっき決めた名称
仕様書
草案
とかのファイルの通称も記載しておいて

```
→ ファイルの通称一覧（`_INDEX.md`に記載）:
- `0-AI-prompt-memo.md` → **AIプロンプトメモ**
- `1-web-ai-directive-draft.md` → **草案**
- `2-gol-design-doc.md` → **仕様書**
- `3-wireframe.md` → **ワイヤーフレーム**
- `4-project-progress.md` → **進捗表**
- `5-dev-log.md` → **開発ログ**
- `6-dta2-memo.md` → **dta2メモ**
- `07-database-schema.md` → **DB設計書**
- `08-md-sync-analysis.md` → **MD同期分析**
- `09-server-validation.md` → **サーバーバリデーション設計書**
```



テスト実装
これいこう

統計・分析機能の続き（ToDo完了率の可視化）


この接続テストのやつをやったらログインできるようになったよ

→ `/test-supabase` ページにアクセスすることで、Supabaseへの接続が正常に動作することを確認できた。ログイン機能も正常に動作するようになった。


今、スパベースって正常にデータベースとして動いてる？

ログインパスワードをspabaseから確認してくることはできる？


続きの実装はなんだろう？


ダメだ。一旦この機能はなくして、先に進もう。

やっぱり動いてないね。どうしたんだろう？？


パスワード表示/非表示機能のコード

`app/demo/components/login-form-field.tsx`

```typescript
'use client';

import { BaseTextInput } from '@/app/common/components/base-text-input';
import { useState } from 'react';

type LoginFormFieldProps = {
  id: string;
  name: string;
  type: 'text' | 'password';
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  required?: boolean;
};

export const LoginFormField = ({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  icon,
  required = false,
}: LoginFormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div>
      <label htmlFor={id} className={`
        mb-2 block text-sm font-medium text-gray-700
      `}>
        {label}
      </label>
      <div className="relative">
        <BaseTextInput
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          icon={icon}
          required={required}
          className={isPasswordField ? 'pr-10' : ''}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`
              absolute inset-y-0 right-3 flex items-center text-gray-500
              hover:text-gray-700
              focus:outline-none
            `}
            aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
          >
            {showPassword ? (
              <span className="i-lucide-eye-off text-lg" />
            ) : (
              <span className="i-lucide-eye text-lg" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
```

**ポイント：**
- `useState`で`showPassword`の状態を管理
- `type === 'password'`のときのみ、表示/非表示ボタンを表示
- `showPassword`が`true`のときは`type="text"`に切り替え、`false`のときは`type="password"`を維持
- アイコンは`i-lucide-eye`（表示）と`i-lucide-eye-off`（非表示）を使用


動いてないんだけど、別のサイトで動いてる画面のコードを見せたほうがいい？？


4まではオッケー。ここの確認箇所教えて。拡張機能のChromeの
ブラウザのコンソール（F12）で「Toggle clicked」のログを確認


キャッシュじゃないみたい。再起動したけど治らないよ。


どうしたの？全然治ってないよ。

まだ治ってないよ

先に、ログイン画面のパスワードを表示非表示の機能をつけて!右端に目のアイコン入れる感じで
＞ これ動作してないよ。パスワード表示されてない。


Lucide Icons
Material Design Icons

このライブラリをインストールして、アイコンの表示をこいつに変えて

先に、ログイン画面のパスワードを表示非表示の機能をつけて!右端に目のアイコン入れる感じで


1. 統計・分析機能の実装を開始（推奨）

これから行こう！！


これエディター本体の方じゃなくて、AIチャット欄で文字列を選択したときのハイライトカラーを変えたかったんだけど、そうなってる？？


dta2-monokaiの設定を編集してAIチャット欄の文字列選択した時のハイライトカラーをもう少し明るく白よりにして、ハイライトをわかりやすくして！！

やりすぎて文字がみえないようにしないでね！！




さぁ、仕切り直ししようか今日の作業は何をするべきかもう一回教えて。


その前にこのファイルのファイル名のプレフィックスをさっき変えているんで、書き換えて裁判00のファイルは、このファイルなんだけど、AIへのプロンプト指示をメモした雑多なファイルになってます


これらの資料向け続きの作業をできる？

今日は260116です。

## ストック分 --------------​

それでは、まずMVP的に必要な機能

ToDoリストのカンバンボード
＞ どうやって実現する？使用するライブラリなど

日々の日誌部分の見せ方
＞ チェックボックスや回数リスト（Number Select）などを駆使して
習慣のチェック部分

アドバイス・あらすじ部分の自由記述部分

これらをどうやるか？
どういうUIで表現していくかについて相談したい。

--------------​

どれが好みですか？

カンバンボード:
@dnd-kit/core で3カラム（アクティブ/進行中/完了）でOK？
カンバンボードトレロのように柔軟に追加できるのか、このように固定のほうがいいのか運用してみてだが、一旦上記の方法で進める。
技術要件にも追記しておいて！


習慣チェック:
A: シンプルなチェックボックス
B: 回数カウンター付き（MD版の[xxx]を再現）

回数カウンター付きがいいが、見た目を見てから調整したい。

レイアウト:
A: タブ切り替え（シンプル）
B: ダッシュボード型（全部見える）

出来上がりのイメージができていないが、Bがいいのかな？？

まず作るもの:
習慣チェックリストから？
ToDoカンバンから？
それとも全体の枠組みから？

どこから始めましょうか？ 🚀

全体の枠組みからはじめましょう。

--------------​

A見た目のイメージの言語化
↓
Bワイヤーフレーム作る
↓
Cプロトタイプ作る
↓
Dプロダクトの細部作り込み → （必要なら）Figmaデザインを起こす

Cのあとに、Figmaデザインつくってからコーディング細部作り込みでもいい）

これで行きたい。

--------------​

ゴースト・オブ・ヨウテイの和風・蝦夷地の雰囲気
＞ これはあとからユーザーが自分の好みのものに切り替えられるようにしたい。

たとえば

ドラクエの世界観の設定

JOJOの奇妙な冒険風の世界観の設定

など、ユーザーが設定プロファイルをいくつか用意していたら、それをどこかでスイッチして切り替えられるようなイメージ

あとからでかまわないので。

--------------​

見てからでないと全然わからないけど、一旦初期イメージで。


1. ステータスバーの位置:
◯｜一番上に固定表示？
サイドバー？


2. 各セクションの表示:
一画面に全部表示（スクロールあり）？
それとも
◯｜タブで切り替え？


3. モバイル対応:
◯｜最初からレスポンシブ？
PCのみでMVP？

4. 各セクションの順番:
現在の提案:
1. ステータスバー
2. 習慣チェック
3. ToDoカンバン
4. 日誌入力
5. AI判定

この順番でOK？
現在の提案:1. ステータスバー2. 習慣チェック3. ToDoカンバン4. 日誌入力5. AI判定この順番でOK？
どんなイメージですか？ 🎨

このイメージで、ワイヤーフレームはどうやって描ける？？

--------------​

💭 確認ポイント

1. 認証方法:
Email + Password必須
Google OAuth も？
他のSNS認証は？
実装重くならなければ…
Apple
Amazon
この辺も入れたい。

2. 初回サインアップ時:
ユーザー名入力
初期ポイント10pt付与
クラス「無名の凡人」からスタート
これでOK？
OK！

3. このワイヤーフレームのイメージでOK？
確認できたら、次は：

Figmaで清書しますか？

それともこのままC: プロトタイプ作成に進みますか？

どうしましょう？ 🚀


Figmaって自動でAIが書いてくれる機能でいける？？

それともう一度MD版の今の機能実装を理解してもらっている？？

今今の段階では、MD版の機能と足並みをあわせたい。

そっからもう一度ワイヤーフレーム制作で

--------------​

習慣チェック
この機能だけに限らないが、認証しているユーザーが設定しているものを柔軟に表示できるようにしたい（追加・削除も含めて）

おそらくこういう構成になる

■ Web版
Web上で動いている（デプロイされて、インターネット上で）

ドメインとかどうしようか？？
一応、さくらのVPNで使用しているドメインを持っているが、Next.js動かすのにこのサーバーじゃ無理だろうけど。
ドメインだけは利用できるのかな？？

■ MD版
ユーザーのローカルに存在している（GitHubを介したりして、どこかのWeb上にUPさせる仕組の方がスムーズであればそれでも可）


・MDファイルに書かれている習慣の内容などがWeb版に反映される仕組？？

相互に設定可能なイメージ？？
（Web版の設定画面で設定したものも、MD版の方に反映される）


--------------​

確認したいこと
1. MD版の機能で抜けているものはありますか？
特に重要な機能
MVPに必須のもの

2. デプロイ方針:
Vercel + カスタムドメインで

3. ワイヤーフレーム:
簡易的に描く
＞ figmaがいいのか？？
なんか簡易的に書いてくれるAI生成ツールは、無いのか？


--------------​

最初のステップの説明
Next.js 15 プロジェクト作成について:
npx create-next-app@latest
npx create-next-app@latest
このコマンドで聞かれること:

プロジェクト名: gol-web または app

TypeScript使う？ → Yes
ESLint使う？ → Yes
Tailwind CSS使う？ → Yes
src/ ディレクトリ使う？ → No（App Routerなので）
App Router使う？ → Yes
import alias カスタマイズ？ → Yes（@/*）

なぜこの選択をするのか:
TypeScript: 型安全性でバグを減らす
Tailwind: スタイリングが超速い
App Router: Next.js 15の推奨方式、Server Componentが使える


準備OKですか？プロジェクト作成を実行しますか？ 🚀

--------------​

ちょっと待ってね。

確認事項

・コンポーネントはshadcn/uiを利用している？？
・どこかで、コンポーネント集を作りたい（story bookは煩雑で時間かかるので...自前で用意するか何か他に良い方法があれば）
・コンポーネントの共通化（AtomicDesign準拠）作業
・テスティングライブラリの導入（playWrightや単体テスト）
・mermaidenフローチャート導入

これらは、後でやるかたちでいい？？


--------------​

UIのディティールとか、今話した方がいい？？

この習慣チェックリストはちょっと違うんだよね。

複数チェックの個数とかは決まっていないから。
Numberのスピンで数はセットできるようになっていたほうがいいと思う

--------------​

これスピンは全部の項目に必要だね。

習慣とかの項目を追加削除する管理画面の作成は、まだ先になる？？

MVPで動くものが先決？？
（Minimum Viable Product）

--------------​

ToDoリスト内に子チェックリストを作りたい。

これあとにしたほうがいい？？

--------------​

ToDoや習慣のCRUD操作部分はどこでつくる？？

--------------​

ちょっと一旦確認ね。

最終的には、ここのmdファイルと同期していく作りになる予定なんだけど、今のweb-app版のつくりで問題なくいけそう？？

