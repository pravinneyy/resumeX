"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Code, XCircle } from "lucide-react"

export default function InterviewsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])

  useEffect(() => {
    if (user) {
        fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`)
            .then(res => res.json())
            .then(data => setApplications(data))
            .catch(console.error)
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
        
        {applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">You haven't applied to any jobs yet.</div>
        ) : (
            <div className="grid gap-4">
                {applications.map(app => (
                    <Card key={app.id} className="flex flex-col md:flex-row items-center justify-between p-2">
                        <CardHeader className="flex-1">
                            <CardTitle>{app.job_title}</CardTitle>
                            <CardDescription>{app.company_name} • Applied on {new Date(app.applied_at).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex items-center gap-6 md:justify-end flex-1 pt-6 md:pt-0">
                            
                            {getStatusBadge(app.status)}

                            {/* Show START button ONLY if accepted for Interview/Assessment */}
                            {(app.status === 'Assessment' || app.status === 'Interview') && (
                                <Button 
                                    className="gap-2 animate-pulse" 
                                    onClick={() => router.push(`/candidate/interviews/${app.job_id}/ide`)}
                                >
                                    <Code className="w-4 h-4" /> Start Exam
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
    </div>
  )
}