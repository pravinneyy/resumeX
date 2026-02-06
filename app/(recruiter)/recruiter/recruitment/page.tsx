"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Kanban } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Building,
  MoreHorizontal,
  Download,
  Send,
  Search,
  ArrowUpDown,
  Copy,
  User,
  Loader2,
  Briefcase,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

// Define the interface for the data we expect
export interface Employee {
  id: number
  name: string
  role: string
  department: string
  email: string
  phone: string
  startDate: string
  salary: string
  status: "Hired" | "Not Hired" | "Pending"
  score: number
  jobTitle?: string  // The job they applied for
  jobId?: number     // Job ID for filtering
}

export default function RecruitmentPage() {
  const { getToken } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const API_URL = process.env.NEXT_PUBLIC_API_URL 

  const [filter, setFilter] = useState<"All" | "Hired" | "Not Hired">("All")
  const [jobFilter, setJobFilter] = useState<string>("All")  // New job filter
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: "score" | "startDate"; direction: "asc" | "desc" }>({
    key: "score",
    direction: "desc",
  })

  // FETCH REAL DATA FROM PYTHON BACKEND
  useEffect(() => {
    const fetchCandidates = async () => {
      setIsLoading(true)
      try {
        const token = await getToken()
        // Use absolute URL to match other working components
        // Use absolute URL to match other working components
        const response = await fetch(`${API_URL}/api/candidates`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch candidates')
        }

        const data = await response.json()

        // MAP BACKEND DATA TO FRONTEND UI
        const mappedData: Employee[] = data.map((candidate: any) => ({
          id: candidate.application_id, // Use application_id for unique key
          name: candidate.name || "Unknown Candidate",
          role: candidate.position || "Applicant",
          department: "Engineering", // Defaulting for now as backend doesn't send it
          email: candidate.email || "no-email@example.com",
          phone: candidate.phone || "N/A",
          startDate: candidate.appliedDate ? new Date(candidate.appliedDate).toLocaleDateString() : new Date().toLocaleDateString(),
          salary: "Competitive", // Defaulting as backend doesn't send it
          status: ["Hired", "Offer Accepted"].includes(candidate.status) ? "Hired" : (["Rejected", "Declined"].includes(candidate.status) ? "Not Hired" : "Pending"),
          score: candidate.score || 0,
          jobTitle: candidate.job_title || "Unknown Position",
          jobId: candidate.job_id
        }))

        setEmployees(mappedData)
      } catch (error) {
        console.error("Error fetching candidates:", error)
        toast.error("Could not load applicants from backend")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [])

  const hiredCount = employees.filter((e) => e.status === "Hired").length
  const notHiredCount = employees.filter((e) => e.status === "Not Hired").length

  // Get unique job titles for filter dropdown
  const uniqueJobs = useMemo(() => {
    const jobs = new Set(employees.map(e => e.jobTitle).filter(Boolean))
    return Array.from(jobs)
  }, [employees])

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Filter and Sort Logic
  const processedEmployees = useMemo(() => {
    let result = [...employees]

    if (filter !== "All") {
      result = result.filter((e) => e.status === filter)
    }

    // Apply job filter
    if (jobFilter !== "All") {
      result = result.filter((e) => e.jobTitle === jobFilter)
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(lowerQuery) ||
          e.role.toLowerCase().includes(lowerQuery) ||
          e.department.toLowerCase().includes(lowerQuery) ||
          (e.jobTitle && e.jobTitle.toLowerCase().includes(lowerQuery))
      )
    }

    result.sort((a, b) => {
      if (sortConfig.key === "score") {
        return sortConfig.direction === "asc" ? a.score - b.score : b.score - a.score
      }
      if (sortConfig.key === "startDate") {
        const dateA = new Date(a.startDate).getTime()
        const dateB = new Date(b.startDate).getTime()
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA
      }
      return 0
    })

    return result
  }, [employees, filter, searchQuery, sortConfig])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Kanban className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruitment Board</h1>
          <p className="text-sm text-muted-foreground">View and manage selected employees</p>
        </div>
      </div>

      <Card className="flex flex-col h-[calc(100vh-220px)]" style={{ animationDelay: "100ms" }}>
        <CardHeader className="pb-4 space-y-4 flex-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-success" />
              Applied Employees
            </CardTitle>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 active:scale-95 select-none pl-2 pr-3 py-1 gap-2 border-dashed",
                  filter === "Hired"
                    ? "bg-success/10 border-success text-success"
                    : "border-border hover:bg-secondary"
                )}
                onClick={() => setFilter(filter === "Hired" ? "All" : "Hired")}
              >
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span>Hired ({hiredCount})</span>
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 active:scale-95 select-none pl-2 pr-3 py-1 gap-2 border-dashed",
                  filter === "Not Hired"
                    ? "bg-destructive/10 border-destructive text-destructive"
                    : "border-border hover:bg-secondary"
                )}
                onClick={() => setFilter(filter === "Not Hired" ? "All" : "Not Hired")}
              >
                <div className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span>Not Hired ({notHiredCount})</span>
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, or job..."
                className="pl-9 h-9 bg-secondary/50 border-transparent focus-visible:bg-background transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Job Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-2", jobFilter !== "All" && "border-primary text-primary")}>
                  <Briefcase className="w-3 h-3" />
                  {jobFilter === "All" ? "All Jobs" : jobFilter.slice(0, 15) + (jobFilter.length > 15 ? "..." : "")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Filter by Job</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setJobFilter("All")}>
                  All Jobs ({employees.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {uniqueJobs.map((job) => (
                  <DropdownMenuItem key={job} onClick={() => setJobFilter(job || "")}>
                    {job} ({employees.filter(e => e.jobTitle === job).length})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <ArrowUpDown className="w-3 h-3" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortConfig({ key: "score", direction: "desc" })}>
                  Highest Score
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortConfig({ key: "score", direction: "asc" })}>
                  Lowest Score
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortConfig({ key: "startDate", direction: "desc" })}>
                  Newest Start Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortConfig({ key: "startDate", direction: "asc" })}>
                  Oldest Start Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6 pb-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {processedEmployees.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No candidates found.</p>
                    <Button
                      variant="link"
                      onClick={() => { setFilter("All"); setSearchQuery(""); }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  processedEmployees.map((employee, index) => (
                    <div
                      key={employee.id}
                      className={cn(
                        "relative p-4 rounded-xl bg-secondary/30 border border-transparent transition-all duration-300",
                        "hover:bg-secondary/80 hover:border-border/50 hover:shadow-lg group",
                      )}
                      style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar
                          className={cn(
                            "h-12 w-12 ring-2 ring-offset-2 ring-offset-background transition-all group-hover:scale-105",
                            employee.status === "Hired" ? "ring-success/50" : (employee.status === "Not Hired" ? "ring-destructive/50" : "ring-muted/50"),
                          )}
                        >
                          <AvatarImage
                            src={`/.jpg?height=48&width=48&query=${employee.name} professional headshot`}
                          />
                          <AvatarFallback
                            className={cn(
                              employee.status === "Hired"
                                ? "bg-success/20 text-success"
                                : (employee.status === "Not Hired" ? "bg-destructive/20 text-destructive" : "bg-muted/20 text-muted-foreground"),
                            )}
                          >
                            {employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {employee.name}
                              </h4>
                              <div
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  employee.status === "Hired"
                                    ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                    : (employee.status === "Not Hired" ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-yellow-500")
                                )}
                                title={employee.status}
                              />
                            </div>

                          </div>
                          <p className="text-sm text-muted-foreground font-medium truncate">{employee.role}</p>
                          {employee.jobTitle && (
                            <div className="flex items-center gap-1.5 mt-1 mb-2">
                              <Briefcase className="w-3 h-3 text-primary" />
                              <span className="text-xs text-primary font-medium truncate">{employee.jobTitle}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground/80">
                            <div className="flex items-center gap-2" title="Department">
                              <Building className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="truncate">{employee.department}</span>
                            </div>
                            <div className="flex items-center gap-2" title="Start Date">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{employee.startDate}</span>
                            </div>
                            <button
                              className="flex items-center gap-2 hover:text-primary transition-colors text-left group/copy"
                              onClick={() => handleCopy(employee.email, "Email")}
                              title="Click to copy email"
                            >
                              <Mail className="w-3.5 h-3.5 text-muted-foreground group-hover/copy:text-primary" />
                              <span className="truncate underline decoration-dotted underline-offset-2 group-hover/copy:decoration-solid">{employee.email}</span>
                              <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            </button>
                            <button
                              className="flex items-center gap-2 hover:text-primary transition-colors text-left group/copy"
                              onClick={() => handleCopy(employee.phone, "Phone")}
                              title="Click to copy phone"
                            >
                              <Phone className="w-3.5 h-3.5 text-muted-foreground group-hover/copy:text-primary" />
                              <span>{employee.phone}</span>
                              <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 z-20">
                          <Badge
                            variant={
                              employee.status === "Hired" ? "default" :
                                employee.status === "Not Hired" ? "destructive" :
                                  "secondary"
                            }
                            className={cn(
                              "text-sm px-3 py-1",
                              employee.status === "Hired" && "bg-green-600"
                            )}
                          >
                            {employee.status}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 hidden sm:flex"
                            >
                              <User className="w-3 h-3 mr-1.5" />
                              Profile
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => handleCopy(employee.email, "Email")}>
                                  <Mail className="w-4 h-4" /> Copy Email
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Download className="w-4 h-4" /> Download Resume
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-primary">
                                  <Send className="w-4 h-4" /> Send to HR System
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}