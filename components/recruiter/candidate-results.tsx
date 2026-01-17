"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, Sparkles, Eye, Download, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const candidates = [
  {
    id: 1,
    name: "Alex Thompson",
    role: "Senior Frontend Developer",
    score: 92,
    status: "qualified",
    aiMatch: 95,
  },
  {
    id: 2,
    name: "Maria Garcia",
    role: "Full Stack Engineer",
    score: 88,
    status: "review",
    aiMatch: 87,
  },
  {
    id: 3,
    name: "James Wilson",
    role: "Backend Developer",
    score: 76,
    status: "pending",
    aiMatch: 72,
  },
  {
    id: 4,
    name: "Emily Chen",
    role: "DevOps Engineer",
    score: 84,
    status: "qualified",
    aiMatch: 89,
  },
]

const statusStyles = {
  qualified: "bg-success/20 text-success border-success/30",
  review: "bg-warning/20 text-warning border-warning/30",
  pending: "bg-muted text-muted-foreground border-muted",
}

export function CandidateResults() {
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Candidate Results
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((candidate, index) => (
          <div
            key={candidate.id}
            className={cn(
              "p-4 rounded-xl bg-secondary/50 border border-transparent transition-all duration-300 cursor-pointer",
              "hover:bg-secondary hover:border-border hover:shadow-md",
              hoveredId === candidate.id && "border-primary/30 shadow-lg shadow-primary/5",
            )}
            style={{ animationDelay: `${(index + 3) * 100}ms` }}
            onMouseEnter={() => setHoveredId(candidate.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{candidate.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{candidate.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("capitalize text-xs", statusStyles[candidate.status as keyof typeof statusStyles])}
                >
                  {candidate.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2">
                      <Eye className="w-4 h-4" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Resume
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Schedule Interview
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Match Score</span>
                <span
                  className={cn(
                    "font-medium",
                    candidate.aiMatch >= 90
                      ? "text-success"
                      : candidate.aiMatch >= 75
                        ? "text-primary"
                        : "text-warning",
                  )}
                >
                  {candidate.aiMatch}%
                </span>
              </div>
              <Progress
                value={candidate.aiMatch}
                className={cn(
                  "h-2 bg-secondary",
                  candidate.aiMatch >= 90 && "[&>div]:bg-success",
                  candidate.aiMatch >= 75 && candidate.aiMatch < 90 && "[&>div]:bg-primary",
                  candidate.aiMatch < 75 && "[&>div]:bg-warning",
                )}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
