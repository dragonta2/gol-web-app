/**
 * AIアドバイス生成API Route
 *
 * 辛口コーチング アドバイスを生成（世界観に応じて口調を変化）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpenAIClient, createAdvicePrompt, getAdviceSystemMessage } from '@/lib/ai/openai';
import { mergeStoryWorldConfig, type StoryWorldId } from '@/lib/ai/story-worlds';
import { validateJournalText, validateImpressionText, validateScore, validateAll } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { journalText, impressionText, conditionBody, conditionMood, storyWorldId: rawWorldId } = body;

    // サーバー側バリデーション
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

    // 体調スコアと気分スコアが必要
    if (conditionBody === undefined || conditionMood === undefined) {
      return NextResponse.json(
        { error: '体調スコアと気分スコアが必要です' },
        { status: 400 }
      );
    }

    const storyWorldId: StoryWorldId =
      rawWorldId === 'dq' || rawWorldId === 'ghost' ? rawWorldId : 'ghost';

    const supabase = await createClient();
    let override: Record<string, unknown> | null = null;
    const { data: overrideRows, error: overrideError } = await supabase
      .from('story_world_configs')
      .select('config_json')
      .eq('world_id', storyWorldId)
      .maybeSingle();
    if (!overrideError && overrideRows?.config_json && typeof overrideRows.config_json === 'object') {
      override = overrideRows.config_json as Record<string, unknown>;
    }
    const worldConfig = mergeStoryWorldConfig(storyWorldId, override);

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        {
          advice: 'AIアドバイス機能を使用するには、OpenAI APIキーを設定してください。',
        },
        { status: 200 }
      );
    }

    const prompt = createAdvicePrompt(
      journalText || '',
      impressionText || '',
      conditionBody,
      conditionMood,
      worldConfig
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: getAdviceSystemMessage(worldConfig),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const advice = completion.choices[0]?.message?.content;
    if (!advice) {
      throw new Error('AIからの応答がありません');
    }

    return NextResponse.json({
      advice: advice.trim(),
    });
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

