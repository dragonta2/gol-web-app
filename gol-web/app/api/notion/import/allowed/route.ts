/**
 * Notion 取り込みが許可されているかどうかを返す。
 * 許可リスト（NOTION_IMPORT_ALLOWED_EMAILS）に含まれるメールのユーザーのみ allowed: true。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_EMAILS_RAW = process.env.NOTION_IMPORT_ALLOWED_EMAILS ?? '';

function getAllowedEmailSet(): Set<string> {
  if (!ALLOWED_EMAILS_RAW.trim()) return new Set();
  return new Set(
    ALLOWED_EMAILS_RAW.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const allowedSet = getAllowedEmailSet();
  const email = (user.email ?? '').trim().toLowerCase();
  const allowed = allowedSet.size > 0 && email !== '' && allowedSet.has(email);

  return NextResponse.json({ allowed });
}
