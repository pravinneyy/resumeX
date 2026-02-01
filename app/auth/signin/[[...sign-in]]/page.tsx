"use client"

import React from "react"
import { SignIn, ClerkLoaded, ClerkLoading } from "@clerk/nextjs"
import { BackgroundElements } from "@/components/background-elements"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { dark } from "@clerk/themes"

export default function UnifiedSignInPage() {
  return (
    <div className="flex min-h-screen w-full bg-[#0f0505]">
      
      {/* LEFT SIDE - BRANDING & VISUALS */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12 text-white border-r border-[#2d1010]">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
            <BackgroundElements />
        </div>
        
        <div className="relative z-10">
          <Link href="/" className="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
            <ArrowLeft className="w-5 h-5 text-[#ff8080]" />
            <span><span className="text-[#ff8080]">Resume</span>X</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2d1010] border border-[#5a3030] text-[#ff8080] text-xs font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                <span>AI-Powered Recruitment</span>
            </div>
            <h2 className="text-6xl font-extrabold tracking-tight leading-tight">
                Welcome <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#ff4040]">
                Back.
                </span>
            </h2>
            <p className="text-[#b8a0a0] text-xl leading-relaxed">
                Log in to access your AI-optimized dashboard and manage your applications or talent pool.
            </p>
        </div>

        <div className="relative z-10 text-sm text-[#5a3030]">
          © 2026 ResumeX Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - ACTUAL LOGIN FORM */}
      <div className="w-full lg:w-1/2 bg-[#1a0505] flex flex-col items-center justify-center p-8 relative border-l border-[#2d1010]">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:hidden mb-8">
                 <span className="text-3xl font-bold text-white"><span className="text-[#ff8080]">Resume</span>X</span>
            </div>

            <div className="bg-[#1a0505] rounded-2xl relative">
              <ClerkLoading>
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 text-[#ff8080] animate-spin" />
                </div>
              </ClerkLoading>

              <ClerkLoaded>
                <SignIn 
                  path="/auth/signin"
                  routing="path"
                  forceRedirectUrl="/" 
                  signUpUrl="/auth/signup"
                  appearance={{
                    baseTheme: dark,
                    variables: {
                      colorPrimary: "#ff8080",
                      colorBackground: "#1a0505",
                      colorText: "#ffffff",
                      colorInputBackground: "#2d1010",
                      colorInputText: "#ffffff",
                      borderRadius: "0.5rem"
                    },
                    elements: {
                      card: "bg-transparent shadow-none border-none p-0 w-full",
                      headerTitle: "text-3xl font-bold text-white tracking-tight",
                      headerSubtitle: "text-[#b8a0a0] mt-2",
                      socialButtonsBlockButton: "bg-[#2d1010] border-[#5a3030] hover:bg-[#3d1a1a] text-white h-12 transition-all",
                      formButtonPrimary: "bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] font-bold py-6 text-base shadow-lg shadow-[#ff8080]/10",
                      footerActionLink: "text-[#ff8080] hover:text-[#ff9999] font-medium",
                      dividerLine: "bg-[#2d1010]",
                      dividerText: "text-[#5a3030] uppercase text-xs tracking-widest",
                      formFieldLabel: "text-[#d0b8b8] font-medium mb-2",
                      formFieldInput: "bg-[#0f0505] border-[#2d1010] focus:border-[#ff8080] h-12"
                    }
                  }}
                />
              </ClerkLoaded>
            </div>
        </div>
      </div>
    </div>
  )
}