"use client"

import { useLayoutEffect } from "react"
import { useUser } from "@clerk/nextjs"

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

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <BackgroundElements />
      </div>
      <CursorGlow />

      <div className="relative z-10">
        {/* Header no longer needs props */}
        <Header />
        
        <div className="snap-section"><HeroSection /></div>
        <div className="snap-section"><FeaturesSection /></div>
        <div className="snap-section"><MissionSection /></div>
        <div className="snap-section"><TestimonialsSection /></div>
        <div className="snap-section"><CTASection /></div>
        <div className="snap-section"><StatsSection /></div>
        <div className="snap-section"><ContactSection /></div>
        <div className="snap-section"><Footer /></div>
      </div>
    </main>
  )
}