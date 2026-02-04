# アバター画像

## 画像の配置方法（4枚の画像を反映させる手順）

手元の4枚（レベル1・各モードのアイコン＋全身）を次のパスに配置すると反映されます。

| 画像種別 | ファイル名 | 配置先 |
|----------|------------|--------|
| ヨウテイ／アイコン | `yo1-i.png` | `gol-web/public/avatars/ghost/icon/yo1-i.png` |
| ヨウテイ／全身 | `yo1.png` | `gol-web/public/avatars/ghost/full/yo1.png` |
| ドラクエ／アイコン | `dq1-i.png` | `gol-web/public/avatars/dq/icon/dq1-i.png` |
| ドラクエ／全身 | `dq1.png` | `gol-web/public/avatars/dq/full/dq1.png` |

※ フォルダ構成: `avatars/{ghost|dq}/{icon|full}/{name}.png`
※ レベル2以上は `yo2-i`, `yo2`, `dq2-i`, `dq2` 等形式

**手順:**
1. エクスプローラーで `gol-web/public/avatars/` を開く
2. ghost/icon, ghost/full, dq/icon, dq/full に上記のファイル名で保存する
3. アプリをリロードして表示を確認する

**推奨（PNG・透過可）:**
- アイコン: 320×320px、容量 50～80KB 程度
ファイル名 例）yo1-i.png

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


## 世界観

・シリアスなタッチ
・和風水墨・筆致強め
・色数は極端に少ない
・黒／墨／血色のみ
・顔は描きすぎない
・人→影→怨念への変質が主役

・ポップなタッチ
・1980–90年代の王道J-RPG
・太めでクリーンな輪郭線
・シンプルな配色（影は最小限）
・親しみやすいデフォルメ体型
・表情は明るく、正義感が前面に出る


## 参照URL

・ゴースト・オブ・ヨウテイ
https://www.google.com/search?sca_esv=dc45e1216515a3e4&sxsrf=ANbL-n65ofFqZyGOvx3LFe3ZWD4fLbZ8LA:1770087382795&udm=2&fbs=ADc_l-baV0L0YfzweGTmS5K6NHfZSIBefqrAGY8Kzs-Pey2vSaSrWODBP70bNQbQIaC2m1a6mA6EaE1C4VuzjvvZ9fRU5But2HjtyeHJ1YM5B96W39egzpcvX10rMK9KOMaturpvdcSE3S_rElQ_TLKUbiic4xMuBPodniPY8ZCQXo_j0lRvS-dZXwvJcDnSs5oZJZ-MxR5kpFGb5H2LlRN-Sldy_DXj8IWcWwIrmEuOCTuZGHzC68A&q=%E3%82%B4%E3%83%BC%E3%82%B9%E3%83%88%E3%82%AA%E3%83%96%E3%83%A8%E3%82%A6%E3%83%86%E3%82%A4&sa=X&ved=2ahUKEwib2bCtqbySAxXytlYBHdi6AEgQtKgLegQIFxAB&biw=1877&bih=737&dpr=2&aic=0#sv=CAMSVhoyKhBlLW11R1hqN1VDSmlHZlRNMg5tdUdYajdVQ0ppR2ZUTToOeFpiWHQtT0owdFVpZk0gBCocCgZtb3NhaWMSEGUtbXVHWGo3VUNKaUdmVE0YADABGAcgjdSmnggwAkoKCAEQAhgCIAIoAg


・ドラゴンクエスト
https://www.google.com/search?sca_esv=dc45e1216515a3e4&sxsrf=ANbL-n4D3JMIgCPtYRowa4v5oUSJUorj6Q:1770087422682&udm=2&fbs=ADc_l-ZhZwqRfIRNTFz1njGTSUZtAlUxku9azR407dpHKeKJ4BNYU7pFbGtDTGwVXi0wqBoj5T2SZZYNagsJ-hk_2mUqq_mfmQaGf5K2F8EguAE27bsrS__joh7ddD7SPkT7kGFQQS1CNCXfUijQUn_fEb6RrbSzTBaQp38cecB8hjGHmcvO2rqC8a5A-majuhe3yrxuQaNhM9MfWDTVQilcGknPFccL3NHYC68szAkFLfsyC0GMVjM&q=%E3%83%89%E3%83%A9%E3%82%AF%E3%82%A82&sa=X&ved=2ahUKEwi-wLLAqbySAxUOsFYBHXoKAtEQtKgLegQIKBAB&biw=1877&bih=737&dpr=2&aic=0



## ランクについて

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


■ ドラクエモード（Lv1–10）
ランク ランク名
1	駆け出し
2	村の若者
3	冒険者
4	鉄の戦士
5	銅の剣士
6	ロトの末裔
7	銀の勇者
8	金の勇者
9	ロトの化身
10 伝説の勇者


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