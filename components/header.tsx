"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserButton, SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from "@clerk/nextjs"
import { dark } from "@clerk/themes" 

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const AuthButtons = () => (
    <div className="flex items-center gap-4">
      {/* Candidate / Standard Log In */}
      <Link href="/auth/signin">
        <Button
          variant="ghost"
          className="text-[#d0b8b8] hover:text-white hover:bg-[#2d1010]"
        >
          Candidate Log In
        </Button>
      </Link>
      
      {/* Business / Recruiter CTA */}
      <Link href="/auth/work-with-us">
        <Button
          className="bg-[#ff8080] text-[#1a0808] font-bold hover:bg-[#ff9999] transition-all duration-300 shadow-[0_0_10px_rgba(255,128,128,0.3)]"
        >
          Work with Us
        </Button>
      </Link>
    </div>
  )

  return (
    <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-500", isScrolled ? "bg-[#2d1010]/80 backdrop-blur-md border-b border-[#5a3030]/30" : "bg-transparent")}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-[#ffb3b3]">ResumeX</Link>

        <div className="hidden md:flex items-center gap-3 justify-end">
          <ClerkLoading>
            <div className="h-9 w-24 bg-[#5a3030]/50 rounded animate-pulse" />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button className="bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] font-bold rounded-full px-6 transition-all shadow-lg shadow-[#ff8080]/20">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    baseTheme: dark,
                    variables: {
                      colorPrimary: "#ff8080",
                      colorBackground: "#1a0505",
                      colorText: "#ffffff",
                    },
                    elements: {
                      userButtonPopoverCard: "bg-[#1a0505] border border-[#5a3030] shadow-2xl",
                      userButtonPopoverHeaderText: "text-white",
                      userButtonPopoverHeaderSubtitle: "text-[#b8a0a0]",
                      userButtonPopoverActionButton: "text-[#d0b8b8] hover:bg-[#2d1010] hover:text-[#ff8080]",
                      userButtonPopoverActionButtonText: "text-[#d0b8b8] hover:text-[#ff8080]",
                      userButtonPopoverActionButtonIcon: "text-[#ff8080]",
                      userButtonPopoverFooter: "hidden" 
                    }
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <AuthButtons />
            </SignedOut>
          </ClerkLoaded>
        </div>

        <button className="md:hidden text-[#ebd0d0]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={cn("md:hidden overflow-hidden transition-all duration-500", isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0")}>
        <div className="bg-[#2d1010]/95 px-6 py-4 border-b border-[#5a3030]/30">
          <ClerkLoaded>
            <SignedIn>
              <div className="flex flex-col gap-4">
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full bg-[#ff8080] text-[#1a0808] font-bold rounded-full">Go to Dashboard</Button>
                </Link>
                <div className="flex justify-center">
                  <UserButton afterSignOutUrl="/" appearance={{ baseTheme: dark }} />
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="flex flex-col gap-3">
                <Link href="/auth/signin" className="w-full">
                  <Button className="w-full bg-[#2d1010] text-[#d0b8b8] border border-[#5a3030]">Candidate Log In</Button>
                </Link>
                <Link href="/auth/work-with-us" className="w-full">
                  <Button className="w-full bg-[#ff8080] text-[#1a0808] font-bold">Work with Us</Button>
                </Link>
              </div>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  )
}