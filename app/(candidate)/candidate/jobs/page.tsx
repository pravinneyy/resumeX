"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function JobsPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/jobs')
      .then(res => res.json())
      .then(data => { setJobs(data); setLoading(false); })
      .catch(err => console.error(err))
  }, [])

  const handleApplySubmit = async () => {
    if (!user || !selectedJob || !resumeFile) return

    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append("resume", resumeFile)
    formData.append("jobId", selectedJob.toString())
    formData.append("candidateId", user.id)
    formData.append("candidateName", user.fullName || "Candidate")
    formData.append("candidateEmail", user.primaryEmailAddress?.emailAddress || "")

    try {
      const res = await fetch("http://127.0.0.1:5000/api/apply", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        alert("Application & Resume sent successfully!")
        setDialogOpen(false)
        setResumeFile(null)
      } else {
        const err = await res.json()
        alert(err.message)
      }
    } catch (e) {
      alert("Error applying")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold">Open Roles</h1>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Apply for Job</DialogTitle>
                <DialogDescription>Upload your resume to apply. Our AI will analyze it for the recruiter.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="resume">Resume (PDF/DOCX)</Label>
                    <Input 
                        id="resume" 
                        type="file" 
                        accept=".pdf,.docx" 
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleApplySubmit} disabled={!resumeFile || isSubmitting}>
                    {isSubmitting ? "Uploading..." : "Submit Application"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
            <Card key={job.id} className="bg-card border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <Button onClick={() => { setSelectedJob(job.id); setDialogOpen(true); }}>
                    Apply Now
                  </Button>
                </div>
              </CardHeader>
            </Card>
        ))}
      </div>
    </div>
  )
}