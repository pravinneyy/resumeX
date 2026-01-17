import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-red-500" />
      <p className="text-zinc-400 text-sm animate-pulse">Verifying access...</p>
    </div>
  )
}