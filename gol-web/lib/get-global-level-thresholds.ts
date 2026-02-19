/**
 * 全アカウント共通のレベル閾値を app_config から取得
 * 未設定の場合は null（呼び出し側で LEVEL_THRESHOLDS にフォールバック）
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseLevelThresholds, type LevelThresholds } from './rank-utils';

const CONFIG_KEY = 'level_thresholds';

export async function getGlobalLevelThresholds(
  supabase: SupabaseClient
): Promise<LevelThresholds | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle();

  if (error || !data?.value) return null;
  return parseLevelThresholds(data.value);
}
