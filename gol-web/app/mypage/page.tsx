import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import {
  Swords,
  Coins,
  ArrowLeft,
  Dumbbell,
  Brain,
  Sparkles,
  TrendingUp,
  History,
} from "lucide-react"
import { syncProfileLevel } from "@/lib/sync-profile-level"
import { getGlobalLevelThresholds } from "@/lib/get-global-level-thresholds"
import { getExpToNextLevel } from "@/lib/rank-utils"
import {
  RankNameDisplay,
  RankHistoryItem,
} from "@/components/rank-name-display"
import { RankAvatar } from "@/components/rank-avatar"
import { MypageSettingsSection } from "@/components/mypage-settings-section"
import FontSizeControl from "@/components/font-size-control"

export default async function MypagePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login?from=mypage")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // レベル同期
  let levelInfo = { level: 1, class_name: "無名の凡人", levelChanged: false }
  if (profile) {
    try {
      levelInfo = await syncProfileLevel(supabase, user.id, "ghost")
    } catch (e) {
      console.warn("syncProfileLevel:", e)
    }
  }

  const userProfile = profile
    ? {
        name: profile.username,
        level: levelInfo.level,
        class: levelInfo.class_name,
        points: profile.points,
        exp: {
          body: profile.exp_body ?? 0,
          intellect: profile.exp_mind ?? 0,
          mind: profile.exp_spirit ?? 0,
        },
      }
    : {
        name: user.email?.split("@")[0] || "ユーザー",
        level: 1,
        class: "無名の凡人",
        points: 10,
        exp: { body: 0, intellect: 0, mind: 0 },
      }

  const levelThresholds = await getGlobalLevelThresholds(supabase)
  const expToNext = getExpToNextLevel(
    userProfile.exp.body,
    userProfile.exp.intellect,
    userProfile.exp.mind,
    levelThresholds,
  )

  // ランク変更履歴を取得（テーブルが存在しない場合は空配列）
  const { data: rankLogsData } = await supabase
    .from("rank_change_logs")
    .select("from_level, to_level, changed_at")
    .eq("user_id", user.id)
    .order("changed_at", { ascending: false })
    .limit(20)
  const rankLogs = rankLogsData ?? []

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ダッシュボードに戻る</span>
          </Link>
          <FontSizeControl />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-1">
          マイページ
        </h1>
        <p className="text-sm text-white mb-4">〜人生をゲームに、日記を冒険に〜</p>

        {/* アイキャッチ：ロゴ（上下を背景にグラデーションで溶け込ませる） */}
        <div
          className="mb-[30px] w-full overflow-hidden mask-size-[100%_100%]"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        >
          <Image
            src="/gol-logo.png"
            alt="GOL - Gamification of Life"
            width={1200}
            height={600}
            priority
            className="w-full h-auto"
          />
        </div>

        {/* プロフィールサマリー */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5 text-cyan-400" />
            プロフィール
          </h2>
          <div className="flex items-start gap-6 mb-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">名前</span>
                <span className="text-zinc-100 font-medium">
                  {userProfile.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">レベル</span>
                <span className="text-cyan-400 font-bold">
                  Lv.{userProfile.level}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-300">
                  <RankNameDisplay level={userProfile.level} />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-zinc-400">ゴルド</span>
                <span className="text-yellow-400 font-semibold">
                  {userProfile.points}G
                </span>
              </div>
            </div>
            {/* 中サイズで 450px 相当。rem で指定し文字サイズ（小・中・大）に連動 */}
            <div className="shrink-0 w-[28.125rem] max-w-full">
              <RankAvatar
                level={userProfile.level}
                variant="full"
                size={600}
                className="w-full h-auto"
              />
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex flex-wrap gap-4 text-lg">
              <div className="flex items-center gap-1.5 text-exp-body">
                <Dumbbell className="w-5 h-5 shrink-0" />
                <span>身体</span>
                <span className="font-semibold">
                  {userProfile.exp.body}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-exp-intelligence">
                <Brain className="w-5 h-5 shrink-0" />
                <span>頭脳</span>
                <span className="font-semibold">
                  {userProfile.exp.intellect}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-exp-mind">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>精神</span>
                <span className="font-semibold">
                  {userProfile.exp.mind}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 次のレベルまで */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            次のレベルアップまで
          </h2>
          {expToNext ? (
            <div className="space-y-3 text-lg">
              <p className="text-zinc-400 mb-3">
                身体・頭脳・精神のそれぞれが次の閾値を超えるとレベルアップします。
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-exp-body text-lg mb-1">身体</div>
                  <div className="text-exp-body font-semibold text-lg">
                    あと {expToNext.body}
                  </div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-exp-intelligence text-lg mb-1">頭脳</div>
                  <div className="text-exp-intelligence font-semibold text-lg">
                    あと {expToNext.intellect}
                  </div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-exp-mind text-lg mb-1">精神</div>
                  <div className="text-exp-mind font-semibold text-lg">
                    あと {expToNext.spirit}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-cyan-400 font-medium">
              🎉 最大レベル（Lv.10）に到達しています！
            </p>
          )}
        </section>

        {/* ランク変更履歴 */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            ランク変更履歴
          </h2>
          {rankLogs.length > 0 ? (
            <ul className="space-y-2">
              {rankLogs.map((log) => (
                <RankHistoryItem
                  key={`${log.changed_at}-${log.from_level}-${log.to_level}`}
                  fromLevel={log.from_level}
                  toLevel={log.to_level}
                  changedAt={log.changed_at}
                />
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500 text-sm">
              まだランク変更の履歴はありません。習慣やToDoをこなしてレベルアップしよう！
            </p>
          )}
        </section>

        {/* 各種設定・データ削除 */}
        <MypageSettingsSection />
      </div>
    </div>
  )
}
