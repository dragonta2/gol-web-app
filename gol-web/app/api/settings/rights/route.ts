/**
 * 権利設定管理API Route
 * 権利の追加・編集・削除。配列形式で保存（code, name, points, unit）。
 * unit: 使用単位の自由記述（旧 maxCount を廃止）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePoints } from '@/lib/validation';
import { RIGHT_COLUMNS_BY_INDEX } from '@/lib/rights';

export type RightItem = { code: string; name: string; points: number; unit: string; is_active?: boolean };

/** 権利記号はアルファベットのみ。最大文字数 */
const CODE_MAX_LENGTH = 10;

/** 権利記号をアルファベットのみに正規化 */
function sanitizeCode(code: string): string {
  return code.replace(/[^a-zA-Z]/g, '').slice(0, CODE_MAX_LENGTH);
}

export { RIGHT_COLUMNS_BY_INDEX };

const LEGACY_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'O', 'U', 'X'] as const;

/** 権利未設定時のフォールバック（新規ユーザーは権利Aのみ。設定画面で追加可能） */
const NEW_USER_DEFAULT_RIGHTS: RightItem[] = [
  { code: 'A', name: 'TVゲームをやる (2時間)', points: 5, unit: '1回あたり' },
];

function toRightsArray(config: unknown): RightItem[] {
  if (Array.isArray(config)) {
    return config
      .filter((r): r is RightItem => r != null && typeof r === 'object' && typeof (r as Record<string, unknown>).code === 'string')
      .map((r) => {
        const row = r as Record<string, unknown>;
        return {
          code: sanitizeCode(String(row.code)),
          name: typeof row.name === 'string' ? row.name : '',
          points: typeof row.points === 'number' ? row.points : 0,
          unit: typeof row.unit === 'string' ? row.unit : '',
          is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
        };
      });
  }
  if (config && typeof config === 'object') {
    const obj = config as Record<string, { name?: string; points?: number; maxCount?: number }>;
    return LEGACY_CODES.map((code) => {
      const c = obj[code];
      const name = c?.name ?? '';
      const points = typeof c?.points === 'number' ? c.points : 0;
      const unit = (c as { unit?: string } | undefined)?.unit ?? (c?.maxCount != null ? `${c.maxCount}回まで` : '1回');
      return { code, name, points, unit };
    }).filter((r) => r.name.trim() !== '');
  }
  return [];
}

// GET: 権利設定を取得（配列で返す）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('rights_config')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('プロファイル取得エラー:', error);
      return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
    }

    const raw = profile?.rights_config;
    let rights: RightItem[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { rights?: unknown }).rights)) {
      rights = toRightsArray((raw as { rights: unknown }).rights);
    } else {
      rights = toRightsArray(raw);
    }
    if (rights.length === 0) {
      rights = [...NEW_USER_DEFAULT_RIGHTS];
    }

    return NextResponse.json({ rights });
  } catch (err) {
    console.error('権利設定取得APIエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT: 権利設定を更新（配列で受け取り保存）
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const rights = body.rights;

    if (!Array.isArray(rights)) {
      return NextResponse.json({ error: 'rights は配列で送信してください' }, { status: 400 });
    }

    const validated: RightItem[] = [];
    const MAX_RIGHTS = RIGHT_COLUMNS_BY_INDEX.length;

    for (let i = 0; i < rights.length && validated.length < MAX_RIGHTS; i++) {
      const r = rights[i];
      const rawCode = typeof r?.code === 'string' ? r.code : '';
      const code = sanitizeCode(rawCode.trim());
      const name = typeof r.name === 'string' ? r.name.trim() : '';
      const pointsRaw = r?.points;
      const points = typeof pointsRaw === 'number' && !Number.isNaN(pointsRaw)
        ? pointsRaw
        : parseInt(String(pointsRaw ?? 0), 10) || 0;
      const unit = typeof r.unit === 'string' ? r.unit.trim() : '';
      const isActive = typeof r.is_active === 'boolean' ? r.is_active : true;
      const pointCheck = validatePoints(points);
      if (!pointCheck.valid) continue;
      validated.push({ code: code || `R${i + 1}`, name, points, unit: unit || '1回', is_active: isActive });
    }

    const payload = { rights: validated };
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ rights_config: payload })
      .eq('id', user.id);

    if (updateError) {
      console.error('権利設定更新エラー:', updateError);
      return NextResponse.json(
        { error: '設定の更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rights: validated });
  } catch (err) {
    console.error('権利設定更新APIエラー:', err);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
