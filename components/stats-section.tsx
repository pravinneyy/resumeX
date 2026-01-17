"use client"

import { useRef, useState, useEffect } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"
import { TrendingUp, Users, Clock, Award } from "lucide-react"

const stats = [
  {
    icon: Users,
    value: 50000,
    suffix: "+",
    label: "Candidates Placed",
    description: "Successfully matched to their dream jobs",
  },
  {
    icon: TrendingUp,
    value: 85,
    suffix: "%",
    label: "Match Accuracy",
    description: "AI-powered precision matching",
  },
  {
    icon: Clock,
    value: 60,
    suffix: "%",
    label: "Time Saved",
    description: "Reduced time-to-hire for companies",
  },
  {
    icon: Award,
    value: 2000,
    suffix: "+",
    label: "Companies Trust Us",
    description: "From startups to Fortune 500",
  },
]

function AnimatedCounter({
  value,
  suffix,
  isInView,
}: {
  value: number
  suffix: string
  isInView: boolean
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.3 })

  return (
    <section ref={sectionRef} className="snap-section py-24 px-6 min-h-screen flex items-center relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2a1010]/30 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div
          className={cn(
            "bg-gradient-to-r from-[#5a2525] via-[#4a1c1c] to-[#3a1515] rounded-3xl p-8 md:p-12 transition-all duration-700 hover:shadow-2xl hover:shadow-[#d4908f]/20 border border-[#ffffff10]",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
          )}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-[#f0e0e0] text-center mb-12 hover:text-[#f0c0c0] transition-colors cursor-default">
            Trusted by industry leaders worldwide
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "text-center group transition-all duration-500 cursor-default p-4 rounded-xl hover:bg-[#ffffff10] hover:shadow-[0_0_20px_rgba(212,144,143,0.2)]",
                  isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#ffffff15] mb-4 group-hover:scale-125 group-hover:bg-[#d4908f] group-hover:shadow-[0_0_25px_rgba(212,144,143,0.6)] transition-all duration-300">
                  <stat.icon className="w-7 h-7 text-[#e8a0a0] group-hover:text-[#2a1010] transition-colors" />
                </div>
                <div className="text-4xl font-bold text-[#f0e0e0] mb-2 group-hover:text-[#f0c0c0] transition-colors">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} isInView={isInView} />
                </div>
                <div className="text-[#e8a0a0] font-semibold mb-1 group-hover:text-[#f0c0c0] transition-colors">
                  {stat.label}
                </div>
                <div className="text-[#c09090] text-sm group-hover:text-[#d4a0a0] transition-colors">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
