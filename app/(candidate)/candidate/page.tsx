"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs" // <--- 1. Import useAuth
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
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth() // <--- 2. Get token helper
    const router = useRouter()
    const [stats, setStats] = useState({ applied: 0, assessments: 0, offers: 0 })
    const [activeTask, setActiveTask] = useState<any>(null)
    const [recommendedJobs, setRecommendedJobs] = useState<any[]>([])

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !isLoaded) return

            try {
                const token = await getToken() // <--- 3. Get Token

                // <--- 4. Attach Token to Request
                const res = await fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })

                const data = await res.json()

                if (Array.isArray(data)) {
                    const assessmentCount = data.filter((a: any) => a.status === 'Assessment').length
                    setStats({
                        applied: data.length,
                        assessments: assessmentCount,
                        offers: 0 // You can filter for 'Offer' status here if you have it
                    })
                    // Find first pending assessment
                    const task = data.find((a: any) => a.status === 'Assessment')
                    if (task) setActiveTask(task)
                }
            } catch (error) {
                console.error("Failed to load dashboard data:", error)
            }

            // Fetch recommended jobs
            try {
                const token = await getToken()
                const jobsRes = await fetch(`http://127.0.0.1:8000/api/candidates/${user.id}/recommended-jobs`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })
                const jobsData = await jobsRes.json()
                if (jobsData.recommended_jobs) {
                    setRecommendedJobs(jobsData.recommended_jobs.slice(0, 3)) // Top 3 for dashboard
                }
            } catch (error) {
                console.error("Failed to load recommended jobs:", error)
            }
        }

        fetchDashboardData()
    }, [user, isLoaded, getToken])

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
                        <Button onClick={() => router.push(`/candidate/interviews/${activeTask.job_id}/psychometric`)} className="w-full md:w-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* 4. RECOMMENDED JOBS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Recommended for you</h2>
                    <Button variant="link" onClick={() => router.push("/candidate/jobs")}>View All</Button>
                </div>


                {/* Dynamic recommended jobs from API */}
                {recommendedJobs.length > 0 ? (
                    recommendedJobs.map((job: any) => (
                        <div key={job.id} className="group flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 transition-all cursor-pointer bg-card">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground">
                                    {job.company?.charAt(0) || "J"}
                                </div>
                                <div>
                                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                                        {job.title}
                                    </h4>
                                    <div className="flex gap-2 text-sm text-muted-foreground items-center">
                                        <span>{job.company}</span>
                                        <span>•</span>
                                        <span>{job.location}</span>
                                        <span>•</span>
                                        <Badge variant={job.match_score > 75 ? "default" : "secondary"} className="text-xs">
                                            {job.match_score}% Match
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/candidate/jobs/${job.id}`)}>Apply</Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">Upload your resume to see personalized job recommendations</p>
                        <Button variant="link" onClick={() => router.push("/candidate/resume")}>Upload Resume</Button>
                    </div>
                )}
            </div>
        </div>
    )
}