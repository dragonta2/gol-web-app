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
 * @param journalText 日誌本文
 * @param impressionText 一言感想
 * @param conditionBody 体調スコア
 * @param conditionMood 気分スコア
 * @param worldConfig 世界観設定（未指定時はゴースト・オブ・ヨウテイ風のデフォルト）
 * @returns プロンプト文字列
 */
export function createAdvicePrompt(
  journalText: string,
  impressionText: string,
  conditionBody: number,
  conditionMood: number,
  worldConfig?: StoryWorldConfig | null
): string {
  const toneInstruction =
    worldConfig?.adviceToneInstruction ??
    'ゴースト・オブ・ヨウテイ風で、厳しめの師匠口調。辛口だが本質を突くコーチングアドバイスをしてください。';

  return `${toneInstruction}

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
    ? `【重要】主人公の名前は、ユーザーのニックネーム「${nickname.trim()}」をそのまま使って「${protagonist}${nickname.trim()}」のように表記してください。`
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

300-400文字で物語風のあらすじを生成してください。`;
}

/** あらすじ生成用のシステムメッセージを返す */
export function getStorySystemMessage(worldConfig?: StoryWorldConfig | null): string {
  return (
    worldConfig?.storySystemMessage ??
    'あなたはRPGゲームのストーリーテラーです。日常の出来事をRPG物語風のあらすじとして生成してください。'
  );
}

/** アドバイス生成用のシステムメッセージを返す */
export function getAdviceSystemMessage(worldConfig?: StoryWorldConfig | null): string {
  return (
    worldConfig?.adviceToneInstruction ??
    'あなたは厳格なコーチ（ゴースト・オブ・ヨウテイ風）です。辛口のコーチングアドバイスを生成してください。'
  );
}

