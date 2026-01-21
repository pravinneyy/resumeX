"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Briefcase, BarChart3 } from "lucide-react" // Added BarChart3

export default function RecruiterDashboard() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "Remote",
    salary: "$100k - $120k",
    type: "Full-time",
    skills: "Python, React, SQL" 
  })

  useEffect(() => {
    if (isLoaded && user) {
        fetch("http://127.0.0.1:8000/api/jobs")
            .then(res => res.json())
            .then(data => setJobs(Array.isArray(data) ? data : []))
    }
  }, [isLoaded, user])

  const handleCreateJob = async () => {
    if (!user) return alert("You must be logged in")

    try {
        const res = await fetch("http://127.0.0.1:8000/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...formData,
                recruiter_id: user.id
            })
        })

        if (res.ok) {
            setOpen(false)
            alert("Job Posted!")
            window.location.reload()
        } else {
            const errorData = await res.json()
            console.error("Validation Error:", errorData) 
            alert("Failed to create job.")
        }
    } catch (error) {
        console.error(error)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Recruiter Dashboard</h1>
                <p className="text-muted-foreground">Manage your job postings and candidates.</p>
            </div>
            
            <div className="flex gap-2">
                {/* NEW: Analytics Button */}
                <Button variant="outline" className="gap-2" onClick={() => router.push("/recruiter/analytics")}>
                    <BarChart3 className="w-4 h-4"/> Global Analytics
                </Button>

                {/* POST JOB MODAL */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="w-4 h-4"/> Post New Job</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create Job Posting</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Job Title</Label>
                                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Senior React Developer" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Company</Label>
                                <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Acme Corp" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Location</Label>
                                    <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Salary Range</Label>
                                    <Input value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Required Skills (comma separated)</Label>
                                <Input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="Python, AWS, Docker"/>
                            </div>
                            <div className="grid gap-2">
                                <Label>Job Type</Label>
                                <Select onValueChange={(val) => setFormData({...formData, type: val})} defaultValue={formData.type}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateJob}>Create Job</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        {/* JOB LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
                <Card 
                    key={job.id} 
                    className="hover:border-primary transition-all cursor-pointer group"
                    onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                >
                    <CardHeader>
                        <CardTitle className="group-hover:text-primary transition-colors">{job.title}</CardTitle>
                        <CardDescription>{job.company} • {job.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" /> {job.type}
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" /> View Applicants
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  )
}