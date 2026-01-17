"use client"

import { CandidateResults } from "@/components/recruiter/candidate-results"
import { TopCandidates } from "@/components/recruiter/top-candidates"
import { AuthLogs } from "@/components/recruiter/auth-logs"
import { StatsCards } from "@/components/recruiter/stats-cards"

export function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CandidateResults />
        <TopCandidates />
      </div>

      {/* Auth Logs */}
      <AuthLogs />
    </div>
  )
}
