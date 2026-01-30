/**
 * 権利設定で使う定数（設定API・日誌API・フロントで共有）
 * 権利記号はアルファベットのみ、最大24件。
 *
 * 24件すべて使う場合、daily_logs に right_g_count 〜 right_z_count など
 * 不足分のカラムを追加するマイグレーションが必要です。
 */

/** daily_logs の権利カラム順（配列インデックス → カラム名）。最大24件 */
export const RIGHT_COLUMNS_BY_INDEX = [
  'right_a_count',
  'right_b_count',
  'right_c_count',
  'right_d_count',
  'right_e_count',
  'right_f_count',
  'right_o_count',
  'right_u_count',
  'right_x_count',
  'right_g_count',
  'right_h_count',
  'right_j_count',
  'right_k_count',
  'right_l_count',
  'right_m_count',
  'right_n_count',
  'right_p_count',
  'right_q_count',
  'right_r_count',
  'right_s_count',
  'right_t_count',
  'right_v_count',
  'right_w_count',
  'right_y_count',
  'right_z_count',
] as const;

export const MAX_RIGHTS = RIGHT_COLUMNS_BY_INDEX.length;
