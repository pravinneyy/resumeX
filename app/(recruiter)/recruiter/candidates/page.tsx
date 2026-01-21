"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Filter, Users, FileText, Mail, Phone, MapPin, Calendar, 
  ChevronRight, Download, MoreHorizontal, Loader2
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const statusColors: Record<string, string> = {
  "Applied": "bg-blue-500/20 text-blue-400",
  "Assessment": "bg-yellow-500/20 text-yellow-400",
  "Interview": "bg-purple-500/20 text-purple-400",
  "Rejected": "bg-red-500/20 text-red-400",
  "Hired": "bg-green-500/20 text-green-400",
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // FETCH REAL DATA
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/candidates")
      .then(res => res.json())
      .then(data => {
        setCandidates(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch candidates:", err)
        setLoading(false)
      })
  }, [])

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some((skill: string) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
  }

  return (
    <div className="space-y-6 animate-fade-in p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidates</h1>
          <p className="text-muted-foreground mt-1">Manage and review all registered candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{candidates.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="w-5 h-5 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold">{candidates.filter((c) => c.status === "Applied").length}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><Filter className="w-5 h-5 text-yellow-400" /></div>
              <div>
                <p className="text-2xl font-bold">{candidates.filter((c) => c.status === "Assessment").length}</p>
                <p className="text-sm text-muted-foreground">Assessment</p>
              </div>
            </CardContent>
        </Card>
        <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Calendar className="w-5 h-5 text-green-400" /></div>
              <div>
                <p className="text-2xl font-bold">{candidates.filter((c) => c.status === "Interview").length}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
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
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Assessment">Assessment</SelectItem>
                <SelectItem value="Interview">Interview</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
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
                key={candidate.id + index}
                className="p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {candidate.name.substring(0,2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.position}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[candidate.status] || "bg-secondary"}>
                            {candidate.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{candidate.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{candidate.phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{candidate.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {candidate.skills.slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs bg-secondary/80">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Applied: <span className="text-foreground">{new Date(candidate.appliedDate).toLocaleDateString()}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Score: <span className={`font-semibold ${candidate.aiScore >= 9 ? 'text-green-500' : 'text-primary'}`}>
                            {candidate.aiScore} / 10
                          </span>
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                        View Details <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredCandidates.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No candidates found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}