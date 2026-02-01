"use client"

import { SignUp } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { BackgroundElements } from "@/components/background-elements"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CandidateSignUpPage() {
  const searchParams = useSearchParams()
  const role = searchParams.get("role")
  const isRecruiter = role === "recruiter"
  const assignedRole = isRecruiter ? "recruiter" : "candidate"

  return (
    <div className="flex min-h-screen w-full bg-[#0f0505]">
      {/* LEFT SIDE */}
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
                Start landing <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#ff4040]">
                interviews today.
                </span>
            </h2>
        </div>
        <div className="relative z-10 text-sm text-[#5a3030]">
          © 2026 ResumeX Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 bg-[#1a0505] flex flex-col items-center justify-center p-8 relative border-l border-[#2d1010]">
         <div className="w-full max-w-md space-y-6">
            <div className="text-center lg:text-left space-y-2">
                <h2 className="text-3xl font-bold text-white">Join as Candidate</h2>
            </div>
            
            <SignUp 
                path="/auth/signup"
                routing="path"
                // FIX 1: Point "Sign In" to this same page (or create a candidate-login page) to avoid 404
                signInUrl="/auth/signup" 
                // FIX 2: FORCE REDIRECT TO CANDIDATE DASHBOARD
                forceRedirectUrl="/candidate"
                unsafeMetadata={{ role: assignedRole }}
                appearance={{
                    variables: {
                        colorPrimary: "#ff8080",
                        colorBackground: "#ffffff", 
                        colorText: "#0f0505",       
                    },
                    elements: {
                        card: "shadow-2xl border-none bg-white w-full p-8",
                        headerTitle: "hidden", 
                        headerSubtitle: "hidden",
                    }
                }}
            />
         </div>
      </div>
    </div>
  )
}