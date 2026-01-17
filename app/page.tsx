"use client"

import { useState, useLayoutEffect, useEffect } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { MissionSection } from "@/components/mission-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CTASection } from "@/components/cta-section"
import { StatsSection } from "@/components/stats-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import { BackgroundElements } from "@/components/background-elements"
import { CursorGlow } from "@/components/cursor-glow"
import { SignIn, SignUp, useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Briefcase, User, ArrowRight } from "lucide-react" // Added ArrowRight
import { useRouter } from "next/navigation"

export default function Home() {
  const [activeModal, setActiveModal] = useState<"signin" | "signup" | null>(null)
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter" | null>(null)
  
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  const closeModals = () => {
    setActiveModal(null)
    setSelectedRole(null)
  }
  
  const isModalOpen = activeModal !== null

  // Auto-redirect for logged-in users (Standard check)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const params = new URLSearchParams(window.location.search)
      // Only redirect if we are not in the middle of an action
      if (!params.get("modal") && params.get("source") !== "dashboard") {
         router.push("/auth/sync") // Send to Backend Sync
      }
    }
  }, [isLoaded, isSignedIn, router])

  // Handle URL triggers
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get("modal") === "signup") {
        setActiveModal("signup")
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // Helper to get the correct Redirect URL
  // If a role is selected, we tell the backend: "/auth/sync?role=recruiter"
  const getRedirectUrl = () => {
    return selectedRole ? `/auth/sync?role=${selectedRole}` : "/auth/sync"
  }

  return (
    <main className="min-h-screen relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <BackgroundElements />
      </div>

      <CursorGlow />

      <div className="relative z-10">
        <Header 
          onSignInClick={() => setActiveModal("signin")} 
          onSignUpClick={() => setActiveModal("signup")} 
        />
        
        {/* Pass sections normally */}
        <div className="snap-section"><HeroSection /></div>
        <div className="snap-section"><FeaturesSection /></div>
        <div className="snap-section"><MissionSection /></div>
        <div className="snap-section"><TestimonialsSection /></div>
        <div className="snap-section"><CTASection /></div>
        <div className="snap-section"><StatsSection /></div>
        <div className="snap-section"><ContactSection /></div>
        <div className="snap-section"><Footer /></div>
      </div>

      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-[9999] transition-all duration-300 ease-out",
          isModalOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={closeModals}
      >
        <div
          className={cn(
            "relative transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", 
            isModalOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- SIGN IN MODAL --- */}
          {activeModal === "signin" && (
            <div className="flex flex-col items-center">
              {/* If no role selected yet, show a mini-switcher so they can decide "Login as..." */}
              {!selectedRole && (
                <div className="mb-4 bg-[#2d1010] p-1 rounded-lg border border-[#5a3030] flex gap-1">
                  <button 
                    onClick={() => setSelectedRole("candidate")}
                    className="px-3 py-1 text-sm text-[#d0b8b8] hover:text-white hover:bg-[#3a1515] rounded transition-colors"
                  >
                    I'm a Candidate
                  </button>
                  <div className="w-px bg-[#5a3030] my-1"></div>
                  <button 
                    onClick={() => setSelectedRole("recruiter")}
                    className="px-3 py-1 text-sm text-[#d0b8b8] hover:text-white hover:bg-[#3a1515] rounded transition-colors"
                  >
                    I'm a Recruiter
                  </button>
                </div>
              )}

              {/* Show selected role context if picked */}
              {selectedRole && (
                <div className="mb-4 flex items-center gap-2 text-[#ff8080] animate-fade-in">
                  <span className="text-sm font-medium">Logging in as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</span>
                  <button onClick={() => setSelectedRole(null)} className="text-xs underline opacity-70 hover:opacity-100">Change</button>
                </div>
              )}

              <SignIn 
                routing="hash" 
                // CRITICAL: Send to backend with the role intent
                forceRedirectUrl={getRedirectUrl()}
              />
            </div>
          )}

          {/* --- SIGN UP MODAL --- */}
          {activeModal === "signup" && (
            <>
              {!selectedRole ? (
                 <div className="bg-[#2d1010] border border-[#5a3030] p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Join ResumeX</h2>
                  <p className="text-[#d0b8b8] mb-8">How do you plan to use the platform?</p>
                  
                  <div className="grid gap-4">
                    <button
                      onClick={() => setSelectedRole("candidate")}
                      className="flex items-center gap-4 p-4 rounded-lg bg-[#3a1515] border border-[#5a3030] hover:border-[#ff8080] hover:bg-[#4a2020] transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#5a3030] flex items-center justify-center group-hover:bg-[#ff8080] transition-colors">
                        <User className="w-6 h-6 text-[#ff8080] group-hover:text-[#2a1010]" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">I'm a Candidate</h3>
                        <p className="text-[#b8a0a0] text-sm">Find jobs and get AI feedback</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedRole("recruiter")}
                      className="flex items-center gap-4 p-4 rounded-lg bg-[#3a1515] border border-[#5a3030] hover:border-[#ff8080] hover:bg-[#4a2020] transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#5a3030] flex items-center justify-center group-hover:bg-[#ff8080] transition-colors">
                        <Briefcase className="w-6 h-6 text-[#ff8080] group-hover:text-[#2a1010]" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">I'm a Recruiter</h3>
                        <p className="text-[#b8a0a0] text-sm">Post jobs and screen talent</p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[#5a3030]">
                     <p className="text-[#b8a0a0] text-sm">
                       Already have an account?{" "}
                       <button onClick={() => setActiveModal("signin")} className="text-[#ff8080] hover:underline">
                         Sign in
                       </button>
                     </p>
                  </div>
                </div>
              ) : (
                <SignUp 
                  routing="hash" 
                  // CRITICAL: Send to backend with the role intent
                  forceRedirectUrl={getRedirectUrl()}
                  fallbackRedirectUrl={getRedirectUrl()}
                  signInFallbackRedirectUrl={getRedirectUrl()}
                  // We also save it to metadata immediately here as a fallback
                  unsafeMetadata={{ role: selectedRole }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}