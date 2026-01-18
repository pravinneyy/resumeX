"use client"

import { useState, useLayoutEffect, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, SignIn, SignUp } from "@clerk/nextjs"
import { User, Briefcase } from "lucide-react"

// Component Imports
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
import { cn } from "@/lib/utils"

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [activeModal, setActiveModal] = useState<"signin" | "signup" | null>(null)
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter" | null>(null)
  
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const isModalOpen = activeModal !== null

  // --- HELPERS ---
  const closeModals = () => {
    setActiveModal(null)
    setSelectedRole(null)
  }

  // Helper to construct the redirect URL based on role
  const getRedirectUrl = () => {
    return selectedRole ? `/auth/sync?role=${selectedRole}` : "/auth/sync"
  }

  // --- EFFECTS ---

  // 1. Redirect if already logged in (unless explicitly on the dashboard)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const params = new URLSearchParams(window.location.search)
      if (!params.get("modal") && params.get("source") !== "dashboard") {
         router.push("/auth/sync") 
      }
    }
  }, [isLoaded, isSignedIn, router])

  // 2. Handle URL parameters to open modals externally
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get("modal") === "signup") {
        setActiveModal("signup")
      }
    }
  }, [])

  // 3. Scroll restoration fix
  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <BackgroundElements />
      </div>
      <CursorGlow />

      {/* Main Content Layer */}
      <div className="relative z-10">
        <Header 
          onSignInClick={() => setActiveModal("signin")} 
          onSignUpClick={() => setActiveModal("signup")} 
        />
        
        {/* The Hero Section now handles its own navigation to /for-candidates etc. */}
        <div className="snap-section"><HeroSection /></div>
        
        <div className="snap-section"><FeaturesSection /></div>
        <div className="snap-section"><MissionSection /></div>
        <div className="snap-section"><TestimonialsSection /></div>
        <div className="snap-section"><CTASection /></div>
        <div className="snap-section"><StatsSection /></div>
        <div className="snap-section"><ContactSection /></div>
        <div className="snap-section"><Footer /></div>
      </div>

      {/* --- MODAL LAYER --- */}
      <div
        className={cn(
          "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] transition-all duration-300",
          isModalOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={closeModals}
      >
        <div
          className={cn(
            "relative w-full max-w-lg transform transition-all duration-300 p-4", 
            isModalOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-8"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* === SIGN IN MODAL === */}
          {activeModal === "signin" && (
            <div className="flex flex-col items-center">
              {/* Optional: Tiny Role Switcher inside Login */}
              {!selectedRole && (
                <div className="mb-6 bg-[#2d1010] p-1 rounded-lg border border-[#5a3030] flex gap-1">
                  <button 
                    onClick={() => setSelectedRole("candidate")}
                    className="px-4 py-2 text-sm text-[#d0b8b8] hover:text-white hover:bg-[#3a1515] rounded-md transition-colors"
                  >
                    I'm a Candidate
                  </button>
                  <div className="w-px bg-[#5a3030] my-2"></div>
                  <button 
                    onClick={() => setSelectedRole("recruiter")}
                    className="px-4 py-2 text-sm text-[#d0b8b8] hover:text-white hover:bg-[#3a1515] rounded-md transition-colors"
                  >
                    I'm a Recruiter
                  </button>
                </div>
              )}

              {/* Clerk Sign In Component */}
              <SignIn 
                routing="hash" 
                forceRedirectUrl={getRedirectUrl()}
                appearance={{
                  elements: {
                    card: "bg-[#1a0505] border border-[#5a3030]",
                    headerTitle: "text-white",
                    headerSubtitle: "text-[#b8a0a0]",
                    socialButtonsBlockButton: "bg-[#2d1010] border-[#5a3030] text-white hover:bg-[#3a1515]",
                    formFieldLabel: "text-[#d0b8b8]",
                    formFieldInput: "bg-[#0f0505] border-[#5a3030] text-white",
                    footerActionLink: "text-[#ff8080] hover:text-[#ff9999]"
                  }
                }}
              />
            </div>
          )}

          {/* === SIGN UP MODAL === */}
          {activeModal === "signup" && (
            <>
              {/* Step 1: Choose Role */}
              {!selectedRole ? (
                 <div className="bg-[#1a0505] border border-[#5a3030] p-8 rounded-2xl shadow-2xl w-full text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">Join ResumeX</h2>
                  <p className="text-[#d0b8b8] mb-8">How do you plan to use the platform?</p>
                  
                  <div className="grid gap-4">
                    <button
                      onClick={() => setSelectedRole("candidate")}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[#2d1010] border border-[#5a3030] hover:border-[#ff8080] hover:bg-[#3a1515] transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#3a1515] flex items-center justify-center group-hover:bg-[#ff8080] transition-colors">
                        <User className="w-6 h-6 text-[#ff8080] group-hover:text-[#2a1010]" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">I'm a Candidate</h3>
                        <p className="text-[#b8a0a0] text-sm">Find jobs & get AI feedback</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedRole("recruiter")}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[#2d1010] border border-[#5a3030] hover:border-[#ff8080] hover:bg-[#3a1515] transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#3a1515] flex items-center justify-center group-hover:bg-[#ff8080] transition-colors">
                        <Briefcase className="w-6 h-6 text-[#ff8080] group-hover:text-[#2a1010]" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">I'm a Recruiter</h3>
                        <p className="text-[#b8a0a0] text-sm">Post jobs & screen talent</p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#5a3030]">
                      <p className="text-[#b8a0a0] text-sm">
                        Already have an account?{" "}
                        <button onClick={() => setActiveModal("signin")} className="text-[#ff8080] hover:underline font-medium">
                          Sign in
                        </button>
                      </p>
                  </div>
                </div>
              ) : (
                /* Step 2: Clerk Sign Up Form */
                <div className="flex justify-center">
                  <SignUp 
                    routing="hash" 
                    forceRedirectUrl={getRedirectUrl()}
                    fallbackRedirectUrl={getRedirectUrl()}
                    unsafeMetadata={{ role: selectedRole }}
                    appearance={{
                      elements: {
                        card: "bg-[#1a0505] border border-[#5a3030]",
                        headerTitle: "text-white",
                        headerSubtitle: "text-[#b8a0a0]",
                        socialButtonsBlockButton: "bg-[#2d1010] border-[#5a3030] text-white hover:bg-[#3a1515]",
                        formFieldLabel: "text-[#d0b8b8]",
                        formFieldInput: "bg-[#0f0505] border-[#5a3030] text-white",
                        footerActionLink: "text-[#ff8080] hover:text-[#ff9999]"
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}