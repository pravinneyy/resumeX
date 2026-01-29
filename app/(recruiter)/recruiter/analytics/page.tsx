"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Trophy, TrendingUp, Users, ArrowUpRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AnalyticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalCandidates: 0,
    avgScore: 0,
    topCandidates: [] as any[],
    recentActivity: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch All Jobs
        const jobsRes = await fetch("http://127.0.0.1:8000/api/jobs")
        let jobs = []

        if (jobsRes.ok) {
            jobs = await jobsRes.json()
        } else {
            console.warn("API: Failed to fetch jobs (Status:", jobsRes.status, ")")
        }

        let allApps: any[] = []

        // 2. Fetch Applications if we have jobs
        if (Array.isArray(jobs) && jobs.length > 0) {
            await Promise.all(jobs.map(async (job: any) => {
                try {
                    const res = await fetch(`http://127.0.0.1:8000/api/jobs/${job.id}/applications`)
                    if (res.ok) {
                        const apps = await res.json()
                        if (Array.isArray(apps)) {
                            const appsWithJob = apps.map((a: any) => ({ ...a, job_title: job.title }))
                            allApps = [...allApps, ...appsWithJob]
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch apps for job ${job.id}`, err)
                }
            }))
        }

        // 3. Calculate Stats
        const total = allApps.length
        const scoredApps = allApps.filter(a => a.score > 0)
        const avg = scoredApps.length 
            ? (scoredApps.reduce((acc, curr) => acc + curr.score, 0) / scoredApps.length).toFixed(1) 
            : "0.0"
            
        const top = [...allApps]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5)

        setStats({
            totalCandidates: total,
            avgScore: Number(avg),
            topCandidates: top,
            recentActivity: allApps.slice(0, 5)
        })
      } catch (e) {
        console.error("Analytics Error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recruitment Analytics</h1>
        <p className="text-muted-foreground">Global insights across all job postings.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
      ) : (
        <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCandidates}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Assessment Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgScore} / 10</div>
                        <p className="text-xs text-muted-foreground">Based on {stats.totalCandidates} submissions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Placement Rate</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12.5%</div>
                        <p className="text-xs text-muted-foreground">Candidates moved to interview</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEADERBOARD */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" /> Top Performers
                        </CardTitle>
                        <CardDescription>Candidates with the highest assessment scores.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topCandidates.map((c, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-secondary'}`}>
                                            #{i+1}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{c.candidate_name}</p>
                                            <p className="text-xs text-muted-foreground">{c.job_title}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={c.score >= 9 ? "default" : "secondary"} className={c.score >= 9 ? "bg-green-600" : ""}>
                                            {c.score} / 10
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {stats.topCandidates.length === 0 && <p className="text-muted-foreground text-center py-4">No data available.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* RECENT ACTIVITY */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Applications</CardTitle>
                        <CardDescription>Latest candidates entering the pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentActivity.map((c, i) => (
                                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">{c.candidate_name}</p>
                                        <p className="text-xs text-muted-foreground">Applied for {c.job_title}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/recruiter/jobs/${c.job_id}`)}>
                                        View <ArrowUpRight className="ml-1 w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                            {stats.recentActivity.length === 0 && <p className="text-muted-foreground text-center py-4">No recent activity.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
      )}
    </div>
  )
}