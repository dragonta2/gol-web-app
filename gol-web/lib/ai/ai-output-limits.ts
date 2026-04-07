/**
 * AI生成テキストの文字数制限（総評・あらすじ・弛緩/緊張コーチング）
 * 世界観（dq/ghost）共通で1セットのみ。管理者が設定画面で変更可能。
 */

export type AiOutputLimits = {
  /** 総評（判定理由）最小・最大文字数 */
  reasoning_min: number;
  reasoning_max: number;
  /** あらすじ（統合・ai_story_past）最小・最大文字数 */
  story_past_min: number;
  story_past_max: number;
  /** 互換用・現在未使用（将来「これからの冒険」再分割時など） */
  story_future_min: number;
  story_future_max: number;
  /** 弛緩コーチング（ai_advice）最小・最大文字数 */
  advice_min: number;
  advice_max: number;
  /** 緊張コーチング（ai_advice_tension）最小・最大文字数 */
  advice_tension_min: number;
  advice_tension_max: number;
};

/** デフォルトの文字数制限（DBにレコードがない場合に使用） */
export const DEFAULT_AI_OUTPUT_LIMITS: AiOutputLimits = {
  reasoning_min: 50,
  reasoning_max: 500,
  story_past_min: 200,
  story_past_max: 600,
  story_future_min: 200,
  story_future_max: 600,
  advice_min: 150,
  advice_max: 500,
  advice_tension_min: 150,
  advice_tension_max: 500,
};

export const AI_OUTPUT_LIMITS_KEYS: (keyof AiOutputLimits)[] = [
  'reasoning_min',
  'reasoning_max',
  'story_past_min',
  'story_past_max',
  'story_future_min',
  'story_future_max',
  'advice_min',
  'advice_max',
  'advice_tension_min',
  'advice_tension_max',
];

/** DBの行を AiOutputLimits に変換（未設定はデフォルト） */
export function rowToAiOutputLimits(row: Record<string, unknown> | null): AiOutputLimits {
  if (!row) return { ...DEFAULT_AI_OUTPUT_LIMITS };
  const num = (key: keyof AiOutputLimits) => {
    const v = row[key];
    if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.floor(v));
    if (typeof v === 'string') return Math.max(0, Math.floor(parseInt(v, 10) || 0));
    return DEFAULT_AI_OUTPUT_LIMITS[key];
  };
  return {
    reasoning_min: num('reasoning_min'),
    reasoning_max: num('reasoning_max'),
    story_past_min: num('story_past_min'),
    story_past_max: num('story_past_max'),
    story_future_min: num('story_future_min'),
    story_future_max: num('story_future_max'),
    advice_min: num('advice_min'),
    advice_max: num('advice_max'),
    advice_tension_min: num('advice_tension_min'),
    advice_tension_max: num('advice_tension_max'),
  };
}
