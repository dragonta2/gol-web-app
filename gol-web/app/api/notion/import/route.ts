/**
 * Notion 日誌取り込み API
 * 指定日付の Notion DB レコードから「日誌」「感想」を取得して返す。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Client } from '@notionhq/client';

const NOTION_JOURNAL_DB_ID = process.env.NOTION_JOURNAL_DB_ID;
const NOTION_API_KEY = process.env.NOTION_API_KEY;

/** Notion の rich_text 配列を 1 本の文字列に結合 */
function richTextToPlainText(richText: { plain_text?: string }[] | undefined): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text ?? '').join('');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!NOTION_API_KEY || !NOTION_JOURNAL_DB_ID) {
      return NextResponse.json(
        { error: 'Notion 連携が設定されていません（NOTION_API_KEY / NOTION_JOURNAL_DB_ID）' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const logDate = typeof body?.logDate === 'string' ? body.logDate.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
      return NextResponse.json(
        { error: '有効な日付（YYYY-MM-DD）を指定してください' },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: NOTION_API_KEY });
    const response = await notion.databases.query({
      database_id: NOTION_JOURNAL_DB_ID,
      filter: {
        property: '日付',
        date: { equals: logDate },
      },
      page_size: 1,
    });

    const page = response.results[0];
    if (!page || !('properties' in page)) {
      return NextResponse.json(
        { error: '該当日の日誌が見つかりません' },
        { status: 404 }
      );
    }

    type RichTextProp = { type?: string; id?: string; rich_text?: { plain_text?: string }[] };
    const props = page.properties as Record<string, RichTextProp>;
    const journalProp = props['nf=t'] ?? props['nf%3Dt'] ?? Object.values(props).find((p) => p?.type === 'rich_text' && p.id === 'nf=t');
    const impressionProp = props['qKRW'] ?? Object.values(props).find((p) => p?.type === 'rich_text' && p.id === 'qKRW');
    const journalText = journalProp ? richTextToPlainText(journalProp.rich_text) : '';
    const impressionText = impressionProp ? richTextToPlainText(impressionProp.rich_text) : '';

    return NextResponse.json({
      journalText,
      impressionText,
      notionPageId: page.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notion の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
