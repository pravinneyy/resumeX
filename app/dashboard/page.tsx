import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const { userId } = await auth()
  
  // 1. Safety Check: If not logged in, go home
  if (!userId) {
    return redirect("/")
  }

  // 2. Just READ the role (Don't write anything)
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const role = user.publicMetadata?.role as string | undefined

  // 3. Simple Redirection based on stored role
  if (role === "recruiter") {
    return redirect("/recruiter")
  }

  if (role === "candidate") {
    return redirect("/candidate")
  }

  // 4. If they have NO role (rare edge case), send them to the Sync logic to fix it
  return redirect("/auth/sync")
}