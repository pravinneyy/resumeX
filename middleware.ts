import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. PUBLIC ROUTES
const isPublicRoute = createRouteMatcher([
  "/",                  
  "/auth(.*)",           // <--- THIS NOW COVERS /auth/work-with-us AUTOMATICALLY
  "/for-candidates(.*)",
  "/api(.*)"            
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

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