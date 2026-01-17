"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Star, ArrowUpRight, Medal } from "lucide-react"
import { cn } from "@/lib/utils"

const topCandidates = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Lead Software Engineer",
    score: 98,
    experience: "8 years",
    rank: 1,
  },
  {
    id: 2,
    name: "Michael Brown",
    role: "Senior Full Stack",
    score: 96,
    experience: "6 years",
    rank: 2,
  },
  {
    id: 3,
    name: "Jennifer Lee",
    role: "Cloud Architect",
    score: 94,
    experience: "7 years",
    rank: 3,
  },
  {
    id: 4,
    name: "David Martinez",
    role: "Tech Lead",
    score: 91,
    experience: "5 years",
    rank: 4,
  },
]

const rankStyles = {
  1: { icon: "text-yellow-400", bg: "bg-yellow-400/10" },
  2: { icon: "text-slate-400", bg: "bg-slate-400/10" },
  3: { icon: "text-amber-600", bg: "bg-amber-600/10" },
}

export function TopCandidates() {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Candidates
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          View Leaderboard
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {topCandidates.map((candidate, index) => (
          <div
            key={candidate.id}
            className={cn(
              "p-4 rounded-xl bg-secondary/50 border border-transparent transition-all duration-300",
              "hover:bg-secondary hover:border-border hover:shadow-md group cursor-pointer",
              candidate.rank === 1 && "ring-1 ring-yellow-400/20",
            )}
            style={{ animationDelay: `${(index + 3) * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Rank - Enhanced styling */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-transform duration-200 group-hover:scale-110",
                  candidate.rank <= 3 ? rankStyles[candidate.rank as keyof typeof rankStyles]?.bg : "bg-muted",
                )}
              >
                {candidate.rank <= 3 ? (
                  candidate.rank === 1 ? (
                    <Medal className={cn("w-4 h-4", rankStyles[1].icon)} />
                  ) : (
                    <Star className={cn("w-4 h-4", rankStyles[candidate.rank as keyof typeof rankStyles]?.icon)} />
                  )
                ) : (
                  <span className="text-muted-foreground">{candidate.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10 ring-2 ring-background transition-transform duration-200 group-hover:scale-105">
                <AvatarImage
                  src={`/.jpg?height=40&width=40&query=${candidate.name} professional headshot`}
                />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {candidate.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate group-hover:text-primary transition-colors">{candidate.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{candidate.role}</p>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className={cn("text-lg font-bold", candidate.score >= 95 ? "text-success" : "text-primary")}>
                    {candidate.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {candidate.experience}
                </Badge>
              </div>

              {/* Arrow */}
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
