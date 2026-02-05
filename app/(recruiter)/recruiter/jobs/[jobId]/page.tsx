"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
    ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle,
    Sparkles, Plus, Trash2, Save, Loader2, Mail, ExternalLink,
    Calendar, Award, TrendingUp, Target, AlertCircle
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProctoringLogs } from "@/components/recruiter/proctoring-logs"
import VerdictCard from "@/components/recruiter/VerdictCard"
import CandidateScoreBadges from "@/components/recruiter/CandidateScoreBadges"

interface PsychometricQ {
    id: string
    text: string
    section: string
}

interface Application {
    id: number
    candidate_id: string
    name: string
    email: string
    skills: string[]
    ai_summary: string
    ai_experience: string
    match_score: number
    verdict: string
    strengths: string[]
    gaps: string[]
    recommendation: string
    status: string
    score: number
    resume_url: string
}

export default function JobDetailsPage() {
    const { jobId } = useParams()
    const router = useRouter()
    const { getToken } = useAuth()

    const [applications, setApplications] = useState<Application[]>([])
    const [selectedApp, setSelectedApp] = useState<Application | null>(null)
    const [updating, setUpdating] = useState(false)

    const [psychometricBank, setPsychometricBank] = useState<PsychometricQ[]>([])

    // Assessment State
    const [assessment, setAssessment] = useState({
        title: "Technical Assessment",
        duration_minutes: 60,
        questions: [
            {
                title: "Two Sum",
                problem_text: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
                test_input: "nums = [2,7,11,15], target = 9",
                test_output: "[0,1]",
                points: 10
            }
        ],
        psychometric_ids: [] as number[]
    })

    // Fetch psychometric bank
    useEffect(() => {
        const loadBank = async () => {
            try {
                const token = await getToken()
                const res = await fetch("http://127.0.0.1:8000/api/assessments/psychometric/questions?limit=1000", {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    // Extract IDs from format "db_123" -> 123 for easier matching if needed
                    // But API returns "db_123". Let's use string IDs in frontend for matching.
                    // But backend expects Int IDs in psychometric_ids list.
                    // So we need to map.
                    if (data.questions) {
                        setPsychometricBank(data.questions.map((q: any) => ({
                            ...q,
                            numericId: parseInt(q.id.replace("db_", ""))
                        })))
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
        if (jobId) loadBank()
    }, [jobId, getToken])

    const togglePsychometric = (numericId: number) => {
        setAssessment(prev => {
            const current = prev.psychometric_ids || [];
            if (current.includes(numericId)) {
                return { ...prev, psychometric_ids: current.filter(id => id !== numericId) }
            } else {
                return { ...prev, psychometric_ids: [...current, numericId] }
            }
        })
    }

    useEffect(() => {
        fetchApplications()
    }, [jobId, getToken])

    useEffect(() => {
        // Fetch assessment for this job on mount / when jobId changes
        if (jobId) fetchAssessment()
    }, [jobId, getToken])

    // Refresh assessment when component mounts or route changes
    useEffect(() => {
        const handleFocus = () => {
            if (jobId) {
                console.log("Window focus detected, refetching assessment...")
                fetchAssessment()
            }
        }

        // Refetch immediately to catch updates from redirect
        if (jobId) {
            const timer = setTimeout(() => {
                console.log("Delayed refetch after route change...")
                fetchAssessment()
            }, 300)
            return () => clearTimeout(timer)
        }

        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [jobId])

    const fetchApplications = async () => {
        try {
            const token = await getToken()
            const res = await fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/applications`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                console.log("Fetched applications:", data)
                setApplications(data)
            }
        } catch (e) {
            console.error("Failed to fetch applications:", e)
        }
    }

    const fetchAssessment = async () => {
        try {
            console.log(`[fetchAssessment] Fetching assessment for job ID: ${jobId}`)
            const token = await getToken()
            const res = await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            console.log(`[fetchAssessment] Response Status: ${res.status}`)

            if (res.ok) {
                const data = await res.json()
                console.log("[fetchAssessment] Fetched assessment data:", JSON.stringify(data, null, 2))
                setAssessment({
                    title: data.title || "Technical Assessment",
                    duration_minutes: data.duration_minutes || 60,
                    questions: Array.isArray(data.questions) ? data.questions : [],
                    psychometric_ids: data.psychometric_ids || []
                })
                console.log(`[fetchAssessment] Successfully loaded ${data.questions?.length || 0} questions`)
            } else {
                console.warn(`[fetchAssessment] No assessment found for job ${jobId} (404)`)
                // Reset to empty assessment when 404
                setAssessment({
                    title: "Technical Assessment",
                    duration_minutes: 60,
                    questions: [],
                    psychometric_ids: []
                })
            }
        } catch (err) {
            console.error("[fetchAssessment] Error:", err)
            // On error, also reset to empty state to prevent stale data
            setAssessment({
                title: "Technical Assessment",
                duration_minutes: 60,
                questions: [],
                psychometric_ids: []
            })
        }
    }

    const updateStatus = async (appId: number, newStatus: string) => {
        setUpdating(true)
        try {
            const token = await getToken()
            const res = await fetch(`http://127.0.0.1:8000/api/applications/${appId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            })

            if (res.ok) {
                setApplications(apps => apps.map(a => a.id === appId ? { ...a, status: newStatus } : a))
                setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null)
            } else {
                alert("Failed to update status")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setUpdating(false)
        }
    }

    const handleSaveAssessment = async () => {
        if (!assessment.questions.length) return alert("Add at least one question")
        try {
            const payload = { job_id: jobId, ...assessment }
            console.log("[handleSaveAssessment] Sending payload:", JSON.stringify(payload, null, 2))

            const token = await getToken()
            const res = await fetch("http://127.0.0.1:8000/api/assessments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            console.log("[handleSaveAssessment] Response Status:", res.status)
            const responseData = await res.json()
            console.log("[handleSaveAssessment] Response Data:", responseData)

            if (res.ok) {
                alert("Assessment Saved Successfully!")
                console.log("[handleSaveAssessment] Refreshing assessment...")
                // Refresh local assessment state so dashboard reflects new questions
                fetchAssessment()
            } else {
                const errorMsg = responseData.detail || JSON.stringify(responseData)
                console.error("[handleSaveAssessment] API Error:", errorMsg)
                alert("Failed: " + errorMsg)
            }
        } catch (e) {
            console.error("[handleSaveAssessment] Exception:", e)
            alert("Error: " + String(e))
        }
    }

    const getResumeLink = (url: string) => {
        if (!url) return "#"
        if (url.startsWith("http")) return url
        return url
    }

    const getMatchColor = (score: number) => {
        if (score >= 75) return "text-green-500 bg-green-500/10 border-green-500/30"
        if (score >= 60) return "text-blue-500 bg-blue-500/10 border-blue-500/30"
        if (score >= 40) return "text-orange-500 bg-orange-500/10 border-orange-500/30"
        return "text-red-500 bg-red-500/10 border-red-500/30"
    }

    const getMatchIcon = (score: number) => {
        if (score >= 75) return <CheckCircle className="w-4 h-4" />
        if (score >= 60) return <CheckCircle className="w-4 h-4" />
        if (score >= 40) return <AlertTriangle className="w-4 h-4" />
        return <XCircle className="w-4 h-4" />
    }

    const getProgressColor = (score: number) => {
        if (score >= 75) return "bg-green-500"
        if (score >= 60) return "bg-blue-500"
        if (score >= 40) return "bg-orange-500"
        return "bg-red-500"
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Job Dashboard</h1>
            </div>

            <Tabs defaultValue="applicants" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="applicants">Applicants</TabsTrigger>
                    <TabsTrigger value="settings">Assessment</TabsTrigger>
                </TabsList>

                <TabsContent value="applicants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Candidates ({applications.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {applications.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No applicants yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {applications.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => setSelectedApp(app)}
                                            className="group p-4 border rounded-lg hover:border-primary hover:shadow-md cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                            {app.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                                                                {app.name}
                                                            </h3>
                                                            {app.match_score > 0 && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs ${getMatchColor(app.match_score)}`}
                                                                >
                                                                    {getMatchIcon(app.match_score)}
                                                                    <span className="ml-1">{app.match_score}% Match</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-1">{app.email}</p>

                                                        {/* Scoring Engine Scores */}
                                                        <div className="mb-1">
                                                            <CandidateScoreBadges
                                                                jobId={Number(jobId)}
                                                                candidateId={app.candidate_id}
                                                            />
                                                        </div>

                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {app.ai_summary.substring(0, 100)}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        app.status === 'Selected' ? 'default' :
                                                            app.status === 'Rejected' ? 'destructive' :
                                                                'secondary'
                                                    }
                                                >
                                                    {app.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    {/* Assessment Status Card */}
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Assessment Configuration
                                </div>
                                {assessment.questions.length > 0 && (
                                    <Badge className="bg-green-600">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {assessment.questions.length} {assessment.questions.length === 1 ? 'Question' : 'Questions'}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Title: {assessment.title || '(Not Set)'}</h3>
                                <p className="text-sm text-muted-foreground">Duration: {assessment.duration_minutes} minutes</p>
                            </div>

                            {assessment.questions.length > 0 && (
                                <div className="space-y-3 max-h-48 overflow-y-auto border-t pt-4">
                                    <h4 className="font-semibold text-sm">Questions Preview:</h4>
                                    {assessment.questions.map((q, idx) => (
                                        <div key={idx} className="text-sm p-2 bg-white/50 dark:bg-black/20 rounded">
                                            <p className="font-medium">{idx + 1}. {q.title || '(Untitled)'}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{q.problem_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                onClick={() => router.push(`/recruiter/jobs/${jobId}/create-assessment`)}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {assessment.questions.length > 0 ? 'Edit Assessment' : 'Create Assessment'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Assessment Details - Shows from Database */}
                    {assessment.questions.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Assessment Details</span>
                                    <Badge variant="outline">Database Record</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Full Question List */}
                                <div>
                                    <h4 className="font-semibold mb-4">All Questions ({assessment.questions.length})</h4>
                                    <div className="space-y-3">
                                        {assessment.questions.map((q: any, idx: number) => (
                                            <div key={idx} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">Question {idx + 1}: {q.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.problem_text}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="shrink-0 ml-2">
                                                        {q.points} pts
                                                    </Badge>
                                                </div>

                                                {q.test_input && (
                                                    <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                                                        <p className="text-muted-foreground font-semibold">Input:</p>
                                                        <p className="text-foreground">{q.test_input}</p>
                                                    </div>
                                                )}

                                                {q.test_output && (
                                                    <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                                                        <p className="text-muted-foreground font-semibold">Expected Output:</p>
                                                        <p className="text-foreground">{q.test_output}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">How It Works</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">1</div>
                                    <div>
                                        <p className="font-semibold">Create or Edit Assessment</p>
                                        <p className="text-muted-foreground text-xs">Click the button above to configure test title, duration, and add coding challenges</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">2</div>
                                    <div>
                                        <p className="font-semibold">Set Culture Fit Preferences (Optional)</p>
                                        <p className="text-muted-foreground text-xs">Select personality traits that matter for this role</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">3</div>
                                    <div>
                                        <p className="font-semibold">Publish Exam</p>
                                        <p className="text-muted-foreground text-xs">Once published, candidates will see these questions in their IDE</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assessment Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Assessment Title</Label>
                                    <Input
                                        value={assessment.title}
                                        onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration (Minutes)</Label>
                                    <Input
                                        type="number"
                                        value={assessment.duration_minutes}
                                        onChange={(e) => setAssessment(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Technical Questions ({assessment.questions.length})</h3>
                                <div className="p-4 border rounded-md bg-muted/20">
                                    {assessment.questions.map((q, i) => (
                                        <div key={i} className="mb-2 p-2 bg-card border rounded shadow-sm text-sm">
                                            <div className="font-medium">{q.title}</div>
                                            <div className="text-muted-foreground text-xs truncate">{q.problem_text}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Psychometric Questions ({assessment.psychometric_ids?.length || 0} selected)</h3>
                                <div className="text-xs text-muted-foreground mb-2">Select questions to include in the Culture Fit section. If none selected, random questions will be used.</div>
                                <ScrollArea className="h-[300px] border rounded-md p-4">
                                    <div className="space-y-3">
                                        {psychometricBank.map((q: any) => (
                                            <div key={q.id} className="flex items-start space-x-2 pb-2 border-b last:border-0">
                                                <Checkbox
                                                    id={q.id}
                                                    checked={assessment.psychometric_ids?.includes(q.numericId)}
                                                    onCheckedChange={() => togglePsychometric(q.numericId)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label
                                                        htmlFor={q.id}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {q.text}
                                                    </label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {q.section}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveAssessment} className="gap-2">
                                    <Save className="w-4 h-4" /> Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Sheet open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
                <SheetContent className="sm:max-w-2xl overflow-y-auto w-full p-0 gap-0">
                    {selectedApp && (
                        <>
                            {/* Header */}
                            <div className="bg-card border-b p-6">
                                <SheetHeader>
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-16 w-16 border-2 border-muted shadow-md">
                                            <AvatarFallback className="text-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                                                {selectedApp.name.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || '??'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <SheetTitle className="text-xl mb-1 truncate">
                                                {selectedApp.name.replace(/[^a-zA-Z0-9\s.'-]/g, '').trim() || 'Unknown'}
                                            </SheetTitle>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                                <Mail className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{selectedApp.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline">
                                                    {selectedApp.status}
                                                </Badge>
                                                {selectedApp.match_score > 0 && (
                                                    <Badge variant="outline" className={getMatchColor(selectedApp.match_score)}>
                                                        <Target className="w-3 h-3 mr-1" />
                                                        {selectedApp.match_score}% Match
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SheetHeader>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Match Score Progress */}
                                {selectedApp.match_score > 0 && (
                                    <div className="space-y-3 p-4 bg-muted/40 rounded-xl border">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Target className="w-4 h-4 text-muted-foreground" />
                                                Job Match Analysis
                                            </h3>
                                            <span className="text-2xl font-bold">{selectedApp.match_score}%</span>
                                        </div>
                                        <Progress
                                            value={selectedApp.match_score}
                                            className="h-2.5 rounded-full"
                                        />
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            {getMatchIcon(selectedApp.match_score)}
                                            <span className="font-medium text-foreground">{selectedApp.verdict}</span>
                                        </div>
                                    </div>
                                )}

                                {/* AI Profile Summary */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                                        <Sparkles className="w-4 h-4" />
                                        AI Profile Summary
                                    </h3>
                                    {selectedApp.ai_summary && selectedApp.ai_summary !== "Pending AI Analysis" ? (
                                        <div className="p-4 bg-muted/30 border rounded-lg text-sm leading-relaxed text-foreground">
                                            {selectedApp.ai_summary}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 bg-muted/30 border border-dashed rounded-lg">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                                            <span className="text-sm text-muted-foreground">AI analysis is running — check back shortly.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Experience */}
                                {selectedApp.ai_experience && selectedApp.ai_experience !== "N/A" && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            Experience
                                        </h3>
                                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                                <Award className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{selectedApp.ai_experience}</p>
                                                <p className="text-xs text-muted-foreground">Professional Experience</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Strengths */}
                                {selectedApp.strengths && selectedApp.strengths.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-green-500">
                                            <CheckCircle className="w-4 h-4" />
                                            Matching Skills
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.strengths.map((strength, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="px-3 py-1 bg-green-500/10 text-green-500 border-green-500/30"
                                                >
                                                    <CheckCircle className="w-3 h-3 mr-1.5" />
                                                    {strength}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Gaps */}
                                {selectedApp.gaps && selectedApp.gaps.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-orange-500">
                                            <AlertCircle className="w-4 h-4" />
                                            Missing Requirements
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.gaps.map((gap, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="px-3 py-1 bg-orange-500/10 text-orange-500 border-orange-500/30"
                                                >
                                                    <XCircle className="w-3 h-3 mr-1.5" />
                                                    {gap}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All Detected Skills */}
                                {selectedApp.skills && selectedApp.skills.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                            All Detected Skills
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.skills.map((skill, i) => (
                                                skill && skill.trim() && (
                                                    <Badge
                                                        key={i}
                                                        variant="outline"
                                                        className="px-3 py-1 bg-muted/40 text-foreground border-muted"
                                                    >
                                                        {skill.trim()}
                                                    </Badge>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Recommendation */}
                                {selectedApp.recommendation && (
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-muted-foreground" />
                                            AI Recommendation
                                        </h3>
                                        <div className="p-4 bg-muted/30 border rounded-lg text-sm text-foreground leading-relaxed">
                                            {selectedApp.recommendation}
                                        </div>
                                    </div>
                                )}

                                {/* Assessment Verdict Card */}
                                <VerdictCard
                                    jobId={Number(jobId)}
                                    candidateId={selectedApp.candidate_id}
                                />

                                {/* Proctoring Logs */}
                                <ProctoringLogs
                                    candidateId={selectedApp.candidate_id}
                                    jobId={Number(jobId)}
                                />

                                {/* Documents */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        Documents
                                    </h3>
                                    {selectedApp.resume_url ? (
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="text-sm">
                                                    <p className="font-medium">Resume.pdf</p>
                                                    <p className="text-xs text-muted-foreground">Original Application</p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" asChild>
                                                <a
                                                    href={getResumeLink(selectedApp.resume_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    View <ExternalLink className="w-3 h-3 ml-1.5" />
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No resume uploaded.</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3 pt-4 mt-2 border-t sticky bottom-0 bg-background pb-6">
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        disabled={updating}
                                        onClick={() => updateStatus(selectedApp.id, 'Rejected')}
                                    >
                                        {updating ? (
                                            <Loader2 className="animate-spin w-4 h-4" />
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Reject
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        disabled={updating}
                                        onClick={() => updateStatus(selectedApp.id, 'Interview')}
                                    >
                                        {updating ? (
                                            <Loader2 className="animate-spin w-4 h-4" />
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Interview
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}