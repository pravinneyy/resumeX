"use client"

import { useState, useLayoutEffect, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser, SignIn, SignUp } from "@clerk/nextjs"
import { User, Briefcase, ArrowLeft } from "lucide-react"

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
  const [activeModal, setActiveModal] = useState<"signin" | "signup" | null>(null)
  const [selectedRole, setSelectedRole] = useState<"candidate" | "recruiter" | null>(null)
  
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const isModalOpen = activeModal !== null

  // Optimized Open Handler to prevent double-clicks
  const handleOpenModal = useCallback((type: "signin" | "signup") => {
    setSelectedRole(null) // Reset role to show Step 1
    setActiveModal(type)
  }, [])

  const closeModals = useCallback(() => {
    setActiveModal(null)
    setTimeout(() => setSelectedRole(null), 300) 
  }, [])

  const getRedirectUrl = () => {
    return selectedRole ? `/auth/sync?role=${selectedRole}` : "/auth/sync"
  }

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const params = new URLSearchParams(window.location.search)
      if (!params.get("modal") && params.get("source") !== "dashboard") {
         router.push("/auth/sync") 
      }
    }
  }, [isLoaded, isSignedIn, router])

  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  const clerkAppearance = {
    variables: {
      colorPrimary: "#ff8080", 
      colorBackground: "#1a0505", 
      colorText: "#ffffff",
      colorTextSecondary: "#b8a0a0",
      colorInputBackground: "#2d1010",
      colorInputText: "#ffffff",
      borderRadius: "0.75rem",
    },
    elements: {
      card: "bg-[#1a0505] border border-[#5a3030] shadow-2xl",
      socialButtonsBlockButton: "bg-[#2d1010] border border-[#5a3030] hover:bg-[#3a1515] !text-white",
      socialButtonsBlockButtonText: "!text-white font-medium",
      socialButtonsBlockButtonArrow: "!text-white",
      formFieldLabel: "text-[#d0b8b8]",
      formFieldInput: "bg-[#0f0505] border-[#5a3030] text-white focus:border-[#ff8080]",
      formButtonPrimary: "bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] font-bold",
      footerActionLink: "text-[#ff8080] hover:text-[#ff9999]",
      dividerLine: "bg-[#5a3030]",
      dividerText: "text-[#5a3030]",
    }
  }

  return (
    <main className="min-h-screen relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <BackgroundElements />
      </div>
      <CursorGlow />

      <div className="relative z-10">
        <Header 
          onSignInClick={() => handleOpenModal("signin")} 
          onSignUpClick={() => handleOpenModal("signup")} 
        />
        <div className="snap-section"><HeroSection /></div>
        <div className="snap-section"><FeaturesSection /></div>
        <div className="snap-section"><MissionSection /></div>
        <div className="snap-section"><TestimonialsSection /></div>
        <div className="snap-section"><CTASection /></div>
        <div className="snap-section"><StatsSection /></div>
        <div className="snap-section"><ContactSection /></div>
        <div className="snap-section"><Footer /></div>
      </div>

      {/* MODAL LAYER */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] transition-all duration-300",
          isModalOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={closeModals}
      >
        <div
          className={cn(
            "relative w-full max-w-md transform transition-all duration-500 ease-out p-4", 
            isModalOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-8"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a0505] border border-[#5a3030] rounded-3xl shadow-2xl overflow-hidden">
            
            {selectedRole && (
              <div className="absolute top-6 left-6 z-20">
                <button 
                  onClick={() => setSelectedRole(null)}
                  className="flex items-center gap-1 text-xs font-medium text-[#b8a0a0] hover:text-[#ff8080]"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Role
                </button>
              </div>
            )}

            {!selectedRole ? (
              <div className="p-10 text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {activeModal === "signin" ? "Welcome Back" : "Join ResumeX"}
                </h2>
                <p className="text-[#b8a0a0] mb-8 text-sm">Please select your portal</p>
                <div className="grid gap-4">
                  <button
                    onClick={() => setSelectedRole("candidate")}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-[#2d1010] border border-[#5a3030] hover:border-[#ff8080] transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#3a1515] flex items-center justify-center group-hover:bg-[#ff8080]">
                      <User className="w-6 h-6 text-[#ff8080] group-hover:text-black" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">Candidate</h3>
                      <p className="text-[#806060] text-xs">Manage resume & applications</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedRole("recruiter")}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-[#2d1010] border border-[#5a3030] hover:border-[#ff8080] transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#3a1515] flex items-center justify-center group-hover:bg-[#ff8080]">
                      <Briefcase className="w-6 h-6 text-[#ff8080] group-hover:text-black" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">Recruiter</h3>
                      <p className="text-[#806060] text-xs">Post jobs & screen talent</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-[#1a0505] mt-4">
                <div className="flex justify-center w-full">
                  {activeModal === "signin" ? (
                    <SignIn routing="hash" forceRedirectUrl={getRedirectUrl()} appearance={clerkAppearance} />
                  ) : (
                    <SignUp routing="hash" forceRedirectUrl={getRedirectUrl()} unsafeMetadata={{ role: selectedRole }} appearance={clerkAppearance} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}