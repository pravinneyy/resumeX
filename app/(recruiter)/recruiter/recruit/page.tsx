"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Briefcase, MapPin, DollarSign, CheckCircle2 } from "lucide-react"

export default function PostJobPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    if (!isLoaded || !user) {
      alert("You must be logged in to post a job.")
      return
    }

    setLoading(true)

    const formData = new FormData(event.currentTarget)
    
    const jobData = {
      title: formData.get("title"),
      company: formData.get("company"),
      location: formData.get("location"),
      salary: formData.get("salary"),
      type: formData.get("type"),
      skills: formData.get("skills"), 
      recruiterId: user.id 
    }

    try {
      // FIX: Changed Port from 5000 to 8000
      const response = await fetch("http://127.0.0.1:8000/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
            router.push("/recruiter") 
        }, 2000)
      } else {
        const errorData = await response.json()
        alert(`Failed to post job: ${errorData.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error connecting to the server. Is the Backend running on Port 8000?")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] animate-fade-in">
        <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Job Posted Successfully!</h2>
        <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Post a New Job</h1>
        <p className="text-muted-foreground">Find the perfect candidate by creating a detailed job listing.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Enter the core information about the role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="title" name="title" placeholder="e.g. Senior Frontend Engineer" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" name="company" placeholder="e.g. Acme Corp" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="location" name="location" placeholder="e.g. New York, Remote" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="salary" name="salary" placeholder="e.g. $120k - $150k" className="pl-9" required />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="type">Employment Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (Comma separated)</Label>
                <Input id="skills" name="skills" placeholder="e.g. React, Python, AWS" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Describe the role, responsibilities, and requirements..." 
                className="min-h-[150px]"
              />
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground" disabled={loading}>
                {loading ? "Posting..." : "Post Job Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}