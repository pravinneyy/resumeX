"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, Code, XCircle, BrainCircuit, ArrowRight, Loader2, AlertCircle } from "lucide-react"

export default function InterviewsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedJob, setSelectedJob] = useState<any | null>(null)

  useEffect(() => {
    if (user) {
        fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch")
                return res.json()
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setApplications(data)
                } else {
                    setApplications([]) 
                }
            })
            .catch(err => {
                console.error("Error:", err)
                setApplications([])
            })
            .finally(() => setLoading(false))
    }
  }, [user])

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'Rejected': return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3"/> Rejected</Badge>
          case 'Interview': return <Badge className="bg-green-600 hover:bg-green-700 gap-1">Interview Selected</Badge>
          case 'Assessment': return <Badge variant="default">Assessment Pending</Badge>
          default: return <Badge variant="secondary">{status}</Badge>
      }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold">My Applications</h1>
        
        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>
        ) : applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50"/>
                <p>No applications found.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {applications.map(app => (
                    <Card key={app.id} className="flex flex-col md:flex-row items-center justify-between p-2">
                        <CardHeader className="flex-1">
                            <CardTitle>{app.job_title}</CardTitle>
                            <CardDescription>{app.company_name} • Applied on {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}</CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex items-center gap-6 md:justify-end flex-1 pt-6 md:pt-0">
                            {getStatusBadge(app.status)}

                            {(app.status === 'Assessment' || app.status === 'Interview') && (
                                <Button 
                                    className="gap-2 bg-primary hover:bg-primary/90" 
                                    onClick={() => setSelectedJob(app)}
                                >
                                    <Code className="w-4 h-4" /> Start Assessment
                                </Button>
                            )}
                            
                            {app.status === 'Applied' && (
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Awaiting Review
                                </span>
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
                    <DialogDescription>Please complete the required modules.</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    {/* OPTION 1: CODING TEST */}
                    <div 
                        onClick={() => router.push(`/candidate/interviews/${selectedJob?.job_id}/ide`)} 
                        className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-secondary/50 hover:border-primary transition-all group"
                    >
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Code className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">Coding Challenge</h3>
                            <p className="text-sm text-muted-foreground">Technical Test</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all"/>
                    </div>

                    {/* OPTION 2: PSYCHOMETRIC TEST */}
                    <div 
                        onClick={() => router.push(`/candidate/interviews/${selectedJob?.job_id}/psychometric`)}
                        className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-secondary/50 hover:border-purple-500 transition-all group"
                    >
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold">Personality Fit</h3>
                            <p className="text-sm text-muted-foreground">Behavioral Questions (10 mins)</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all"/>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}