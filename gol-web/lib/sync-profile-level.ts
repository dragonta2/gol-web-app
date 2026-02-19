import type { SupabaseClient } from '@supabase/supabase-js';
import { getGlobalLevelThresholds } from './get-global-level-thresholds';
import { getLevelFromExp, getRankName, type RankMode } from './rank-utils';

/**
 * プロファイルのEXPからレベルを再計算し、必要なら更新・ログ記録
 * ダッシュボード・マイページ読み込み時に呼ぶ
 * 閾値は app_config の全アカウント共通設定を使用
 */
export async function syncProfileLevel(
  supabase: SupabaseClient,
  userId: string,
  mode: RankMode = 'ghost'
): Promise<{
  level: number;
  class_name: string;
  levelChanged: boolean;
}> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('level, class_name, exp_body, exp_mind, exp_spirit')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { level: 1, class_name: getRankName(1, mode), levelChanged: false };
  }

  const customThresholds = await getGlobalLevelThresholds(supabase);
  const computedLevel = getLevelFromExp(
    profile.exp_body ?? 0,
    profile.exp_mind ?? 0,
    profile.exp_spirit ?? 0,
    customThresholds
  );

  const storedLevel = profile.level ?? 1;

  if (computedLevel !== storedLevel) {
    const newClassName = getRankName(computedLevel, mode);

    await supabase
      .from('profiles')
      .update({ level: computedLevel, class_name: newClassName })
      .eq('id', userId);

    // ランク変更ログ（テーブル未作成時はスキップ）
    const { error: logError } = await supabase.from('rank_change_logs').insert({
      user_id: userId,
      from_level: storedLevel,
      to_level: computedLevel,
    });
    if (logError) {
      console.warn('rank_change_logs insert:', logError.message);
    }

    return {
      level: computedLevel,
      class_name: newClassName,
      levelChanged: true,
    };
  }

  return {
    level: storedLevel,
    class_name: profile.class_name ?? getRankName(storedLevel, mode),
    levelChanged: false,
  };
}
