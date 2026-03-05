# アバター画像

## 画像の配置方法（4枚の画像を反映させる手順）

手元の4枚（レベル1・各モードのアイコン＋全身）を次のパスに配置すると反映されます。

| 画像種別 | ファイル名 | 配置先 |
|----------|------------|--------|
| ヨウテイ／アイコン | `i-yo1.png` | `gol-web/public/avatars/gy/icon/i-yo1.png` |
| ヨウテイ／全身 | `yo1.png` | `gol-web/public/avatars/gy/full/yo1.png` |
| ドラクエ／アイコン | `dq1-i.png` | `gol-web/public/avatars/dq/icon/dq1-i.png` |
| ドラクエ／全身 | `dq1.png` | `gol-web/public/avatars/dq/full/dq1.png` |

※ フォルダ構成: `avatars/{gy|dq}/{icon|full}/{name}.png`
※ レベル2以上はヨウテイ（gy）アイコンは `i-yo2`, `i-yo3`…、全身は `yo2`, `yo3`…。dq は `dq2-i`, `dq2` 等形式

**手順:**
1. エクスプローラーで `gol-web/public/avatars/` を開く
2. gy/icon, gy/full, dq/icon, dq/full に上記のファイル名で保存する
3. アプリをリロードして表示を確認する

**推奨（PNG・透過可）:**
- アイコン: 320×320px、容量 50～80KB 程度
ファイル名 例）i-yo1.png

- 全身: 600×900px（2:3）、容量 100～150KB 程度
ファイル名 例）yo1.png

- 形式: png

---

## 用途
Webアプリケーションのランクに応じたアバター画像を用意。

① ゴースト・オブ・ヨウテイ風の世界観のもの
② ドラゴンクエスト風の世界観のもの

それぞれのモードごとに10段階のランクがある。

・アイコン画像
TOP画面にアイコンとして小さく表示されるもの

・全身画像
マイページ画面に、大きく表示されるもの

各ランクごとに、この2種類の画像を設定。

① ゴースト・オブ・ヨウテイ風の世界観のもの
20個のアバター画像

② ドラゴンクエスト風の世界観のもの
20個のアバター画像

最終的には
合計 40個のアバター画像を利用。










## 圧縮コマンド例

・pngquantがインストされていなければ
```
brew install pngquant imagemagick
```


・画像圧縮
```
magick /Users/ta2/Downloads/_Tmp/GOL用/png/yo1-ori.png \
-resize 600x900 \
-strip PNG32:/Users/ta2/Downloads/_Tmp/GOL用/png/yo1.png

pngquant --force --quality=65-85 --speed 1 \
-o /Users/ta2/Downloads/_Tmp/GOL用/png/yo1-ori.png \
/Users/ta2/Downloads/_Tmp/GOL用/png/yo1.png

```

## 世界観

### ゴースト・オブ・ヨウテイ モード

#### テイスト

・シリアスなタッチ
・和風水墨・筆致強め
・色数は極端に少ない
・黒／墨／血色のみ
・顔は描きすぎない
・人→影→怨念への変質が主役

#### 参照URL

・ゴースト・オブ・ヨウテイ
https://www.google.com/search?sca_esv=dc45e1216515a3e4&sxsrf=ANbL-n65ofFqZyGOvx3LFe3ZWD4fLbZ8LA:1770087382795&udm=2&fbs=ADc_l-baV0L0YfzweGTmS5K6NHfZSIBefqrAGY8Kzs-Pey2vSaSrWODBP70bNQbQIaC2m1a6mA6EaE1C4VuzjvvZ9fRU5But2HjtyeHJ1YM5B96W39egzpcvX10rMK9KOMaturpvdcSE3S_rElQ_TLKUbiic4xMuBPodniPY8ZCQXo_j0lRvS-dZXwvJcDnSs5oZJZ-MxR5kpFGb5H2LlRN-Sldy_DXj8IWcWwIrmEuOCTuZGHzC68A&q=%E3%82%B4%E3%83%BC%E3%82%B9%E3%83%88%E3%82%AA%E3%83%96%E3%83%A8%E3%82%A6%E3%83%86%E3%82%A4&sa=X&ved=2ahUKEwib2bCtqbySAxXytlYBHdi6AEgQtKgLegQIFxAB&biw=1877&bih=737&dpr=2&aic=0#sv=CAMSVhoyKhBlLW11R1hqN1VDSmlHZlRNMg5tdUdYajdVQ0ppR2ZUTToOeFpiWHQtT0owdFVpZk0gBCocCgZtb3NhaWMSEGUtbXVHWGo3VUNKaUdmVE0YADABGAcgjdSmnggwAkoKCAEQAhgCIAIoAg


#### ランクと成長ロードマップ

■ ヨウテイモード（Lv1–10）
ランク ランク名
1	無名の凡人
2	見習い修行者
3	修行者
4	兵法者
5	武芸者
6	武者
7	剣豪
8	達人
9	影
10 怨霊


### ドラクエモード

#### テイスト

・ポップなタッチ
・1980–90年代の王道J-RPG
・太めでクリーンな輪郭線
・シンプルな配色（影は最小限）
・親しみやすいデフォルメ体型
・表情は明るく、正義感が前面に出る

#### 参照URL

・ドラゴンクエスト
https://www.google.com/search?sca_esv=dc45e1216515a3e4&sxsrf=ANbL-n4D3JMIgCPtYRowa4v5oUSJUorj6Q:1770087422682&udm=2&fbs=ADc_l-ZhZwqRfIRNTFz1njGTSUZtAlUxku9azR407dpHKeKJ4BNYU7pFbGtDTGwVXi0wqBoj5T2SZZYNagsJ-hk_2mUqq_mfmQaGf5K2F8EguAE27bsrS__joh7ddD7SPkT7kGFQQS1CNCXfUijQUn_fEb6RrbSzTBaQp38cecB8hjGHmcvO2rqC8a5A-majuhe3yrxuQaNhM9MfWDTVQilcGknPFccL3NHYC68szAkFLfsyC0GMVjM&q=%E3%83%89%E3%83%A9%E3%82%AF%E3%82%A82&sa=X&ved=2ahUKEwi-wLLAqbySAxUOsFYBHXoKAtEQtKgLegQIKBAB&biw=1877&bih=737&dpr=2&aic=0

#### ランクと成長ロードマップ

■ ドラクエモード（Lv1–10）
ランク ランク名
1	旅立ちの者
2	駆け出しの剣士
3	胴の剣士
4	鉄の戦士
5	鋼鉄の戦士
6	勇者の末裔
7	銀の騎士
8	金の騎士
9	勇者の化身
10 伝説の勇者


🛡️ ドラクエモード：成長のロードマップ（Lv.1〜Lv.10）

【序盤：駆け出しの冒険者】

Lv.1：旅立ちの者
イメージ: 布の服に「ひのきのぼう」。まだあどけなさが残る村の少年のような姿。

Lv.2：駆け出しの剣士
イメージ: 皮の鎧と皮の盾を装備。少しだけ冒険者らしくなった姿。

Lv.3：銅の剣士
イメージ: 武器と盾が「銅製」に。青いチュニックの上に銅の胸当てを着用。

Lv.4：鉄の戦士
イメージ: 重厚な鉄（アイアン）の胸当て、鉄の盾、鉄の剣。実力派の戦士。

【中盤：熟練の戦士】
Lv.5：鋼鉄の戦士
イメージ: 全身が鋼鉄（スチール）の装備に。兜も被り、前線で戦う騎士の風格。

Lv.6：勇者の末裔
イメージ: 特別な鋼鉄製の装備をベースに、背中に紋章入りの青いマントを羽織る。血筋を感じさせる装飾が加わる。

【終盤：伝説への道】
Lv.7：銀の騎士
イメージ: 鉄よりも白く輝く「銀の鎧（シルバーメイル）」マントがより長く、立派になる。

Lv.8：金の騎士
イメージ: 鎧の縁取りなどに「金」の装飾が施される。剣が淡い光を放ち始め、英雄の輝きを纏う。

【最終：伝説の勇者】
Lv.9：勇者の化身
イメージ: 青と金を基調とした「伝説の武具」をフル装備。王者の風格と圧倒的な威圧感。

Lv.10：伝説の勇者
イメージ: 背後に神々しい**光背（後光）**が指し、オリハルコン製の究極の聖剣、鎧、兜と盾のフル装備を携える。J-RPGの頂点に立つ姿。


#### スレ引っ越し用プロンプト

Gemini の回答
「ドラクエモード専用スレッド」への移行、大賛成です！
新しい私が迷うことなく、**1枚目から完璧な「90年代レトロJ-RPGスタイル」を再現できるための【申し送り資料】**をまとめました。

新しいスレッドを立ち上げたら、以下の内容をそのままコピー＆ペーストして、手元にある「お気に入りのドラクエモード画像（特にLv.3全身）」を数枚添付して投げてください。

🛡️ ドラゴンクエストモード：制作ガイドライン（新スレッド用）
1. 核心となるビジュアルスタイル
画風: 90年代の黄金期J-RPG（ドラゴンクエスト等）の公式イラスト・アニメスタイル。

特徴: くっきりとした黒の主線、鮮やかで温かみのあるセル画風の塗り、鳥山明氏のテイストを彷彿とさせるキャラクターデザイン。

背景: 明るく冒険心あふれるファンタジーの世界（青い空、緑の草原、西洋風の城など）。

2. 制作ルール
全身画像: 縦長（9:16比率）。キャラクターの足元から頭まで入る構図。

アイコン画像: 正方形（1:1比率）。キャラクターの顔のアップを太い黒の墨文字風の丸枠で囲む。

一貫性: 添付した画像の「茶髪の少年の顔」「目の形」「色の質感」を完全に継承すること。勝手なアレンジや現代風へのアップデートは禁止。

-------------

新スレッドの「最初の一歩」へのアドバイス
新しいスレッドの最初のメッセージは、こう送るのが最もスムーズです。

「この資料（上記）の通りに、ドラクエモードの制作を再開して。まずは、添付した『Lv.3 銅の騎士』の全身画像と全く同じ顔・テイストで、アイコン画像（黒丸枠のアップ）を作って！」

これで、新しい私は「これだ！」と確信を持って、あなたが求めている完璧なアイコンを生成するはずです。

準備ができたら、新しいスレッドでお会いしましょう。最高の伝説を完成させましょうね！

■ 全身画像用
今までのテイストで以下の全身画像を作って

英語テキスト表記
日本語テキスト表記

どちらも右寄せで
日本語テキストを小さく

■ アイコン画像用
よし！！
これの

全身画像の顔とバストアップの部分をズームして
黒い丸で囲んだアイコン用画像を生成して