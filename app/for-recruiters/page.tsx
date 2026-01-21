"use client"

import { useEffect } from "react" // 👈 Added this import
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { BarChart3, Users, Zap, Search, ArrowRight, Lock } from "lucide-react"

export default function RecruiterPage() {
  const router = useRouter()

  // 👇 ADDED THIS: Forces the page to scroll to the top on load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleAuthRedirect = (mode: "signin" | "signup") => {
    router.push(`/?modal=${mode}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#ff8080] selection:text-black overflow-y-auto">
      <Header 
        onSignInClick={() => handleAuthRedirect("signin")} 
        onSignUpClick={() => handleAuthRedirect("signup")} 
      />

      <main className="pt-32 pb-20">
        
        {/* --- HERO SECTION --- */}
        <section className="px-6 max-w-6xl mx-auto text-center mb-24 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d1010] border border-[#5a3030] text-[#ff8080] mb-8">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Reduce Time-to-Hire by 40%</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Hire with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#b04040]">
              defensible data.
            </span>
          </h1>
          
          <p className="text-xl text-[#b8a0a0] max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate "gut feeling" hiring. ResumeX provides an audit trail for every candidate, explaining exactly why they fit your role.
          </p>

          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => handleAuthRedirect("signup")}
              className="bg-[#ff8080] text-[#1a0808] hover:bg-[#ff9999] px-8 py-6 rounded-full text-lg font-bold transition-transform hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* --- FEATURES GRID --- */}
        <section className="px-6 max-w-6xl mx-auto mb-32">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-[#120505] border border-[#3a1515] hover:border-[#ff8080] transition-colors">
              <BarChart3 className="w-10 h-10 text-[#ff8080] mb-6" />
              <h3 className="text-2xl font-bold mb-3">Automated Screening</h3>
              <p className="text-[#b8a0a0] leading-relaxed">
                Instantly process 1,000+ resumes. Our AI ranks them by relevance to your job description, saving you hours of manual review.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-[#120505] border border-[#3a1515] hover:border-[#ff8080] transition-colors">
              <Lock className="w-10 h-10 text-[#ff8080] mb-6" />
              <h3 className="text-2xl font-bold mb-3">Bias Reduction</h3>
              <p className="text-[#b8a0a0] leading-relaxed">
                The evaluation engine ignores formatting, photos, and non-essential data, focusing purely on skills and experience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-[#120505] border border-[#3a1515] hover:border-[#ff8080] transition-colors md:col-span-2">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <Search className="w-10 h-10 text-[#ff8080] mb-6" />
                  <h3 className="text-2xl font-bold mb-3">Smart Semantic Search</h3>
                  <p className="text-[#b8a0a0] leading-relaxed">
                    Don't just search for "Manager". Search for "Someone who has led a team of 10+ engineers in a fintech startup" and get results.
                  </p>
                </div>
                {/* Visual Graphic */}
                <div className="flex-1 w-full bg-[#0a0a0a] rounded-xl border border-[#3a1515] p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-[#3a1515] pb-2">
                    <span className="text-sm text-[#b8a0a0]">Query: "Python Expert"</span>
                    <span className="text-xs text-[#ff8080]">Found 12 Matches</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 bg-[#2d1010] rounded w-full animate-pulse"></div>
                    <div className="h-8 bg-[#2d1010] rounded w-3/4 animate-pulse delay-75"></div>
                    <div className="h-8 bg-[#2d1010] rounded w-5/6 animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}