/**
 * AI判定API Route
 * 
 * 日誌内容から体調スコア・気分スコアを判定
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, createJudgmentPrompt } from '@/lib/ai/openai';
import { validateJournalText, validateImpressionText, validateAll } from '@/lib/validation';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { recordUsage, extractTokenUsage, calculateCost } from '@/lib/ai/usage-tracker';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let userId: string | null = null;

  try {
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    userId = user.id;

    const { journalText, impressionText } = await request.json();

    // レート制限チェック
    const rateLimitResult = await checkRateLimit(userId, 'judgment');
    if (!rateLimitResult.allowed) {
      // 使用量記録（レート制限エラーとして記録）
      await recordUsage(
        supabase,
        userId,
        {
          api_type: 'judgment',
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          input_cost: 0,
          output_cost: 0,
          total_cost: 0,
          status: 'rate_limited',
          error_message: rateLimitResult.errorMessage,
        }
      );

      return NextResponse.json(
        {
          error: 'レート制限に達しました',
          details: rateLimitResult.errorMessage,
          code: 'RATE_LIMIT_EXCEEDED',
          remainingDaily: rateLimitResult.remainingDaily,
          remainingMonthly: rateLimitResult.remainingMonthly,
        },
        { status: 429 }
      );
    }

    // サーバー側バリデーション
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

    // 日誌本文または一言感想のいずれかが必要
    if (!journalText?.trim() && !impressionText?.trim()) {
      return NextResponse.json(
        { error: '日誌本文または一言感想が必要です' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    
    // APIキーがない場合、モックデータを返す
    if (!openai) {
      // モック判定結果を生成（日誌内容に基づいて簡易判定）
      const mockBodyScore = Math.min(100, Math.max(50, 
        (journalText?.length || 0) / 30 + 
        (impressionText?.includes('良い') || impressionText?.includes('元気') ? 20 : 0) +
        (impressionText?.includes('疲れた') || impressionText?.includes('調子悪') ? -20 : 0)
      ));
      const mockMoodScore = Math.min(100, Math.max(50,
        (journalText?.length || 0) / 40 +
        (impressionText?.includes('楽しい') || impressionText?.includes('嬉しい') ? 25 : 0) +
        (impressionText?.includes('つらい') || impressionText?.includes('悲しい') ? -25 : 0)
      ));

      return NextResponse.json({
        condition_body: Math.round(mockBodyScore),
        condition_mood: Math.round(mockMoodScore),
        reasoning: '（モックデータ）APIキーが設定されていないため、簡易判定を返しています。実際のAI判定を使用するには、.env.localファイルにOPENAI_API_KEYを設定してください。',
        is_mock: true, // モックデータのフラグ
      });
    }

    const prompt = createJudgmentPrompt(journalText || '', impressionText || '');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは厳格なコーチです。日誌を読んで体調スコアと気分スコアを0-100点で判定し、JSON形式で回答してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AIからの応答がありません');
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('AIからの応答内容:', content);
      throw new Error('AIからの応答が正しいJSON形式ではありません');
    }

    // 必須フィールドのチェック
    if (typeof result.condition_body === 'undefined' || typeof result.condition_mood === 'undefined') {
      console.error('AIからの応答に必須フィールドが不足:', result);
      throw new Error('AIからの応答に必須フィールド（condition_body, condition_mood）が不足しています');
    }

    // スコアの検証と変換
    const conditionBody = Math.max(0, Math.min(100, parseInt(String(result.condition_body)) || 50));
    const conditionMood = Math.max(0, Math.min(100, parseInt(String(result.condition_mood)) || 50));

    // 使用量を記録
    if (userId) {
      const tokenUsage = extractTokenUsage(completion);
      const costs = calculateCost(tokenUsage.input_tokens, tokenUsage.output_tokens);

      await recordUsage(
        supabase,
        userId,
        {
          api_type: 'judgment',
          input_tokens: tokenUsage.input_tokens,
          output_tokens: tokenUsage.output_tokens,
          total_tokens: tokenUsage.total_tokens,
          ...costs,
          model: 'gpt-4o-mini',
          status: 'success',
        }
      );
    }

    return NextResponse.json({
      condition_body: conditionBody,
      condition_mood: conditionMood,
      reasoning: result.reasoning || '',
      usage: userId ? {
        remainingDaily: rateLimitResult.remainingDaily,
        remainingMonthly: rateLimitResult.remainingMonthly,
      } : undefined,
    });
  } catch (error) {
    console.error('AI判定エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // エラー時も使用量を記録（エラーとして記録）
    if (userId) {
      try {
        await recordUsage(
          supabase,
          userId,
          {
            api_type: 'judgment',
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            input_cost: 0,
            output_cost: 0,
            total_cost: 0,
            status: 'error',
            error_message: message,
          }
        );
      } catch (recordError) {
        console.error('使用量記録エラー:', recordError);
        // 使用量記録の失敗は無視
      }
    }
    
    // 環境変数不足時のエラーメッセージを改善（モックモードでは到達しないはず）
    if (message.includes('OPENAI_API_KEY') || message.includes('環境変数が設定されていません')) {
      return NextResponse.json(
        { 
          error: 'AI判定に失敗しました', 
          details: 'OPENAI_API_KEY環境変数が設定されていません。.env.localファイルにOPENAI_API_KEYを設定してください。モックモードが有効な場合、簡易判定が返されます。',
          code: 'MISSING_API_KEY'
        },
        { status: 503 }
      );
    }
    
    // OpenAI APIエラーの場合
    if (message.includes('OpenAI') || message.includes('API')) {
      return NextResponse.json(
        { 
          error: 'AI判定に失敗しました', 
          details: message,
          code: 'OPENAI_API_ERROR'
        },
        { status: 502 }
      );
    }
    
    // その他のエラー
    return NextResponse.json(
      { 
        error: 'AI判定に失敗しました', 
        details: message,
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}

