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
    // This matches your app background exactly, making the transition seamless
    <div className="min-h-screen bg-[#1a0808] flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#e8a0a0]" />
    </div>
  )
}