"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, DollarSign, Building2 } from "lucide-react"

const jobs = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "TechFlow Systems",
    location: "Remote",
    salary: "$140k - $160k",
    type: "Full-time",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"],
    posted: "2 days ago"
  },
  {
    id: 2,
    title: "Backend Developer (Go)",
    company: "CloudScale Inc",
    location: "New York, NY",
    salary: "$130k - $150k",
    type: "Hybrid",
    skills: ["Go", "Kubernetes", "AWS", "gRPC"],
    posted: "1 day ago"
  },
  {
    id: 3,
    title: "Full Stack Developer",
    company: "StartupAI",
    location: "San Francisco, CA",
    salary: "$150k - $180k",
    type: "On-site",
    skills: ["Python", "Django", "React", "PostgreSQL"],
    posted: "Just now"
  }
]

export default function JobsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Open Roles</h1>
          <p className="text-muted-foreground">Find the perfect job matching your skill set.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs or skills..." className="pl-9 bg-secondary/50 border-border" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="bg-card border-border hover:border-primary/50 transition-all group">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{job.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" /> {job.company}
                    <span>•</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">{job.type}</span>
                  </div>
                </div>
                <Button>Apply Now</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salary}</span>
                <span className="flex items-center gap-1 text-xs ml-auto">Posted {job.posted}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}