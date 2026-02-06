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
import { Plus, MapPin, Users, Loader2, Briefcase, Building2, DollarSign, FileText, Globe, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs"

export default function RecruiterDashboard() {
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth() // <--- 2. ADDED: Get token helper
    const router = useRouter()
    const [initialJobs, setInitialJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

    // ✨ REALTIME: Use the hook for automatic updates
    const jobs = useRealtimeJobs(initialJobs)

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
            // <--- 5. ATTACH HEADER
            const res = await fetch(`${API_URL}/api/jobs`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            const data = await res.json()
            setInitialJobs(Array.isArray(data) ? data : []) // Set initial data for realtime hook
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleCreateJob = async () => {
        if (!user) return
        setCreating(true)
        try {
            const token = await getToken() // <--- 6. GET TOKEN FOR POST

            const res = await fetch(`${API_URL}/api/jobs`, {
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
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2 text-primary/80">
                                                <Users className="w-4 h-4" />
                                                <span>{job.applicant_count || 0} Applicants</span>
                                            </div>
                                            {(job.recruited_count > 0) && (
                                                <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/5">
                                                    {job.recruited_count} Recruited
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-primary/5 p-6 border-b border-primary/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
                                <Briefcase className="w-6 h-6" />
                                Post a New Opportunity
                            </DialogTitle>
                            <CardDescription className="text-base">
                                Find the perfect candidate for your team.
                            </CardDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Main Details */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Job Title</Label>
                                <Input
                                    placeholder="e.g. Senior Frontend Engineer"
                                    value={newJob.title}
                                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                                    className="bg-muted/30 focus-visible:bg-background transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company</Label>
                                <Input
                                    placeholder="Company Name"
                                    value={newJob.company}
                                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                                    className="bg-muted/30 focus-visible:bg-background transition-colors"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Job Description</Label>
                            <Textarea
                                placeholder="Describe the role, responsibilities, and what makes your team great..."
                                className="min-h-[120px] bg-muted/30 focus-visible:bg-background transition-colors resize-none"
                                value={newJob.description}
                                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                            />
                        </div>

                        {/* Specifics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</Label>
                                <Input
                                    placeholder="e.g. Remote / New York"
                                    value={newJob.location}
                                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Salary Range</Label>
                                <Input
                                    placeholder="e.g. $100k - $120k"
                                    value={newJob.salary}
                                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Job Type</Label>
                                <Select value={newJob.type} onValueChange={(val) => setNewJob({ ...newJob, type: val })}>
                                    <SelectTrigger className="bg-muted/30">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                        <SelectItem value="Part-time">Part-time</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                        <SelectItem value="Freelance">Freelance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-dashed">
                            <Label className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Required Skills</Label>
                            <Input
                                placeholder="e.g. React, Python, AWS (comma separated)"
                                value={newJob.skills}
                                onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                                className="bg-background"
                            />
                            <p className="text-xs text-muted-foreground">Tip: Add at least 3 main skills to help candidates match with your job.</p>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 bg-gray-50/50 dark:bg-zinc-900/50">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="gap-2">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateJob} disabled={creating} className="bg-primary hover:bg-primary/90 gap-2 px-6">
                            {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <><Plus className="w-4 h-4" /> Publish Job</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}