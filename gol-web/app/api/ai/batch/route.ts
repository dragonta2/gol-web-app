/**
 * AI一括生成API Route
 *
 * 判定・これまでの冒険・これからの冒険・辛口コーチングアドバイスを一括生成。
 * 1日2回まで（daily_logs.ai_batch_run_count で制限）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOpenAIClient,
  createJudgmentPrompt,
  createStoryPrompt,
  createStoryFuturePrompt,
  getStorySystemMessage,
  createAdvicePrompt,
  getAdviceSystemMessage,
} from '@/lib/ai/openai';
import { mergeStoryWorldConfig, type StoryWorldId } from '@/lib/ai/story-worlds';
import { rowToAiOutputLimits } from '@/lib/ai/ai-output-limits';
import {
  getPersonalityPromptAddition,
  isValidPersonalityTypeId,
  STRICT_COACH_SNIPPET,
  DEFAULT_PERSONALITY_TYPE_ID,
  DEFAULT_STRICT_COACH_ENABLED,
} from '@/lib/ai/personality-types';
import { validateJournalText, validateImpressionText, validateAll } from '@/lib/validation';

const JOURNAL_MAX_LENGTH = 3000;
const IMPRESSION_MAX_LENGTH = 3000;

function calculatePointsAndExp(conditionBody: number, conditionMood: number) {
  const averageScore = (conditionBody + conditionMood) / 2;
  return {
    points: Math.round(averageScore / 2),
    exp_body: Math.round(conditionBody / 10),
    exp_mind: Math.round(averageScore / 10),
    exp_spirit: Math.round(conditionMood / 10),
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      dailyLogId,
      journalText,
      impressionText,
      storyWorldId: rawWorldId,
      personalityTypeId: rawPersonalityTypeId,
      strictCoachEnabled: rawStrictCoachEnabled,
    } = body;

    if (!dailyLogId || typeof dailyLogId !== 'string') {
      return NextResponse.json({ error: 'dailyLogIdが必要です' }, { status: 400 });
    }

    const validation = validateAll([
      validateJournalText(journalText),
      validateImpressionText(impressionText),
    ]);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }
    if (!journalText?.trim() && !impressionText?.trim()) {
      return NextResponse.json({ error: '日誌本文または一言感想が必要です' }, { status: 400 });
    }
    if ((journalText?.length ?? 0) > JOURNAL_MAX_LENGTH) {
      return NextResponse.json({ error: `日誌本文は${JOURNAL_MAX_LENGTH}文字以内で入力してください` }, { status: 400 });
    }
    if ((impressionText?.length ?? 0) > IMPRESSION_MAX_LENGTH) {
      return NextResponse.json({ error: `一言感想は${IMPRESSION_MAX_LENGTH}文字以内で入力してください` }, { status: 400 });
    }

    const { data: logRow, error: logError } = await supabase
      .from('daily_logs')
      .select('id, user_id, ai_batch_run_count')
      .eq('id', dailyLogId)
      .single();

    if (logError || !logRow) {
      const isColumnMissing =
        logError?.message?.includes('ai_batch_run_count') || logError?.code === 'PGRST204';
      return NextResponse.json(
        {
          error: isColumnMissing
            ? 'AI一括生成用のDB更新が必要です'
            : '日誌が見つかりません',
          details: logError?.message,
        },
        { status: isColumnMissing ? 503 : 404 }
      );
    }
    if ((logRow as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'この日誌を編集する権限がありません' }, { status: 403 });
    }

    const currentCount = Number((logRow as { ai_batch_run_count?: number }).ai_batch_run_count ?? 0);
    if (currentCount >= 2) {
      return NextResponse.json(
        { error: '本日の再生成は2回までです。明日またお試しください。', code: 'BATCH_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 503 }
      );
    }

    const storyWorldId: StoryWorldId = rawWorldId === 'dq' || rawWorldId === 'ghost' ? rawWorldId : 'ghost';
    let override: Record<string, unknown> | null = null;
    const { data: overrideRows } = await supabase
      .from('story_world_configs')
      .select('config_json')
      .eq('world_id', storyWorldId)
      .maybeSingle();
    if (overrideRows?.config_json && typeof overrideRows.config_json === 'object') {
      override = overrideRows.config_json as Record<string, unknown>;
    }
    const worldConfig = mergeStoryWorldConfig(storyWorldId, override);

    // 文字数制限（世界観共通・テーブルが無ければデフォルト）
    const { data: limitsRow } = await supabase
      .from('ai_output_limits')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    const aiLimits = rowToAiOutputLimits(limitsRow as Record<string, unknown> | null);

    // GOL世界の表示名: 「この名前をGOL世界の表示名として利用する」がONのときは
    // 必ずDBに保存された username を使う（クライアントの古いキャッシュに依存しない）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, use_username_as_display_name')
      .eq('id', user.id)
      .single();
    let finalProfile = profile;
    if (profileError) {
      console.error('[AI batch] プロファイル取得エラー:', profileError.message);
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

    // 調査用: 表示名がデフォルトになる原因切り分け（本番ではレスポンスから削除しても可）
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI batch] display name check', {
        use_username_as_display_name: finalProfile?.use_username_as_display_name,
        username_from_db: finalProfile?.username ?? '(null)',
        nickname_used: nickname || '(空・デフォルト名が使われます)',
      });
    }

    const habits: string[] = [];
    const todos: string[] = [];

    // 1. 判定
    const judgmentPrompt = createJudgmentPrompt(
      journalText || '',
      impressionText || '',
      { reasoning_min: aiLimits.reasoning_min, reasoning_max: aiLimits.reasoning_max }
    );
    const judgmentCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは厳格なコーチです。日誌を読んで体調スコアと気分スコアを0-100点で判定し、JSON形式で回答してください。' },
        { role: 'user', content: judgmentPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });
    const judgmentContent = judgmentCompletion.choices[0]?.message?.content;
    if (!judgmentContent) throw new Error('AI判定の応答がありません');
    let judgmentResult: { condition_body?: number; condition_mood?: number; reasoning?: string };
    try {
      judgmentResult = JSON.parse(judgmentContent);
    } catch {
      throw new Error('AI判定の応答がJSON形式ではありません');
    }
    const conditionBody = Math.max(0, Math.min(100, parseInt(String(judgmentResult.condition_body)) || 50));
    const conditionMood = Math.max(0, Math.min(100, parseInt(String(judgmentResult.condition_mood)) || 50));
    const { points, exp_body, exp_mind, exp_spirit } = calculatePointsAndExp(conditionBody, conditionMood);

    // 2. これまでの冒険
    const storyPastPrompt = createStoryPrompt(
      journalText || '',
      impressionText || '',
      habits,
      todos,
      nickname,
      worldConfig,
      { story_past_min: aiLimits.story_past_min, story_past_max: aiLimits.story_past_max }
    );
    const storyPastCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getStorySystemMessage(worldConfig, nickname) },
        { role: 'user', content: storyPastPrompt },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });
    const storyPast = storyPastCompletion.choices[0]?.message?.content?.trim();
    if (!storyPast) throw new Error('あらすじ（これまでの冒険）の応答がありません');

    // 3. これからの冒険
    const storyFuturePrompt = createStoryFuturePrompt(
      journalText || '',
      impressionText || '',
      habits,
      todos,
      nickname,
      worldConfig,
      { story_future_min: aiLimits.story_future_min, story_future_max: aiLimits.story_future_max }
    );
    const storyFutureCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getStorySystemMessage(worldConfig, nickname) },
        { role: 'user', content: storyFuturePrompt },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });
    const storyFuture = storyFutureCompletion.choices[0]?.message?.content?.trim();
    if (!storyFuture) throw new Error('あらすじ（これからの冒険）の応答がありません');

    // 4. 辛口コーチングアドバイス
    const personalityTypeId = isValidPersonalityTypeId(rawPersonalityTypeId) ? rawPersonalityTypeId : DEFAULT_PERSONALITY_TYPE_ID;
    const strictCoachEnabled = typeof rawStrictCoachEnabled === 'boolean' ? rawStrictCoachEnabled : DEFAULT_STRICT_COACH_ENABLED;
    const personalityBase = getPersonalityPromptAddition(personalityTypeId);
    const personalityAddition = strictCoachEnabled
      ? `${personalityBase} 加えて、${STRICT_COACH_SNIPPET}`
      : personalityBase;
    const advicePrompt = createAdvicePrompt(
      journalText || '',
      impressionText || '',
      conditionBody,
      conditionMood,
      worldConfig,
      personalityAddition,
      nickname,
      { advice_min: aiLimits.advice_min, advice_max: aiLimits.advice_max }
    );
    const adviceCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getAdviceSystemMessage(worldConfig) },
        { role: 'user', content: advicePrompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });
    const advice = adviceCompletion.choices[0]?.message?.content?.trim();
    if (!advice) throw new Error('アドバイスの応答がありません');

    // 5. daily_logs 更新（一括＋実行回数インクリメント）
    const { error: updateLogError } = await supabase
      .from('daily_logs')
      .update({
        ai_condition_body: conditionBody,
        ai_condition_mood: conditionMood,
        ai_reasoning: judgmentResult.reasoning ?? null,
        ai_points_earned: points,
        ai_exp_body: exp_body,
        ai_exp_mind: exp_mind,
        ai_exp_spirit: exp_spirit,
        ai_story_past: storyPast,
        ai_story_future: storyFuture,
        ai_advice: advice,
        ai_batch_run_count: currentCount + 1,
      })
      .eq('id', dailyLogId);

    if (updateLogError) {
      console.error('daily_logs update error:', updateLogError);
      return NextResponse.json(
        { error: '保存に失敗しました', details: updateLogError.message },
        { status: 500 }
      );
    }
    // ポイント/EXPの profiles 反映は確定ボタンで一括適用するため、ここでは daily_logs の更新のみ

    return NextResponse.json({
      condition_body: conditionBody,
      condition_mood: conditionMood,
      reasoning: judgmentResult.reasoning ?? '',
      storyPast,
      storyFuture,
      advice,
      ai_batch_run_count: currentCount + 1,
      // 調査用: APIがプロンプトに渡した表示名（原因切り分け用・本番では削除可）
      ...(process.env.NODE_ENV !== 'production' && {
        _debug_nickname_used: nickname || '(未設定)',
      }),
    });
  } catch (error) {
    console.error('AI一括生成エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
    return NextResponse.json(
      { error: 'AI一括生成に失敗しました', details: message },
      { status }
    );
  }
}
