"use client"

import { cn } from "@/lib/utils"
import { LayoutDashboard, Briefcase, FileText, Code2, ChevronLeft, Sparkles } from "lucide-react" // Changed icons
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/candidate" },
  { label: "Jobs", icon: Briefcase, href: "/candidate/jobs" },
  { label: "Applications", icon: FileText, href: "/candidate/applications" }, // Application status
  { label: "Interviews", icon: Code2, href: "/candidate/interviews" },
  { label: "AI Resume", icon: Sparkles, href: "/candidate/ai-resume" },
]

export function CandidateSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out z-40",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        <Link href="/?source=dashboard" className="block hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center gap-2 p-4 border-b border-border h-16 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            {!collapsed && <span className="font-bold text-xl text-primary animate-fade-in">ResumeX</span>}
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  "hover:bg-secondary/80",
                  isActive && "bg-secondary text-foreground shadow-sm",
                  !isActive && "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="font-medium animate-fade-in">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onToggle} className="w-full">
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}