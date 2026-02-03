/**
 * 世界観テーマ定義（2種類固定）
 *
 * ドラゴンクエスト風・ゴースト・オブ・ヨウテイ風のデフォルト設定。
 * 管理者は設定画面でオーバーライド可能。
 */

export type StoryWorldId = 'dq' | 'ghost';

export interface StoryWorldConfig {
  /** 世界観ID */
  id: StoryWorldId;
  /** 表示名 */
  displayName: string;
  /** 主人公のデフォルト名（ニックネーム未設定時など） */
  protagonistName: string;
  /** 世界観の雰囲気・トーン */
  worldTone: string;
  /** アドバイスのスタイル・口調 */
  adviceStyle: string;
  /** 比喩の出典・イメージ */
  metaphorSource: string;
  /** あらすじ生成用システムメッセージ */
  storySystemMessage: string;
  /** アドバイス生成用の口調・指示 */
  adviceToneInstruction: string;
}

/** デフォルトの世界観設定（コードで固定） */
export const DEFAULT_STORY_WORLDS: Record<StoryWorldId, StoryWorldConfig> = {
  dq: {
    id: 'dq',
    displayName: 'ドラゴンクエスト風',
    protagonistName: '勇者',
    worldTone: '勇者と魔王のファンタジーRPG世界。冒険と成長の物語。',
    adviceStyle: '村の長老や仲間のような、温かみのある励ましと助言。',
    metaphorSource: '剣と魔法、スライム、魔王城、レベルアップ',
    storySystemMessage:
      'あなたはドラゴンクエスト風RPGのストーリーテラーです。日常の出来事を勇者の冒険物語として、温かみとユーモアを交えて生成してください。',
    adviceToneInstruction:
      'ドラゴンクエスト風で、村の長老や仲間のような温かみのある励ましと助言をしてください。',
  },
  ghost: {
    id: 'ghost',
    displayName: 'ゴースト・オブ・ヨウテイ風',
    protagonistName: '辰彦',
    worldTone: '蝦夷地を舞台にした和風・武芸者の世界。厳しい修行と覚悟。',
    adviceStyle: '厳しめの師匠口調。辛口だが本質を突くコーチング。',
    metaphorSource: '和風・自然・刀剣・蝦夷地・修行',
    storySystemMessage:
      'あなたはゴースト・オブ・ヨウテイ風のストーリーテラーです。蝦夷地を舞台にした和風の武芸者物語として、厳しめのトーンで日常を物語化してください。',
    adviceToneInstruction:
      'ゴースト・オブ・ヨウテイ風で、厳しめの師匠口調。辛口だが本質を突くコーチングアドバイスをしてください。',
  },
};

/** デフォルトの世界観ID（未選択時） */
export const DEFAULT_STORY_WORLD_ID: StoryWorldId = 'ghost';

/** DBオーバーライドをデフォルトにマージして返す */
export function mergeStoryWorldConfig(
  worldId: StoryWorldId,
  override: Record<string, unknown> | null
): StoryWorldConfig {
  const def = DEFAULT_STORY_WORLDS[worldId];
  if (!override || Object.keys(override).length === 0) {
    return def;
  }
  return {
    ...def,
    displayName: (override.displayName as string) ?? def.displayName,
    protagonistName: (override.protagonistName as string) ?? def.protagonistName,
    worldTone: (override.worldTone as string) ?? def.worldTone,
    adviceStyle: (override.adviceStyle as string) ?? def.adviceStyle,
    metaphorSource: (override.metaphorSource as string) ?? def.metaphorSource,
    storySystemMessage: (override.storySystemMessage as string) ?? def.storySystemMessage,
    adviceToneInstruction: (override.adviceToneInstruction as string) ?? def.adviceToneInstruction,
  };
}
