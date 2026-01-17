import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

// Fix: Define the SearchParams type as a Promise
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function AuthSyncPage(props: {
  searchParams: SearchParams
}) {
  // 1. Authenticate the user
  const { userId } = await auth()
  if (!userId) {
    return redirect("/")
  }

  // 2. Await the searchParams (Next.js 15+ requirement)
  const searchParams = await props.searchParams
  const intendedRole = typeof searchParams.role === 'string' ? searchParams.role : undefined

  // 3. Get Current Role from Database
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const currentRole = user.publicMetadata?.role as string | undefined

  // 4. THE BACKEND LOGIC: Update Role if needed
  if (intendedRole && intendedRole !== currentRole) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: intendedRole,
      },
    })
    
    if (intendedRole === "recruiter") return redirect("/recruiter")
    if (intendedRole === "candidate") return redirect("/candidate")
  }

  // 5. Default Routing
  if (currentRole === "recruiter") return redirect("/recruiter")
  if (currentRole === "candidate") return redirect("/candidate")

  // 6. Fallback
  return redirect("/?modal=signup")
}