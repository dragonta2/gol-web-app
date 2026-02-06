/**
 * GOL Web版｜共通型定義ファイル
 * 
 * このファイルは、アプリケーション全体で使用する型定義を一元管理します。
 * データベースのテーブル構造に対応した型定義が含まれています。
 */

// ============================================================================
// データベーステーブル対応型定義
// ============================================================================

/**
 * habitsテーブル（習慣マスタ）
 * 
 * ユーザーが登録している習慣の定義を格納
 * 例: 筋トレ、読書、タバコを吸わない など
 */
export interface Habit {
  /** 習慣の一意ID */
  id: string;
  /** ユーザーID（誰の習慣か） */
  user_id: string;
  /** 習慣の名前（例: "筋トレ"） */
  habit_name: string;
  /** 習慣の種類: 'good'=良習慣, 'bad'=悪習慣, 'bonus'=ボーナス */
  habit_type: 'good' | 'bad' | 'bonus';
  /** 獲得ポイント */
  points: number;
  /** 身体EXP */
  exp_body: number;
  /** 頭脳EXP */
  exp_mind: number;
  /** 精神EXP */
  exp_spirit: number;
  /** 表示順序（小さい順に表示） */
  display_order: number;
  /** カスタム習慣かどうか（ユーザーが作成した習慣） */
  is_custom: boolean;
  /** 入力タイプ: 'checkbox'=チェックボックス, 'number'=数値入力 */
  input_type: 'checkbox' | 'number';
  /** 週末を除外するか */
  exclude_weekends: boolean;
  /** 完了判定から除外するか */
  exclude_from_complete: boolean;
  /** 難易度（habitsテーブルにカラムがある場合のみ。未設定時は 'medium' として扱う） */
  difficulty?: Difficulty;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * habit_logsテーブル（習慣実行記録）
 * 
 * ユーザーが習慣を実行した記録を日ごとに格納
 * 例: 2024-11-21に筋トレをやった、読書をやった など
 */
export interface HabitLog {
  /** 記録の一意ID */
  id: string;
  /** 日誌ID（どの日の記録か） */
  daily_log_id: string;
  /** 習慣ID（どの習慣の記録か） */
  habit_id: string;
  /** チェックしたかどうか（true=やった, false=やってない） */
  is_checked: boolean;
  /** 実行回数（例: 筋トレ3回） */
  count: number;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * daily_logsテーブル（日誌）
 * 
 * ユーザーの1日ごとの日誌データを格納
 * 例: 2024-11-21の日誌本文、一言感想、権利使用回数 など
 */
export interface DailyLog {
  /** 日誌の一意ID */
  id: string;
  /** ユーザーID */
  user_id: string;
  /** 日付（YYYY-MM-DD形式） */
  log_date: string;
  /** 日誌の本文（長文） */
  journal_text: string | null;
  /** 一言感想（短文） */
  one_line_comment: string | null;
  /** 基本消費ポイント */
  base_consumption: number;
  /** 権利Aの使用回数（TVゲーム2時間） */
  right_a_count: number;
  /** 権利Bの使用回数（お酒4杯まで） */
  right_b_count: number;
  /** 権利Cの使用回数（食事時動画1時間毎） */
  right_c_count: number;
  /** 権利Dの使用回数（睡眠導入剤） */
  right_d_count: number;
  /** 権利Eの使用回数（朝食 or 昼食） */
  right_e_count: number;
  /** 権利Fの使用回数（EMKF） */
  right_f_count: number;
  /** 権利Oの使用回数（ON (PLN以外)） */
  right_o_count: number;
  /** 権利Uの使用回数（宇都宮ダンス） */
  right_u_count: number;
  /** 権利Xの使用回数（PLN動画 & ON 1時間） */
  right_x_count: number;
  /** 権利G〜Zの使用回数（アルファベット24種対応、DBにカラム追加が必要） */
  right_g_count?: number;
  right_h_count?: number;
  right_j_count?: number;
  right_k_count?: number;
  right_l_count?: number;
  right_m_count?: number;
  right_n_count?: number;
  right_p_count?: number;
  right_q_count?: number;
  right_r_count?: number;
  right_s_count?: number;
  right_t_count?: number;
  right_v_count?: number;
  right_w_count?: number;
  right_y_count?: number;
  right_z_count?: number;
  /** AI判定: 体調スコア（0-100） */
  ai_condition_body: number | null;
  /** AI判定: 気分スコア（0-100） */
  ai_condition_mood: number | null;
  /** AI判定: 獲得ポイント */
  ai_points_earned: number | null;
  /** AI判定: 獲得身体EXP */
  ai_exp_body: number | null;
  /** AI判定: 獲得頭脳EXP */
  ai_exp_mind: number | null;
  /** AI判定: 獲得精神EXP */
  ai_exp_spirit: number | null;
  /** AI生成: 厳しめコーチングアドバイス */
  ai_advice: string | null;
  /** AI生成: これまでの冒険（あらすじ・過去） */
  ai_story_past: string | null;
  /** AI生成: これからの冒険（あらすじ・未来） */
  ai_story_future: string | null;
  /** 日誌確定フラグ（確定済みの過去日誌は編集不可） */
  is_confirmed: boolean;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * todosテーブル（ToDoマスタ）
 * 
 * ユーザーが登録しているToDoタスクの定義を格納
 * 例: 沖縄旅行、確定申告、健康診断 など
 */
export interface Todo {
  /** ToDoタスクの一意ID */
  id: string;
  /** ユーザーID（誰のToDoか） */
  user_id: string;
  /** タスク名（例: "沖縄旅行"） */
  task_name: string;
  /** ポイント報酬（難易度倍率はフロントで適用） */
  sp_points: number;
  /** 身体EXP報酬 */
  sp_exp_body: number;
  /** 頭脳EXP報酬 */
  sp_exp_mind: number;
  /** 精神EXP報酬 */
  sp_exp_spirit: number;
  /** ステータス: 'active'=アクティブ, 'in_progress'=進行中, 'completed'=完了済み */
  status: 'active' | 'in_progress' | 'completed';
  /** 保留中か（true のときToDoサマリーの「保留中」に表示、日誌カンバンには表示しない）。未マイグレーション時は undefined → false 扱い */
  is_on_hold?: boolean;
  /** 期限（YYYY-MM-DD形式、null可） */
  due_date: string | null;
  /** 完了日時（完了済みの場合のみ） */
  completed_at: string | null;
  /** 表示順序（小さい順に表示） */
  display_order: number;
  /** 難易度 */
  difficulty: Difficulty;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * todo_logsテーブル（ToDo完了記録）
 * 
 * ユーザーがToDoを完了した記録を日ごとに格納
 * 例: 2024-11-21に沖縄旅行の準備を完了した など
 */
export interface TodoLog {
  /** 記録の一意ID */
  id: string;
  /** 日誌ID（どの日の記録か） */
  daily_log_id: string;
  /** ToDoタスクID（どのタスクの記録か） */
  todo_id: string;
  /** 獲得ポイント */
  points_earned: number;
  /** 獲得身体EXP */
  exp_body_earned: number;
  /** 獲得頭脳EXP */
  exp_mind_earned: number;
  /** 獲得精神EXP */
  exp_spirit_earned: number;
  /** 作成日時 */
  created_at: string;
}

/**
 * todo_subtasksテーブル（ToDoサブタスク）
 * 
 * ToDoタスクのサブタスク（子チェックリスト）を格納
 * 例: 「沖縄旅行」タスクの「旅行プランの立案」「スケジュールの策定」など
 */
export interface TodoSubtask {
  /** サブタスクの一意ID */
  id: string;
  /** ToDoタスクID（どのタスクのサブタスクか） */
  todo_id: string;
  /** サブタスク名（例: "どこいくか｜調査｜AI利用"） */
  subtask_name: string;
  /** 完了状態（true = 完了、false = 未完了） */
  is_completed: boolean;
  /** チェックを入れた日時（完了時に記録） */
  completed_at?: string | null;
  /** 表示順序（小さい順に表示） */
  display_order: number;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * 難易度の型（3段階）
 * ※裁量値は後から 'custom' を追加可能。その場合は報酬を自由入力にし、calculateReward 内で分岐する。
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * 難易度の表示名
 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'やさしい',
  medium: 'ふつう',
  hard: 'むずかしい',
};

/**
 * 難易度の色（Tailwind CSSクラス・明度控えめで文字視認性を優先）
 */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-600',
  medium: 'bg-amber-600',
  hard: 'bg-red-600',
};

/**
 * 難易度ごとの固定ゴルド（やさしい1 / ふつう2 / むずかしい3）
 */
export const PRESET_GOLD_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * 難易度ごとの固定EXP合計（やさしい1 / ふつう2 / むずかしい3）
 * 選択した属性（体・頭・心）に振り分ける
 */
export const PRESET_EXP_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * 難易度に応じた報酬倍率（現仕様は固定報酬のためすべて1.0）
 * ※裁量値追加時は difficulty === 'custom' のときは sp_* をそのまま使う分岐を入れる
 */
export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.0,
  hard: 1.0,
};

/** 属性（体=身体 / 頭=頭脳 / 心=精神）。EXP振り分け先 */
export type ExpAttribute = 'body' | 'mind' | 'spirit';

export const EXP_ATTRIBUTE_LABELS: Record<ExpAttribute, string> = {
  body: '体',
  mind: '頭',
  spirit: '心',
};

/**
 * 固定EXPを選択属性に均等配分する（余りは先頭から+1）
 * 例: totalExp=2, attributes=['body','mind'] → { body:1, mind:1, spirit:0 }
 * 例: totalExp=3, attributes=['body','mind'] → { body:2, mind:1, spirit:0 }
 * ※むずかしいで2つだけ選んだ場合の「どれに2EXP」は現状は選択順で自動。AIで比重を提案する機能は後から追加可能。
 */
export function distributePresetExp(
  totalExp: number,
  attributes: ExpAttribute[]
): { body: number; mind: number; spirit: number } {
  const result = { body: 0, mind: 0, spirit: 0 };
  if (attributes.length === 0) return result;
  const base = Math.floor(totalExp / attributes.length);
  let remainder = totalExp % attributes.length;
  for (const a of attributes) {
    result[a] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return result;
}

// ============================================================================
// UI用の拡張型定義
// ============================================================================

/**
 * HabitとHabitLogをマージした型
 * 
 * 習慣リストと今日の記録を組み合わせて、画面表示用に加工したデータ
 * 例: 筋トレ（習慣） + やった ✓（記録） = 筋トレ: やった ✓
 */
export interface HabitWithLog extends Habit {
  /** チェック状態（is_checkedの短縮形） */
  checked: boolean;
  /** 実行回数（countの短縮形） */
  count: number;
  /** 記録ID（記録が存在する場合のみ） */
  habitLogId: string | null;
}

/**
 * 権利（利用ポイント）の型
 * 
 * 日誌フォームで使用する権利の定義
 * 例: 権利A（TVゲーム2時間）、権利B（お酒4杯まで） など
 */
export interface Right {
  /** 権利のID */
  id: string;
  /** 権利コード（例: 'A', 'B', 'C'） */
  code: string;
  /** 権利の名前（例: "TVゲーム2時間"） */
  name: string;
  /** 消費ポイント */
  points: number;
  /** 使用単位（自由記述。例: 2時間、4杯まで） */
  unit?: string;
  /** 使用回数 */
  count: number;
}

// ============================================================================
// Props型定義（コンポーネント間のデータ受け渡し用）
// ============================================================================

/**
 * HabitListコンポーネントのProps
 * 
 * 親コンポーネント（dashboard-tabs.tsx）から受け取るデータ
 */
export interface HabitListProps {
  /** 習慣リスト（配列） */
  habits: Habit[];
  /** 今日の習慣記録（配列） */
  habitLogs: HabitLog[];
  /** 今日の日誌ID */
  dailyLogId: string | null;
}

/**
 * DashboardTabsコンポーネントのProps
 * 
 * 親コンポーネント（page.tsx）から受け取るデータ
 */
export interface DashboardTabsProps {
  /** 習慣リスト（配列） */
  habits: Habit[];
  /** 今日の習慣記録（配列） */
  habitLogs: HabitLog[];
  /** 今日の日誌ID */
  dailyLogId: string | null;
  /** 今日の日誌データ */
  dailyLog: DailyLog | null;
  /** ToDoタスクリスト（配列） */
  todos: Todo[];
  /** 今日のToDo完了記録（配列） */
  todoLogs: TodoLog[];
  /** ToDoサブタスクリスト（配列） */
  todoSubtasks: TodoSubtask[];
  /** 選択された日付（YYYY-MM-DD形式） */
  selectedDate?: string;
  /** ユーザー表示名（あらすじ・アドバイス内の名前をボールド表示するために使用） */
  userName?: string;
}

/**
 * JournalFormコンポーネントのProps
 * 
 * 親コンポーネント（dashboard-tabs.tsx）から受け取るデータ
 */
export interface JournalFormProps {
  /** 今日の日誌ID */
  dailyLogId: string | null;
  /** 今日の日誌データ */
  dailyLog: DailyLog | null;
  /** 選択された日付（YYYY-MM-DD形式） */
  logDate?: string;
  /** アコーディオンの開閉状態（外部制御用） */
  expandedStates?: {
    journal?: boolean;
    impression?: boolean;
    rights?: boolean;
    ai?: boolean;
  };
  /** アコーディオンの開閉状態を更新する関数（外部制御用） */
  onExpandedStateChange?: (states: {
    journal?: boolean;
    impression?: boolean;
    rights?: boolean;
    ai?: boolean;
  }) => void;
}

/**
 * KanbanBoardコンポーネントのProps
 *
 * 親コンポーネント（dashboard-tabs.tsx）から受け取るデータ。
 * 日誌画面のカンバンは「状態変更のみ」を司る（サブタスクの完了チェック・ドラッグ・編集リンク）。
 * サブタスクの追加・テキスト編集はToDoサマリー画面で行い、日誌からは編集リンクで遷移する。
 */
export interface KanbanBoardProps {
  /** ToDoタスクリスト（配列） */
  todos: Todo[];
  /** 今日のToDo完了記録（配列） */
  todoLogs: TodoLog[];
  /** ToDoサブタスクリスト（配列）・日誌カードでサブタスク表示用 */
  todoSubtasks: TodoSubtask[];
  /** 今日の日誌ID */
  dailyLogId: string | null;
  /** アコーディオンの開閉状態（外部制御用） */
  isExpanded?: boolean;
  /** アコーディオンの開閉状態を更新する関数（外部制御用） */
  onExpandedChange?: (expanded: boolean) => void;
  /** カードの「編集」クリック時：ToDoサマリーへ切り替え＋編集モーダルを開く（CRUDはリンク先で） */
  onEditTodo?: (todoId: string) => void;
  /** 日誌タブ用：フィルター枠内右上に表示する「新規タスク」クリック時（ToDoサマリーへ切り替え＋新規作成モーダルを開く） */
  onOpenCreateModal?: () => void;
}

// ============================================================================
// データ構造の説明（コメント）
// ============================================================================

/**
 * データの関係性:
 * 
 * DailyLog（日誌）
 *   └─ dailyLogId（日誌のID）
 *       ├─ HabitLog[]（その日の習慣記録の配列）
 *       │   └─ habit_id（どの習慣か）
 *       │       └─ Habit（習慣の定義）
 *       └─ TodoLog[]（その日のToDo完了記録の配列）
 *           └─ todo_id（どのToDoか）
 *               └─ Todo（ToDoタスクの定義）
 * 
 * 例:
 * - DailyLog: 2024-11-21の日誌
 *   - dailyLogId: "daily-2024-11-21"
 *   - HabitLog: 筋トレをやった記録
 *     - habit_id: "habit-001"
 *     - Habit: 筋トレの定義（名前、ポイントなど）
 *   - TodoLog: 沖縄旅行の準備を完了した記録
 *     - todo_id: "todo-001"
 *     - Todo: 沖縄旅行の定義（タスク名、期限など）
 */

