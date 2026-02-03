"use client"

import { useState, useEffect } from "react"
import type { RankMode } from "@/lib/rank-utils"
import {
  STORAGE_STORY_WORLD,
  STORY_WORLD_CHANGED_EVENT,
} from "@/lib/story-world-storage"

function getModeFromStorage(): RankMode {
  if (typeof window === "undefined") return "ghost"
  const stored = localStorage.getItem(STORAGE_STORY_WORLD)
  return stored === "dq" || stored === "ghost" ? stored : "ghost"
}

const AVATAR_EXTS = ["png", "jpg", "svg"] as const

/**
 * アバター画像のパス（avatar.md 準拠）
 * 配置: public/avatars/{mode}/{variant}/{name}.{jpg|png|svg}
 * - ghost/icon/yo1-i, ghost/full/yo1
 * - dq/icon/dq1-i, dq/full/dq1
 */
function getAvatarSrc(
  mode: RankMode,
  level: number,
  variant: "icon" | "full",
  extIndex: number = 0
): string {
  const lv = Math.min(10, Math.max(1, level))
  const ext = AVATAR_EXTS[Math.min(extIndex, AVATAR_EXTS.length - 1)]
  const variantDir = variant === "icon" ? "icon" : "full"
  const prefix = mode === "ghost" ? "yo" : "dq"
  const name = variant === "icon" ? `${prefix}${lv}-i` : `${prefix}${lv}`
  return `/avatars/${mode}/${variantDir}/${name}.${ext}`
}

interface RankAvatarProps {
  level: number
  /** icon=ヘッダー用アイコン, full=マイページ用全身 */
  variant?: "icon" | "full"
  size?: number
  className?: string
}

/**
 * ランクに応じたアバター画像を表示（モード別: ghost / dq）
 * variant: icon=ヘッダー用, full=マイページ用全身
 */
export function RankAvatar({
  level,
  variant = "icon",
  size = 48,
  className = "",
}: RankAvatarProps) {
  const [mode, setMode] = useState<RankMode>("ghost")
  const [extIndex, setExtIndex] = useState(0)
  const [src, setSrc] = useState<string>(() =>
    getAvatarSrc("ghost", level, variant, 0)
  )

  useEffect(() => {
    const m = getModeFromStorage()
    setMode(m)
    setExtIndex(0)
    setSrc(getAvatarSrc(m, level, variant, 0))
  }, [level, variant])

  useEffect(() => {
    const handler = () => {
      const m = getModeFromStorage()
      setMode(m)
      setExtIndex(0)
      setSrc(getAvatarSrc(m, level, variant, 0))
    }
    window.addEventListener("storage", handler)
    window.addEventListener(STORY_WORLD_CHANGED_EVENT, handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener(STORY_WORLD_CHANGED_EVENT, handler)
    }
  }, [level, variant])

  const handleError = () => {
    if (extIndex < AVATAR_EXTS.length - 1) {
      const next = extIndex + 1
      setExtIndex(next)
      setSrc(getAvatarSrc(mode, level, variant, next))
    }
  }

  const isFull = variant === "full"
  return (
    <img
      src={src}
      alt={`ランク Lv.${level}`}
      width={size}
      height={isFull ? Math.round(size * 1.5) : size}
      className={`${
        isFull
          ? "rounded-lg object-contain"
          : "rounded-full object-cover overflow-hidden"
      } ${className}`}
      onError={handleError}
    />
  )
}
