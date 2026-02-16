export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">読み込み中</span>
    </div>
  )
}
