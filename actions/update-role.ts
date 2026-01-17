"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export async function updateRole(role: "candidate" | "recruiter") {
  const { userId } = await auth()

  if (!userId) {
    return { error: "User not found" }
  }

  try {
    const client = await clerkClient()
    
    // Update the user's metadata in Clerk
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
      },
    })
    
  } catch (error) {
    console.error("Failed to update role:", error)
    return { error: "Failed to update role" }
  }

  // Redirect to dashboard after saving
  redirect("/dashboard")
}