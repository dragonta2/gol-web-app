"use client"

import { useEffect, useRef, useCallback, useState } from "react"

const CONFETTI_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
]

function playLevelUpSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = "sine"
      gain.gain.setValueAtTime(0.15, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    playTone(523.25, 0, 0.15)
    playTone(659.25, 0.15, 0.15)
    playTone(783.99, 0.3, 0.2)
  } catch {
    // ignore
  }
}

export function LevelUpCelebration({
  show,
  newLevel,
  onEnd,
}: {
  show: boolean
  newLevel?: number
  onEnd?: () => void
}) {
  const hasPlayed = useRef(false)
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runConfetti = useCallback(() => {
    const container = document.getElementById("level-up-confetti-container")
    if (!container) return
    container.innerHTML = ""
    const particleCount = 55
    for (let i = 0; i < particleCount; i++) {
      const el = document.createElement("div")
      el.setAttribute("aria-hidden", "true")
      el.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        opacity: 0;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        transform: rotate(0deg);
        animation: level-up-confetti-fall ${2 + Math.random() * 1.5}s ease-out ${Math.random() * 0.5}s forwards;
        pointer-events: none;
      `
      container.appendChild(el)
    }
  }, [])

  useEffect(() => {
    if (!show) {
      hasPlayed.current = false
      return
    }
    if (hasPlayed.current) return
    hasPlayed.current = true
    playLevelUpSound()
    runConfetti()
    endTimer.current = setTimeout(() => {
      onEnd?.()
    }, 4200)
    return () => {
      if (endTimer.current) clearTimeout(endTimer.current)
    }
  }, [show, runConfetti, onEnd])

  if (!show) return null

  return (
    <>
      <div
        id="level-up-confetti-container"
        className="fixed inset-0 z-[100] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        role="alert"
        aria-live="polite"
      >
        <div className="text-center animate-in zoom-in-95 duration-500">
          <p className="text-5xl sm:text-6xl md:text-7xl font-bold text-cyan-400 drop-shadow-lg tracking-wider">
            レベルアップ
          </p>
          {newLevel != null && (
            <p className="mt-3 text-2xl sm:text-3xl text-zinc-300">
              Lv.{newLevel}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

/** サーバーから渡す levelChanged を受け取り、一度だけ演出を表示するラッパー */
export function LevelUpCelebrationTrigger({
  levelChanged,
  newLevel,
}: {
  levelChanged: boolean
  newLevel?: number
}) {
  const [show, setShow] = useState(levelChanged)
  useEffect(() => {
    if (levelChanged && !show) setShow(true)
  }, [levelChanged, show])
  return (
    <LevelUpCelebration
      show={show}
      newLevel={newLevel}
      onEnd={() => setShow(false)}
    />
  )
}
