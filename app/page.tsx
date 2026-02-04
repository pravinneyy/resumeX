"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"

// Component Imports
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { MissionSection } from "@/components/mission-section"
// Removed TestimonialsSection import
import { CTASection } from "@/components/cta-section"
// Removed StatsSection import
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import { BackgroundElements } from "@/components/background-elements"
import { CursorGlow } from "@/components/cursor-glow"

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen relative">
      {/* UPDATED STYLES:
        1. Hides scrollbars (scrollbar-width: none).
        2. Enables 'scroll-snap-type' on html/body.
        3. Defines '.snap-section' behavior to stop scrolling exactly at that section.
      */}
      <style dangerouslySetInnerHTML={{
        __html: `
        html, body {
          /* Hide Scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;

          /* ENABLE SCROLL SNAPPING */
          height: 100vh;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
        }

        /* Hide Scrollbar for Chrome, Safari, Opera */
        ::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }

        /* Snap Logic: Forces the browser to stop at these elements */
        .snap-section {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}} />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <BackgroundElements />
      </div>
      <CursorGlow />

      <div className="relative z-10">
        {/* Header */}
        <Header />

        {/* Each section is wrapped in 'snap-section' so the scroll stops here */}
        <div className="snap-section"><HeroSection /></div>
        <div className="snap-section"><FeaturesSection /></div>
        <div className="snap-section"><MissionSection /></div>

        {/* REMOVED: TestimonialsSection */}

        <div className="snap-section"><CTASection /></div>

        {/* REMOVED: StatsSection */}

        <div className="snap-section"><ContactSection /></div>

        {/* Note: Footer usually doesn't need to be full height, but snapping to it is fine */}
        <div className="snap-section"><Footer /></div>
      </div>
    </main>
  )
}