"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs" // <--- 1. CHANGED: Import useAuth
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, MapPin, Users, Loader2 } from "lucide-react"

export default function RecruiterDashboard() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth() // <--- 2. ADDED: Get token helper
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create Job State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newJob, setNewJob] = useState({
      title: "", company: "", location: "", salary: "", type: "Full-time", skills: "", description: ""
  })
  const [creating, setCreating] = useState(false)

  // <--- 3. UPDATED: Wait for auth to load before fetching
  useEffect(() => {
     if (isLoaded) {
        fetchJobs()
     }
  }, [isLoaded])

  const fetchJobs = async () => {
     try {
         const token = await getToken() // <--- 4. GET TOKEN
         
         // <--- 5. ATTACH HEADER
         const res = await fetch("http://127.0.0.1:8000/api/jobs", {
             headers: {
                 "Authorization": `Bearer ${token}` 
             }
         })
         const data = await res.json()
         setJobs(Array.isArray(data) ? data : [])
     } catch (e) { console.error(e) } 
     finally { setLoading(false) }
  }

  const handleCreateJob = async () => {
     if (!user) return
     setCreating(true)
     try {
         const token = await getToken() // <--- 6. GET TOKEN FOR POST
         
         const res = await fetch("http://127.0.0.1:8000/api/jobs", {
             method: "POST",
             headers: { 
                 "Content-Type": "application/json",
                 "Authorization": `Bearer ${token}` // <--- 7. ATTACH HEADER
             },
             body: JSON.stringify({
                 ...newJob,
                 // Note: We don't need to send recruiter_id manually anymore
             })
         })
         
         if (res.ok) {
             fetchJobs() // Refresh the list
             setIsModalOpen(false)
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

        {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
                        No jobs posted yet. Create your first one!
                    </div>
                ) : (
                    jobs.map(job => (
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
                    ))
                )}
            </div>
        )}

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