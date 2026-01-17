"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"
import { CheckCircle2, ArrowRight } from "lucide-react"

const flowSteps = [
  { label: "Resume Upload", color: "#e8a0a0" },
  { label: "AI Analysis", color: "#d090a0" },
  { label: "Skill Matching", color: "#c080a0" },
  { label: "Assessment", color: "#b070a0" },
  { label: "Interview", color: "#a060a0" },
  { label: "Hire", color: "#9050a0" },
]

export function MissionSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2 })

  return (
    <section ref={sectionRef} className="snap-section py-24 px-6 min-h-screen flex items-center relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#3a1515]/30 via-transparent to-[#3a1515]/30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div
            className={cn(
              "transition-all duration-700",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10",
            )}
          >
            <span className="text-[#e8a0a0] text-sm font-medium mb-4 block hover:text-[#f0c0c0] hover:drop-shadow-[0_0_10px_rgba(232,160,160,0.4)] transition-all duration-300 cursor-default">
              Our mission
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight hover:text-[#f0c0c0] transition-colors cursor-default">
              Recruitment reimagined through technology
            </h2>
            <p className="text-[#b8a0a0] text-lg leading-relaxed mb-8 hover:text-[#d0b8b8] transition-colors cursor-default">
              ResumeX eliminates bias and guesswork from hiring. We built a full-stack platform that makes assessment
              transparent, evaluation explainable, and outcomes fair for everyone.
            </p>

            <div className="space-y-4">
              {[
                "Unbiased AI-driven candidate evaluation",
                "Real-time progress tracking for all parties",
                "Comprehensive skill assessment tools",
                "Data-driven hiring decisions",
              ].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-500 group cursor-default",
                    isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5",
                  )}
                  style={{ transitionDelay: `${index * 100 + 300}ms` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-[#e8a0a0] flex-shrink-0 group-hover:text-[#f0c0c0] group-hover:scale-125 group-hover:drop-shadow-[0_0_8px_rgba(232,160,160,0.6)] transition-all duration-300" />
                  <span className="text-[#d4a5a5] group-hover:text-[#f0c0c0] transition-colors">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Flow Visualization */}
          <div
            className={cn(
              "relative bg-[#2a1010]/80 border border-[#5a3030]/50 rounded-2xl p-8 transition-all duration-700 hover:border-[#e8a0a0]/30 hover:shadow-xl hover:shadow-[#e8a0a0]/10",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
            )}
          >
            <h3 className="text-white font-semibold mb-8 text-center hover:text-[#f0c0c0] transition-colors cursor-default">
              Hiring Pipeline Flow
            </h3>

            <div className="space-y-4">
              {flowSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={cn(
                    "flex items-center gap-4 transition-all duration-500",
                    isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
                  )}
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  <div
                    className="w-full h-12 rounded-lg flex items-center justify-between px-4 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group"
                    style={{
                      backgroundColor: `${step.color}20`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${step.color}40`
                      e.currentTarget.style.boxShadow = `0 0 20px ${step.color}30`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${step.color}20`
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full animate-pulse group-hover:scale-150 transition-transform"
                        style={{ backgroundColor: step.color }}
                      />
                      <span className="text-white font-medium group-hover:text-[#f0c0c0] transition-colors">
                        {step.label}
                      </span>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 group-hover:translate-x-1 group-hover:scale-110 transition-all"
                      style={{ color: step.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
