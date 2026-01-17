"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Building,
  MoreHorizontal,
  Download,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const selectedEmployees = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Lead Software Engineer",
    department: "Engineering",
    email: "sarah.j@company.com",
    phone: "+1 (555) 123-4567",
    startDate: "Feb 15, 2026",
    salary: "$145,000",
    status: "Hired",
    score: 98,
  },
  {
    id: 2,
    name: "Michael Brown",
    role: "Senior Full Stack Developer",
    department: "Engineering",
    email: "m.brown@company.com",
    phone: "+1 (555) 234-5678",
    startDate: "Feb 20, 2026",
    salary: "$130,000",
    status: "Hired",
    score: 96,
  },
  {
    id: 3,
    name: "Jennifer Lee",
    role: "Cloud Architect",
    department: "Infrastructure",
    email: "j.lee@company.com",
    phone: "+1 (555) 345-6789",
    startDate: "Mar 1, 2026",
    salary: "$155,000",
    status: "Not Hired",
    score: 94,
  },
  {
    id: 4,
    name: "David Martinez",
    role: "Tech Lead",
    department: "Product",
    email: "d.martinez@company.com",
    phone: "+1 (555) 456-7890",
    startDate: "Mar 10, 2026",
    salary: "$140,000",
    status: "Hired",
    score: 91,
  },
  {
    id: 5,
    name: "Emily Chen",
    role: "DevOps Engineer",
    department: "Infrastructure",
    email: "e.chen@company.com",
    phone: "+1 (555) 567-8901",
    startDate: "Mar 15, 2026",
    salary: "$125,000",
    status: "Not Hired",
    score: 89,
  },
]

const statusStyles: Record<string, string> = {
  Hired: "bg-success/20 text-success border-success/30",
  "Not Hired": "bg-destructive/20 text-destructive border-destructive/30",
}

export function SelectedEmployees() {
  const hiredCount = selectedEmployees.filter((e) => e.status === "Hired").length

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-success" />
          Selected Employees
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            {hiredCount} Hired
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            {selectedEmployees.length - hiredCount} Not Hired
          </Badge>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Export List
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {selectedEmployees.map((employee, index) => (
              <div
                key={employee.id}
                className={cn(
                  "p-4 rounded-xl bg-secondary/50 border border-transparent transition-all duration-300",
                  "hover:bg-secondary hover:border-border hover:shadow-md group",
                )}
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar
                    className={cn(
                      "h-12 w-12 ring-2",
                      employee.status === "Hired" ? "ring-success/30" : "ring-destructive/30",
                    )}
                  >
                    <AvatarImage
                      src={`/.jpg?height=48&width=48&query=${employee.name} professional headshot`}
                    />
                    <AvatarFallback
                      className={cn(
                        employee.status === "Hired"
                          ? "bg-success/20 text-success"
                          : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {employee.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0 ml-2 flex items-center gap-1", statusStyles[employee.status])}
                      >
                        {employee.status === "Hired" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{employee.role}</p>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3 h-3" />
                        <span className="truncate">{employee.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{employee.startDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{employee.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score and Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-lg font-bold",
                          employee.status === "Hired" ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {employee.score}
                      </div>
                      <div className="text-[10px] text-muted-foreground">AI Score</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Mail className="w-4 h-4" /> Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Download className="w-4 h-4" /> Download Documents
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Send className="w-4 h-4" /> Send to HR System
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
