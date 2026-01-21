"use client"

import { useEffect } from "react" // 👈 Added this import
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { FileText, CheckCircle, BrainCircuit, ArrowRight, ShieldCheck, Sparkles } from "lucide-react"

export default function CandidatePage() {
  const router = useRouter()

  // 👇 ADDED THIS: Forces the page to scroll to the top on load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Helper to redirect to Home and open the modal
  const handleAuthRedirect = (mode: "signin" | "signup") => {
    router.push(`/?modal=${mode}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#ff8080] selection:text-black overflow-y-auto">
      {/* Reusing your Header with redirect logic */}
      <Header 
        onSignInClick={() => handleAuthRedirect("signin")} 
        onSignUpClick={() => handleAuthRedirect("signup")} 
      />

      <main className="pt-32 pb-20">
        
        {/* --- HERO SECTION --- */}
        <section className="px-6 max-w-6xl mx-auto text-center mb-24 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d1010] border border-[#5a3030] text-[#ff8080] mb-8">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Fairness First Architecture</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Don't just apply. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8080] to-[#b04040]">
              Know where you stand.
            </span>
          </h1>
          
          <p className="text-xl text-[#b8a0a0] max-w-2xl mx-auto mb-10 leading-relaxed">
            ResumeX is the first platform that gives you a <strong>Transparent Rationale</strong>. 
            See exactly how our AI scores your resume against the job description.
          </p>

          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => handleAuthRedirect("signup")}
              className="bg-[#ff8080] text-[#1a0808] hover:bg-[#ff9999] px-8 py-6 rounded-full text-lg font-bold transition-transform hover:scale-105"
            >
              Check My Resume Score
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* --- THE AI PIPELINE VISUAL --- */}
        <section className="px-6 max-w-6xl mx-auto mb-32">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-[#5a3030] via-[#ff8080] to-[#5a3030] opacity-20 -z-10"></div>

            {/* Step 1 */}
            <div className="bg-[#120505] p-8 rounded-2xl border border-[#3a1515] hover:border-[#ff8080] transition-all group">
              <div className="w-16 h-16 bg-[#2d1010] rounded-full flex items-center justify-center mb-6 border border-[#5a3030] group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,128,128,0.2)]">
                <FileText className="w-8 h-8 text-[#ff8080]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">1. Smart Parse</h3>
              <p className="text-[#b8a0a0]">We extract your skills, not just keywords. Our engine understands that "React" implies "JavaScript" mastery.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#120505] p-8 rounded-2xl border border-[#3a1515] hover:border-[#ff8080] transition-all group">
              <div className="w-16 h-16 bg-[#2d1010] rounded-full flex items-center justify-center mb-6 border border-[#5a3030] group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,128,128,0.2)]">
                <BrainCircuit className="w-8 h-8 text-[#ff8080]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">2. Gap Analysis</h3>
              <p className="text-[#b8a0a0]">The AI compares your profile to the job instantly, identifying exactly where you match and where you don't.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#120505] p-8 rounded-2xl border border-[#3a1515] hover:border-[#ff8080] transition-all group">
              <div className="w-16 h-16 bg-[#2d1010] rounded-full flex items-center justify-center mb-6 border border-[#5a3030] group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,128,128,0.2)]">
                <ShieldCheck className="w-8 h-8 text-[#ff8080]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">3. Feedback Loop</h3>
              <p className="text-[#b8a0a0]">Receive a "Rationale Report" explaining the decision. Use it to improve your resume for next time.</p>
            </div>
          </div>
        </section>

        {/* --- DEMO UI: THE RATIONALE CARD --- */}
        <section className="px-6 max-w-4xl mx-auto">
          <div className="bg-[#1a0505] border border-[#5a3030] rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff8080] opacity-5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="text-green-500 w-6 h-6" />
              <h2 className="text-2xl font-bold">Sample AI Rationale</h2>
            </div>

            <div className="bg-[#0a0a0a] p-6 rounded-xl border border-[#3a1515] font-mono text-sm leading-relaxed text-[#d0b8b8]">
              <p className="mb-4">
                <span className="text-[#ff8080] font-bold">[MATCH]</span> Candidate demonstrates strong proficiency in Next.js 14 and Tailwind CSS, aligning with the "Senior Frontend" requirement.
              </p>
              <p className="mb-4">
                <span className="text-yellow-500 font-bold">[NOTE]</span> While React Native experience is listed, the project portfolio focuses primarily on Web. Suggested interview question: "Describe a challenge in bridging web logic to mobile."
              </p>
              <p>
                <span className="text-green-500 font-bold">[CONCLUSION]</span> <span className="text-white">High Fit (88%).</span> Recommended for technical screen.
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}