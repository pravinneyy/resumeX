"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
    ArrowLeft, FileText, CheckCircle, XCircle, BrainCircuit, 
    Sparkles, Plus, Trash2, Save, Loader2, Mail, ExternalLink
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const router = useRouter()
  
  const [applications, setApplications] = useState<any[]>([])
  const [selectedApp, setSelectedApp] = useState<any | null>(null)
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
    fetchApplications()
  }, [jobId])

  const fetchApplications = async () => {
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/applications`)
        if (res.ok) {
            const data = await res.json()
            setApplications(data)
        }
    } catch (e) { console.error(e) }
  }

  const updateStatus = async (appId: number, newStatus: string) => {
      setUpdating(true)
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/applications/${appId}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
          })

          if (res.ok) {
              setApplications(apps => apps.map(a => a.id === appId ? {...a, status: newStatus} : a))
              setSelectedApp(null) 
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
        const res = await fetch("http://127.0.0.1:8000/api/assessments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
      const cleanPath = url.startsWith("/") ? url.substring(1) : url
      return `http://127.0.0.1:8000/${cleanPath}`
  }

  // --- HELPER TO HANDLE BOTH BACKEND VERSIONS ---
  const getName = (app: any) => app.candidate_name || app.name || "Unknown Candidate"
  const getEmail = (app: any) => app.candidate_email || app.email || ""
  const getSkills = (app: any) => app.candidate_skills || app.skills || ""
  const getReasoning = (app: any) => app.candidate_summary || app.ai_reasoning || app.notes || "No analysis available."

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-2xl font-bold">Job Dashboard</h1>
        </div>

        <Tabs defaultValue="applicants" className="space-y-4">
            <TabsList>
                <TabsTrigger value="applicants">Applicants</TabsTrigger>
                <TabsTrigger value="settings">Job Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="applicants">
                <Card>
                    <CardHeader><CardTitle>Candidates ({applications.length})</CardTitle></CardHeader>
                    <CardContent>
                         {applications.length === 0 ? <div className="text-center py-10 text-muted-foreground">No applicants yet.</div> : (
                             <div className="space-y-2">
                                {applications.map(app => (
                                    <div key={app.id} onClick={() => setSelectedApp(app)}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer group transition-all">
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {getName(app).substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold">{getName(app)}</div>
                                                <div className="text-xs text-muted-foreground">{getEmail(app)}</div>
                                            </div>
                                        </div>
                                        <Badge variant={app.status === 'Selected' ? 'default' : app.status === 'Rejected' ? 'destructive' : 'secondary'}>
                                            {app.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="settings">
                <Card>
                    <CardHeader><CardTitle>Assessment Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Exam Title</Label><Input value={assessment.title} onChange={(e) => setAssessment({...assessment, title: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Duration (Minutes)</Label><Input type="number" value={assessment.duration_minutes} onChange={(e) => setAssessment({...assessment, duration_minutes: parseInt(e.target.value)})} /></div>
                        </div>
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-semibold flex items-center justify-between">
                                Questions 
                                <Button variant="outline" size="sm" onClick={() => setAssessment({...assessment, questions: [...assessment.questions, { title: "", problem_text: "", test_input: "", test_output: "", points: 10 }]})}>
                                    <Plus className="w-4 h-4 mr-2"/> Add Question
                                </Button>
                            </h3>
                            {assessment.questions.map((q, idx) => (
                                <div key={idx} className="p-4 border rounded-lg bg-secondary/10 space-y-3 relative">
                                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-red-500" onClick={() => {
                                        const newQ = [...assessment.questions]; newQ.splice(idx, 1); setAssessment({...assessment, questions: newQ})
                                    }}><Trash2 className="w-4 h-4" /></Button>
                                    <Input placeholder="Question Title" value={q.title} onChange={(e) => { const newQ = [...assessment.questions]; newQ[idx].title = e.target.value; setAssessment({...assessment, questions: newQ}) }}/>
                                    <Textarea placeholder="Problem Description" value={q.problem_text} onChange={(e) => { const newQ = [...assessment.questions]; newQ[idx].problem_text = e.target.value; setAssessment({...assessment, questions: newQ}) }}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input placeholder="Input" value={q.test_input} onChange={(e) => { const newQ = [...assessment.questions]; newQ[idx].test_input = e.target.value; setAssessment({...assessment, questions: newQ}) }}/>
                                        <Input placeholder="Output" value={q.test_output} onChange={(e) => { const newQ = [...assessment.questions]; newQ[idx].test_output = e.target.value; setAssessment({...assessment, questions: newQ}) }}/>
                                    </div>
                                </div>
                            ))}
                            <Button onClick={handleSaveAssessment} className="w-full"><Save className="w-4 h-4 mr-2" /> Save Assessment</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <Sheet open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <SheetContent className="sm:max-w-xl overflow-y-auto w-full p-0 gap-0">
                {selectedApp && (
                    <>
                    <div className="bg-muted/40 p-6 border-b">
                        <SheetHeader>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border-2 border-background">
                                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                                        {getName(selectedApp).substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <SheetTitle className="text-xl">{getName(selectedApp)}</SheetTitle>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" />
                                        {getEmail(selectedApp)}
                                    </div>
                                    <Badge variant="outline" className="mt-1">{selectedApp.status}</Badge>
                                </div>
                            </div>
                        </SheetHeader>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* AI ANALYSIS CARD */}
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2 text-primary">
                                <Sparkles className="w-4 h-4" /> AI Analysis
                            </h3>
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-sm leading-relaxed text-gray-700 shadow-sm">
                                {getReasoning(selectedApp)}
                            </div>
                        </div>

                        {/* SKILLS */}
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <BrainCircuit className="w-4 h-4 text-muted-foreground" /> Detected Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(getSkills(selectedApp)) 
                                    ? getSkills(selectedApp).map((skill: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="px-3 py-1 font-normal bg-secondary/50 hover:bg-secondary">
                                            {skill.trim()}
                                        </Badge>
                                    ))
                                    : (getSkills(selectedApp) || "").split(',').map((skill: string, i: number) => (
                                        skill && <Badge key={i} variant="secondary" className="px-3 py-1 font-normal bg-secondary/50 hover:bg-secondary">
                                            {skill.trim()}
                                        </Badge>
                                    ))
                                }
                            </div>
                        </div>

                        {/* DOCUMENTS */}
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" /> Documents
                            </h3>
                            {selectedApp.resume_url ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 rounded text-red-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium">Resume.pdf</p>
                                            <p className="text-xs text-muted-foreground">Original Application</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={getResumeLink(selectedApp.resume_url)} target="_blank" rel="noopener noreferrer">
                                            View <ExternalLink className="w-3 h-3 ml-2" />
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No resume uploaded.</p>
                            )}
                        </div>

                        {/* ACTIONS FOOTER */}
                        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t">
                            <Button 
                                variant="destructive" 
                                className="w-full"
                                disabled={updating} 
                                onClick={() => updateStatus(selectedApp.id, 'Rejected')}
                            >
                                {updating ? <Loader2 className="animate-spin w-4 h-4"/> : <><XCircle className="w-4 h-4 mr-2" /> Reject Candidate</>}
                            </Button>
                            <Button 
                                className="w-full bg-green-600 hover:bg-green-700" 
                                disabled={updating} 
                                onClick={() => updateStatus(selectedApp.id, 'Interview')}
                            >
                                {updating ? <Loader2 className="animate-spin w-4 h-4"/> : <><CheckCircle className="w-4 h-4 mr-2" /> Accept for Interview</>}
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