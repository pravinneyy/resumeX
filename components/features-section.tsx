"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { Brain, Code, Shield, Zap, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    category: "Screening",
    title: "AI-driven candidate matching",
    description: "Our system analyzes resumes and qualifications to surface the best matches instantly.",
    icon: Brain,
  },
  {
    category: "Assessment",
    title: "Integrated coding tests",
    description: "Evaluate technical skills and behavioral fit through simultaneous coding sandboxes.",
    icon: Code,
  },
  {
    category: "Transparency",
    title: "Explainable AI logic",
    description: "Every decision is justified with competency maps and logs for full accountability.",
    icon: Shield,
  },
]

const additionalFeatures = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get results in minutes, not days",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Work together seamlessly",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your hiring metrics",
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.1 })

  return (
    <section ref={sectionRef} className="snap-section py-24 px-6 min-h-screen flex flex-col justify-center relative">
      {/* FIX: Removed background overlay or kept it very light transparent 
         so it doesn't hide the global background particles.
      */}
      
      <div className="max-w-7xl mx-auto relative z-10">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-bold text-white text-center mb-16 transition-all duration-700 hover:text-[#f0c0c0] cursor-default",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
          )}
        >
          What sets us apart
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                // FIX: Changed from Solid Gradient to Glassmorphism (bg-opacity + backdrop-blur)
                "group relative bg-[#4a2020]/40 backdrop-blur-sm border border-[#5a3030]/50 rounded-2xl p-8 overflow-hidden transition-all duration-500 hover:scale-105 hover:bg-[#5a3030]/50 hover:shadow-2xl hover:shadow-[#e8a0a0]/10 cursor-default",
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#e8a0a0]/10 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <feature.icon className="w-6 h-6 text-[#e8a0a0] group-hover:text-[#f0c0c0] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(232,160,160,0.6)] transition-all duration-300" />
                  <span className="text-[#e8a0a0] text-sm font-medium group-hover:text-[#f0c0c0] transition-colors">
                    {feature.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#f0c0c0] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[#b8a0a0] text-sm leading-relaxed group-hover:text-[#d0b8b8] transition-colors">
                  {feature.description}
                </p>
              </div>

              {/* Decorative corner accent */}
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-[#e8a0a0]/5 to-transparent rounded-tl-full group-hover:from-[#e8a0a0]/20 transition-all duration-500" />
            </div>
          ))}
        </div>

        {/* Additional features row */}
        <div className="grid md:grid-cols-3 gap-6">
          {additionalFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                // FIX: Made these cards glass-like too
                "flex items-center gap-4 p-6 rounded-xl bg-[#3a1818]/40 backdrop-blur-sm border border-[#5a3030]/30 transition-all duration-500 hover:bg-[#4a2020]/60 hover:border-[#e8a0a0]/40 hover:shadow-lg hover:shadow-[#e8a0a0]/10 cursor-default group",
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
              )}
              style={{ transitionDelay: `${(index + 3) * 150}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-[#5a3030]/50 flex items-center justify-center group-hover:bg-[#e8a0a0] group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-[#e8a0a0] group-hover:text-[#2a1010] transition-colors duration-300" />
              </div>
              <div>
                <h4 className="text-white font-semibold group-hover:text-[#f0c0c0] transition-colors">
                  {feature.title}
                </h4>
                <p className="text-[#b8a0a0] text-sm group-hover:text-[#d0b8b8] transition-colors">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}