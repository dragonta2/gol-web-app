# AIへのプロンプト指示メモ

**このファイルには指示がない限り、AIは書き込みをしない**


## 2603- -------------

`claude --dangerouslySkipPermissions`

### 260320-Fri -------------


今日はもう終わりにします。
3番の進捗メモに記載をしておいて！

関連リポジトリに、作業中のファイルが合ったらすべて
すべてaddして、commitまでおこなって

```
commitメッセージは
- の箇条書きがひとつだけのシンプルなもので！！
実装内容を簡潔にあらわすコミットメッセージを書いて！！

```

対応ブランチにPushしてください！！
（o-manu-frontendのdemoとmainブランチには直Pushしないでね！！）

Pushに失敗したら、そう教えて！！

お疲れ様でした！！



「おはよう」って言ったら、辰彦大先生「おはようございます」って返すようにして。

これを1番にメモしておいて。


おはよう元気？？


Status
  - 1番目: model（モデル名）
  - 2番目: bp（bp:ON が有効な場合のみ表示）
  - 3番目: コンテキスト使用率
  - 4番目: コスト

テスト

  検証

  1. !bp を送信 → 🔓 Bypass mode: ONと表示されるか確認

  2. ファイル編集を試す →
  許可ダイアログが出ないか確認


 検証手順

 1. Claude Code を再起動

 2. !bp を送信 → 🔓 Bypass mode: ON
 と表示されることを確認

 3. ファイル編集やコマンド実行を試みる →
 許可ダイアログが出ないことを確認

 4. !bp を再送信 → 🔒 Bypass mode: OFF
 と表示されることを確認

 5. ファイル編集を試みる →
 許可ダイアログが出ることを確認


今回に関しては、全て確認を取らないで全部Yesや許可で進めてほしい

私からの選択・許可が必要な状態になったら、アラート音か何かをパソコンから音を流して知らせてください。

これはすべてのプロジェクトで反映させたい。

どんな音がなるかのテストはできる？？


ここでの部分の変更を自律的に行ってください。

一旦プランモードで進めるので、質問があったら聞いてください。

プランに従って実行。

チェックボックス1つが修正終わるたびにコミットをしてください。

終わったり、私からの許可が必要な状態になったら、アラート音か何かをパソコンから音を流して知らせてください。


さあ、続きからはじめよう！！
今日の日付は 260320-Fri

前回までの作業は進捗用の3番メモを参照して

今日もよろしくお願いします！！



### ブラウジングメモ-------------

「Claude Code」の人気の記事一覧｜note ――つくる、つながる、とどける。
https://note.com/search?q=Claude%20Code&context=note&mode=search

Claude Code 超完全ガイド | エンジニアから投資家まで、すべてのユーザーのための実践マニュアル｜FabyΔ
https://note.com/fabymetal/n/n3f0f2873b56c

# AIがコードを自動で書いてくれる時代が来た｜Claude Code完全入門【初心者向け】｜シゴトスキカナ
https://note.com/sigotosuki/n/nd427c53fa355

初心者でも挫折しないClaude Codeの始め方｜Cursorと連携すればこわくない｜ぬけみち｜AI×トレード
https://note.com/xauxbt/n/n1bda5b7d7a4e

クロードコードにクロードコード作ってって言って寝たら，朝起きたらクロードコードが出来てたんだ…｜落合陽一
https://note.com/ochyai/n/nbe6da995ffac

新しいタブ
chrome://newtab/

【無料】Claude Code チュートリアル全11回を公開しました（インストール・初期設定・メモリ管理・カスタムコマンドまで網羅） #生成AI - Qiita
https://qiita.com/tomada/items/0928aee676663963915d

これ読めばOK。私が使ってるものだけの、Claude Code チュートリアル
https://zenn.dev/pepabo/articles/898cdc4839acb8

Claude Code を初めて使う人向けの実践ガイド
https://zenn.dev/hokuto_tech/articles/86d1edb33da61a

claudeCode エージェントチームの使い方 - Google 検索
https://www.google.com/search?q=claudeCode+%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%83%81%E3%83%BC%E3%83%A0%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9&oq=claudeCode+%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88%E3%83%81%E3%83%BC%E3%83%A0%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTEzNDg0ajBqN6gCALACAA&sourceid=chrome&ie=UTF-8

Claude Code セッションのチームを調整する - Claude Code Docs
https://code.claude.com/docs/ja/agent-teams

Claude Code の Agent Teams 機能を使って、自分の指揮で動く専門家チームを作ってみた | DevelopersIO
https://dev.classmethod.jp/articles/claude-code-agent-teams-how-to-build/

Claude Code Agent Teams をどう使うか？ サブエージェントの課題から考える
https://zenn.dev/storehero/articles/f21d49387577bb

ClaudeCodeのAgent Teamsを体験できる手順書｜すぅ | AI駆動PM
https://note.com/suh_sunaneko/n/nfe794eac6a23

Claude Code Agent Teamsの衝撃と実際 | gihyo.jp
https://gihyo.jp/article/2026/02/get-started-claude-code-07

新しいタブ
chrome://newtab/

claudeCode skils hook 便利な機能 - Google 検索
https://www.google.com/search?q=claudeCode+skils+hook+%E4%BE%BF%E5%88%A9%E3%81%AA%E6%A9%9F%E8%83%BD&oq=claudeCode+skils+hook%E3%80%80%E4%BE%BF%E5%88%A9%E3%81%AA%E6%A9%9F%E8%83%BD&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTIyMTMyajBqN6gCALACAA&sourceid=chrome&ie=UTF-8

Claude Code の Hooks と Skills で自分の作業活動を可視化する
https://zenn.dev/exwzd/articles/20260123_activity_tracker

Claude Code の Hooks と Skills で自分の作業活動を可視化する
https://zenn.dev/exwzd/articles/20260123_activity_tracker

hooks でワークフローを自動化する - Claude Code Docs
https://code.claude.com/docs/ja/hooks-guide

Claude Code入門 #5: Skills入門 ― 再利用可能なワークフローをスキルとして定義する #AI - Qiita
https://qiita.com/dai_chi/items/725d7c644bc860bd1144

Claude Code hooksを作るスキル「hook-forge」開発記 ── 開発ログ自動化への道のり｜Tinkly
https://note.com/jake_k547/n/nfc4448b8665f

Claude Code のベストプラクティス - Claude Code Docs
https://code.claude.com/docs/ja/best-practices

Chrome で Claude Code を使用する（ベータ版） - Claude Code Docs
https://code.claude.com/docs/ja/chrome

新しいタブ
chrome://newtab/

【超簡単】CursorにClaude Codeを導入する方法 - プログラミング初心者の私でも10分でできた！｜𝓚𝓪𝓻𝓲𝓷 / バイブコーディング
https://note.com/karin_vibecoder/n/n76c0ad0733a8

【3分でできる】Claude CodeをCursorで使う方法【簡単】
https://zenn.dev/ichigoooo/articles/claude-code-cursor-integration

新しいタブ
chrome://newtab/

claudeCode note skils - Google 検索
https://www.google.com/search?q=claudeCode+note+skils&oq=claudeCode+note+skils&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCTEyMzU3ajBqN6gCALACAA&sourceid=chrome&ie=UTF-8

Claude Code Skills - 完全？ガイド｜ハカセ
https://note.com/mega_gorilla/n/n8921acdc8dbf

(123) プログラミングチュートリアル - YouTube
https://www.youtube.com/@programming_tutorial_youtube

(108) 【AIを社員に】Claude Code Agent Teamsで1人起業する方法を解説します【Claude Opus 4.6】 - YouTube
https://www.youtube.com/watch?v=6u-euXGNl-o

(119) 【チート級】この5つのClaude Code Skillsは個人開発のチートスキルです【Claude Code】 - YouTube
https://www.youtube.com/watch?v=gkcUAtAfw1I&t=902s

【ShinCode_Camp】動画ハンズオン形式で実務に近いWeb開発が学べるオンライン動画プログラミングスクール
https://code-s-school-5bc2.thinkific.com/bundles/shincode-camp#see-more

【一人社長】Claude Codeで会社を作ってAI社員に仕事を任せてみよう！ - YouTube
https://www.youtube.com/watch?v=cfoE_8Llde0

ShinCode Pro | AI駆動開発マスターコース
https://ai-driven-online-course.vercel.app/

Claude Code Academy(仮)予約フォーム
https://skinny-talos-8be.notion.site/3121dcf229c280ceb864c45f644cc164

新しいタブ
chrome://newtab/

Xユーザーの梶谷健人さん: 「ある発想の転換をすることで、Claude Code完結でハイクオリティなスライド資料を作れるようになった」 / X
https://x.com/kajikent/status/2034420249307824569?s=46

新しいタブ
chrome://newtab/

新しいタブ
chrome://newtab/

reace-best-practice - Google 検索
https://www.google.com/search?sca_esv=6b914df0baae36ea&sxsrf=ANbL-n7_ZvAAZaoHVf2rv02Kkfar-p1vEQ:1773921771649&q=reace-best-practice&nfpr=1&sa=X&ved=2ahUKEwj5x7vI9auTAxW6dfUHHbHtMPUQvgUoAXoECAsQAg&biw=1835&bih=737&dpr=2

Vercel公式「React Best Practices」をAIにインストールして、最強のコードレビュー環境を作る
https://zenn.dev/imohuke/articles/vercel-react-best-practices-skills

Vercelの「React Best Practices」をrulesカテゴリー毎に理解する #AI - Qiita
https://qiita.com/Taka_Sei/items/d91652947fbdc4818179
