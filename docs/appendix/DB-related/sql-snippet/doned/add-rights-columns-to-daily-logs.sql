-- daily_logs に不足している権利カラム（right_g_count 〜 right_z_count）を追加
--
-- 原因: アプリ側は24件の権利を想定しているが、DBには right_a 〜 right_f, right_o, right_u, right_x のみ存在
-- エラー: Could not find the 'right_g_count' column of 'daily_logs' in the schema cache
--
-- 使用方法:
-- 1. Supabase SQL Editor でこのスクリプトを実行
-- 2. 実行後、Supabase ダッシュボードで「Database > Schema cache」をリフレッシュ（または数分待つ）

-- 不足分の権利カラムを追加（G, H, J, K, L, M, N, P, Q, R, S, T, V, W, Y, Z）
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_g_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_h_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_j_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_k_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_l_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_m_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_n_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_p_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_q_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_r_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_s_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_t_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_v_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_w_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_y_count INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS right_z_count INTEGER DEFAULT 0;

-- 確認: daily_logs の権利カラム一覧
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'daily_logs'
  AND column_name LIKE 'right_%_count'
ORDER BY column_name;
