"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, FileCheck, ListChecks, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

const stats = [
  {
    label: "Total Candidates",
    value: "1,284",
    change: "+12%",
    changeType: "positive" as const,
    icon: Users,
  },
  {
    label: "Resumes Analyzed",
    value: "856",
    change: "+8%",
    changeType: "positive" as const,
    icon: FileCheck,
  },
  {
    label: "Avg. Rounds Passed",
    value: "3.2",
    change: "+0.4",
    changeType: "positive" as const,
    icon: ListChecks,
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in overflow-hidden relative"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <p
                    className={cn(
                      "text-xs font-medium",
                      stat.changeType === "positive" ? "text-success" : "text-destructive",
                    )}
                  >
                    {stat.change} from last month
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  "bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110",
                )}
              >
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Card>
      ))}
    </div>
  )
}
