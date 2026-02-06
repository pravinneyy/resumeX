"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserButton, SignedIn, SignedOut, ClerkLoaded, ClerkLoading, useUser } from "@clerk/nextjs"
import { dark } from "@clerk/themes" 

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { user } = useUser()
  
  const role = user?.unsafeMetadata?.role as string
  const dashboardHref = role === "recruiter" ? "/recruiter" : "/candidate"

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const AuthButtons = () => (
    <div className="flex items-center gap-3">
      {/* Recruiter / Business Entry */}
      <Link href="/auth/work-with-us">
        <Button
          variant="ghost"
          className="text-[#ff8080] hover:text-[#ff9999] hover:bg-[#2d1010] border border-[#5a3030]/50"
        >
          <Briefcase className="w-4 h-4 mr-2" />
          Recruiter Login
        </Button>
      </Link>

      <Link href="/auth/signin">
        <Button
          variant="ghost"
          className="text-[#d0b8b8] hover:text-white hover:bg-[#2d1010]"
        >
          Sign In
        </Button>
      </Link>
      
      <Link href="/auth/signup">
        <Button className="bg-[#ff8080] text-[#1a0808] font-bold hover:bg-[#ff9999] transition-all duration-300 shadow-[0_0_15px_rgba(255,128,128,0.2)]">
          Get Started
        </Button>
      </Link>
    </div>
  )

  return (
    // Updated header className:
    // 1. Removed the conditional background check.
    // 2. Added permanent maroon transparent background: bg-[#2d1010]/70
    // 3. Added permanent blur: backdrop-blur-md
    // 4. Kept the bottom border conditional on scroll.
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-[#2d1010]/70 backdrop-blur-md",
      isScrolled ? "border-b border-[#5a3030]/30" : ""
    )}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-[#ffb3b3] tracking-tighter">
          Resume<span className="text-white">X</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <ClerkLoading>
            <div className="h-9 w-24 bg-[#5a3030]/50 rounded animate-pulse" />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href={dashboardHref}>
                  <Button className="bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] font-bold rounded-full px-6 transition-all shadow-lg shadow-[#ff8080]/10">
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
                    },
                    elements: {
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

        {/* Mobile Toggle */}
        <button className="md:hidden text-[#ebd0d0]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={cn("md:hidden overflow-hidden transition-all duration-500", isMobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0")}>
        {/* Updated mobile menu background to match the maroon theme better */}
        <div className="bg-[#2d1010]/95 backdrop-blur-md px-6 py-6 border-b border-[#5a3030]/30 space-y-4">
          <ClerkLoaded>
            <SignedIn>
              <Link href={dashboardHref} className="w-full block">
                <Button className="w-full bg-[#ff8080] text-[#1a0808] font-bold rounded-full">Go to Dashboard</Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/auth/work-with-us" className="w-full block">
                <Button variant="outline" className="w-full border-[#5a3030] text-[#ff8080] hover:bg-[#4a1a1a]">
                  <Briefcase className="w-4 h-4 mr-2 inline" />
                  Recruiter Portal
                </Button>
              </Link>
              <Link href="/auth/signin" className="w-full block">
                <Button variant="ghost" className="w-full text-[#d0b8b8] hover:bg-[#4a1a1a] hover:text-white">Sign In</Button>
              </Link>
              <Link href="/auth/signup" className="w-full block">
                <Button className="w-full bg-[#ff8080] text-[#1a0808] font-bold hover:bg-[#ff9999]">Join as Candidate</Button>
              </Link>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  )
}