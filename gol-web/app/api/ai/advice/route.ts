/**
 * AIアドバイス生成API Route
 * 
 * 辛口コーチング アドバイスを生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, createAdvicePrompt } from '@/lib/ai/openai';
import { validateJournalText, validateImpressionText, validateScore, validateAll } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { journalText, impressionText, conditionBody, conditionMood } = await request.json();

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

    const openai = getOpenAIClient();
    if (!openai) {
      // APIキーが設定されていない場合はモックレスポンスを返す
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
      conditionMood
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは厳格なコーチ（ゴースト・オブ・ヨウテイ風）です。辛口のコーチングアドバイスを生成してください。',
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

