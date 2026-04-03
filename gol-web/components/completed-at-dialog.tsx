'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function toLocalDatetimeString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

interface CompletedAtDialogProps {
  open: boolean
  onConfirm: (completedAt: string) => void
  onCancel: () => void
}

export function CompletedAtDialog({ open, onConfirm, onCancel }: CompletedAtDialogProps) {
  const [selectedDateTime, setSelectedDateTime] = useState('')

  useEffect(() => {
    if (open) setSelectedDateTime(toLocalDatetimeString(new Date()))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-sm bg-zinc-800 border-zinc-600">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">完了日時を設定</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <input
            type="datetime-local"
            value={selectedDateTime}
            onChange={(e) => setSelectedDateTime(e.target.value)}
            max={toLocalDatetimeString(new Date())}
            className="w-full bg-zinc-700 border border-zinc-500 text-zinc-100 rounded px-3 py-2 text-sm"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" onClick={onCancel} className="bg-transparent border border-zinc-500 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100">
            キャンセル
          </Button>
          <Button size="sm" onClick={() => onConfirm(new Date().toISOString())} className="bg-zinc-600 border border-zinc-400 text-zinc-100 hover:bg-zinc-500">
            今すぐ完了
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(new Date(selectedDateTime).toISOString())}
            disabled={!selectedDateTime}
            className="bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40"
          >
            指定日時で完了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
