"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Trash2,
  AlertTriangle,
  User,
  Mail,
  Key,
  Bot,
  BookOpen,
  ListChecks,
  ClipboardList,
  Settings as SettingsIcon,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { arrayToCsv, downloadCsv } from "@/lib/export-csv"

export function MypageSettingsSection() {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{
    inserted: Record<string, number>
    error?: string
  } | null>(null)
  const [showAdminCard, setShowAdminCard] = useState(false)

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.is_admin === true) setShowAdminCard(true)
      })
      .catch(() => {})
  }, [])

  const handleExportJson = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/user/export")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "エクスポートに失敗しました")
      }
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gol_export_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "エクスポートに失敗しました")
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/user/export")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "エクスポートに失敗しました")
      }
      const data = await res.json()
      const dateStr = new Date().toISOString().slice(0, 10)

      if (data.dailyLogs?.length) {
        downloadCsv(
          `gol_export_daily_logs_${dateStr}.csv`,
          arrayToCsv(data.dailyLogs)
        )
      }
      setTimeout(() => {
        if (data.habits?.length) {
          downloadCsv(
            `gol_export_habits_${dateStr}.csv`,
            arrayToCsv(data.habits)
          )
        }
      }, 300)
      setTimeout(() => {
        if (data.todos?.length) {
          downloadCsv(`gol_export_todos_${dateStr}.csv`, arrayToCsv(data.todos))
        }
      }, 600)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "エクスポートに失敗しました")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportJson = async () => {
    if (!importFile) {
      alert("JSONファイルを選択してください")
      return
    }
    setIsImporting(true)
    setImportResult(null)
    try {
      const text = await importFile.text()
      const data = JSON.parse(text) as unknown
      const res = await fetch("/api/user/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setImportResult({
          inserted: {},
          error: result.error ?? result.details ?? "インポートに失敗しました",
        })
        return
      }
      setImportResult({ inserted: result.inserted ?? {} })
      setImportFile(null)
      const input = document.getElementById("import-json-input") as HTMLInputElement
      if (input) input.value = ""
    } catch (e) {
      console.error(e)
      const msg =
        e instanceof Error ? e.message : "ファイルの読み込みに失敗しました"
      setImportResult({ inserted: {}, error: msg })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteData = async () => {
    if (confirmText !== "削除") {
      alert("「削除」と入力してください")
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch("/api/user/delete-data", {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "データの削除に失敗しました")
      }

      alert("データの削除が完了しました。ログアウトします。")

      router.push("/login")
    } catch (error) {
      console.error("データ削除エラー:", error)
      alert(
        error instanceof Error ? error.message : "データの削除に失敗しました"
      )
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
      setConfirmText("")
    }
  }

  return (
    <>
      {/* 各種設定 */}
      <section className="mt-8 mb-8">
        <h2 className="text-base font-semibold text-zinc-300 mb-3">各種設定</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link href="/settings/account#nickname">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  ニックネーム
                </h3>
              </div>
              <p className="text-sm text-zinc-400">表示名の変更</p>
            </div>
          </Link>
          <Link href="/settings/account#email">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  メールアドレス
                </h3>
              </div>
              <p className="text-sm text-zinc-400">ログイン用メールの変更</p>
            </div>
          </Link>
          <Link href="/settings/account#password">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  パスワード変更
                </h3>
              </div>
              <p className="text-sm text-zinc-400">ログインパスワードの変更</p>
            </div>
          </Link>
          <Link href="/settings/account#ai-personality">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  AIの性格
                </h3>
              </div>
              <p className="text-sm text-zinc-400">AIの話し方・性格の設定</p>
            </div>
          </Link>
          <Link href="/settings/account#story-world">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  物語の世界観
                </h3>
              </div>
              <p className="text-sm text-zinc-400">物語の世界観・設定</p>
            </div>
          </Link>
          {showAdminCard && (
            <Link href="/settings/admin">
              <div className="bg-zinc-900 border border-cyan-600 rounded-lg p-5 hover:border-cyan-500 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <SettingsIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-zinc-100">
                    管理者用の設定
                  </h3>
                </div>
                <p className="text-sm text-zinc-400">世界観・文字数制限・レベル閾値</p>
              </div>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/announcements">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Megaphone className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  お知らせ
                </h3>
              </div>
              <p className="text-sm text-zinc-400">
                日付・件名でお知らせを表示・追加
              </p>
            </div>
          </Link>
          <Link href="/settings/habits">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <ListChecks className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  習慣管理
                </h3>
              </div>
              <p className="text-sm text-zinc-400">
                良習慣・悪習慣・ボーナス習慣の追加・編集・削除
              </p>
            </div>
          </Link>
          <Link href="/settings/todos">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  ToDo管理
                </h3>
              </div>
              <p className="text-sm text-zinc-400">
                ToDoタスクの追加・編集・削除・SP設定
              </p>
            </div>
          </Link>
          <Link href="/settings/rights">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-cyan-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <SettingsIcon className="w-6 h-6 text-cyan-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                  権利設定
                </h3>
              </div>
              <p className="text-sm text-zinc-400">権利のゴルド消費量の設定</p>
            </div>
          </Link>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-6 h-6 text-cyan-400" />
              <h3 className="text-base font-semibold text-zinc-100">
                データのエクスポート
              </h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              プロフィール・日誌・習慣・ToDoをJSON/CSVでダウンロード
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleExportJson}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
              >
                <FileJson className="w-3.5 h-3.5 mr-1.5" />
                JSON
              </Button>
              <Button
                onClick={handleExportCsv}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                CSV
              </Button>
            </div>
            {isExporting && (
              <p className="text-xs text-zinc-500 mt-2">準備中...</p>
            )}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-6 h-6 text-cyan-400" />
              <h3 className="text-base font-semibold text-zinc-100">
                データのインポート
              </h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              エクスポートしたJSONを取り込みます。同じ日付の日誌はスキップされます。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="import-json-input"
                type="file"
                accept=".json,application/json"
                className="text-sm text-zinc-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-700 file:text-zinc-200 file:text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setImportFile(f ?? null)
                  setImportResult(null)
                }}
              />
              <Button
                onClick={handleImportJson}
                disabled={isImporting || !importFile}
                variant="outline"
                size="sm"
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {isImporting ? "取り込み中..." : "インポート実行"}
              </Button>
            </div>
            {importResult && (
              <div className="mt-4 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
                {importResult.error ? (
                  <p className="text-red-400">{importResult.error}</p>
                ) : (
                  <div className="text-zinc-300">
                    <p className="font-medium text-cyan-400 mb-2">取り込み完了</p>
                    <ul className="space-y-1">
                      {importResult.inserted.habits != null && (
                        <li>習慣: {importResult.inserted.habits} 件</li>
                      )}
                      {importResult.inserted.todos != null && (
                        <li>ToDo: {importResult.inserted.todos} 件</li>
                      )}
                      {importResult.inserted.dailyLogs != null && (
                        <li>日誌: {importResult.inserted.dailyLogs} 件</li>
                      )}
                      {importResult.inserted.skippedDailyLogs != null &&
                        importResult.inserted.skippedDailyLogs > 0 && (
                          <li className="text-zinc-500">
                            日誌（同日のためスキップ）:{" "}
                            {importResult.inserted.skippedDailyLogs} 件
                          </li>
                        )}
                      {importResult.inserted.habitLogs != null &&
                        importResult.inserted.habitLogs > 0 && (
                          <li>習慣記録: {importResult.inserted.habitLogs} 件</li>
                        )}
                      {importResult.inserted.todoLogs != null &&
                        importResult.inserted.todoLogs > 0 && (
                          <li>ToDo記録: {importResult.inserted.todoLogs} 件</li>
                        )}
                      {importResult.inserted.todoSubtasks != null &&
                        importResult.inserted.todoSubtasks > 0 && (
                          <li>サブタスク: {importResult.inserted.todoSubtasks} 件</li>
                        )}
                      {importResult.inserted.rankChangeLogs != null &&
                        importResult.inserted.rankChangeLogs > 0 && (
                          <li>ランク変更履歴: {importResult.inserted.rankChangeLogs} 件</li>
                        )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* データ削除セクション */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Trash2 className="w-6 h-6 text-red-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-red-400 mb-2">
              データの削除
            </h2>
            <p className="text-zinc-400 mb-4">
              アカウントに関連するすべてのデータを削除します。この操作は取り消せません。
            </p>

            {!showConfirm ? (
              <Button
                onClick={() => setShowConfirm(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                データを削除する
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-950 border border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-semibold mb-2">
                        警告: この操作は取り消せません
                      </p>
                      <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                        <li>日誌データ（daily_logs）</li>
                        <li>習慣データ（habits, habit_logs）</li>
                        <li>ToDoデータ（todos, todo_logs）</li>
                        <li>AI使用量ログ（ai_usage_logs）</li>
                        <li>ユーザープロファイル（profiles）</li>
                      </ul>
                      <p className="text-sm text-red-200 mt-3">
                        上記のすべてのデータが永久に削除されます。
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    確認のため、「
                    <span className="text-red-400 font-bold">削除</span>
                    」と入力してください
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="削除"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleDeleteData}
                    disabled={isDeleting || confirmText !== "削除"}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "削除中..." : "削除を実行"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConfirm(false)
                      setConfirmText("")
                    }}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
