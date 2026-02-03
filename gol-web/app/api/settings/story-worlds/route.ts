/**
 * 世界観設定API
 *
 * GET: 全認証ユーザーが世界観のマージ済み設定を取得（デフォルト + 管理者オーバーライド）
 * PATCH: 管理者のみがオーバーライドを保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/admin';
import {
  mergeStoryWorldConfig,
  type StoryWorldId,
} from '@/lib/ai/story-worlds';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: rows, error: fetchError } = await supabase
      .from('story_world_configs')
      .select('world_id, config_json');

    const overrides: Record<string, Record<string, unknown>> = {};
    if (!fetchError && rows) {
      for (const row of rows) {
        if (row.world_id && row.config_json) {
          overrides[row.world_id] = row.config_json as Record<string, unknown>;
        }
      }
    }

    const dq = mergeStoryWorldConfig('dq', overrides['dq'] ?? null);
    const ghost = mergeStoryWorldConfig('ghost', overrides['ghost'] ?? null);

    return NextResponse.json({
      dq,
      ghost,
    });
  } catch (err) {
    console.error('story-worlds GET error:', err);
    return NextResponse.json(
      { error: '世界観設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/** 保存可能なフィールドのみ抽出 */
const EDITABLE_KEYS = [
  'displayName',
  'protagonistName',
  'worldTone',
  'adviceStyle',
  'metaphorSource',
  'storySystemMessage',
  'adviceToneInstruction',
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = await request.json();
    const worldId = body.worldId as string;
    if (worldId !== 'dq' && worldId !== 'ghost') {
      return NextResponse.json(
        { error: 'worldIdはdqまたはghostである必要があります' },
        { status: 400 }
      );
    }

    const config = body.config;
    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'configオブジェクトが必要です' },
        { status: 400 }
      );
    }

    const configJson: Record<string, string> = {};
    for (const key of EDITABLE_KEYS) {
      if (typeof config[key] === 'string') {
        configJson[key] = config[key].trim();
      }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('story_world_configs')
      .upsert(
        {
          world_id: worldId,
          config_json: configJson,
          updated_by: user?.id ?? null,
        },
        { onConflict: 'world_id' }
      );

    if (error) {
      console.error('story-worlds PATCH error:', error);
      return NextResponse.json(
        { error: '世界観設定の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('story-worlds PATCH error:', err);
    return NextResponse.json(
      { error: '世界観設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}
