"use client"

import React, { useEffect } from "react" // Added React import
import { useUser, SignUp, ClerkLoaded, ClerkLoading } from "@clerk/nextjs"
// Ensure this file actually exists at /components/background-elements.tsx
import { BackgroundElements } from "@/components/background-elements" 
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function WorkWithUsPage() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/recruiter")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f0505]">
        <Loader2 className="w-10 h-10 text-[#ff8080] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0f0505]">
      
      {/* LEFT SIDE - BRANDING */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 text-white border-r border-[#2d1010]">
        <div className="absolute inset-0 opacity-50 pointer-events-none">
            <BackgroundElements />
        </div>
        <div className="relative z-10">
          <Link href="/" className="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
            <ArrowLeft className="w-5 h-5 text-[#ff8080]" />
            <span><span className="text-[#ff8080]">Resume</span>X</span>
            <span className="text-[10px] uppercase tracking-wider bg-[#2d1010] px-2 py-1 rounded text-[#b8a0a0] border border-[#5a3030]">Business</span>
          </Link>
        </div>
        <div className="relative z-10 space-y-8 max-w-lg mt-10">
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
            Hire the top 1% of <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#ff4040]">
              Engineering Talent.
            </span>
          </h2>
          <p className="text-[#b8a0a0] text-lg leading-relaxed">
            Join thousands of recruiters using AI to screen, filter, and interview candidates automatically.
          </p>
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4 text-[#d0b8b8]">
                <div className="w-10 h-10 rounded-full bg-[#2d1010] flex items-center justify-center border border-[#5a3030] shadow-lg shadow-[#ff8080]/5">
                    <CheckCircle className="w-5 h-5 text-[#ff8080]" />
                </div>
                <span className="text-lg">AI-Powered Resume Screening</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-sm text-[#5a3030]">
          © 2026 ResumeX Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM CONTAINER */}
      <div className="w-full lg:w-1/2 bg-[#1a0505] flex flex-col items-center justify-center p-8 relative border-l border-[#2d1010]">
        <div className="w-full max-w-md space-y-6">
            <div className="text-center lg:text-left space-y-2">
                <h2 className="text-3xl font-bold text-white">
                  Create Recruiter Account
                </h2>
                <p className="text-[#b8a0a0]">
                  Start hiring with AI. No credit card required.
                </p>
            </div>

            <div className="w-full flex justify-center">
              <ClerkLoading>
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-[#ff8080] animate-spin" />
                </div>
              </ClerkLoading>

              <ClerkLoaded>
                <SignUp 
                  path="/auth/work-with-us" 
                  routing="path"
                  forceRedirectUrl="/recruiter" 
                  signInUrl="/auth/work-with-us"
                  // This is the line that actually creates the role
                  unsafeMetadata={{
                      role: "recruiter"
                  }}
                  appearance={clerkAppearance} 
                />
              </ClerkLoaded>
            </div>

            <div className="text-center pt-4">
                <Link href="/auth/work-with-us" className="text-[#ff8080] hover:underline text-sm font-medium">
                    Already have an account? Log in here
                </Link>
            </div>
        </div>
      </div>
    </div>
  )
}

const clerkAppearance = {
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
      formFieldInput: "bg-white border-gray-200 text-[#0f0505] focus:border-[#ff8080] focus:ring-[#ff8080]/20",
      formFieldLabel: "text-gray-600 font-medium",
      footerActionLink: "hidden"
  }
}