"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs" // <--- 1. Import useAuth
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Code, XCircle, BrainCircuit, ArrowRight, Loader2, CheckCircle2 } from "lucide-react"

export default function InterviewsPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth() // <--- 2. Get token helper
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  
  // Track completion status locally for UI feedback
  const [completion, setCompletion] = useState<{technical: boolean, psycho: boolean}>({ technical: false, psycho: false })

  // 1. Fetch Applications (Secured)
  useEffect(() => {
    const fetchApps = async () => {
        if (!user || !isLoaded) return

        try {
            const token = await getToken() // <--- 3. Get Token
            
            const res = await fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}` // <--- Attach Header
                }
            })
            
            const data = res.ok ? await res.json() : []
            setApplications(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    fetchApps()
  }, [user, isLoaded, getToken])

  // 2. Fetch Completion Status (Secured)
  useEffect(() => {
    const fetchStatus = async () => {
        if (!selectedJob || !user) return

        try {
            const token = await getToken() // <--- Get Token
            
            // Note: Ensure your backend endpoint for 'status' also expects a token!
            // If you haven't secured that specific route yet, adding the header won't hurt,
            // but you should update the backend to verify it.
            const res = await fetch(`http://127.0.0.1:8000/api/assessments/status/${selectedJob.job_id}/${user.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}` // <--- Attach Header
                }
            })
            
            const data = await res.json()
            setCompletion({
                technical: data.technical_completed,
                psycho: data.psychometric_completed
            })
        } catch (err) {
            console.error(err)
            setCompletion({ technical: false, psycho: false })
        }
    }

    fetchStatus()
  }, [selectedJob, user, getToken])

  const getStatusBadge = (status: string) => {
      if(status === 'Rejected') return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3"/> Rejected</Badge>
      if(status === 'Interview') return <Badge className="bg-green-600 gap-1">Interview Selected</Badge>
      if(status === 'Assessment') return <Badge variant="default">Assessment Pending</Badge>
      return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold">My Applications</h1>
        
        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>
        ) : applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><p>No applications found.</p></div>
        ) : (
            <div className="grid gap-4">
                {applications.map(app => (
                    <Card key={app.id} className="flex flex-col md:flex-row items-center justify-between p-2">
                        <CardHeader className="flex-1">
                            <CardTitle>{app.job_title}</CardTitle>
                            <CardDescription>{app.company_name}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-6 md:justify-end flex-1 pt-6 md:pt-0">
                            {getStatusBadge(app.status)}
                            {(app.status === 'Assessment' || app.status === 'Interview') && (
                                <Button className="gap-2" onClick={() => setSelectedJob(app)}>
                                    <Code className="w-4 h-4" /> Start Assessment
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select Assessment Module</DialogTitle>
                    <DialogDescription>You must complete BOTH modules to finish.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* CODING TEST */}
                    <div onClick={() => !completion.technical && router.push(`/candidate/interviews/${selectedJob?.job_id}/ide`)} 
                        className={`flex items-center gap-4 p-4 border rounded-lg transition-all group ${completion.technical ? 'opacity-50 cursor-not-allowed bg-muted' : 'cursor-pointer hover:bg-secondary/50 hover:border-primary'}`}>
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            {completion.technical ? <CheckCircle2 className="w-6 h-6 text-green-600"/> : <Code className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">Coding Challenge</h3>
                            <p className="text-sm text-muted-foreground">{completion.technical ? "Completed" : "Technical Test"}</p>
                        </div>
                        {!completion.technical && <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary"/>}
                    </div>

                    {/* PSYCHOMETRIC TEST */}
                    <div onClick={() => !completion.psycho && router.push(`/candidate/interviews/${selectedJob?.job_id}/psychometric`)}
                        className={`flex items-center gap-4 p-4 border rounded-lg transition-all group ${completion.psycho ? 'opacity-50 cursor-not-allowed bg-muted' : 'cursor-pointer hover:bg-secondary/50 hover:border-purple-500'}`}>
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            {completion.psycho ? <CheckCircle2 className="w-6 h-6 text-green-600"/> : <BrainCircuit className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">Personality Fit</h3>
                            <p className="text-sm text-muted-foreground">{completion.psycho ? "Completed" : "Behavioral Questions"}</p>
                        </div>
                        {!completion.psycho && <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500"/>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}