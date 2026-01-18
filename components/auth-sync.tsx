"use client"

import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function AuthSync() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoaded && user) {
      // Determine role based on where they are navigating
      let role = "User"
      if (pathname.startsWith("/recruiter")) role = "Recruiter"
      if (pathname.startsWith("/candidate")) role = "Candidate"

      // Send "I am here" signal to Backend
      fetch("http://127.0.0.1:5000/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: user.fullName || "Unknown",
          email: user.primaryEmailAddress?.emailAddress || "No Email",
          role: role
        })
      }).catch(err => console.error("Auth sync failed", err))
    }
  }, [isLoaded, user, pathname])

  return null // This component renders nothing
}