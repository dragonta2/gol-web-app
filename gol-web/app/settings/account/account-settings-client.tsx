"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  User,
  Mail,
  Key,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import type { StoryWorldConfig, StoryWorldId } from "@/lib/ai/story-worlds"
import type { AiOutputLimits } from "@/lib/ai/ai-output-limits"
import { DEFAULT_AI_OUTPUT_LIMITS } from "@/lib/ai/ai-output-limits"
import {
  type PersonalityTypeId,
  PERSONALITY_TYPES,
  DEFAULT_PERSONALITY_TYPE_ID,
  DEFAULT_STRICT_COACH_ENABLED,
  isValidPersonalityTypeId,
  STORAGE_AI_PERSONALITY_TYPE,
  STORAGE_AI_STRICT_COACH_ENABLED,
} from "@/lib/ai/personality-types"
import {
  STORAGE_STORY_WORLD,
  notifyStoryWorldChanged,
} from "@/lib/story-world-storage"

function AdminWorldConfigForm({
  config,
  onConfigChange,
  onSave,
  saving,
}: {
  config: StoryWorldConfig
  onConfigChange: (c: StoryWorldConfig) => void
  onSave: () => void
  saving: boolean
}) {
  const update = (key: keyof StoryWorldConfig, value: string) => {
    onConfigChange({ ...config, [key]: value })
  }
  return (
    <div className="space-y-4 pl-2 border-l-2 border-zinc-700 py-2">
      <div>
        <label className="block text-sm text-zinc-400 mb-1">表示名</label>
        <input
          type="text"
          value={config.displayName}
          onChange={(e) => update("displayName", e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          主人公のデフォルト名
        </label>
        <input
          type="text"
          value={config.protagonistName}
          onChange={(e) => update("protagonistName", e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          世界観の雰囲気
        </label>
        <textarea
          value={config.worldTone}
          onChange={(e) => update("worldTone", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm resize-y"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          アドバイスのスタイル
        </label>
        <textarea
          value={config.adviceStyle}
          onChange={(e) => update("adviceStyle", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm resize-y"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">比喩の出典</label>
        <input
          type="text"
          value={config.metaphorSource}
          onChange={(e) => update("metaphorSource", e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          あらすじ生成のシステムメッセージ
        </label>
        <textarea
          value={config.storySystemMessage}
          onChange={(e) => update("storySystemMessage", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm resize-y"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          アドバイス生成の口調指示
        </label>
        <textarea
          value={config.adviceToneInstruction}
          onChange={(e) => update("adviceToneInstruction", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm resize-y"
        />
      </div>
      <Button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
      >
        {saving ? "保存中..." : "この世界観の設定を保存"}
      </Button>
    </div>
  )
}

export interface AccountSettingsInitialData {
  username: string
  email: string
  useUsernameAsDisplayName: boolean
  isAdmin: boolean
}

export default function AccountSettingsClient({
  initialData,
}: {
  initialData: AccountSettingsInitialData
}) {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(initialData.isAdmin)

  const [username, setUsername] = useState(initialData.username)
  const [useUsernameAsDisplayName, setUseUsernameAsDisplayName] = useState(
    initialData.useUsernameAsDisplayName,
  )
  const [usernameSaving, setUsernameSaving] = useState(false)

  const [currentEmail, setCurrentEmail] = useState<string>(initialData.email)
  const [newEmail, setNewEmail] = useState("")
  const [emailSaving, setEmailSaving] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [aiPersonalityType, setAiPersonalityType] =
    useState<PersonalityTypeId>(DEFAULT_PERSONALITY_TYPE_ID)
  const [strictCoachEnabled, setStrictCoachEnabled] = useState(
    DEFAULT_STRICT_COACH_ENABLED,
  )
  const [aiStorySaving, setAiStorySaving] = useState(false)

  const [storyWorldId, setStoryWorldId] = useState<StoryWorldId>("ghost")
  const [dqConfig, setDqConfig] = useState<StoryWorldConfig | null>(null)
  const [ghostConfig, setGhostConfig] = useState<StoryWorldConfig | null>(null)
  const [worldConfigSaving, setWorldConfigSaving] = useState(false)
  const [worldConfigLoading, setWorldConfigLoading] = useState(false)
  const [worldConfigLoadError, setWorldConfigLoadError] = useState<string | null>(null)
  const [dqExpanded, setDqExpanded] = useState(false)
  const [ghostExpanded, setGhostExpanded] = useState(false)

  const [aiLimits, setAiLimits] = useState<AiOutputLimits>(DEFAULT_AI_OUTPUT_LIMITS)
  const [aiLimitsLoading, setAiLimitsLoading] = useState(false)
  const [aiLimitsSaving, setAiLimitsSaving] = useState(false)
  const [aiLimitsLoadError, setAiLimitsLoadError] = useState<string | null>(null)

  const loadWorldConfigs = useCallback(async () => {
    if (!isAdmin) return
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
  }, [isAdmin])

  useEffect(() => {
    loadWorldConfigs()
  }, [loadWorldConfigs])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storedType = localStorage.getItem(STORAGE_AI_PERSONALITY_TYPE)
    if (isValidPersonalityTypeId(storedType)) setAiPersonalityType(storedType)
    else if (storedType === "strict")
      setAiPersonalityType(DEFAULT_PERSONALITY_TYPE_ID)
    const storedStrict = localStorage.getItem(STORAGE_AI_STRICT_COACH_ENABLED)
    setStrictCoachEnabled(storedStrict !== "false")
    const stored = localStorage.getItem(STORAGE_STORY_WORLD)
    if (stored === "dq" || stored === "ghost") setStoryWorldId(stored)
  }, [])

  useEffect(() => {
    loadWorldConfigs()
  }, [loadWorldConfigs])

  const loadAiOutputLimits = useCallback(async () => {
    if (!isAdmin) return
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
  }, [isAdmin])

  useEffect(() => {
    loadAiOutputLimits()
  }, [loadAiOutputLimits])

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

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newEmail.trim()
    if (!trimmed) {
      toast.error("新しいメールアドレスを入力してください")
      return
    }
    if (trimmed === currentEmail) {
      toast.error("現在のメールアドレスと同じです")
      return
    }
    setEmailSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed })
      if (error) throw error
      toast.success(
        "確認リンクを新しいメールアドレスに送りました。そのリンクを開いて変更を完了してください。",
      )
      setNewEmail("")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "メールアドレスの変更に失敗しました",
      )
    } finally {
      setEmailSaving(false)
    }
  }

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          use_username_as_display_name: useUsernameAsDisplayName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.detail
          ? `${data.error}\n${data.detail}`
          : data.error ?? "保存に失敗しました"
        throw new Error(msg)
      }
      toast.success("ニックネームを保存しました")
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました"
      toast.error("プロフィールの更新に失敗しました", {
        description: message,
      })
    } finally {
      setUsernameSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("新しいパスワードが一致しません")
      return
    }
    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください")
      return
    }
    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      toast.success("パスワードを変更しました")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "パスワードの変更に失敗しました",
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSaveAiStory = (e: React.FormEvent) => {
    e.preventDefault()
    setAiStorySaving(true)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_AI_PERSONALITY_TYPE, aiPersonalityType)
        localStorage.setItem(
          STORAGE_AI_STRICT_COACH_ENABLED,
          String(strictCoachEnabled),
        )
        localStorage.setItem(STORAGE_STORY_WORLD, storyWorldId)
        notifyStoryWorldChanged()
      }
      toast.success("AIの性格・物語の世界観を保存しました")
    } catch {
      toast.error("保存に失敗しました")
    } finally {
      setAiStorySaving(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>マイページに戻る</span>
        </Link>
        <h1 className="text-2xl font-bold text-cyan-400 mb-6">
          アカウント・AI設定
        </h1>

        <section
          id="nickname"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              ニックネーム
            </h2>
          </div>
          <form onSubmit={handleSaveUsername} className="space-y-3">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-300"
            >
              表示名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ニックネームを入力"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={useUsernameAsDisplayName}
                onChange={(e) =>
                  setUseUsernameAsDisplayName(e.target.checked)
                }
                className="w-4 h-4 text-cyan-600 bg-zinc-800 border-zinc-600 rounded focus:ring-cyan-500"
              />
              <span className="text-sm text-zinc-300">
                この名前をGOL世界の表示名として利用する
              </span>
            </label>
            <p className="text-xs text-zinc-500">
              オフのときは、各世界観のデフォルト名（篤、もょもと）がアドバイスやあらすじに使われます。
            </p>
            <Button
              type="submit"
              disabled={usernameSaving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {usernameSaving ? "保存中..." : "保存"}
            </Button>
          </form>
        </section>

        <section
          id="email"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              メールアドレス（ログイン用）
            </h2>
          </div>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <label
              htmlFor="current-email"
              className="block text-sm font-medium text-zinc-300"
            >
              現在のメールアドレス
            </label>
            <input
              id="current-email"
              type="email"
              value={currentEmail}
              readOnly
              className="w-full px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
            />
            <label
              htmlFor="new-email"
              className="block text-sm font-medium text-zinc-300"
            >
              新しいメールアドレス
            </label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="新しいメールアドレスを入力"
              autoComplete="email"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-sm text-zinc-500">
              変更すると、新しいメールアドレスに確認メールが送られます。メールが届いただけでは変更されません。届いたメール内のリンクを開くと変更が完了します。
            </p>
            <Button
              type="submit"
              disabled={
                emailSaving ||
                !newEmail.trim() ||
                newEmail.trim() === currentEmail
              }
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {emailSaving ? "送信中..." : "確認メールを送信"}
            </Button>
          </form>
        </section>

        <section
          id="password"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-100">
              パスワード変更
            </h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-zinc-300"
            >
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6文字以上"
              autoComplete="new-password"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-zinc-300"
            >
              新しいパスワード（確認）
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Button
              type="submit"
              disabled={passwordSaving || !newPassword || !confirmPassword}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {passwordSaving ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>
        </section>

        <section
          id="ai-personality"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 scroll-mt-4"
        >
          <form onSubmit={handleSaveAiStory} className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-zinc-100">
                  AIの性格
                </h2>
              </div>
              <p className="text-sm text-zinc-400 mb-3">
                アドバイスの方針を選びます。世界観を主とし、性格でトーンを調整します。
              </p>
              <div className="flex flex-col gap-2 mb-6">
                {PERSONALITY_TYPES.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    <input
                      type="radio"
                      name="aiPersonalityType"
                      value={p.id}
                      checked={aiPersonalityType === p.id}
                      onChange={() => setAiPersonalityType(p.id)}
                      className="w-4 h-4 text-cyan-500"
                    />
                    <span className="text-zinc-100">{p.label}</span>
                  </label>
                ))}
              </div>

              <div id="strict-coach" className="pt-4 border-t border-zinc-700">
                <h3 className="text-base font-semibold text-zinc-100 mb-2">
                  辛口コーチ
                </h3>
                <p className="text-sm text-zinc-400 mb-3">
                  AIアドバイスに辛口コーチのコメントを出すかどうか。
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Switch
                    checked={strictCoachEnabled}
                    onCheckedChange={setStrictCoachEnabled}
                  />
                  <span className="text-zinc-100 text-sm">
                    {strictCoachEnabled
                      ? "コメントを出す"
                      : "コメントを出さない"}
                  </span>
                </div>
              </div>
            </div>

            <div id="story-world">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-zinc-100">
                  物語の世界観
                </h2>
              </div>
              <p className="text-sm text-zinc-400 mb-3">
                日誌のAIが生成する物語の世界観を選びます。
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors">
                  <input
                    type="radio"
                    name="storyWorld"
                    value="ghost"
                    checked={storyWorldId === "ghost"}
                    onChange={() => setStoryWorldId("ghost")}
                    className="w-4 h-4 text-cyan-500"
                  />
                  <span className="text-zinc-100">
                    ゴースト・オブ・ヨウテイ風
                  </span>
                  <span className="text-sm text-zinc-500">
                    北の大地の和風・武芸者物語
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors">
                  <input
                    type="radio"
                    name="storyWorld"
                    value="dq"
                    checked={storyWorldId === "dq"}
                    onChange={() => setStoryWorldId("dq")}
                    className="w-4 h-4 text-cyan-500"
                  />
                  <span className="text-zinc-100">ドラゴンクエスト風</span>
                  <span className="text-sm text-zinc-500">
                    勇者と魔王のファンタジーRPG
                  </span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={aiStorySaving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {aiStorySaving ? "保存中..." : "AIの性格・物語の世界観を保存"}
            </Button>
          </form>

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-zinc-700">
              <h3 className="text-base font-semibold text-cyan-400 mb-2">
                管理者用：世界観の詳細設定
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                テスト・管理者アカウントのみ編集可能。全ユーザーに適用されます。
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
              {!worldConfigLoading && !worldConfigLoadError && dqConfig && ghostConfig && (
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
                        <ChevronDown className="w-4 h-4" />
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
                        <ChevronDown className="w-4 h-4" />
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

                  {/* 文字数制限（世界観共通・dq/ghost どちらも同じ値を参照） */}
                  <div className="mt-6 pt-6 border-t border-zinc-700">
                    <h3 className="text-base font-semibold text-cyan-400 mb-2">
                      文字数制限
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      AI生成テキストの最低・最大文字数。総評・あらすじ・アドバイスに適用。世界観（dq/ghost）共通です。
                    </p>
                    {aiLimitsLoading && <p className="text-sm text-zinc-500 py-2">読み込み中...</p>}
                    {aiLimitsLoadError && !aiLimitsLoading && (
                      <p className="text-sm text-amber-400 mb-2">{aiLimitsLoadError}</p>
                    )}
                    {!aiLimitsLoading && (
                      <form onSubmit={handleSaveAiOutputLimits} className="space-y-4 pl-2 border-l-2 border-zinc-700 py-2">
                        {[
                          { key: "reasoning" as const, label: "総評" },
                          { key: "story_past" as const, label: "これまでの冒険" },
                          { key: "story_future" as const, label: "これからの冒険" },
                          { key: "advice" as const, label: "辛口コーチング アドバイス" },
                        ].map(({ key, label }) => (
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
                              文字
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
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
