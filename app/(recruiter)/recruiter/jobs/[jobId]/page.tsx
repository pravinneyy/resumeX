"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs" // <--- 1. Import useAuth
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRealtimeApplications } from "@/hooks/useRealtimeApplications"

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
  const { getToken, isLoaded } = useAuth() // <--- 2. Get auth helpers

  const [initialApplications, setInitialApplications] = useState<Application[]>([])

  // ✨ REALTIME: Use hook for automatic application updates
  const applications = useRealtimeApplications(initialApplications, Number(jobId))

  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [updating, setUpdating] = useState(false)

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
    ]
  })

  useEffect(() => {
    if (isLoaded && jobId) {
      fetchApplications()
    }
  }, [isLoaded, jobId])

  const fetchApplications = async () => {
    try {
      const token = await getToken() // <--- 3. Get Token
      const res = await fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/applications`, {
        headers: {
          "Authorization": `Bearer ${token}` // <--- 4. Attach Header
        }
      })
      if (res.ok) {
        const data = await res.json()
        console.log("Fetched applications:", data)
        setInitialApplications(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error("Failed to fetch applications:", e)
    }
  }

  const updateStatus = async (appId: number, newStatus: string) => {
    setUpdating(true)
    try {
      const token = await getToken() // <--- Get Token
      const res = await fetch(`http://127.0.0.1:8000/api/applications/${appId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // <--- Attach Header
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        // Status update will trigger realtime for other users
        // For current user, update local state immediately
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
      const token = await getToken() // <--- Get Token
      const res = await fetch("http://127.0.0.1:8000/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // <--- Attach Header
        },
        body: JSON.stringify({ job_id: jobId, ...assessment })
      })
      if (res.ok) alert("Assessment Saved Successfully!")
      else {
        const err = await res.json()
        alert("Failed: " + JSON.stringify(err))
      }
    } catch (e) { console.error(e) }
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
          <TabsTrigger value="settings">Job Settings</TabsTrigger>
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

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Create Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assessment Title</Label>
                  <Input
                    value={assessment.title}
                    onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={assessment.duration_minutes}
                    onChange={(e) => setAssessment({ ...assessment, duration_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold flex items-center justify-between">
                  Questions
                  <Button variant="outline" size="sm" onClick={() => router.push(`/recruiter/jobs/${jobId}/create-assessment`)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </Button>
                </h3>
                {assessment.questions.map((q, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-secondary/10 space-y-3 relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-500"
                      onClick={() => {
                        const newQ = [...assessment.questions]
                        newQ.splice(idx, 1)
                        setAssessment({ ...assessment, questions: newQ })
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Question Title"
                      value={q.title}
                      onChange={(e) => {
                        const newQ = [...assessment.questions]
                        newQ[idx].title = e.target.value
                        setAssessment({ ...assessment, questions: newQ })
                      }}
                    />
                    <Textarea
                      placeholder="Problem Description"
                      value={q.problem_text}
                      onChange={(e) => {
                        const newQ = [...assessment.questions]
                        newQ[idx].problem_text = e.target.value
                        setAssessment({ ...assessment, questions: newQ })
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Input"
                        value={q.test_input}
                        onChange={(e) => {
                          const newQ = [...assessment.questions]
                          newQ[idx].test_input = e.target.value
                          setAssessment({ ...assessment, questions: newQ })
                        }}
                      />
                      <Input
                        placeholder="Output"
                        value={q.test_output}
                        onChange={(e) => {
                          const newQ = [...assessment.questions]
                          newQ[idx].test_output = e.target.value
                          setAssessment({ ...assessment, questions: newQ })
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={handleSaveAssessment} className="w-full">
                  <Save className="w-4 h-4 mr-2" /> Save Assessment
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