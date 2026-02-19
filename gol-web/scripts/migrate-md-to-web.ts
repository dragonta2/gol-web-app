/**
 * マークダウン版からウェブ版へのデータ移行スクリプト
 *
 * 使用例:
 *   npx tsx scripts/migrate-md-to-web.ts
 *
 * または、package.jsonにスクリプトを追加:
 *   "migrate": "tsx scripts/migrate-md-to-web.ts"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数の読み込み（.env.localから）
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- スクリプト実行時のみ dotenv をオプションで読み込む
  require('dotenv').config({ path: '.env.local' });
} catch {
  // dotenvがインストールされていない場合は無視
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません。.env.localを確認してください。');
  process.exit(1);
}

// Service Role Keyが設定されている場合はそれを使用、そうでない場合はANON_KEYを使用
// 注意: ANON_KEYの場合はRLSポリシーにより、認証が必要な場合があります
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Service Role Keyが設定されている場合は、RLSをバイパスする設定を追加
  ...(process.env.SUPABASE_SERVICE_ROLE_KEY ? {
    db: {
      schema: 'public',
    },
  } : {})
});

// 日付フォーマット変換: YYMMDD-W または YYYY-MM-DD-W → YYYY-MM-DD
function convertDate(mdDate: string): string {
  // 形式1: YYMMDD-W (例: 260116-金 → 2026-01-16)
  const oldFormatMatch = mdDate.match(/^(\d{6})-([月火水木金土日])$/);
  if (oldFormatMatch) {
    const [, dateStr] = oldFormatMatch;
    const year = parseInt(dateStr.substring(0, 2), 10);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    // 年を2000年代として解釈（26 → 2026）
    const fullYear = 2000 + year;
    return `${fullYear}-${month}-${day}`;
  }

  // 形式2: YYYY-MM-DD-W (例: 2026-01-16-金 → 2026-01-16)
  const newFormatMatch = mdDate.match(/^(\d{4}-\d{2}-\d{2})-([月火水木金土日])$/);
  if (newFormatMatch) {
    return newFormatMatch[1]; // YYYY-MM-DD部分だけ返す
  }

  throw new Error(`不正な日付フォーマット: ${mdDate}`);
}

// マークダウンファイルから日誌データを抽出
function parseJournalEntry(content: string, dateMatch: string): {
  logDate: string;
  journalText: string;
  oneLineComment: string;
  rights: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    O: number;
    U: number;
    X: number;
  };
  aiStoryPast?: string;
  aiStoryFuture?: string;
} | null {
  try {
    const logDate = convertDate(dateMatch)
    
    // 日付セクション全体を抽出
    const escapedDate = dateMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dateSectionMatch = content.match(
      new RegExp(`### ${escapedDate}[\\s\\S]*?(?=### \\d|## 日誌|$)`, 'm')
    );
    if (!dateSectionMatch) {
      console.error(`日付セクションが見つかりません: ${dateMatch}`);
      return null;
    }
    const dateSection = dateSectionMatch[0];
    
    // 「処理済み/最新話」セクションを優先的に探す
    // パターン1: 「処理済み/最新話」セクション内の「自己記述パート」
    let processedSectionMatch = dateSection.match(
      /## 日誌｜処理済み\/最新話[-\s]*\n\n### [\s\S]*?#### 自己記述パート([\s\S]*?)(?=#### AI判定|## |### \d|$)/m
    );
    
    // パターン2: 「処理前/ドラフト/当日日誌」セクション内の「自己記述パート」
    if (!processedSectionMatch) {
      processedSectionMatch = dateSection.match(
        /## 日誌｜処理前\/ドラフト\/当日日誌[-\s]*\n\n### [\s\S]*?#### 自己記述パート([\s\S]*?)(?=#### AI判定|## |### \d|$)/m
      );
    }
    
    // パターン3: 日付セクション全体から直接抽出（セクション構造がない場合）
    const targetSection = processedSectionMatch ? processedSectionMatch[1] : dateSection;
    
    // デバッグ: 抽出されたセクションの最初の200文字を表示
    if (process.env.DEBUG) {
      console.log(`\n[DEBUG] 抽出されたセクション (${dateMatch}):`);
      console.log(targetSection.substring(0, 200));
    }
    
    // 日誌本文を抽出（「自己記述パート」内を優先）
    let journalMatch = targetSection.match(
      /##### 今日の日誌 =+\s*\n\n([\s\S]*?)\n\n##### 一言感想/m
    );
    // もし見つからなければ、日付セクション全体から探す
    if (!journalMatch) {
      journalMatch = dateSection.match(
        /##### 今日の日誌 =+\s*\n\n([\s\S]*?)\n\n##### 一言感想/m
      );
    }
    const journalText = journalMatch?.[1]?.trim() || '';

    // 一言感想を抽出
    let commentMatch = targetSection.match(
      /##### 一言感想 =+\s*\n\n([\s\S]*?)\n\n##### 習慣/m
    );
    // もし見つからなければ、日付セクション全体から探す
    if (!commentMatch) {
      commentMatch = dateSection.match(
        /##### 一言感想 =+\s*\n\n([\s\S]*?)\n\n##### 習慣/m
      );
    }
    const oneLineComment = commentMatch?.[1]?.trim() || '';

    // 権利の使用回数を抽出
    let rightsMatch = targetSection.match(
      /##### 本日の利用ポイント =+([\s\S]*?)\n\n#### AI判定/m
    );
    // もし見つからなければ、日付セクション全体から探す
    if (!rightsMatch) {
      rightsMatch = dateSection.match(
        /##### 本日の利用ポイント =+([\s\S]*?)\n\n#### AI判定/m
      );
    }
    const rightsSection = rightsMatch?.[1] || '';

    // 権利の使用回数をカウント（[x], [xx], [xxx]などに対応）
    const countRights = (section: string, rightCode: string): number => {
      const pattern = new RegExp(`- \\[(x+)\\] 権利${rightCode}`, 'g');
      const matches = Array.from(section.matchAll(pattern));
      return matches.reduce((sum, match) => sum + match[1].length, 0);
    };

    const rights = {
      A: countRights(rightsSection, 'A'),
      B: countRights(rightsSection, 'B'),
      C: countRights(rightsSection, 'C'),
      D: countRights(rightsSection, 'D'),
      E: countRights(rightsSection, 'E'),
      F: countRights(rightsSection, 'F'),
      O: countRights(rightsSection, 'O'),
      U: countRights(rightsSection, 'U'),
      X: countRights(rightsSection, 'X'),
    };

    // AIあらすじを抽出（「処理済み/最新話」セクション内を優先）
    const aiStoryMatch = targetSection.match(
      /- これまでの冒険\s*\n\n([\s\S]*?)\n\n\s*- これからの冒険\s*\n\n([\s\S]*?)(?=\n\n####|$)/m
    );
    const aiStoryPast = aiStoryMatch?.[1]?.trim();
    const aiStoryFuture = aiStoryMatch?.[2]?.trim();

    return {
      logDate,
      journalText,
      oneLineComment,
      rights,
      aiStoryPast,
      aiStoryFuture,
    };
  } catch (error) {
    console.error(`日誌データの抽出エラー (${dateMatch}):`, error);
    return null;
  }
}

// データベースに移行
async function migrateToDatabase(userId: string, journalData: ReturnType<typeof parseJournalEntry>): Promise<void> {
  if (!journalData) {
    console.error('日誌データが無効です');
    return;
  }

  console.log(`\n移行中: ${journalData.logDate}`);
  console.log(`  日誌本文: ${journalData.journalText ? journalData.journalText.substring(0, 50) + '...' : '(空)'}`);
  console.log(`  一言感想: ${journalData.oneLineComment ? journalData.oneLineComment.substring(0, 50) + '...' : '(空)'}`);
  console.log(`  権利使用: A=${journalData.rights.A}, B=${journalData.rights.B}, C=${journalData.rights.C}, D=${journalData.rights.D}, E=${journalData.rights.E}, F=${journalData.rights.F}, O=${journalData.rights.O}, U=${journalData.rights.U}, X=${journalData.rights.X}`);

  // daily_logsテーブルに挿入または更新
  const { data: existingLog, error: fetchError } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', journalData.logDate)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`既存日誌の確認エラー:`, fetchError);
    return;
  }
  const dailyLogData = {
    user_id: userId,
    log_date: journalData.logDate,
    journal_text: journalData.journalText || null,
    one_line_comment: journalData.oneLineComment || null,
    right_a_count: journalData.rights.A,
    right_b_count: journalData.rights.B,
    right_c_count: journalData.rights.C,
    right_d_count: journalData.rights.D,
    right_e_count: journalData.rights.E,
    right_f_count: journalData.rights.F,
    right_o_count: journalData.rights.O,
    right_u_count: journalData.rights.U,
    right_x_count: journalData.rights.X,
    ai_story_past: journalData.aiStoryPast || null,
    // ai_story_futureはウェブ版にはない（ai_adviceに相当する可能性がある）
  };

  if (existingLog) {
    // 更新
    const { error: updateError } = await supabase
      .from('daily_logs')
      .update(dailyLogData)
      .eq('id', existingLog.id);

    if (updateError) {
      console.error(`日誌の更新エラー:`, updateError);
      return;
    }
    console.log(`  ✓ 更新完了`);
  } else {
    // 新規作成
    const { error: insertError } = await supabase
      .from('daily_logs')
      .insert(dailyLogData);

    if (insertError) {
      console.error(`日誌の作成エラー:`, insertError);
      return;
    }
    console.log(`  ✓ 作成完了`);
  }
}

// メイン処理
async function main() {
  console.log('マークダウン版からウェブ版へのデータ移行を開始します...\n');

  // ユーザーIDをコマンドライン引数から取得、または環境変数から取得
  const userId = process.argv[2] || process.env.TEST_USER_ID;

  if (!userId) {
    console.error('使用方法:');
    console.error('  npx tsx scripts/migrate-md-to-web.ts <USER_ID>');
    console.error('\nまたは、環境変数 TEST_USER_ID を設定してください');
    console.error('\nテストアカウントのUSER_IDは、Supabaseの認証画面で確認できます');
    process.exit(1);
  }

  console.log(`ユーザーID: ${userId}\n`);

  // マークダウンファイルを読み込み
  // マークダウンファイルのパス（ワークスペースルートからの相対パス）
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const mdFilePath = path.join(workspaceRoot, 'md-app/now/story/0-monthly-episode-2601.md');

  if (!fs.existsSync(mdFilePath)) {
    console.error(`マークダウンファイルが見つかりません: ${mdFilePath}`);
    process.exit(1);
  }

  const mdContent = fs.readFileSync(mdFilePath, 'utf-8');

  // 日付パターンに一致する日誌エントリを抽出（両方の形式に対応）
  // 形式1: YYMMDD-W (例: 260116-金)
  // 形式2: YYYY-MM-DD-W (例: 2026-01-16-金)
  const datePattern = /### (\d{6}-[月火水木金土日]|\d{4}-\d{2}-\d{2}-[月火水木金土日])/g;
  const matches = Array.from(mdContent.matchAll(datePattern));

  console.log(`見つかった日誌エントリ: ${matches.length}件\n`);

  // 最初の2件のみ移行（テスト用）
  const entriesToMigrate = matches.slice(0, 2);

  for (const match of entriesToMigrate) {
    const dateMatch = match[1];
    const journalData = parseJournalEntry(mdContent, dateMatch);

    if (journalData) {
      await migrateToDatabase(userId, journalData);
    }
  }

  console.log('\n移行が完了しました！');
}

// 実行
main().catch((error) => {
  console.error('移行エラー:', error);
  process.exit(1);
});
