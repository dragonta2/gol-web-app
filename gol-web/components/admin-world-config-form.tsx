"use client"

import { Button } from "@/components/ui/button"
import type { StoryWorldConfig } from "@/lib/ai/story-worlds"

export function AdminWorldConfigForm({
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
