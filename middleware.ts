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

  // 1. PUBLIC ROUTES: Always allow
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 2. FORCE SIGN-IN
  if (!userId) {
    return (await auth()).redirectToSignIn();
  }

  // 3. GET ROLE
// Inside your middleware.ts
const metadata = (sessionClaims?.metadata as any) || {};
const role = metadata.role;

console.log(`--- Auth Debug --- User: ${userId} | Role: ${role}`);


  // 4. PROTECT RECRUITER ROUTES
  if (isRecruiterRoute(req)) {
    if (role === "candidate") {
      return NextResponse.redirect(new URL("/candidate", req.url));
    }
    return NextResponse.next();
  }

  // 5. PROTECT CANDIDATE ROUTES
  if (isCandidateRoute(req)) {
    if (role === "recruiter") {
      return NextResponse.redirect(new URL("/recruiter", req.url));
    }
    return NextResponse.next();
  }

  // 6. ROOT REDIRECT (Sorting Hat)
  if (req.nextUrl.pathname === "/") {
    if (role === "recruiter") {
      return NextResponse.redirect(new URL("/recruiter", req.url));
    } else if (role === "candidate") {
      return NextResponse.redirect(new URL("/candidate", req.url));
    }
    // If role is missing, stay on landing page to avoid loops
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};