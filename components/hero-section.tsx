"use client"

import { Button } from "@/components/ui/button"
import { User, Briefcase } from "lucide-react"
import { ParticleBackground } from "@/components/particle-background"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="snap-section relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        <ParticleBackground />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="bg-[#2a1010]/60 backdrop-blur-md border border-[#5a3030]/50 rounded-3xl p-8 md:p-16 animate-fade-in hover:border-[#e8a0a0]/30 transition-all duration-500">
          
          {/* Heading */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-tight mb-8 text-balance hover:text-[#f0e8e8] transition-colors cursor-default">
            Recruitment built on{" "}
            <span className="text-[#e8a0a0] relative hover:text-[#f0c0c0] transition-colors">
              intelligence
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path
                  d="M1 5.5C47 2.5 153 2.5 199 5.5"
                  stroke="#e8a0a0"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="animate-draw"
                />
              </svg>
            </span>{" "}
            and fairness
          </h1>

          {/* UPDATED: Description with line break */}
          <p className="text-[#b8a0a0] text-center text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-pretty hover:text-[#d0b8b8] transition-colors cursor-default">
            A full-stack AI HR system that streamlines the hiring journey.<br />
            From resume upload to final decision with transparent<br/> data-driven rationale.
          </p>

          <div className="flex flex-col items-center justify-center gap-6">
            
            {/* Perspective Links: Candidates & Recruiters */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Link href="/for-candidates">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#5a3030] text-white bg-[#3a1818]/50 hover:bg-[#e8a0a0] hover:text-[#1a0808] hover:border-[#e8a0a0] px-8 py-6 rounded-full transition-all duration-300 hover:scale-105"
                >
                  <User className="mr-2 w-5 h-5" />
                  For Candidates
                </Button>
              </Link>

              <Link href="/for-recruiters">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#5a3030] text-white bg-[#3a1818]/50 hover:bg-[#e8a0a0] hover:text-[#1a0808] hover:border-[#e8a0a0] px-8 py-6 rounded-full transition-all duration-300 hover:scale-105"
                >
                  <Briefcase className="mr-2 w-5 h-5" />
                  For Recruiters
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}