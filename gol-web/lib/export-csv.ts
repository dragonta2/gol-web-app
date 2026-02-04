/**
 * オブジェクト配列をCSV文字列に変換（BOM付きUTF-8でExcel対応）
 */
export function arrayToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T)[]
): string {
  if (rows.length === 0) {
    return ""
  }
  const keys = columns ?? (Object.keys(rows[0]) as (keyof T)[])
  const escape = (v: unknown): string => {
    if (v == null) return ""
    const s = String(v)
    if (
      s.includes(",") ||
      s.includes('"') ||
      s.includes("\n") ||
      s.includes("\r")
    ) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = keys.map((k) => escape(k)).join(",")
  const body = rows
    .map((row) => keys.map((k) => escape(row[k])).join(","))
    .join("\r\n")
  return "\uFEFF" + header + "\r\n" + body
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
