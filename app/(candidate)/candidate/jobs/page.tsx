"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MapPin, DollarSign, Building2, Check, Loader2, RefreshCw, CheckCircle2 } from "lucide-react"
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs"

export default function CandidateJobsPage() {
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const [initialJobs, setInitialJobs] = useState<any[]>([])
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set())
    const [search, setSearch] = useState("")

    // ✨ REALTIME: Use the hook for automatic updates
    const jobs = useRealtimeJobs(initialJobs)

    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [viewingJob, setViewingJob] = useState<any>(null) // For job details view
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [applying, setApplying] = useState(false)

    // Fetch Jobs
    const fetchJobs = useCallback(async () => {
        try {
            console.log("Fetching public job feed...")
            const token = await getToken()

            // FIX: Changed to /api/jobs/feed to see ALL jobs (not just my own)
            const res = await fetch("http://127.0.0.1:8000/api/jobs/feed", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            const data = await res.json()
            setInitialJobs(Array.isArray(data) ? data : [])
        } catch (e) { console.error("Failed to fetch jobs") }
    }, [getToken])

    // Fetch Applications
    const fetchApplications = useCallback(async () => {
        if (!user) return
        try {
            const token = await getToken()

            const res = await fetch(`http://127.0.0.1:8000/api/candidate/applications?candidateId=${user.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            const data = await res.json()
            if (Array.isArray(data)) {
                const ids = new Set<number>(data.map((app: any) => Number(app.job_id)))
                setAppliedJobIds(ids)
            }
        } catch (err) { console.error("Failed to fetch apps", err) }
    }, [user, getToken])

    useEffect(() => {
        if (isLoaded) {
            fetchJobs()
            if (user) fetchApplications()
        }
    }, [isLoaded, user, fetchJobs, fetchApplications])

    const handleApply = async () => {
        if (!viewingJob || !user || !resumeFile) return
        setApplying(true)

        try {
            const token = await getToken()

            const formData = new FormData()
            formData.append("job_id", viewingJob.id)
            formData.append("candidate_id", user.id)
            formData.append("candidate_name", user.fullName || "Candidate")
            formData.append("candidate_email", user.primaryEmailAddress?.emailAddress || "")
            formData.append("resume", resumeFile)

            const res = await fetch("http://127.0.0.1:8000/api/applications/apply", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (res.ok) {
                setAppliedJobIds(prev => new Set(prev).add(Number(viewingJob.id)))
                setViewingJob(null)
                setResumeFile(null)
                alert("Applied successfully!")
            } else {
                const err = await res.json()
                alert(`Failed to apply: ${err.detail || "Unknown error"}`)
            }
        } catch (e) { console.error(e) }
        finally { setApplying(false) }
    }

    const filteredJobs = jobs.filter(j =>
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.company?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Explore Jobs</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Find your next role.
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live
                        </span>
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchJobs}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10 h-12" placeholder="Search role or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No jobs found.
                    </div>
                ) : (
                    filteredJobs.map((job, index) => {
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
                                        <div className="text-xs text-muted-foreground pt-2">Posted by: {job.recruiter_name || job.company}</div>
                                    </div>
                                    <Button
                                        className="w-full mt-4"
                                        variant={isApplied ? "secondary" : "default"}
                                        disabled={isApplied}
                                        onClick={() => setViewingJob(job)}
                                    >
                                        {isApplied ? <><Check className="w-4 h-4 mr-2" /> Applied</> : "View Details"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Job Details Dialog */}
            <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    {viewingJob && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-bold tracking-tight mb-2">{viewingJob.title}</DialogTitle>
                                <div className="flex flex-col gap-4">
                                    {/* Company & Location Info */}
                                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                                        <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                            <Building2 className="w-4 h-4" />
                                            <span className="font-medium">{viewingJob.company}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                            <MapPin className="w-4 h-4" />
                                            <span>{viewingJob.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                            <DollarSign className="w-4 h-4" />
                                            <span>{viewingJob.salary}</span>
                                        </div>
                                    </div>

                                    {/* Job Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-sm mt-1 border-y py-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Job Type</p>
                                            <p className="font-medium">{viewingJob.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Posted by</p>
                                            <p className="font-medium">{viewingJob.recruiter_name || viewingJob.company}</p>
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-6 pt-4">
                                {/* Description */}
                                {/* Description */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-xl flex items-center gap-2">
                                        Description
                                    </h3>
                                    <p className="text-base text-muted-foreground leading-7">
                                        {viewingJob.description}
                                    </p>
                                </div>

                                {viewingJob.requirements && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-xl">Requirements</h3>
                                        <div className="text-base text-muted-foreground leading-7 whitespace-pre-wrap p-4 bg-muted/20 rounded-lg border">
                                            {viewingJob.requirements}
                                        </div>
                                    </div>
                                )}

                                {/* Padding before application section */}
                                <div className="py-2"></div>

                                {/* Application Section - Stick to bottom of scroll? Or just focused at bottom */}
                                {!appliedJobIds.has(Number(viewingJob.id)) && (
                                    <div className="mt-8 space-y-4 pt-6 border-t">
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">Ready to apply?</h3>
                                            <p className="text-muted-foreground text-sm mb-4">Upload your resume to submit your application.</p>
                                        </div>

                                        <div className="space-y-4 p-5 border rounded-xl bg-card shadow-sm hover:border-primary/50 transition-colors">
                                            <div className="space-y-3">
                                                <Label htmlFor="resume-upload" className="font-medium">Upload Resume (PDF)</Label>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        id="resume-upload"
                                                        type="file"
                                                        accept=".pdf"
                                                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                                        disabled={applying}
                                                        className="cursor-pointer file:cursor-pointer file:text-primary file:font-medium"
                                                    />
                                                </div>
                                                {resumeFile && (
                                                    <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md flex items-center gap-2 border border-green-200 dark:border-green-800">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="font-medium">{resumeFile.name} ready to upload</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                className="w-full h-11 text-base font-semibold shadow-md"
                                                onClick={handleApply}
                                                disabled={!resumeFile || applying}
                                                size="lg"
                                            >
                                                {applying ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                        Sending Application...
                                                    </>
                                                ) : (
                                                    "Submit Application"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Already Applied Message */}
                                {appliedJobIds.has(Number(viewingJob.id)) && (
                                    <div className="p-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <h3 className="font-semibold text-lg text-green-800 dark:text-green-300">Application Received</h3>
                                            <p className="text-green-700 dark:text-green-400">
                                                You have already applied to this position.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>


                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}