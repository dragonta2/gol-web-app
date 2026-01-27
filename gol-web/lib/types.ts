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
  /** 難易度 */
  difficulty: Difficulty;
  /** タグリスト（UI表示用、JOINで取得） */
  tags?: Tag[];
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
  /** AI生成: RPG物語風あらすじ */
  ai_story_past: string | null;
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
  /** SPタスクフラグ（true=スペシャルタスク） */
  is_special: boolean;
  /** SPポイント報酬 */
  sp_points: number;
  /** SP身体EXP報酬 */
  sp_exp_body: number;
  /** SP頭脳EXP報酬 */
  sp_exp_mind: number;
  /** SP精神EXP報酬 */
  sp_exp_spirit: number;
  /** ステータス: 'active'=アクティブ, 'in_progress'=進行中, 'completed'=完了済み */
  status: 'active' | 'in_progress' | 'completed';
  /** 期限（YYYY-MM-DD形式、null可） */
  due_date: string | null;
  /** 完了日時（完了済みの場合のみ） */
  completed_at: string | null;
  /** 表示順序（小さい順に表示） */
  display_order: number;
  /** 難易度 */
  difficulty: Difficulty;
  /** タグリスト（UI表示用、JOINで取得） */
  tags?: Tag[];
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
  /** 表示順序（小さい順に表示） */
  display_order: number;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * tagsテーブル（タグマスタ）
 * 
 * ユーザーが作成したタグの定義を格納
 * 例: "運動", "仕事", "プライベート" など
 */
export interface Tag {
  /** タグの一意ID */
  id: string;
  /** ユーザーID */
  user_id: string;
  /** タグ名（例: "運動", "仕事"） */
  tag_name: string;
  /** タグの色（HEX形式、例: "#3b82f6"） */
  tag_color: string;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
}

/**
 * habit_tagsテーブル（習慣-タグ関連）
 * 
 * 習慣とタグの多対多リレーション
 */
export interface HabitTag {
  /** 関連ID */
  id: string;
  /** 習慣ID */
  habit_id: string;
  /** タグID */
  tag_id: string;
  /** 作成日時 */
  created_at: string;
}

/**
 * todo_tagsテーブル（ToDo-タグ関連）
 * 
 * ToDoとタグの多対多リレーション
 */
export interface TodoTag {
  /** 関連ID */
  id: string;
  /** ToDoタスクID */
  todo_id: string;
  /** タグID */
  tag_id: string;
  /** 作成日時 */
  created_at: string;
}

/**
 * 難易度の型（3段階）
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
 * 難易度の色（Tailwind CSSクラス）
 */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-red-500',
};

/**
 * 難易度に応じた報酬倍率
 * 
 * 難易度が高いタスクほど報酬が多くなるように設定
 * - easy: 0.75x
 * - medium: 1.0x（基準）
 * - hard: 1.5x（難しいタスクは報酬が多い）
 */
export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.5,
};

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
  /** 最大使用回数（省略可能） */
  maxCount?: number;
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
 * 親コンポーネント（dashboard-tabs.tsx）から受け取るデータ
 */
export interface KanbanBoardProps {
  /** ToDoタスクリスト（配列） */
  todos: Todo[];
  /** 今日のToDo完了記録（配列） */
  todoLogs: TodoLog[];
  /** 今日の日誌ID */
  dailyLogId: string | null;
  /** アコーディオンの開閉状態（外部制御用） */
  isExpanded?: boolean;
  /** アコーディオンの開閉状態を更新する関数（外部制御用） */
  onExpandedChange?: (expanded: boolean) => void;
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

