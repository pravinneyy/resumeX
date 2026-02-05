"use client"

import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Kanban, ChevronLeft, BarChart3, Sparkles, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  // REMOVED: "Recruit" item (consolidated into Dashboard)

  // CHANGED: Label updated to "Recruiter Dashboard"
  { label: "Dashboard", icon: LayoutDashboard, href: "/recruiter" },

  { label: "Candidates", icon: Users, href: "/recruiter/candidates" },
  { label: "Analytics", icon: BarChart3, href: "/recruiter/analytics" },
  { label: "Recruitment Board", icon: Kanban, href: "/recruiter/recruitment" },
  { label: "Security Logs", icon: ShieldAlert, href: "/recruiter/logs" },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out z-40",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        {/* FIX: Added '?source=dashboard' so the landing page knows NOT to redirect you back */}
        <Link href="/?source=dashboard" className="block hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center gap-2 p-4 border-b border-border h-16 flex-shrink-0 cursor-pointer">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            {!collapsed && <span className="font-bold text-xl text-primary animate-fade-in">ResumeX</span>}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            // Updated active check to handle sub-routes (e.g., keeping dashboard active when in job details)
            // If you want strict matching only, use: pathname === item.href
            const isActive = pathname === item.href || (item.href !== "/recruiter" && pathname.startsWith(item.href))

            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  "hover:bg-secondary/80",
                  isActive && "bg-secondary text-foreground shadow-sm",
                  !isActive && "text-muted-foreground hover:text-foreground",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                    "group-hover:scale-110",
                    isActive && "text-primary",
                  )}
                />
                {!collapsed && <span className="font-medium animate-fade-in">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavLink
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className={cn("w-full justify-center", !collapsed && "justify-start")}
              >
                <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
                {!collapsed && <span className="ml-2">Collapse</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={10}>
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}