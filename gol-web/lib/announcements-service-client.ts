import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * お知らせの INSERT/UPDATE は RLS と API の管理者判定が一致しない場合があるため、
 * SUPABASE_SERVICE_ROLE_KEY があればサービスロールで書き込む（権限チェックは呼び出し側で済ませる）。
 */
export function createAnnouncementsServiceClient(
  userScopedClient: SupabaseClient
): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceRoleKey && url) {
    return createSupabaseClient(url, serviceRoleKey);
  }
  return userScopedClient;
}
