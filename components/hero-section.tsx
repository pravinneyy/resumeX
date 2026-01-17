"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { ParticleBackground } from "@/components/particle-background"

export function HeroSection() {
  return (
    <section className="snap-section relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
      {/* Floating particles (Keep this if you want extra particles locally, otherwise remove) */}
      <div className="absolute inset-0 overflow-hidden">
        <ParticleBackground />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="bg-[#2a1010]/60 backdrop-blur-md border border-[#5a3030]/50 rounded-3xl p-8 md:p-16 animate-fade-in hover:border-[#e8a0a0]/30 transition-all duration-500">
          <div className="flex items-center justify-center gap-2 mb-6 group cursor-default">
            {/* FIX: Removed 'animate-pulse' class from here */}
            <Sparkles className="w-5 h-5 text-[#e8a0a0] group-hover:text-[#f0c0c0] group-hover:scale-110 transition-all duration-300" />
            <span className="text-[#e8a0a0] text-sm font-medium group-hover:text-[#f0c0c0] transition-colors">
              AI-Powered Recruitment
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-tight mb-6 text-balance hover:text-[#f0e8e8] transition-colors cursor-default">
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

          <p className="text-[#b8a0a0] text-center text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-pretty hover:text-[#d0b8b8] transition-colors cursor-default">
            ResumeX connects candidates with opportunities through AI-powered assessment and transparent evaluation.
            Whether you&apos;re seeking your next role or building your team, our platform delivers precision at every
            stage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-[#e8a0a0] text-[#1a0808] hover:bg-[#f0c0c0] hover:text-[#1a0808] px-8 py-6 text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#e8a0a0]/40 group"
            >
              Sign in
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[#5a3030] text-white bg-[#3a1818]/50 hover:bg-[#e8a0a0] hover:text-[#1a0808] hover:border-[#e8a0a0] px-8 py-6 text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#e8a0a0]/30"
            >
              Learn more
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}