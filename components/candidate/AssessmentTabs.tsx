"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Code2, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils" // Ensure you have a cn utility or just use template literals

export default function AssessmentTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Technical Challenge",
      href: `/candidate/interviews/${jobId}/ide`,
      icon: Code2,
      active: pathname.includes("/ide")
    },
    {
      name: "Culture Fit",
      href: `/candidate/interviews/${jobId}/psychometric`,
      icon: BrainCircuit,
      active: pathname.includes("/psychometric")
    }
  ]

  return (
    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
            tab.active 
              ? "bg-[#2b2b2b] text-white shadow-sm border border-white/10" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <tab.icon className="w-4 h-4" />
          {tab.name}
        </Link>
      ))}
    </div>
  )
}