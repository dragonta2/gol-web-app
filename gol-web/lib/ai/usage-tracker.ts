/**
 * AI使用量記録ユーティリティ
 * 
 * OpenAI APIの使用量（トークン数、コスト）を記録する
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// GPT-4o miniの料金（2024年時点）
// 入力: $0.15 / 1M tokens = $0.00000015 per token
// 出力: $0.60 / 1M tokens = $0.0000006 per token
const INPUT_COST_PER_TOKEN = 0.00000015;
const OUTPUT_COST_PER_TOKEN = 0.0000006;

export type APIType = 'judgment' | 'advice' | 'story';

export interface UsageRecord {
  api_type: APIType;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  model?: string;
  request_payload?: string;
  response_payload?: string;
  status?: 'success' | 'error' | 'rate_limited';
  error_message?: string;
}

/**
 * トークン数からコストを計算
 */
export function calculateCost(inputTokens: number, outputTokens: number): {
  input_cost: number;
  output_cost: number;
  total_cost: number;
} {
  const input_cost = inputTokens * INPUT_COST_PER_TOKEN;
  const output_cost = outputTokens * OUTPUT_COST_PER_TOKEN;
  const total_cost = input_cost + output_cost;

  return {
    input_cost: Number(input_cost.toFixed(8)),
    output_cost: Number(output_cost.toFixed(8)),
    total_cost: Number(total_cost.toFixed(8)),
  };
}

/**
 * AI使用量を記録
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  usage: UsageRecord
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        ...usage,
        model: usage.model || 'gpt-4o-mini',
        status: usage.status || 'success',
      });

    if (error) {
      console.error('AI使用量記録エラー:', error);
      // エラーを投げない（使用量記録の失敗でAPI自体を失敗させない）
    }
  } catch (error) {
    console.error('AI使用量記録エラー:', error);
    // エラーを投げない（使用量記録の失敗でAPI自体を失敗させない）
  }
}

/**
 * OpenAI APIのレスポンスからトークン使用量を取得
 */
export function extractTokenUsage(completion: any): {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
} {
  const usage = completion.usage || {};
  return {
    input_tokens: usage.prompt_tokens || 0,
    output_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
  };
}
