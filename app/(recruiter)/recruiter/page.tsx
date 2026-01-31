"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Briefcase, MapPin, Users, Loader2 } from "lucide-react"

export default function RecruiterDashboard() {
  const { user } = useUser()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create Job State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newJob, setNewJob] = useState({
      title: "", company: "", location: "", salary: "", type: "Full-time", skills: "", description: ""
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
     fetchJobs()
  }, [])

  const fetchJobs = async () => {
     try {
         const res = await fetch("http://127.0.0.1:8000/api/jobs")
         const data = await res.json()
         setJobs(Array.isArray(data) ? data : [])
     } catch (e) { console.error(e) } 
     finally { setLoading(false) }
  }

  const handleCreateJob = async () => {
     if (!user) return
     setCreating(true)
     try {
         const res = await fetch("http://127.0.0.1:8000/api/jobs", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                 ...newJob,
                 recruiter_id: user.id
             })
         })
         
         if (res.ok) {
             fetchJobs()
             setIsModalOpen(false)
             // FIX: Clear the form data completely
             setNewJob({ title: "", company: "", location: "", salary: "", type: "Full-time", skills: "", description: "" })
         } else {
             alert("Failed to create job")
         }
     } catch (e) { console.error(e) }
     finally { setCreating(false) }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
                <p className="text-muted-foreground">Manage your job postings and candidates.</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Post New Job
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
                <Card key={job.id} className="hover:border-primary transition-all cursor-pointer group" onClick={() => router.push(`/recruiter/jobs/${job.id}`)}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="group-hover:text-primary transition-colors">{job.title}</CardTitle>
                                <CardDescription>{job.company}</CardDescription>
                            </div>
                            <Badge variant="secondary">{job.type}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location}</div>
                            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> View Applicants</div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle>Post a New Job</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Job Title</Label><Input value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Company</Label><Input value={newJob.company} onChange={(e) => setNewJob({...newJob, company: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Location</Label><Input value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Salary Range</Label><Input value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Required Skills (comma separated)</Label><Input value={newJob.skills} onChange={(e) => setNewJob({...newJob, skills: e.target.value})} /></div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateJob} disabled={creating}>
                        {creating ? <Loader2 className="animate-spin w-4 h-4" /> : "Create Job"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}