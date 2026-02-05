"use client"

import { useRef } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, CheckCircle2, Zap, Shield, Users } from "lucide-react"
import Link from "next/link"

const benefits = [
  { icon: Zap, text: "Start in under 5 minutes" },
  { icon: Shield, text: "Enterprise-grade security" },
  { icon: Users, text: "Unlimited team members" },
]

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.3 })

  return (
    <section
      ref={sectionRef}
      className="snap-section py-24 px-6 min-h-screen flex items-center relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#e8a0a0]/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#c07080]/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div
          className={cn(
            "bg-gradient-to-br from-[#3a1818]/90 to-[#2a1010]/90 backdrop-blur-sm border border-[#5a3030]/50 rounded-3xl p-8 md:p-16 transition-all duration-700 hover:border-[#e8a0a0]/30 hover:shadow-2xl hover:shadow-[#e8a0a0]/10",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
          )}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#5a3030]/50 rounded-full px-4 py-2 mb-6 group hover:bg-[#e8a0a0]/20 hover:shadow-[0_0_15px_rgba(232,160,160,0.3)] transition-all duration-300 cursor-default">
                <Sparkles className="w-4 h-4 text-[#e8a0a0] group-hover:text-[#f0c0c0] group-hover:scale-110 transition-all duration-300" />
                <span className="text-[#e8a0a0] text-sm group-hover:text-[#f0c0c0] transition-colors">
                  Join 10,000+ companies
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 text-balance leading-tight hover:text-[#f0e8e8] transition-colors cursor-default">
                Transform your{" "}
                <span className="text-[#e8a0a0] relative inline-block hover:text-[#f0c0c0] transition-colors cursor-default group">
                  hiring process
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path
                      d="M1 5.5C47 2.5 153 2.5 199 5.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="animate-draw"
                    />
                  </svg>
                </span>{" "}
                today
              </h2>

              {/* PARAGRAPH REMOVED HERE */}

              <div className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <div
                    key={benefit.text}
                    className={cn(
                      "flex items-center gap-3 group transition-all duration-500 cursor-default",
                      isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5",
                    )}
                    style={{ transitionDelay: `${index * 100 + 300}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#5a3030] flex items-center justify-center group-hover:bg-[#e8a0a0] group-hover:shadow-[0_0_15px_rgba(232,160,160,0.5)] transition-all duration-300 group-hover:scale-110">
                      <benefit.icon className="w-4 h-4 text-[#e8a0a0] group-hover:text-[#2a1010] transition-colors" />
                    </div>
                    <span className="text-[#d4a5a5] group-hover:text-[#f0c0c0] transition-colors">{benefit.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link href="/signup">
                    <Button
                    size="lg"
                    className="bg-[#e8a0a0] hover:bg-[#f0c0c0] text-[#2a1010] px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#e8a0a0]/40 group font-semibold"
                    >
                    Get started free
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Link>
                <Link href="/demo">
                    <Button
                    size="lg"
                    variant="outline"
                    className="border-[#5a3030] text-white bg-transparent hover:bg-[#e8a0a0] hover:text-[#2a1010] hover:border-[#e8a0a0] px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#e8a0a0]/30"
                    >
                    Schedule a demo
                    </Button>
                </Link>
              </div>
            </div>

            {/* Right content - Visual element */}
            <div
              className={cn(
                "relative transition-all duration-700",
                isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
              )}
            >
              <div className="relative group">
                {/* Decorative card stack */}
                <div className="absolute -top-4 -left-4 w-full h-full bg-[#5a3030]/30 rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform duration-500" />
                <div className="absolute -top-2 -left-2 w-full h-full bg-[#5a3030]/50 rounded-2xl transform rotate-1 group-hover:rotate-3 transition-transform duration-500" />

                <div className="relative bg-gradient-to-br from-[#4a2020] to-[#3a1515] rounded-2xl p-8 border border-[#6a4040]/50 group-hover:border-[#e8a0a0]/30 transition-all duration-500">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#e8a0a0] to-[#c08080] rounded-full flex items-center justify-center mb-4 animate-pulse group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(232,160,160,0.5)] transition-all duration-500">
                      <Sparkles className="w-10 h-10 text-[#2a1010]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#f0c0c0] transition-colors">
                      Ready to start?
                    </h3>
                    <p className="text-[#b8a0a0] group-hover:text-[#d0b8b8] transition-colors">
                      No credit card required
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Active job postings", value: "Unlimited" },
                      { label: "AI-powered matching", value: "Included" },
                      { label: "Assessment tools", value: "Full access" },
                      { label: "Support", value: "24/7" },
                    ].map((item, index) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#2a1010]/50 group/item hover:bg-[#3a1515]/70 hover:shadow-[0_0_10px_rgba(232,160,160,0.15)] transition-all duration-300 cursor-default"
                      >
                        <span className="text-[#b8a0a0] group-hover/item:text-[#d4a5a5] transition-colors">
                          {item.label}
                        </span>
                        <span className="text-[#e8a0a0] font-semibold group-hover/item:text-[#f0c0c0] transition-colors">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-[#5a3030]/50 group-hover:border-[#e8a0a0]/20 transition-colors">
                    <div className="flex items-center justify-center gap-2 text-[#8a6060] group-hover:text-[#b8a0a0] transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">14-day free trial</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}