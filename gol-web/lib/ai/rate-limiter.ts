/**
 * AI APIレート制限ユーティリティ
 * 
 * ユーザーごとのAPI呼び出し回数を制限する
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type APIType = 'judgment' | 'advice' | 'story';

export interface RateLimitConfig {
  /** 1日あたりの最大リクエスト数 */
  dailyLimit: number;
  /** 1ヶ月あたりの最大リクエスト数 */
  monthlyLimit: number;
}

// デフォルトのレート制限設定
export const DEFAULT_RATE_LIMITS: Record<APIType, RateLimitConfig> = {
  judgment: {
    dailyLimit: 10,    // 1日10回まで
    monthlyLimit: 300, // 1ヶ月300回まで
  },
  advice: {
    dailyLimit: 5,     // 1日5回まで
    monthlyLimit: 150, // 1ヶ月150回まで
  },
  story: {
    dailyLimit: 5,     // 1日5回まで
    monthlyLimit: 150, // 1ヶ月150回まで
  },
};

export interface RateLimitResult {
  allowed: boolean;
  remainingDaily?: number;
  remainingMonthly?: number;
  errorMessage?: string;
}

/**
 * レート制限をチェック
 */
export async function checkRateLimit(
  userId: string,
  apiType: APIType,
  limits: RateLimitConfig = DEFAULT_RATE_LIMITS[apiType]
): Promise<RateLimitResult> {
  const supabase = await createClient();

  try {
    // 今日の使用回数を取得
    const { data: todayCountData, error: todayError } = await supabase.rpc(
      'get_today_usage_count',
      {
        p_user_id: userId,
        p_api_type: apiType,
      }
    );

    if (todayError) {
      console.error('今日の使用回数取得エラー:', todayError);
      // エラー時は許可（フェイルセーフ）
      return { allowed: true };
    }

    const todayCount = todayCountData || 0;

    // 今月の使用回数を取得
    const { data: monthlyCountData, error: monthlyError } = await supabase.rpc(
      'get_monthly_usage_count',
      {
        p_user_id: userId,
        p_api_type: apiType,
      }
    );

    if (monthlyError) {
      console.error('今月の使用回数取得エラー:', monthlyError);
      // エラー時は許可（フェイルセーフ）
      return { allowed: true };
    }

    const monthlyCount = monthlyCountData || 0;

    // レート制限チェック
    if (todayCount >= limits.dailyLimit) {
      return {
        allowed: false,
        remainingDaily: 0,
        remainingMonthly: Math.max(0, limits.monthlyLimit - monthlyCount),
        errorMessage: `1日あたりの${apiType} API呼び出し上限（${limits.dailyLimit}回）に達しました。明日再試行してください。`,
      };
    }

    if (monthlyCount >= limits.monthlyLimit) {
      return {
        allowed: false,
        remainingDaily: Math.max(0, limits.dailyLimit - todayCount),
        remainingMonthly: 0,
        errorMessage: `1ヶ月あたりの${apiType} API呼び出し上限（${limits.monthlyLimit}回）に達しました。来月再試行してください。`,
      };
    }

    return {
      allowed: true,
      remainingDaily: limits.dailyLimit - todayCount - 1, // -1は今回のリクエスト分
      remainingMonthly: limits.monthlyLimit - monthlyCount - 1,
    };
  } catch (error) {
    console.error('レート制限チェックエラー:', error);
    // エラー時は許可（フェイルセーフ）
    return { allowed: true };
  }
}
