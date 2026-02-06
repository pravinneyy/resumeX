"use client"

import { usePathname, useRouter } from "next/navigation"
import { Code2, BrainCircuit, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useExam } from "@/contexts/ExamContext"

export default function AssessmentTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isExamActive, endExam } = useExam()

  const tabs = [
    {
      name: "Psychometric",
      href: `/candidate/interviews/${jobId}/psychometric`,
      icon: BrainCircuit,
      active: pathname.includes("/psychometric")
    },
    {
      name: "Technical Text",
      href: `/candidate/interviews/${jobId}/technical-text`,
      icon: MessageSquare,
      active: pathname.includes("/technical-text")
    },
    {
      name: "Coding",
      href: `/candidate/interviews/${jobId}/ide`,
      icon: Code2,
      active: pathname.includes("/ide")
    }
  ]

  const handleTabClick = (e: React.MouseEvent, tab: typeof tabs[0]) => {
    // Allow navigation to the same tab
    if (tab.active) return

    // If exam is active, show warning before allowing navigation
    if (isExamActive) {
      e.preventDefault()
      const confirmed = window.confirm(
        "⚠️ You are in an active exam section.\n\n" +
        "Are you sure you want to switch to another section? Your current progress will be saved."
      )
      if (confirmed) {
        endExam("completed")
        router.push(tab.href)
      }
    }
  }

  return (
    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
      {tabs.map((tab, index) => (
        <div key={tab.name} className="flex items-center">
          <button
            onClick={(e) => {
              handleTabClick(e, tab)
              if (!isExamActive || tab.active) {
                router.push(tab.href)
              }
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
              tab.active
                ? "bg-[#2b2b2b] text-white shadow-sm border border-white/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
          {/* Arrow/Step indicator between tabs */}
          {index < tabs.length - 1 && (
            <span className="text-gray-600 mx-1">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
