<<<<<<< HEAD
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
=======
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) return redirect("/");

  const userRole = user.publicMetadata?.role as string | undefined;

  // --- CONFIGURATION ---
  // Change this to your deployed URL later (e.g., https://app.resumex.com)
  const RECRUITER_DASHBOARD_URL = process.env.NODE_ENV === "development" 
    ? "http://localhost:3001" 
    : "https://your-production-dashboard-url.com";

  // --- REDIRECT LOGIC ---
  
  if (userRole === "recruiter") {
    // Redirect to the SEPARATE project
    redirect(RECRUITER_DASHBOARD_URL); 
  }

  if (userRole === "candidate") {
    // Keep candidates on the main site (or redirect to their own separate app too)
    redirect("/candidate-dashboard"); 
  }

  // If no role, send back to home to pick one
  redirect("/?modal=signup"); 
>>>>>>> ed3e7fc4e5fa75221f910e81c5b6be81dcd35de4
}