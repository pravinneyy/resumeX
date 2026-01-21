"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Briefcase, Clock, Code, CheckCircle2, ArrowRight, 
  Sparkles, Target, Zap 
} from "lucide-react"

export default function CandidateDashboard() {
  const { user } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState({ applied: 0, assessments: 0, offers: 0 })
  const [activeTask, setActiveTask] = useState<any>(null)

  // Mock fetching dashboard data
  useEffect(() => {
    if (user) {
        // In a real app, fetch from /api/candidate/dashboard-stats
        // For now, we simulate data or fetch applications to count
        fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const assessmentCount = data.filter((a: any) => a.status === 'Assessment').length
                    setStats({
                        applied: data.length,
                        assessments: assessmentCount,
                        offers: 0
                    })
                    // Find first pending assessment
                    const task = data.find((a: any) => a.status === 'Assessment')
                    if (task) setActiveTask(task)
                }
            })
    }
  }, [user])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">
                Hello, {user?.firstName || "Developer"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
                You are all set to land your next dream job. Here is your daily digest.
            </p>
         </div>
         <Button onClick={() => router.push("/candidate/jobs")} className="gap-2 shadow-lg shadow-primary/20">
            <Sparkles className="w-4 h-4" /> Find New Jobs
         </Button>
      </div>

      {/* 2. PRIORITY ACTION CARD */}
      {activeTask ? (
          <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/10 to-transparent">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-yellow-500/20 text-yellow-600 flex items-center justify-center">
                        <Code className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Coding Assessment Pending</h3>
                        <p className="text-muted-foreground text-sm">
                            {activeTask.company_name} is waiting for you to complete the <b>{activeTask.job_title}</b> challenge.
                        </p>
                    </div>
                </div>
                <Button onClick={() => router.push(`/candidate/${activeTask.job_id}/ide`)} className="w-full md:w-auto">
                    Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
          </Card>
      ) : (
          <Card className="bg-gradient-to-r from-primary/10 to-transparent border-none">
             <CardContent className="p-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold">All caught up!</h3>
                    <p className="text-sm text-muted-foreground">No pending actions. Why not apply to more roles?</p>
                </div>
             </CardContent>
          </Card>
      )}

      {/* 3. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
                <Briefcase className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.applied}</div>
                <Progress value={stats.applied * 10} className="h-1 mt-3" />
            </CardContent>
         </Card>
         
         <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assessments Taken</CardTitle>
                <Target className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.assessments}</div>
                <p className="text-xs text-muted-foreground mt-2">Keep your skills sharp!</p>
            </CardContent>
         </Card>

         <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profile Visibility</CardTitle>
                <Zap className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">High</div>
                <p className="text-xs text-muted-foreground mt-2">Your resume is optimized.</p>
            </CardContent>
         </Card>
      </div>

      {/* 4. RECENT ACTIVITY / JOB FEED (Simplified) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Left: Recommended Jobs */}
         <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recommended for you</h2>
                <Button variant="link" onClick={() => router.push("/candidate/jobs")}>View All</Button>
            </div>
            
            {/* Hardcoded Sample for UI feel - dynamic data comes from API */}
            {[1, 2].map((i) => (
                <div key={i} className="group flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 transition-all cursor-pointer bg-card">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground">
                            {i === 1 ? "G" : "M"}
                        </div>
                        <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                                {i === 1 ? "Senior Backend Engineer" : "Full Stack Developer"}
                            </h4>
                            <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>{i === 1 ? "Google" : "Microsoft"}</span>
                                <span>•</span>
                                <span>$140k - $180k</span>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" size="sm">Apply</Button>
                </div>
            ))}
         </div>

         {/* Right: Resources */}
         <div className="space-y-4">
             <h2 className="text-xl font-semibold">Prep Resources</h2>
             <Card className="bg-secondary/20 border-none">
                <CardContent className="p-4 space-y-4">
                    <div className="flex gap-3">
                        <div className="mt-1"><Code className="w-4 h-4 text-primary" /></div>
                        <div>
                            <h4 className="font-medium text-sm">Practice Python Algorithms</h4>
                            <p className="text-xs text-muted-foreground">Brush up on lists and dictionaries.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="mt-1"><Clock className="w-4 h-4 text-primary" /></div>
                        <div>
                            <h4 className="font-medium text-sm">Mock Interview</h4>
                            <p className="text-xs text-muted-foreground">Schedule a practice round.</p>
                        </div>
                    </div>
                </CardContent>
             </Card>
         </div>
      </div>
    </div>
  )
}