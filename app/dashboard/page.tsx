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
}