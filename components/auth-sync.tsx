"use client"

import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function AuthSync() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoaded && user) {
      let role = "User"
      if (pathname.startsWith("/recruiter")) role = "Recruiter"
      if (pathname.startsWith("/candidate")) role = "Candidate"

      // CHANGED PORT TO 8000
      fetch("http://${API_URL}:8000/api/users/sync", { 
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

  return null
}