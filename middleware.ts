import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Define Route Groups
const isPublicRoute = createRouteMatcher([
  "/",                  
  "/auth(.*)",          
  "/api(.*)"            
]);

const isRecruiterRoute = createRouteMatcher(["/recruiter(.*)"]);
const isCandidateRoute = createRouteMatcher(["/candidate(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // 2. THE SORTING HAT LOGIC
  // If the user is logged in and is on the Landing Page ('/'),
  // redirect them to their specific dashboard immediately.
  if (userId && req.nextUrl.pathname === "/") {
    const role = (sessionClaims?.metadata as any)?.role;
    if (role === "recruiter") {
      return NextResponse.redirect(new URL("/recruiter", req.url));
    } else {
      // Default to candidate if role is missing or is 'candidate'
      return NextResponse.redirect(new URL("/candidate", req.url));
    }
  }

  // 3. Protect Recruiter Routes
// ... inside middleware ...
  if (isRecruiterRoute(req)) {
    const role = (sessionClaims?.metadata as any)?.role;
    // If role is NOT recruiter, kick them out
    if (role !== "recruiter") {
      return NextResponse.redirect(new URL("/candidate", req.url));
    }
  }
// ...

  // 4. Protect Candidate Routes (Optional but good)
  if (isCandidateRoute(req)) {
     const role = (sessionClaims?.metadata as any)?.role;
     if (role === "recruiter") {
       return NextResponse.redirect(new URL("/recruiter", req.url));
     }
  }

  // 5. Allow public routes (like sign-in pages) to load
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 6. Catch-all: If not public and not logged in, force sign-in
  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};