"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { updateRole } from "@/actions/update-role"
import { Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const role = searchParams.get("role") as "candidate" | "recruiter" | null

  useEffect(() => {
    if (role) {
      updateRole(role)
    }
  }, [role])

  return (
    <div className="min-h-screen bg-[#2d1010] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 animate-spin text-[#ff8080] mb-4" />
      <h2 className="text-xl font-semibold">Setting up your {role} profile...</h2>
    </div>
  )
}