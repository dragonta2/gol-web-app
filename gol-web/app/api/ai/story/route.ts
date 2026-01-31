/**
 * AIあらすじ生成API Route
 * 
 * RPG物語風のあらすじを生成（ユーザーのニックネームを主人公名に反映）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpenAIClient, createStoryPrompt } from '@/lib/ai/openai';
import { validateJournalText, validateImpressionText, validateAll } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { journalText, impressionText, habits, todos } = await request.json();

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

    // habitsとtodosが配列かどうかをチェック
    if (habits !== undefined && !Array.isArray(habits)) {
      return NextResponse.json(
        { error: 'habitsは配列である必要があります' },
        { status: 400 }
      );
    }

    if (todos !== undefined && !Array.isArray(todos)) {
      return NextResponse.json(
        { error: 'todosは配列である必要があります' },
        { status: 400 }
      );
    }

    // プロフィールからニックネーム（表示名）を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    const nickname = (profile?.username ?? '').trim();

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 500 }
      );
    }

    const prompt = createStoryPrompt(
      journalText || '',
      impressionText || '',
      habits || [],
      todos || [],
      nickname
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはRPGゲームのストーリーテラーです。日常の出来事をRPG物語風のあらすじとして生成してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });

    const story = completion.choices[0]?.message?.content;
    if (!story) {
      throw new Error('AIからの応答がありません');
    }

    return NextResponse.json({
      story: story.trim(),
    });
  } catch (error) {
    console.error('AIあらすじ生成エラー:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
    return NextResponse.json(
      { error: 'AIあらすじ生成に失敗しました', details: message },
      { status }
    );
  }
}

