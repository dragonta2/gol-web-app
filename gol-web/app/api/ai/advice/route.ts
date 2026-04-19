/**
 * AIアドバイス生成API Route
 *
 * 弛緩コーチング / 緊張コーチングを生成（variant で切り替え）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOpenAIClient,
  createRelaxAdvicePrompt,
  createTensionAdvicePrompt,
  getAdviceSystemMessage,
} from '@/lib/ai/openai';
import { mergeStoryWorldConfig, type StoryWorldId } from '@/lib/ai/story-worlds';
import { rowToAiOutputLimits } from '@/lib/ai/ai-output-limits';
import {
  getPersonalityPromptAddition,
  isValidPersonalityTypeId,
  DEFAULT_PERSONALITY_TYPE_ID,
} from '@/lib/ai/personality-types';
import { validateJournalText, validateImpressionText, validateScore, validateAll } from '@/lib/validation';
import {
  buildHabitNamesForAiCoaching,
  type HabitRowForPrompt,
} from '@/lib/ai/habit-prompt-lists';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dailyLogId,
      journalText,
      impressionText,
      conditionBody,
      conditionMood,
      storyWorldId: rawWorldId,
      personalityTypeId: rawPersonalityTypeId,
      variant: rawVariant,
    } = body;

    const validation = validateAll([
      validateJournalText(journalText),
      validateImpressionText(impressionText),
      validateScore(conditionBody, '体調スコア'),
      validateScore(conditionMood, '気分スコア'),
    ]);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    if (conditionBody === undefined || conditionMood === undefined) {
      return NextResponse.json(
        { error: '体調スコアと気分スコアが必要です' },
        { status: 400 }
      );
    }

    const variant = rawVariant === 'tension' ? 'tension' : 'relax';

    const storyWorldId: StoryWorldId =
      rawWorldId === 'dq' || rawWorldId === 'ghost' ? rawWorldId : 'ghost';

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const [
      { data: profile, error: profileError },
      { data: overrideRows, error: overrideError },
      { data: limitsRow },
    ] = await Promise.all([
      supabase.from('profiles').select('username, use_username_as_display_name').eq('id', user.id).single(),
      supabase.from('story_world_configs').select('config_json').eq('world_id', storyWorldId).maybeSingle(),
      supabase.from('ai_output_limits').select('*').eq('id', 1).maybeSingle(),
    ]);

    const aiLimits = rowToAiOutputLimits(limitsRow as Record<string, unknown> | null);

    let finalProfile = profile;
    if (profileError) {
      console.error('[AI advice] プロファイル取得エラー:', profileError.message);
      const { data: fallback } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      finalProfile = fallback
        ? { ...fallback, use_username_as_display_name: true }
        : null;
    }
    const useAsDisplayName = finalProfile?.use_username_as_display_name !== false;
    const nickname = useAsDisplayName ? (finalProfile?.username ?? '').trim() : '';

    let completedHabits: string[] = [];
    let missedHabits: string[] = [];
    let resistedBadHabits: string[] = [];
    let committedBadHabits: string[] = [];
    let completedTodos: string[] = [];

    if (dailyLogId && typeof dailyLogId === 'string') {
      const [{ data: habitLogs }, { data: todoLogs }] = await Promise.all([
        supabase.from('habit_logs').select('habit_id, is_checked').eq('daily_log_id', dailyLogId),
        supabase.from('todo_logs').select('todo_id').eq('daily_log_id', dailyLogId),
      ]);
      const habitLogsAll = habitLogs ?? [];
      const allHabitIds = [...new Set(habitLogsAll.map((h) => h.habit_id))];
      if (allHabitIds.length > 0) {
        const { data: habitsRows } = await supabase
          .from('habits')
          .select('id, habit_name, habit_type, parent_habit_id')
          .in('id', allHabitIds);
        const habitsForBuilder = (habitsRows ?? [])
          .map((h) => {
            const row = h as {
              id: string;
              habit_name: string | null;
              habit_type: string;
              parent_habit_id: string | null;
            };
            const t = row.habit_type;
            if (t !== 'good' && t !== 'bad' && t !== 'bonus') return null;
            return {
              id: row.id,
              habit_name: (row.habit_name ?? '').trim(),
              habit_type: t,
              parent_habit_id: row.parent_habit_id ?? null,
            };
          })
          .filter(Boolean) as HabitRowForPrompt[];
        const built = buildHabitNamesForAiCoaching(habitLogsAll, habitsForBuilder);
        completedHabits = built.completedGoodBonus;
        missedHabits = built.missedGoodBonus;
        resistedBadHabits = built.resistedBad;
        committedBadHabits = built.committedBad;
      }
      const todoIds = [...new Set(todoLogs?.map((t) => t.todo_id) ?? [])];
      if (todoIds.length > 0) {
        const { data: todosRows } = await supabase
          .from('todos').select('id, task_name').in('id', todoIds);
        completedTodos = todosRows?.map((t) => (t as { task_name: string }).task_name?.trim()).filter(Boolean) as string[] ?? [];
      }
    }

    let override: Record<string, unknown> | null = null;
    if (!overrideError && overrideRows?.config_json && typeof overrideRows.config_json === 'object') {
      override = overrideRows.config_json as Record<string, unknown>;
    }
    const worldConfig = mergeStoryWorldConfig(storyWorldId, override);

    const personalityTypeId = isValidPersonalityTypeId(rawPersonalityTypeId)
      ? rawPersonalityTypeId
      : DEFAULT_PERSONALITY_TYPE_ID;
    const personalityAddition = getPersonalityPromptAddition(personalityTypeId);

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        {
          advice: 'AIアドバイス機能を使用するには、OpenAI APIキーを設定してください。',
        },
        { status: 200 }
      );
    }

    if (variant === 'tension') {
      const prompt = createTensionAdvicePrompt(
        journalText || '',
        impressionText || '',
        conditionBody,
        conditionMood,
        worldConfig,
        nickname,
        {
          advice_tension_min: aiLimits.advice_tension_min,
          advice_tension_max: aiLimits.advice_tension_max,
        },
        completedHabits,
        missedHabits,
        completedTodos,
        resistedBadHabits,
        committedBadHabits
      );
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: getAdviceSystemMessage(worldConfig, 'tension') },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      const advice = completion.choices[0]?.message?.content?.trim();
      if (!advice) throw new Error('AIからの応答がありません');
      return NextResponse.json({ advice, variant: 'tension' as const });
    }

    const prompt = createRelaxAdvicePrompt(
      journalText || '',
      impressionText || '',
      conditionBody,
      conditionMood,
      worldConfig,
      personalityAddition,
      nickname,
      { advice_min: aiLimits.advice_min, advice_max: aiLimits.advice_max },
      completedHabits,
      missedHabits,
      completedTodos,
      resistedBadHabits,
      committedBadHabits
    );
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getAdviceSystemMessage(worldConfig, 'relax') },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });
    const advice = completion.choices[0]?.message?.content?.trim();
    if (!advice) throw new Error('AIからの応答がありません');

    return NextResponse.json({ advice, variant: 'relax' as const });
  } catch (error) {
    console.error('AIアドバイス生成エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
    return NextResponse.json(
      { error: 'AIアドバイス生成に失敗しました', details: message },
      { status }
    );
  }
}

