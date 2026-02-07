/**
 * OpenAI API統合ユーティリティ
 *
 * GPT-4o miniを使用したAI判定・生成機能の基盤
 */

import OpenAI from 'openai';
import type { StoryWorldConfig } from '@/lib/ai/story-worlds';

// OpenAIクライアントの初期化
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null; // APIキーがない場合はnullを返す（モックモード用）
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * APIキーが設定されているかチェック
 */
export function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * AI判定用のプロンプト生成
 * 
 * @param journalText 日誌本文
 * @param impressionText 一言感想
 * @returns プロンプト文字列
 */
export function createJudgmentPrompt(journalText: string, impressionText: string): string {
  return `あなたは厳格なコーチです。以下の日誌と一言感想を読んで、体調スコアと気分スコアを0-100点で判定してください。

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

以下のJSON形式で回答してください：
{
  "condition_body": 0-100の整数（体調スコア）,
  "condition_mood": 0-100の整数（気分スコア）,
  "reasoning": "判定理由（簡潔に）"
}`;
}

/**
 * AIアドバイス生成用のプロンプト生成
 *
 * 世界観の口調を主とし、personalityAddition は従として追加する（世界観 > 性格）。
 *
 * @param journalText 日誌本文
 * @param impressionText 一言感想
 * @param conditionBody 体調スコア
 * @param conditionMood 気分スコア
 * @param worldConfig 世界観設定（未指定時はゴースト・オブ・ヨウテイ風のデフォルト）
 * @param personalityAddition 性格タイプによる追加指示（省略可）。世界観の口調の後に「加えて」で結合
 * @param nickname ユーザーのニックネーム（アドバイス冒頭の「〇〇よ。」に使用。未設定時は世界観のデフォルト名）
 * @returns プロンプト文字列
 */
export function createAdvicePrompt(
  journalText: string,
  impressionText: string,
  conditionBody: number,
  conditionMood: number,
  worldConfig?: StoryWorldConfig | null,
  personalityAddition?: string | null,
  nickname: string = ''
): string {
  const toneInstruction =
    worldConfig?.adviceToneInstruction ??
    'ゴースト・オブ・ヨウテイ風で、厳しめの師匠口調。辛口だが本質を突くコーチングアドバイスをしてください。';
  const toneBlock =
    personalityAddition?.trim()
      ? `${toneInstruction} 加えて、${personalityAddition.trim()}`
      : toneInstruction;
  const displayName = nickname.trim() || (worldConfig?.protagonistName ?? '勇者');
  const nameInstruction = `【重要】アドバイスの冒頭で、読者に呼びかける形で「${displayName}よ。」のように必ず表記してください。`;

  return `${toneBlock}

${nameInstruction}

以下の情報を基に、コーチングアドバイスを生成してください。

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【体調スコア】${conditionBody}/100
【気分スコア】${conditionMood}/100

200-300文字で生成してください。`;
}

/**
 * AIあらすじ生成用のプロンプト生成
 *
 * @param journalText 日誌本文
 * @param impressionText 一言感想
 * @param habits 習慣の実行状況
 * @param todos 完了したToDo
 * @param nickname ユーザーのニックネーム（あらすじ内の主人公名に使用）
 * @param worldConfig 世界観設定（未指定時はゴースト・オブ・ヨウテイ風のデフォルト）
 * @returns プロンプト文字列
 */
export function createStoryPrompt(
  journalText: string,
  impressionText: string,
  habits: string[],
  todos: string[],
  nickname: string = '',
  worldConfig?: StoryWorldConfig | null
): string {
  const protagonist = worldConfig?.protagonistName ?? '勇者';
  const heroInstruction = nickname.trim()
    ? `【重要】主人公の名前は、ユーザーが設定したニックネーム「${nickname.trim()}」を省略・短縮・置き換えせず、そのまま全文で使ってください。表記例: 「${protagonist}${nickname.trim()}」。デフォルト名（${protagonist}）だけでは表記しないでください。`
    : `【重要】主人公の名前は「${protagonist}」と表記してください。`;

  return `以下の情報を基に、今日の出来事を物語風のあらすじとして生成してください。

${heroInstruction}

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【実行した習慣】
${habits.length > 0 ? habits.join('、') : 'なし'}

【完了したToDo】
${todos.length > 0 ? todos.join('、') : 'なし'}

300-400文字で物語風のあらすじを生成してください。
【禁止】「彼」「彼女」など性別を特定する代名詞は使わないでください。主人公を指すときは名前や「主人公」など中性な表現を使ってください。`;
}

/**
 * AIあらすじ「これからの冒険」用のプロンプト生成
 * 明日への展望・今後への意気込みを物語風に
 */
export function createStoryFuturePrompt(
  journalText: string,
  impressionText: string,
  habits: string[],
  todos: string[],
  nickname: string = '',
  worldConfig?: StoryWorldConfig | null
): string {
  const protagonist = worldConfig?.protagonistName ?? '勇者';
  const heroInstruction = nickname.trim()
    ? `【重要】主人公の名前は、ユーザーが設定したニックネーム「${nickname.trim()}」を省略・短縮・置き換えせず、そのまま全文で使ってください。表記例: 「${protagonist}${nickname.trim()}」。デフォルト名（${protagonist}）だけでは表記しないでください。`
    : `【重要】主人公の名前は「${protagonist}」と表記してください。`;

  return `以下の情報を基に、「これからの冒険」として、明日への展望や今後への意気込みをRPG物語風のあらすじで生成してください。

${heroInstruction}

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【実行した習慣】
${habits.length > 0 ? habits.join('、') : 'なし'}

【完了したToDo】
${todos.length > 0 ? todos.join('、') : 'なし'}

300-400文字で、前向きな展望・これからへの物語を生成してください。
【禁止】出力に「あらすじ」「これからの冒険」などの見出し・タイトル行を含めないでください。物語本文のみを出力してください。
【禁止】「彼」「彼女」など性別を特定する代名詞は使わないでください。主人公を指すときは名前や「主人公」など中性な表現を使ってください。`;
}

/** あらすじ生成用のシステムメッセージを返す */
export function getStorySystemMessage(
  worldConfig?: StoryWorldConfig | null,
  nickname?: string
): string {
  const base =
    worldConfig?.storySystemMessage ??
    'あなたはRPGゲームのストーリーテラーです。日常の出来事をRPG物語風のあらすじとして生成してください。';
  const noGender =
    '【禁止】「彼」「彼女」など性別を特定する代名詞は使わないこと。主人公を指すときは名前や「主人公」など中性な表現を使うこと。';
  if (nickname?.trim()) {
    return `${base}\n【必須】主人公の名前は、ユーザーが設定したニックネーム「${nickname.trim()}」を省略・短縮せずそのまま全文で使うこと。デフォルト名だけでは表記しないこと。\n${noGender}`;
  }
  return `${base}\n${noGender}`;
}

/** アドバイス生成用のシステムメッセージを返す */
export function getAdviceSystemMessage(worldConfig?: StoryWorldConfig | null): string {
  return (
    worldConfig?.adviceToneInstruction ??
    'あなたは厳格なコーチ（ゴースト・オブ・ヨウテイ風）です。辛口のコーチングアドバイスを生成してください。'
  );
}

