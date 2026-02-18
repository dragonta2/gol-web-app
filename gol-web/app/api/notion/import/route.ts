/**
 * Notion 日誌取り込み API
 * 指定日付の Notion DB レコードから「日誌」「感想」を取得して返す。
 * レガシー API (2022-06-28) の POST /v1/databases/{id}/query を使用（v5 dataSources は既存 DB で 404 になる場合があるため）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const NOTION_JOURNAL_DB_ID = process.env.NOTION_JOURNAL_DB_ID;

/**
 * Next.js はシステム環境変数を .env.local より優先するため、
 * シェルに古い NOTION_API_KEY が残っていると .env.local の値が使われない。
 * .env.local から直接読み取り、差異があればファイルの値を優先する。
 */
function resolveNotionApiKey(): string | undefined {
  const fromEnv = process.env.NOTION_API_KEY;
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const m = content.match(/^NOTION_API_KEY=(.*)$/m);
    const fromFile = m?.[1]?.trim();
    if (fromFile && fromFile !== fromEnv) return fromFile;
  } catch { /* .env.local が無い場合（本番等）は process.env を使う */ }
  return fromEnv;
}
const NOTION_API_KEY = resolveNotionApiKey();

/** Notion の日付プロパティ名（未設定時は「日付」→「Date」の順で試す。カンマ区切りで複数指定可） */
const NOTION_DATE_PROPERTY_NAMES = (process.env.NOTION_DATE_PROPERTY_NAME || '日付,Date')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (NOTION_DATE_PROPERTY_NAMES.length === 0) NOTION_DATE_PROPERTY_NAMES.push('日付', 'Date');

const NOTION_API_BASE = 'https://api.notion.com';
const NOTION_VERSION_LEGACY = '2022-06-28';

/** データベース ID を正規化（トリム・ハイフン除去）。Notion API は 32 文字の英数字で受け付ける */
function normalizeNotionId(raw: string | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/-/g, '');
}

/** Notion の rich_text 配列を 1 本の文字列に結合 */
function richTextToPlainText(richText: { plain_text?: string }[] | undefined): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text ?? '').join('');
}

const NOTION_IMPORT_ALLOWED_EMAILS_RAW = process.env.NOTION_IMPORT_ALLOWED_EMAILS ?? '';

function isNotionImportAllowed(userEmail: string | undefined): boolean {
  if (!NOTION_IMPORT_ALLOWED_EMAILS_RAW.trim()) return false;
  const email = (userEmail ?? '').trim().toLowerCase();
  if (!email) return false;
  const set = new Set(
    NOTION_IMPORT_ALLOWED_EMAILS_RAW.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return set.has(email);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!isNotionImportAllowed(user.email)) {
      return NextResponse.json(
        { error: 'Notion 取り込みは許可されていないアカウントです' },
        { status: 403 }
      );
    }

    if (!NOTION_API_KEY || !NOTION_JOURNAL_DB_ID) {
      return NextResponse.json(
        { error: 'Notion 連携が設定されていません（NOTION_API_KEY / NOTION_JOURNAL_DB_ID）' },
        { status: 503 }
      );
    }

    const databaseId = normalizeNotionId(NOTION_JOURNAL_DB_ID);

    if (databaseId.length !== 32) {
      return NextResponse.json(
        { error: `NOTION_JOURNAL_DB_ID が不正です（32文字の英数字である必要があります）。現在: ${databaseId.length}文字` },
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

    const headers = {
      Authorization: `Bearer ${NOTION_API_KEY.trim()}`,
      'Notion-Version': NOTION_VERSION_LEGACY,
      'Content-Type': 'application/json',
    };

    const getDbRes = await fetch(
      `${NOTION_API_BASE}/v1/databases/${databaseId}`,
      { headers: { Authorization: headers.Authorization, 'Notion-Version': NOTION_VERSION_LEGACY } }
    );
    if (!getDbRes.ok) {
      const errBody = await getDbRes.text();
      let errMessage = 'Notion のデータベースにアクセスできません。';
      try {
        const parsed = JSON.parse(errBody);
        if (parsed?.message) errMessage = parsed.message;
      } catch {
        if (errBody) errMessage = errBody.slice(0, 300);
      }
      const hint = [
        '使用している DB ID（ハイフンなし）: ' + databaseId + ' 。',
        'Notion の日誌 DB を開き、URL の notion.so/ の直後～ ? の前の英数字と一致しているか確認してください。',
        '「…」→「接続を追加」で「GOL-WEB連携」を追加し、.env.local の NOTION_API_KEY がそのインテグレーションのシークレット（ntn_ で始まる）と完全に同じか確認してください。',
      ].join(' ');
      return NextResponse.json(
        { error: errMessage + ' ' + hint },
        { status: getDbRes.status === 404 ? 404 : getDbRes.status >= 500 ? 502 : getDbRes.status }
      );
    }

    let page: { id: string; properties?: Record<string, unknown> } | null = null;
    for (const propName of NOTION_DATE_PROPERTY_NAMES) {
      const res = await fetch(
        `${NOTION_API_BASE}/v1/databases/${databaseId}/query`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: {
              property: propName,
              date: { equals: logDate },
            },
            page_size: 1,
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.text();
        let errMessage = `Notion API error: ${res.status}`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.message) errMessage = parsed.message;
        } catch {
          if (errBody) errMessage = errBody.slice(0, 200);
        }
        return NextResponse.json({ error: errMessage }, { status: res.status >= 500 ? 502 : res.status });
      }
      const data = await res.json();
      const first = data.results?.[0];
      if (first && 'properties' in first) {
        page = first;
        break;
      }
    }

    if (!page || !('properties' in page)) {
      let hint = '';
      try {
        const dbRes = await fetch(
          `${NOTION_API_BASE}/v1/databases/${databaseId}`,
          { headers: { Authorization: headers.Authorization, 'Notion-Version': NOTION_VERSION_LEGACY } }
        );
        if (dbRes.ok) {
          const dbJson = await dbRes.json();
          const props = dbJson?.properties as Record<string, { name?: string; type?: string }> | undefined;
          if (props && typeof props === 'object') {
            const list = Object.entries(props)
              .map(([, v]) => (v?.name && v?.type ? `${v.name}（${v.type}）` : null))
              .filter(Boolean);
            if (list.length > 0) {
              hint = ` Notion のプロパティ一覧: ${list.join('、')}。日付型のプロパティ名を .env の NOTION_DATE_PROPERTY_NAME に指定してください。`;
            }
          }
        }
      } catch {
        /* ヒント取得に失敗してもメインのエラーは返す */
      }
      return NextResponse.json(
        {
          error:
            `該当日の日誌が見つかりません（検索日付: ${logDate}）。日付列は「日付」型である必要があります。試したプロパティ名: ${NOTION_DATE_PROPERTY_NAMES.join(' / ')}。${hint}`,
        },
        { status: 404 }
      );
    }

    type RichTextProp = { type?: string; id?: string; rich_text?: { plain_text?: string }[] };
    const props = page.properties as Record<string, RichTextProp>;

    const journalProp = props['日誌'] ?? Object.values(props).find((p) => p?.id === 'nf%3Dt' || p?.id === 'nf=t');
    const impressionProp = props['感想'] ?? Object.values(props).find((p) => p?.id === 'qKRW');
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
