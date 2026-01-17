"use client"

// FIX: Removed DashboardLayout import
import { SelectedEmployees } from "@/components/recruiter/selected-employees"
import { Kanban } from "lucide-react"

export default function RecruitmentPage() {
  return (
    // FIX: Removed <DashboardLayout> wrapper
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

      {/* Selected Employees - Moved from Dashboard */}
      <SelectedEmployees />
    </div>
  )
}