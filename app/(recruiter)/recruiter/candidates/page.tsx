"use client"

// FIX: Removed DashboardLayout import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Users,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  Download,
  MoreHorizontal,
} from "lucide-react"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const candidates = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    position: "Senior Frontend Developer",
    experience: "6 years",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    status: "In Review",
    appliedDate: "2024-01-15",
    aiScore: 92,
    roundsPassed: 3,
    avatar: "/professional-woman-headshot.png",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "+1 (555) 234-5678",
    location: "New York, NY",
    position: "Full Stack Engineer",
    experience: "4 years",
    skills: ["Node.js", "React", "PostgreSQL", "AWS"],
    status: "Interview Scheduled",
    appliedDate: "2024-01-14",
    aiScore: 88,
    roundsPassed: 2,
    avatar: "/professional-asian-man-headshot.png",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "+1 (555) 345-6789",
    location: "Austin, TX",
    position: "UX Designer",
    experience: "5 years",
    skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
    status: "New",
    appliedDate: "2024-01-16",
    aiScore: 85,
    roundsPassed: 1,
    avatar: "/professional-latina-woman-headshot.png",
  },
  {
    id: 4,
    name: "David Kim",
    email: "d.kim@email.com",
    phone: "+1 (555) 456-7890",
    location: "Seattle, WA",
    position: "Backend Developer",
    experience: "7 years",
    skills: ["Python", "Django", "Kubernetes", "Redis"],
    status: "Technical Round",
    appliedDate: "2024-01-12",
    aiScore: 94,
    roundsPassed: 4,
    avatar: "/professional-korean-man-headshot.png",
  },
  {
    id: 5,
    name: "Jessica Williams",
    email: "j.williams@email.com",
    phone: "+1 (555) 567-8901",
    location: "Chicago, IL",
    position: "Product Manager",
    experience: "8 years",
    skills: ["Agile", "Roadmapping", "Analytics", "Stakeholder Management"],
    status: "Final Round",
    appliedDate: "2024-01-10",
    aiScore: 91,
    roundsPassed: 5,
    avatar: "/professional-black-woman-headshot.png",
  },
  {
    id: 6,
    name: "Alex Thompson",
    email: "a.thompson@email.com",
    phone: "+1 (555) 678-9012",
    location: "Denver, CO",
    position: "DevOps Engineer",
    experience: "5 years",
    skills: ["Docker", "CI/CD", "Terraform", "Linux"],
    status: "In Review",
    appliedDate: "2024-01-13",
    aiScore: 87,
    roundsPassed: 2,
    avatar: "/professional-man-headshot.png",
  },
]

const statusColors: Record<string, string> = {
  New: "bg-blue-500/20 text-blue-400",
  "In Review": "bg-yellow-500/20 text-yellow-400",
  "Interview Scheduled": "bg-purple-500/20 text-purple-400",
  "Technical Round": "bg-orange-500/20 text-orange-400",
  "Final Round": "bg-green-500/20 text-green-400",
}

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    // FIX: Removed <DashboardLayout> wrapper. 
    // The main Layout.tsx now handles the Sidebar and Header automatically.
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidates</h1>
          <p className="text-muted-foreground mt-1">Manage and review all registered candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Users className="w-4 h-4" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{candidates.length}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter((c) => c.status === "New").length}
                </p>
                <p className="text-sm text-muted-foreground">New Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Filter className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter((c) => c.status === "In Review").length}
                </p>
                <p className="text-sm text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter((c) => c.status.includes("Round") || c.status.includes("Interview")).length}
                </p>
                <p className="text-sm text-muted-foreground">In Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, position, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-secondary/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="In Review">In Review</SelectItem>
                <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                <SelectItem value="Technical Round">Technical Round</SelectItem>
                <SelectItem value="Final Round">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registered Candidates</CardTitle>
          <CardDescription>
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="p-4 hover:bg-secondary/30 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.position}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[candidate.status]}>{candidate.status}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Schedule Interview</DropdownMenuItem>
                            <DropdownMenuItem>Download Resume</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {candidate.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {candidate.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs bg-secondary/80">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Experience: <span className="text-foreground">{candidate.experience}</span>
                        </span>
                        <span className="text-muted-foreground">
                          AI Score: <span className="text-primary font-semibold">{candidate.aiScore}%</span>
                        </span>
                        <span className="text-muted-foreground">
                          Rounds Passed:{" "}
                          <span className="text-foreground font-semibold">{candidate.roundsPassed}</span>
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}