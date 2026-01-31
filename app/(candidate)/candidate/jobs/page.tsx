"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MapPin, DollarSign, Building2, Check, Loader2, RefreshCw } from "lucide-react"
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

export default function CandidateJobsPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<any[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [applying, setApplying] = useState(false)
  const [isRealtime, setIsRealtime] = useState(false)

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
      try {
        console.log("🔄 Fetching jobs...")
        const res = await fetch("http://127.0.0.1:8000/api/jobs")
        const data = await res.json()
        setJobs(Array.isArray(data) ? data : [])
      } catch (e) { console.error("Failed to fetch jobs") }
  }, [])

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    if (!user) return
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`)
        const data = await res.json()
        if (Array.isArray(data)) {
            const ids = new Set<number>(data.map((app: any) => Number(app.job_id)))
            setAppliedJobIds(ids)
        }
    } catch (err) { console.error("Failed to fetch apps", err) }
  }, [user])

  useEffect(() => {
    fetchJobs()
    if (user) fetchApplications()
    
    if (!supabase) return

    console.log("📡 Attempting Realtime Connection...")
    const channel = supabase
        .channel('public-jobs-channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'jobs' }, 
            (payload) => {
                console.log("🔔 NEW JOB RECEIVED:", payload)
                fetchJobs() // Trigger refresh
            }
        )
        .subscribe((status) => {
            console.log(`🔌 Realtime Status: ${status}`)
            if (status === 'SUBSCRIBED') setIsRealtime(true)
        })

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchJobs, fetchApplications])

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
        const res = await fetch("http://127.0.0.1:8000/api/applications/apply", { method: "POST", body: formData })
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
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Explore Jobs</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                    Find your next role.
                    {isRealtime ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">(Connecting...)</span>
                    )}
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 h-12" placeholder="Search role..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job, index) => {
                const isApplied = appliedJobIds.has(Number(job.id))
                return (
                    <Card key={job.id} className="hover:border-primary transition-all flex flex-col justify-between group animate-in fade-in slide-in-from-bottom-4 duration-700"
                        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{job.title}</CardTitle>
                                    <div className="flex items-center gap-1 text-muted-foreground mt-1"><Building2 className="w-3 h-3" /> <span className="text-sm">{job.company}</span></div>
                                </div>
                                <Badge variant="outline">{job.type}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location}</div>
                                <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> {job.salary}</div>
                            </div>
                            <Button className="w-full mt-4" variant={isApplied ? "secondary" : "default"} disabled={isApplied} onClick={() => setSelectedJob(job)}>
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
                <div className="space-y-2 py-4"><Label>Resume (PDF)</Label><Input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)}/></div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setSelectedJob(null)}>Cancel</Button>
                    <Button onClick={handleApply} disabled={!resumeFile || applying}>{applying ? <Loader2 className="w-4 h-4 animate-spin"/> : "Submit"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}