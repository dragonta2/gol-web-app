/**
 * OpenAI API統合ユーティリティ
 *
 * GPT-4o miniを使用したAI判定・生成機能の基盤
 */

import OpenAI from 'openai';
import type { StoryWorldConfig } from '@/lib/ai/story-worlds';
import { TENSION_COACH_SNIPPET } from '@/lib/ai/personality-types';

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
 * @param limits 総評（reasoning）の文字数制限（省略時は指示なし）
 * @param habits その日に実行した習慣の名前一覧（判定の参考。省略時は渡さない）
 * @param todos その日に完了したToDoの名前一覧（判定の参考。省略時は渡さない）
 */
export function createJudgmentPrompt(
  journalText: string,
  impressionText: string,
  limits?: { reasoning_min: number; reasoning_max: number } | null,
  habits?: string[],
  todos?: string[]
): string {
  const limitLine =
    limits && limits.reasoning_max > 0
      ? `\n「reasoning」は${limits.reasoning_min}文字以上${limits.reasoning_max}文字以内で記述してください。`
      : '';
  const habitsBlock =
    habits && habits.length > 0
      ? `\n【実行した習慣】\n${habits.join('、')}\n`
      : '';
  const todosBlock =
    todos && todos.length > 0
      ? `\n【完了したToDo】\n${todos.join('、')}\n`
      : '';
  const habitSemanticsNote = habitsBlock
    ? '\n※習慣の解釈: 【実行した習慣】には、チェック済みの良習慣・ボーナスに加え、「悪習慣を今日は実施しなかった（回避）」として扱うべき表記が含まれる場合があります。**悪習慣は実施しないことが望ましい**ので、回避を「未達」や「サボり」と誤解しないでください。親子の良習慣では、親または子のいずれかが実施されていれば十分な前進とみなしてください。\n'
    : '';
  const referenceNote =
    habitsBlock || todosBlock
      ? `${habitSemanticsNote}上記の習慣・ToDoの達成状況も体調・気分の判定の参考にしてください。reasoning（判定理由）には、日誌・一言の内容に加え、習慣やToDoの達成に触れても構いません。\n`
      : '';
  return `あなたは厳格なコーチです。以下の日誌と一言感想を読んで、体調スコアと気分スコアを0-100点で判定してください。

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}
${habitsBlock}${todosBlock}${referenceNote}以下のJSON形式で回答してください：
{
  "condition_body": 0-100の整数（体調スコア）,
  "condition_mood": 0-100の整数（気分スコア）,
  "reasoning": "判定理由（総評。簡潔に）"
}${limitLine}`;
}

/**
 * 弛緩（飴）コーチング用プロンプト
 */
export function createRelaxAdvicePrompt(
  journalText: string,
  impressionText: string,
  conditionBody: number,
  conditionMood: number,
  worldConfig?: StoryWorldConfig | null,
  personalityAddition?: string | null,
  nickname: string = '',
  limits?: { advice_min: number; advice_max: number } | null,
  completedHabits?: string[],
  missedHabits?: string[],
  completedTodos?: string[],
  resistedBadHabits: string[] = [],
  committedBadHabits: string[] = []
): string {
  const relaxCore =
    '弛緩（飴）のコーチングとして、共感・褒め・認める・激励を心がけてください。厳しい叱責や欠点の列挙は避け、今日の小さな前進を認めたうえで背中を押してください。';
  const toneBlock =
    personalityAddition?.trim()
      ? `${relaxCore} 加えて、${personalityAddition.trim()}`
      : relaxCore;
  const displayName = nickname.trim() || (worldConfig?.protagonistName ?? '勇者');
  const nameInstruction = `【重要】アドバイスの冒頭の1行目は「${displayName}よ。」という呼びかけのみにしてください。呼びかけ以外の文章は2行目以降に書いてください。`;

  const completedHabitsBlock =
    completedHabits && completedHabits.length > 0 ? completedHabits.join('、') : 'なし';
  const missedHabitsBlock =
    missedHabits && missedHabits.length > 0 ? missedHabits.join('、') : 'なし';
  const resistedBadBlock =
    resistedBadHabits.length > 0 ? resistedBadHabits.join('、') : 'なし';
  const committedBadBlock =
    committedBadHabits.length > 0 ? committedBadHabits.join('、') : 'なし';
  const completedTodosBlock =
    completedTodos && completedTodos.length > 0 ? completedTodos.join('、') : 'なし';

  return `${toneBlock}

${nameInstruction}

以下の情報を基に、弛緩コーチングを生成してください。

【今日達成した良習慣・ボーナス（チェック済み）】
${completedHabitsBlock}

【守れた悪習慣（今日は実施しなかった＝望ましい結果。未チェックが正解）】
${resistedBadBlock}
※ここに挙がった項目を「できなかった」「サボった」と表現しないでください。回避は評価に値します。

【実施してしまった悪習慣（チェックあり＝悪習慣をした）】
${committedBadBlock}

【今日できなかった良習慣・ボーナス（目標として未チェック）】
${missedHabitsBlock}
※できなかった事実を責めず、共感と前向きな視点で触れてください。

【完了したToDo】
${completedTodosBlock}

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【体調スコア】${conditionBody}/100
【気分スコア】${conditionMood}/100

構成の目安：①共感 ②できたことへの認めと褒め ③短い激励（明日への一歩を軽く示してもよい）

${limits && limits.advice_max > 0 ? `${limits.advice_min}-${limits.advice_max}文字で生成してください。` : '200-300文字で生成してください。'}`;
}

/**
 * 緊張（ムチ）コーチング用プロンプト
 */
export function createTensionAdvicePrompt(
  journalText: string,
  impressionText: string,
  conditionBody: number,
  conditionMood: number,
  worldConfig?: StoryWorldConfig | null,
  nickname: string = '',
  limits?: { advice_tension_min: number; advice_tension_max: number } | null,
  completedHabits?: string[],
  missedHabits?: string[],
  completedTodos?: string[],
  resistedBadHabits: string[] = [],
  committedBadHabits: string[] = []
): string {
  const toneInstruction =
    worldConfig?.adviceToneInstruction ??
    'ゴースト・オブ・ヨウテイ風で、厳しめの師匠口調。辛口だが本質を突くコーチングアドバイスをしてください。';
  const toneBlock = `${toneInstruction} 加えて、${TENSION_COACH_SNIPPET}`;
  const displayName = nickname.trim() || (worldConfig?.protagonistName ?? '勇者');
  const nameInstruction = `【重要】アドバイスの冒頭の1行目は「${displayName}よ。」という呼びかけのみにしてください。呼びかけ以外の文章は2行目以降に書いてください。`;

  const completedHabitsBlock =
    completedHabits && completedHabits.length > 0 ? completedHabits.join('、') : 'なし';
  const missedHabitsBlock =
    missedHabits && missedHabits.length > 0 ? missedHabits.join('、') : 'なし';
  const resistedBadBlock =
    resistedBadHabits.length > 0 ? resistedBadHabits.join('、') : 'なし';
  const committedBadBlock =
    committedBadHabits.length > 0 ? committedBadHabits.join('、') : 'なし';
  const completedTodosBlock =
    completedTodos && completedTodos.length > 0 ? completedTodos.join('、') : 'なし';

  return `${toneBlock}

${nameInstruction}

以下の情報を基に、緊張コーチングを生成してください。

【今日達成した良習慣・ボーナス（チェック済み）】
${completedHabitsBlock}

【守れた悪習慣（今日は実施しなかった＝望ましい結果。未チェックが正解）】
${resistedBadBlock}
※ここに挙がった項目を「できなかった」と叱らないこと。回避は評価に値する。

【実施してしまった悪習慣（チェックあり）】
${committedBadBlock}

【今日できなかった良習慣・ボーナス（目標として未チェック）】
${missedHabitsBlock}

【完了したToDo】
${completedTodosBlock}
※参考情報です。ToDoは日々すべてこなす義務ではない。未完了や遅れをムチの理由にしないでください。

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【体調スコア】${conditionBody}/100
【気分スコア】${conditionMood}/100

【トーンの基本】
成長を促すスタイル（客観整理・気づき・叱咤のバランス）を維持しつつ、メンタル不調の有無にかかわらず、明日への一歩は**ベビーステップ**（今日できる最小の一歩）を意識して示すこと。

【メンタル不調の言葉・ニュアンスが日誌・一言感想に現れる場合】
その部分に**とくに注意**すること。精神的・情緒的なつらさ・不調が読み取れるときは、叱咤より寄り添いを優先し、ベビーステップで前に進む一歩を示すことを徹底すること。一辺倒な叱り方は禁止。

構成の目安：①客観的な事実の整理 ②日誌に表れる価値観と行動のズレがあれば指摘 ③気づきと叱咤、明日への具体的なアクションを1つ
※②③では、ToDo未完了そのものを叱る材料にしないこと（習慣・日誌の本質的なズレや言動のほうを優先）。
※③では常に「小さく踏み出せる一歩」を意識すること。【メンタル不調の言葉…】に該当するときは、③を「叱咤」より「小さな一歩の具体化」に強く寄せてよい。

${limits && limits.advice_tension_max > 0 ? `${limits.advice_tension_min}-${limits.advice_tension_max}文字で生成してください。` : '200-300文字で生成してください。'}`;
}

/**
 * AIあらすじ生成用のプロンプト（統合1本：その日の物語として過去の振り返りとこれからの一歩を自然に織り込む）
 */
export function createStoryPrompt(
  journalText: string,
  impressionText: string,
  habits: string[],
  todos: string[],
  nickname: string = '',
  worldConfig?: StoryWorldConfig | null,
  limits?: { story_past_min: number; story_past_max: number } | null
): string {
  const protagonist = worldConfig?.protagonistName ?? '勇者';
  const heroInstruction = nickname.trim()
    ? `【重要】主人公の名前は、ユーザーが設定したニックネーム「${nickname.trim()}」を省略・短縮・置き換えせず、そのまま全文で使ってください。表記例: 「${protagonist}${nickname.trim()}」。デフォルト名（${protagonist}）だけでは表記しないでください。`
    : `【重要】主人公の名前は「${protagonist}」と表記してください。`;

  return `以下の情報を基に、今日の日誌の内容を**1本のあらすじ**にまとめてください。RPG物語風で、今日起きた出来事の描写に加え、必要なら軽く振り返りや、これから進む一歩の示唆を**自然に織り込んで**ください。「これまで」と「これから」を別パートに分けず、ひと続きの物語として書いてください。

${heroInstruction}

【日誌本文】
${journalText || '（未記入）'}

【一言感想】
${impressionText || '（未記入）'}

【実行した習慣（良習慣・ボーナスのチェック済み＋悪習慣の「今日は回避」表記を含む場合あり）】
${habits.length > 0 ? habits.join('、') : 'なし'}
${habits.length > 0 ? '※悪習慣は実施しないことが望ましい。親子の良習慣はいずれか実施があれば前進とみなすこと。\n' : ''}
【完了したToDo】
${todos.length > 0 ? todos.join('、') : 'なし'}

${limits && limits.story_past_max > 0 ? `${limits.story_past_min}-${limits.story_past_max}文字で` : '300-400文字で'}物語風のあらすじを生成してください。
【禁止】出力に「あらすじ」「これまでの冒険」「これからの冒険」などの見出し・タイトル行を含めないでください。物語本文のみを出力してください。
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

/** アドバイス生成用のシステムメッセージ（弛緩 / 緊張） */
export function getAdviceSystemMessage(
  worldConfig?: StoryWorldConfig | null,
  variant: 'relax' | 'tension' = 'relax'
): string {
  if (variant === 'relax') {
    return (
      worldConfig?.adviceToneInstruction
        ? `あなたは弛緩（飴）のコーチです。次の口調を尊重しつつ、共感・褒め・認める・激励を軸にしてください: ${worldConfig.adviceToneInstruction}`
        : 'あなたは弛緩（飴）のコーチです。共感・褒め・認める・激励を軸にしたコーチングを生成してください。'
    );
  }
  return (
    worldConfig?.adviceToneInstruction
      ? `あなたは緊張（ムチ）のコーチです。次の口調を土台に、客観指摘・気づき・叱咤で成長を促してください: ${worldConfig.adviceToneInstruction} ToDoの未完了を叱責の根拠にしないこと（タスクは毎日すべて完了すべきものではない）。基本は成長を促すスタイルを保ちつつ、常にベビーステップ（今日できる最小の一歩）を意識すること。日誌・一言感想にメンタル不調の言葉やニュアンスがあるときは、とくにその部分に注意し、一辺倒な叱咤を避けて寄り添いとベビーステップの前進を最優先すること。`
      : 'あなたは緊張（ムチ）のコーチです。客観指摘・気づき・叱咤で本人の行動を促すコーチングを生成してください。ToDoの未完了を叱責の根拠にしないこと（タスクは毎日すべて完了すべきものではない）。基本は成長を促すスタイルを保ちつつ、常にベビーステップ（今日できる最小の一歩）を意識すること。日誌・一言感想にメンタル不調の言葉やニュアンスがあるときは、とくにその部分に注意し、一辺倒な叱咤を避けて寄り添いとベビーステップの前進を最優先すること。'
  );
}
