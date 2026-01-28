'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface PointsExpData {
  date: string;
  points: number;
  expBody: number;
  expMind: number;
  expSpirit: number;
}

interface HabitCompletionData {
  habitId: string;
  habitName: string;
  habitType: 'good' | 'bad' | 'bonus';
  completionRate: number;
  completedDays: number;
  totalDays: number;
}

interface HabitCompletionSummary {
  totalDays: number;
  averageByType: {
    good: number;
    bad: number;
    bonus: number;
  };
  totalHabits: number;
}

interface TodoCompletionData {
  date: string;
  completed: number;
  total: number;
  rate: number;
}

interface TodoCompletionSummary {
  totalTodos: number;
  completedTodos: number;
  completionRate: number;
}

interface WeeklyMonthlySummary {
  weekly: {
    points: number;
    expBody: number;
    expMind: number;
    expSpirit: number;
    habitCompletionRate: number;
    todoCompletionRate: number;
  };
  monthly: {
    points: number;
    expBody: number;
    expMind: number;
    expSpirit: number;
    habitCompletionRate: number;
    todoCompletionRate: number;
  };
}

export default function StatsTab() {
  const [pointsExpData, setPointsExpData] = useState<PointsExpData[]>([]);
  const [habitCompletionData, setHabitCompletionData] = useState<HabitCompletionData[]>([]);
  const [habitSummary, setHabitSummary] = useState<HabitCompletionSummary | null>(null);
  const [todoCompletionData, setTodoCompletionData] = useState<TodoCompletionData[]>([]);
  const [todoSummary, setTodoSummary] = useState<TodoCompletionSummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyMonthlySummary | null>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // データ取得関数をuseCallbackでメモ化
  const fetchData = useCallback(async (daysCount: number) => {
    try {
      setLoading(true);
      setError(null);

      // 3つのAPIを並列で取得（パフォーマンス向上）
      const [pointsExpResponse, habitsResponse, todosResponse] = await Promise.all([
        fetch(`/api/stats/points-exp?days=${daysCount}`),
        fetch(`/api/stats/habits-completion?days=${daysCount}`),
        fetch(`/api/stats/todos-completion?days=${daysCount}`),
      ]);

      // レスポンスの検証とJSON変換を並列で実行
      const [pointsExpResult, habitsResult, todosResult] = await Promise.all([
        pointsExpResponse.ok
          ? pointsExpResponse.json()
          : Promise.reject(new Error('ゴルド・EXPデータの取得に失敗しました')),
        habitsResponse.ok
          ? habitsResponse.json()
          : Promise.reject(new Error('習慣データの取得に失敗しました')),
        todosResponse.ok
          ? todosResponse.json()
          : Promise.reject(new Error('ToDoデータの取得に失敗しました')),
      ]);

      // 状態を一括更新
      setPointsExpData(pointsExpResult.data || []);
      setHabitCompletionData(habitsResult.data || []);
      setHabitSummary(habitsResult.summary || null);
      setTodoCompletionData(todosResult.data || []);
      setTodoSummary(todosResult.summary || null);

      // 週間・月間サマリーとAI使用量を取得
      await Promise.all([fetchSummary(), fetchAiUsage()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      console.error('データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  const fetchAiUsage = async () => {
    try {
      const response = await fetch('/api/ai/usage?days=30');
      if (response.ok) {
        const data = await response.json();
        setAiUsage(data);
      } else if (response.status === 403) {
        // 管理者権限がない場合（403 Forbidden）
        // エラーログは出力せず、静かにセクションを非表示にする
        setAiUsage(null);
      } else {
        // その他のエラー（500など）
        const errorData = await response.json().catch(() => ({}));
        console.error('AI使用量取得エラー:', response.status, errorData);
        setAiUsage(null);
      }
    } catch (err) {
      console.error('AI使用量取得エラー:', err);
      // エラー時はnullのまま（セクションを表示しない）
      setAiUsage(null);
    }
  };

  const fetchSummary = async () => {
    try {
      // 週間データ（7日間）
      const [weeklyPointsExp, weeklyHabits, weeklyTodos] = await Promise.all([
        fetch('/api/stats/points-exp?days=7').then(r => r.json()),
        fetch('/api/stats/habits-completion?days=7').then(r => r.json()),
        fetch('/api/stats/todos-completion?days=7').then(r => r.json()),
      ]);

      // 月間データ（30日間）
      const [monthlyPointsExp, monthlyHabits, monthlyTodos] = await Promise.all([
        fetch('/api/stats/points-exp?days=30').then(r => r.json()),
        fetch('/api/stats/habits-completion?days=30').then(r => r.json()),
        fetch('/api/stats/todos-completion?days=30').then(r => r.json()),
      ]);

      const weeklyPointsExpData = weeklyPointsExp.data || [];
      const monthlyPointsExpData = monthlyPointsExp.data || [];

      setWeeklySummary({
        weekly: {
          points: weeklyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.points, 0),
          expBody: weeklyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expBody, 0),
          expMind: weeklyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expMind, 0),
          expSpirit: weeklyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expSpirit, 0),
          habitCompletionRate: weeklyHabits.summary?.averageByType?.good || 0,
          todoCompletionRate: weeklyTodos.summary?.completionRate || 0,
        },
        monthly: {
          points: monthlyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.points, 0),
          expBody: monthlyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expBody, 0),
          expMind: monthlyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expMind, 0),
          expSpirit: monthlyPointsExpData.reduce((sum: number, d: PointsExpData) => sum + d.expSpirit, 0),
          habitCompletionRate: monthlyHabits.summary?.averageByType?.good || 0,
          todoCompletionRate: monthlyTodos.summary?.completionRate || 0,
        },
      });
    } catch (err) {
      console.error('サマリー取得エラー:', err);
    }
  };

  // 習慣の種類別に色を設定（useCallbackでメモ化）- 早期リターンの前に定義
  const getHabitTypeColor = useCallback((type: 'good' | 'bad' | 'bonus') => {
    switch (type) {
      case 'good':
        return '#34d399'; // 緑
      case 'bad':
        return '#f87171'; // 赤
      case 'bonus':
        return '#fbbf24'; // 黄
      default:
        return '#a1a1aa'; // グレー
    }
  }, []);

  // 習慣の種類別にデータを分類（useMemoでメモ化）- 早期リターンの前に定義
  const { goodHabits, badHabits, bonusHabits } = useMemo(() => {
    return {
      goodHabits: habitCompletionData.filter(h => h.habitType === 'good'),
      badHabits: habitCompletionData.filter(h => h.habitType === 'bad'),
      bonusHabits: habitCompletionData.filter(h => h.habitType === 'bonus'),
    };
  }, [habitCompletionData]);

  // 統計サマリーの計算をメモ化 - 早期リターンの前に定義
  const pointsExpSummary = useMemo(() => {
    if (pointsExpData.length === 0) return null;
    return {
      totalPoints: pointsExpData.reduce((sum, d) => sum + d.points, 0),
      totalExpBody: pointsExpData.reduce((sum, d) => sum + d.expBody, 0),
      totalExpMind: pointsExpData.reduce((sum, d) => sum + d.expMind, 0),
      totalExpSpirit: pointsExpData.reduce((sum, d) => sum + d.expSpirit, 0),
    };
  }, [pointsExpData]);

  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-400">
        データを読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        エラー: {error}
      </div>
    );
  }

  if (pointsExpData.length === 0 && habitCompletionData.length === 0 && todoCompletionData.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400">
        データがありません。日誌を記録すると、ここに統計が表示されます。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 週間・月間サマリー */}
      {weeklySummary && (
        <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl sm:text-2xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
            <span>進捗サマリー</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 週間サマリー */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-zinc-300 border-b border-zinc-700 pb-2">
                過去7日間
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">ゴルド</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {weeklySummary.weekly.points}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">身体EXP</p>
                  <p className="text-2xl font-bold text-green-400">
                    {weeklySummary.weekly.expBody}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">頭脳EXP</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {weeklySummary.weekly.expMind}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">精神EXP</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {weeklySummary.weekly.expSpirit}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">習慣達成率</p>
                  <p className="text-2xl font-bold text-green-400">
                    {Math.round(weeklySummary.weekly.habitCompletionRate * 10) / 10}%
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">ToDo完了率</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {Math.round(weeklySummary.weekly.todoCompletionRate * 10) / 10}%
                  </p>
                </div>
              </div>
            </div>

            {/* 月間サマリー */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-zinc-300 border-b border-zinc-700 pb-2">
                過去30日間
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">ゴルド</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {weeklySummary.monthly.points}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">身体EXP</p>
                  <p className="text-2xl font-bold text-green-400">
                    {weeklySummary.monthly.expBody}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">頭脳EXP</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {weeklySummary.monthly.expMind}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">精神EXP</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {weeklySummary.monthly.expSpirit}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">習慣達成率</p>
                  <p className="text-2xl font-bold text-green-400">
                    {Math.round(weeklySummary.monthly.habitCompletionRate * 10) / 10}%
                  </p>
                </div>
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-2xl text-zinc-400 mb-1">ToDo完了率</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {Math.round(weeklySummary.monthly.todoCompletionRate * 10) / 10}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 期間選択 */}
      <div className="flex items-center gap-4">
        <label className="text-2xl text-zinc-300">表示期間:</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="pl-3 pr-8 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value={7}>過去7日間</option>
          <option value={30}>過去30日間</option>
          <option value={90}>過去90日間</option>
        </select>
      </div>

      {/* ゴルド・EXPの推移グラフ */}
      <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h2 className="text-2xl sm:text-2xl font-semibold text-cyan-400 mb-4">
          📈 ゴルド・EXPの推移
        </h2>
        
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={pointsExpData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="date"
                stroke="#a1a1aa"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#a1a1aa" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#f4f4f5',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: number) => [value, '']}
              />
              <Legend
                wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="#22d3ee"
                strokeWidth={2}
                name="ゴルド"
                dot={{ fill: '#22d3ee', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expBody"
                stroke="#34d399"
                strokeWidth={2}
                name="身体EXP"
                dot={{ fill: '#34d399', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expMind"
                stroke="#60a5fa"
                strokeWidth={2}
                name="頭脳EXP"
                dot={{ fill: '#60a5fa', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expSpirit"
                stroke="#a78bfa"
                strokeWidth={2}
                name="精神EXP"
                dot={{ fill: '#a78bfa', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 統計サマリー */}
      {pointsExpSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-2xl text-zinc-400 mb-1">合計ゴルド</p>
            <p className="text-2xl font-bold text-cyan-400">
              {pointsExpSummary.totalPoints}
            </p>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-2xl text-zinc-400 mb-1">合計身体EXP</p>
            <p className="text-2xl font-bold text-green-400">
              {pointsExpSummary.totalExpBody}
            </p>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-2xl text-zinc-400 mb-1">合計頭脳EXP</p>
            <p className="text-2xl font-bold text-blue-400">
              {pointsExpSummary.totalExpMind}
            </p>
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
            <p className="text-2xl text-zinc-400 mb-1">合計精神EXP</p>
            <p className="text-2xl font-bold text-purple-400">
              {pointsExpSummary.totalExpSpirit}
            </p>
          </div>
        </div>
      )}

      {/* 習慣の達成率グラフ */}
      {habitCompletionData.length > 0 && (
        <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl sm:text-2xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
            <span>習慣の達成率</span>
          </h2>

          {/* 種類別平均達成率 */}
          {habitSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                <p className="text-2xl text-zinc-400 mb-1">良習慣の平均達成率</p>
                <p className="text-2xl font-bold text-green-400">
                  {habitSummary.averageByType.good}%
                </p>
                <p className="text-2xl text-zinc-500 mt-1">
                  {goodHabits.length}個の習慣
                </p>
              </div>
              <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                <p className="text-2xl text-zinc-400 mb-1">悪習慣の平均達成率</p>
                <p className="text-2xl font-bold text-red-400">
                  {habitSummary.averageByType.bad}%
                </p>
                <p className="text-2xl text-zinc-500 mt-1">
                  {badHabits.length}個の習慣
                </p>
              </div>
              <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                <p className="text-2xl text-zinc-400 mb-1">ボーナスの平均達成率</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {habitSummary.averageByType.bonus}%
                </p>
                <p className="text-2xl text-zinc-500 mt-1">
                  {bonusHabits.length}個の習慣
                </p>
              </div>
            </div>
          )}

          {/* 習慣ごとの達成率グラフ */}
          <div className="w-full" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height={Math.max(400, habitCompletionData.length * 30)}>
              <BarChart
                data={habitCompletionData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#a1a1aa"
                  style={{ fontSize: '12px' }}
                  label={{ value: '達成率 (%)', position: 'insideBottom', offset: -5, style: { fill: '#a1a1aa' } }}
                />
                <YAxis
                  type="category"
                  dataKey="habitName"
                  stroke="#a1a1aa"
                  style={{ fontSize: '12px' }}
                  width={140}
                  tick={{ fill: '#a1a1aa' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.completedDays}/${props.payload.totalDays}日)`,
                    '達成率',
                  ]}
                />
                <Bar dataKey="completionRate" name="達成率">
                  {habitCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHabitTypeColor(entry.habitType)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ToDo完了率グラフ */}
      {todoSummary && (
        <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl sm:text-2xl font-semibold text-cyan-400 mb-4">
            ✅ ToDo完了率
          </h2>

          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-2xl text-zinc-400 mb-1">全体の完了率</p>
              <p className="text-2xl font-bold text-cyan-400">
                {todoSummary.completionRate}%
              </p>
              <p className="text-2xl text-zinc-500 mt-1">
                {todoSummary.completedTodos}/{todoSummary.totalTodos}個完了
              </p>
            </div>
          </div>

          {/* 日別完了率グラフ */}
          {todoCompletionData.length > 0 && (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={todoCompletionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="date"
                    stroke="#a1a1aa"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#a1a1aa"
                    style={{ fontSize: '12px' }}
                    label={{ value: '完了率 (%)', angle: -90, position: 'insideLeft', style: { fill: '#a1a1aa' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.completed}/${props.payload.total}個)`,
                      '完了率',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    name="完了率"
                    dot={{ fill: '#22d3ee', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* AI使用量モニタリング */}
      {aiUsage && (
        <div className="p-4 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl sm:text-2xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
            <span>AI使用量</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-base text-zinc-400 mb-1">今日のコスト</p>
              <p className="text-2xl font-bold text-yellow-400">
                ${aiUsage.todayCost?.toFixed(6) || '0.000000'}
              </p>
            </div>
            <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-base text-zinc-400 mb-1">今月のコスト</p>
              <p className="text-2xl font-bold text-purple-400">
                ${aiUsage.monthlyCost?.toFixed(6) || '0.000000'}
              </p>
            </div>
            <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-base text-zinc-400 mb-1">今日の判定</p>
              <p className="text-2xl font-bold text-cyan-400">
                {aiUsage.todayUsage?.judgment || 0}回
              </p>
            </div>
            <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-base text-zinc-400 mb-1">今月の判定</p>
              <p className="text-2xl font-bold text-green-400">
                {aiUsage.monthlyUsage?.judgment || 0}回
              </p>
            </div>
          </div>

          {aiUsage.statistics && aiUsage.statistics.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-zinc-300 mb-3">日別使用量（過去30日）</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiUsage.statistics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="date"
                      stroke="#a1a1aa"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis stroke="#a1a1aa" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        color: '#f4f4f5',
                      }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
                    <Bar dataKey="request_count" name="リクエスト数" fill="#22d3ee" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
