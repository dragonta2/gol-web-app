"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronUp, Megaphone, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { StoryWorldConfig, StoryWorldId } from "@/lib/ai/story-worlds"
import type { AiOutputLimits } from "@/lib/ai/ai-output-limits"
import { DEFAULT_AI_OUTPUT_LIMITS } from "@/lib/ai/ai-output-limits"
import { isSubmitShortcut } from "@/lib/utils"
import { AdminWorldConfigForm } from "@/components/admin-world-config-form"
import { LevelThresholdsEditor } from "@/components/level-thresholds-editor"

const AI_LIMITS_KEYS = [
  { key: "reasoning" as const, label: "総評" },
  { key: "story_past" as const, label: "あらすじ（統合）" },
  { key: "advice" as const, label: "弛緩コーチング" },
  { key: "advice_tension" as const, label: "緊張コーチング" },
] as const

export default function AdminSettingsClient() {
  const [dqConfig, setDqConfig] = useState<StoryWorldConfig | null>(null)
  const [ghostConfig, setGhostConfig] = useState<StoryWorldConfig | null>(null)
  const [worldConfigLoading, setWorldConfigLoading] = useState(true)
  const [worldConfigLoadError, setWorldConfigLoadError] = useState<string | null>(null)
  const [worldConfigSaving, setWorldConfigSaving] = useState(false)
  const [ghostExpanded, setGhostExpanded] = useState(false)
  const [dqExpanded, setDqExpanded] = useState(false)

  const [aiLimits, setAiLimits] = useState<AiOutputLimits>(DEFAULT_AI_OUTPUT_LIMITS)
  const [aiLimitsLoading, setAiLimitsLoading] = useState(true)
  const [aiLimitsSaving, setAiLimitsSaving] = useState(false)
  const [aiLimitsLoadError, setAiLimitsLoadError] = useState<string | null>(null)

  const loadWorldConfigs = useCallback(async () => {
    setWorldConfigLoadError(null)
    setWorldConfigLoading(true)
    try {
      const res = await fetch("/api/settings/story-worlds")
      if (res.ok) {
        const sw = await res.json()
        setDqConfig(sw.dq ?? null)
        setGhostConfig(sw.ghost ?? null)
      } else {
        setWorldConfigLoadError("設定の取得に失敗しました")
      }
    } catch {
      setWorldConfigLoadError("設定の取得に失敗しました")
    } finally {
      setWorldConfigLoading(false)
    }
  }, [])

  const loadAiOutputLimits = useCallback(async () => {
    setAiLimitsLoadError(null)
    setAiLimitsLoading(true)
    try {
      const res = await fetch("/api/settings/ai-output-limits")
      if (res.ok) {
        const data = await res.json()
        if (data.limits) setAiLimits(data.limits)
      } else {
        setAiLimitsLoadError("文字数制限の取得に失敗しました")
      }
    } catch {
      setAiLimitsLoadError("文字数制限の取得に失敗しました")
    } finally {
      setAiLimitsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorldConfigs()
  }, [loadWorldConfigs])

  useEffect(() => {
    loadAiOutputLimits()
  }, [loadAiOutputLimits])

  const handleSaveWorldConfig = async (
    worldId: StoryWorldId,
    config: StoryWorldConfig,
  ) => {
    setWorldConfigSaving(true)
    try {
      const payload = {
        worldId,
        config: {
          displayName: config.displayName,
          protagonistName: config.protagonistName,
          worldTone: config.worldTone,
          adviceStyle: config.adviceStyle,
          metaphorSource: config.metaphorSource,
          storySystemMessage: config.storySystemMessage,
          adviceToneInstruction: config.adviceToneInstruction,
        },
      }
      const res = await fetch("/api/settings/story-worlds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "保存に失敗しました")
      }
      toast.success(`${config.displayName}の設定を保存しました`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setWorldConfigSaving(false)
    }
  }

  const handleSaveAiOutputLimits = async (e: React.FormEvent) => {
    e.preventDefault()
    setAiLimitsSaving(true)
    try {
      const res = await fetch("/api/settings/ai-output-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiLimits),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error ?? "保存に失敗しました"
        const detail = typeof data.details === "string" ? data.details : undefined
        toast.error(msg, { description: detail })
        return
      }
      toast.success("文字数制限を保存しました")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setAiLimitsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/settings/account"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>アカウント・AI設定に戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          管理者用の設定
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          世界観の詳細・文字数制限・レベルアップ必要EXP。管理者アカウントのみ編集可能です。
        </p>

        {/* お知らせ（管理者用） */}
        <section className="mb-6">
          <Link
            href="/announcements"
            className="block bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-zinc-100">お知らせ</h2>
                <p className="text-sm text-zinc-400">日付・件名でお知らせを表示・追加</p>
              </div>
            </div>
          </Link>
        </section>

        {/* 世界観の詳細設定 */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-cyan-400 mb-2">
            世界観の詳細設定
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            全ユーザーに適用されます。
          </p>
          {worldConfigLoading && (
            <p className="text-sm text-zinc-500 py-4">読み込み中...</p>
          )}
          {worldConfigLoadError && !worldConfigLoading && (
            <div className="py-4">
              <p className="text-sm text-amber-400 mb-2">{worldConfigLoadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadWorldConfigs()}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                再読み込み
              </Button>
            </div>
          )}
          {!worldConfigLoading && !worldConfigLoadError && ghostConfig && dqConfig && (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setGhostExpanded(!ghostExpanded)}
                  className="flex items-center justify-between w-full py-2 text-left text-zinc-200 hover:text-zinc-100"
                >
                  <span>{ghostConfig.displayName} の設定</span>
                  {ghostExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
                {ghostExpanded && (
                  <AdminWorldConfigForm
                    config={ghostConfig}
                    onConfigChange={setGhostConfig}
                    onSave={() => handleSaveWorldConfig("ghost", ghostConfig)}
                    saving={worldConfigSaving}
                  />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setDqExpanded(!dqExpanded)}
                  className="flex items-center justify-between w-full py-2 text-left text-zinc-200 hover:text-zinc-100"
                >
                  <span>{dqConfig.displayName} の設定</span>
                  {dqExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
                {dqExpanded && (
                  <AdminWorldConfigForm
                    config={dqConfig}
                    onConfigChange={setDqConfig}
                    onSave={() => handleSaveWorldConfig("dq", dqConfig)}
                    saving={worldConfigSaving}
                  />
                )}
              </div>
            </>
          )}
        </section>

        {/* 文字数制限 */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-cyan-400 mb-2">
            文字数制限
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            AI生成テキストの最低・最大文字数。総評・あらすじ・弛緩/緊張コーチングに適用。世界観共通です。（story_future は互換列のため管理画面からは省略）
          </p>
          {aiLimitsLoading && <p className="text-sm text-zinc-500 py-2">読み込み中...</p>}
          {aiLimitsLoadError && !aiLimitsLoading && (
            <p className="text-sm text-amber-400 mb-2">{aiLimitsLoadError}</p>
          )}
          {!aiLimitsLoading && (
            <form
              onSubmit={handleSaveAiOutputLimits}
              onKeyDown={(e) => {
                if (!isSubmitShortcut(e)) return
                e.preventDefault()
                handleSaveAiOutputLimits(e as unknown as React.FormEvent)
              }}
              className="space-y-4 pl-2 border-l-2 border-zinc-700 py-2"
            >
              {AI_LIMITS_KEYS.map(({ key, label }) => (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-zinc-300 w-48 shrink-0">{label}</span>
                  <label className="flex items-center gap-1.5 text-sm text-zinc-400">
                    最小
                    <input
                      type="number"
                      min={0}
                      value={aiLimits[`${key}_min`]}
                      onChange={(e) =>
                        setAiLimits((prev) => ({
                          ...prev,
                          [`${key}_min`]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-zinc-400">
                    最大
                    <input
                      type="number"
                      min={0}
                      value={aiLimits[`${key}_max`]}
                      onChange={(e) =>
                        setAiLimits((prev) => ({
                          ...prev,
                          [`${key}_max`]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm"
                    />
                  文字
                  </label>
                </div>
              ))}
              <Button
                type="submit"
                disabled={aiLimitsSaving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {aiLimitsSaving ? "保存中..." : "文字数制限を保存"}
              </Button>
            </form>
          )}
        </section>

        {/* レベルアップ必要EXP（このアカウントにのみ反映） */}
        <LevelThresholdsEditor forceShowForAdmin />
      </div>
    </div>
  )
}
