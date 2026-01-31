"use client"

import { SignIn } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { BackgroundElements } from "@/components/background-elements"
import { Code2, CheckCircle, Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react" // Required for useSearchParams in Next.js 13/14/15

// SearchParams needs to be wrapped in Suspense to prevent build errors in Next.js
function SignInForm() {
  const searchParams = useSearchParams()
  
  // Logic: Identify if user is a recruiter based on URL query: ?role=recruiter
  const role = searchParams.get("role")
  const isRecruiter = role === "recruiter"
  
  // FIXED: Explicitly fallback to candidate path if no role is found
  const redirectPath = isRecruiter ? "/recruiter" : "/candidate/jobs"
  const portalName = isRecruiter ? "recruiter portal" : "candidate portal"

  return (
    <div className="w-full max-w-md space-y-8">
        <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
            <p className="text-[#b8a0a0]">Login to access your {portalName}.</p>
        </div>

        <div className="w-full">
            <SignIn 
                path="/auth/signin"
                routing="path"
                signUpUrl="/auth/signup" 
                forceRedirectUrl={redirectPath} 
                appearance={{
                    variables: {
                        colorPrimary: "#ff8080",
                        colorBackground: "#ffffff", 
                        colorText: "#0f0505",       
                        colorTextSecondary: "#4b5563", 
                        colorInputBackground: "#ffffff",
                        colorInputText: "#0f0505",
                        borderRadius: "0.75rem",
                    },
                    elements: {
                        card: "shadow-2xl border-none bg-white w-full p-8", 
                        headerTitle: "hidden", 
                        headerSubtitle: "hidden",
                        formButtonPrimary: "bg-[#ff8080] hover:bg-[#ff6666] text-[#0f0505] py-3 font-bold",
                        socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50 text-[#0f0505]",
                        socialButtonsBlockButtonText: "font-semibold",
                        formFieldInput: "bg-white border-gray-200 text-[#0f0505] focus:border-[#ff8080] focus:ring-[#ff8080]/20",
                        formFieldLabel: "text-gray-600 font-medium",
                        footerActionLink: "text-[#ff8080] hover:text-[#ff6666] font-bold",
                        dividerLine: "bg-gray-200",
                        dividerText: "text-gray-400"
                    }
                }}
            />
        </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full bg-[#0f0505]">
      
      {/* LEFT SIDE - DARK BRANDING (Same as before) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 text-white border-r border-[#2d1010]">
        <div className="absolute inset-0 opacity-50 pointer-events-none">
            <BackgroundElements />
        </div>
        <div className="relative z-10">
          <Link href="/" className="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
            <ArrowLeft className="w-5 h-5 text-[#ff8080]" />
            <span><span className="text-[#ff8080]">Resume</span>X</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg mt-10">
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
            Land your dream job <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#ff4040]">
              in Top Tech Companies.
            </span>
          </h2>
          {/* Icons and Text... */}
        </div>

        <div className="relative z-10 text-sm text-[#5a3030]">
          © 2026 ResumeX Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM CONTAINER */}
      <div className="w-full lg:w-1/2 bg-[#1a0505] flex flex-col items-center justify-center p-8 relative border-l border-[#2d1010]">
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}