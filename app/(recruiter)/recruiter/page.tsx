import type { Metadata } from "next"
import { DashboardContent } from "@/components/recruiter/dashboard-content"

// FIX: Metadata must be exported from a Server Component (like this page), 
// since the layout is now a Client Component.
export const metadata: Metadata = {
  title: "Recruiter Dashboard | ResumeX",
  description: "Manage your hiring pipeline",
}

export default function DashboardPage() {
  return (
    <DashboardContent />
  )
}