"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, User } from "lucide-react"

interface Application {
  id: number
  job_title: string
  candidate_name: string
  candidate_email: string
  status: string
  resume_url: string | null
  skills: string[]
}

export default function RecruiterDashboard() {
  const { user } = useUser()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
       fetch(`http://127.0.0.1:8000/api/recruiter/applications?recruiterId=${user.id}`)
         .then(res => res.json())
         .then(data => {
            if (Array.isArray(data)) {
                setApplications(data)
            } else {
                setApplications([])
            }
            setLoading(false)
         })
         .catch(err => {
             console.error("Failed to fetch applications:", err)
             setLoading(false)
         })
    }
  }, [user])

  return (
    <div className="space-y-6 animate-fade-in p-6">
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
       </div>
       
       <div className="grid grid-cols-1 gap-6">
         <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Candidates who have applied to your job postings.</CardDescription>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <p className="text-muted-foreground">Loading applications...</p>
               ) : applications.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center border border-dashed rounded-lg">No applications received yet.</p>
               ) : (
                  <div className="space-y-4">
                     {applications.map((app) => (
                        <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors">
                           
                           {/* Candidate Info */}
                           <div className="flex items-start gap-4 mb-4 md:mb-0">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                 <User className="w-6 h-6" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-lg">{app.candidate_name}</h4>
                                 <p className="text-sm text-muted-foreground">Applied for: <span className="font-medium text-foreground">{app.job_title}</span></p>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    {/* Show Extracted Skills */}
                                    {app.skills && app.skills.length > 0 ? (
                                        app.skills.map((skill, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">No skills detected</span>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Actions */}
                           <div className="flex items-center gap-3">
                              <Badge variant={app.status === 'Applied' ? 'secondary' : 'default'}>{app.status}</Badge>
                              
                              {app.resume_url && (
                                <a href={`http://127.0.0.1:8000/${app.resume_url}`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <FileText className="w-4 h-4" /> View Resume
                                    </Button>
                                </a>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </CardContent>
         </Card>
       </div>
    </div>
  )
}