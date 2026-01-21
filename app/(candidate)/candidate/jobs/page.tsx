"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MapPin, DollarSign, Building2, Check, Loader2 } from "lucide-react"

export default function CandidateJobsPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<any[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  
  // Modal State
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/jobs")
        .then(res => res.json())
        .then(data => setJobs(Array.isArray(data) ? data : []))

    if (user) {
        fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                const ids = new Set<number>(data.map((app: any) => Number(app.job_id)))
                setAppliedJobIds(ids)
            })
            .catch(err => console.error("Failed to fetch apps", err))
    }
  }, [user])

  const handleApply = async () => {
    if (!selectedJob || !user || !resumeFile) return
    setApplying(true)
    
    const formData = new FormData()
    formData.append("job_id", selectedJob.id)
    formData.append("candidate_id", user.id)
    formData.append("candidate_name", user.fullName || "Candidate")
    formData.append("candidate_email", user.primaryEmailAddress?.emailAddress || "")
    formData.append("resume", resumeFile)

    try {
        const res = await fetch("http://127.0.0.1:8000/api/applications/apply", {
            method: "POST", body: formData
        })
        if (res.ok) {
            setAppliedJobIds(prev => new Set(prev).add(Number(selectedJob.id)))
            setSelectedJob(null)
            setResumeFile(null)
            alert("Applied successfully!")
        } else {
            alert("Failed to apply.")
        }
    } catch (e) { console.error(e) } 
    finally { setApplying(false) }
  }

  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div>
            <h1 className="text-3xl font-bold">Explore Jobs</h1>
            <p className="text-muted-foreground">Find your next role.</p>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 h-12" placeholder="Search role or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map(job => {
                const isApplied = appliedJobIds.has(Number(job.id))
                return (
                    <Card key={job.id} className="hover:border-primary transition-all flex flex-col justify-between group">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="group-hover:text-primary transition-colors">{job.title}</CardTitle>
                                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                        <Building2 className="w-3 h-3" /> <span className="text-sm">{job.company}</span>
                                    </div>
                                </div>
                                <Badge variant="outline">{job.type}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location}</div>
                                <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> {job.salary}</div>
                            </div>
                            <Button 
                                className="w-full mt-4" 
                                variant={isApplied ? "secondary" : "default"}
                                disabled={isApplied}
                                onClick={() => setSelectedJob(job)}
                            >
                                {isApplied ? <><Check className="w-4 h-4 mr-2"/> Applied</> : "Apply Now"}
                            </Button>
                        </CardContent>
                    </Card>
                )
            })}
        </div>

        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
            <DialogContent>
                <DialogHeader><DialogTitle>Apply for {selectedJob?.title}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Resume (PDF)</Label>
                        {/* FIX: Visible File Input */}
                        <Input 
                            type="file" 
                            accept=".pdf"
                            className="cursor-pointer"
                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setSelectedJob(null)}>Cancel</Button>
                    <Button onClick={handleApply} disabled={!resumeFile || applying}>
                        {applying ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Processing...</> : "Submit Application"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}