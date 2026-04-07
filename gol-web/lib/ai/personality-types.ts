/**
 * AIの性格タイプ定義（アドバイス口調）
 *
 * 世界観（dq/ghost）を主とし、性格タイプはその上でトーンを調整する。
 * 「辛口コーチ」は性格タイプではなく、独立したオン/オフ設定。
 */

export type PersonalityTypeId = 'warm' | 'humor' | 'neutral';

export interface PersonalityType {
  id: PersonalityTypeId;
  label: string;
  /** 世界観の口調に追加する短文（主は世界観・従はこの指示） */
  promptSnippet: string;
}

/** 性格タイプ一覧（ラジオで選択。辛口コーチは含めない。並び: 温かく励ます → バランス → ユーモア多め） */
export const PERSONALITY_TYPES: PersonalityType[] = [
  {
    id: 'warm',
    label: '温かく励ます',
    promptSnippet: '温かく励まし、背中を押すような助言を心がけてください。',
  },
  {
    id: 'neutral',
    label: 'バランス',
    promptSnippet: '辛くも優しくも偏らず、バランスの取れた中立的な助言を心がけてください。',
  },
  {
    id: 'humor',
    label: 'ユーモア多め',
    promptSnippet: '軽めのトーンで、適度にユーモアや冗談を交えてください。',
  },
];

/** 辛口コーチをオンにしたときに追加する指示（独立した設定） */
export const STRICT_COACH_SNIPPET =
  '辛口で本質を突くコメントを心がけてください。厳しめのトーンで。' +
  'ただし、習慣として登録しているが今日達成できなかったものは「やりたい意欲がある証拠」です。' +
  'できなかった事実を責めず、なぜできなかったかの本質を鋭く指摘してください。' +
  '叱るときは必ず理由を添えること（「〜だから〜が問題だ」の形）。';

/** 緊張コーチング用の追加指示（ムチの父親的な優しさ） */
export const TENSION_COACH_SNIPPET =
  '緊張（ムチ）のコーチングとして、客観的な事実の整理、ユーザーが日誌に示した信念・価値観と行動のズレがあれば指摘し、気づきと叱咤で次の一歩を促してください。' +
  '習慣として登録しているが今日達成できなかったものは「やりたい意欲がある証拠」として、事実だけを責めず、なぜできなかったかの本質を突いてください。' +
  '叱咤するときは必ず理由を添えてください（「〜だから〜が問題だ」の形）。';


/** デフォルトの性格タイプ（未設定時） */
export const DEFAULT_PERSONALITY_TYPE_ID: PersonalityTypeId = 'neutral';

/** デフォルトで辛口コーチのコメントを出すか（未設定時は true） */
export const DEFAULT_STRICT_COACH_ENABLED = true;

/** localStorage のキー（設定画面・日誌画面で共通） */
export const STORAGE_AI_PERSONALITY_TYPE = 'gol-ai-personality-type';
export const STORAGE_AI_STRICT_COACH_ENABLED = 'gol-ai-strict-coach-enabled';

/** 性格タイプIDが有効か（strict は廃止・独立した辛口コーチに移行） */
export function isValidPersonalityTypeId(
  value: string | null | undefined
): value is PersonalityTypeId {
  return value === 'warm' || value === 'humor' || value === 'neutral';
}

/**
 * プロンプトに追加する性格用の短文を返す（性格タイプのみ。辛口は別扱い）。
 */
export function getPersonalityPromptAddition(personalityTypeId: PersonalityTypeId): string {
  const t = PERSONALITY_TYPES.find((p) => p.id === personalityTypeId);
  return t?.promptSnippet ?? PERSONALITY_TYPES[0].promptSnippet;
}
