"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, DollarSign, Loader2 } from "lucide-react"

export default function JobsPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Application State
  const [selectedJob, setSelectedJob] = useState<number | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 1. Fetch Jobs from Backend (Port 8000)
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/jobs')
      .then(res => res.json())
      .then(data => { 
          if (Array.isArray(data)) {
            setJobs(data); 
          } else {
            console.error("API returned non-array:", data)
            setJobs([]);
          }
          setLoading(false); 
      })
      .catch(err => {
          console.error("Failed to fetch jobs:", err);
          setLoading(false);
      })
  }, [])

  // 2. Handle Application Submit
  const handleApplySubmit = async () => {
    if (!user || !selectedJob || !resumeFile) {
        alert("Please select a job and upload a resume.");
        return;
    }

    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append("file", resumeFile)
    // IMPORTANT: Explicitly convert ID to string for FormData
    formData.append("job_id", selectedJob.toString()) 

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/candidates/${user.id}/resume`, {
        method: "POST",
        body: formData,
        headers: {
            "X-User": user.id 
        }
      })

      if (res.ok) {
        alert("Application submitted successfully!")
        setDialogOpen(false)
        setResumeFile(null)
      } else {
        // Parse error message so we don't get [object Object]
        const errorData = await res.json();
        console.error("Upload Error:", errorData);
        
        // Show the specific error detail from FastAPI
        const errorMessage = errorData.detail 
            ? JSON.stringify(errorData.detail) 
            : "Unknown server error";
            
        alert(`Failed: ${errorMessage}`);
      }
    } catch (e: any) {
      console.error(e)
      alert(`Network Error: ${e.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold">Open Roles</h1>

      {/* --- APPLICATION DIALOG --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Apply for this Position</DialogTitle>
                <DialogDescription>Upload your resume to apply. Our AI will scan it instantly.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid w-full items-center gap-1.5">
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
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- JOB LISTINGS --- */}
      <div className="grid grid-cols-1 gap-4">
        {loading && <p className="text-muted-foreground">Loading open roles...</p>}
        {!loading && jobs.length === 0 && <p className="text-muted-foreground">No jobs found. Check if the backend is running on port 8000.</p>}
        
        {jobs.map((job) => (
            <Card key={job.id} className="bg-card border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" /> {job.company}
                        <Badge variant="secondary" className="ml-2">{job.type}</Badge>
                    </div>
                  </div>
                  <Button onClick={() => { setSelectedJob(job.id); setDialogOpen(true); }}>
                    Apply Now
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salary}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {job.skills && typeof job.skills === 'string' 
                        ? job.skills.split(',').map((skill: string) => <Badge key={skill} variant="outline">{skill.trim()}</Badge>)
                        : null
                    }
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}