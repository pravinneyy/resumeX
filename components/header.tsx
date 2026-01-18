"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserButton, SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from "@clerk/nextjs"

interface HeaderProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export function Header({ onSignInClick, onSignUpClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll)
      setIsScrolled(window.scrollY > 20)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  const AuthButtons = () => (
    <>
      <Button
        variant="ghost"
        className="text-[#ffdede] hover:text-white hover:bg-[#5a2a2a]/50 transition-all duration-300"
        onClick={onSignInClick}
      >
        Sign in
      </Button>
      <Button
        className="bg-[#d45d5d] text-white hover:bg-[#ff6b6b] hover:text-white transition-all duration-300 hover:scale-105 shadow-[0_0_10px_rgba(212,93,93,0.3)]"
        onClick={onSignUpClick}
      >
        Get started
      </Button>
    </>
  )

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-[#2d1010]/80 backdrop-blur-md border-b border-[#5a3030]/30 shadow-lg" 
          : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* LOGO */}
        <Link
          href="/"
          className="text-2xl font-bold text-[#ffb3b3] hover:text-white transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(255,179,179,0.5)]"
        >
          ResumeX
        </Link>

        {/* NAVIGATION LINKS REMOVED HERE */}

        {/* AUTH SECTION */}
        <div className="hidden md:flex items-center gap-3 min-w-[200px] justify-end">
          <ClerkLoading>
            <div className="h-9 w-24 bg-[#5a3030]/50 rounded animate-pulse" />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button className="bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] border-none font-bold rounded-full px-6 transition-all shadow-lg shadow-[#ff8080]/20">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
            <SignedOut>
              <AuthButtons />
            </SignedOut>
          </ClerkLoaded>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden text-[#ebd0d0] hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-500",
          isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="bg-[#2d1010]/95 backdrop-blur-md px-6 py-4 space-y-4 border-b border-[#5a3030]/30">
          {/* NAVIGATION LINKS REMOVED HERE */}
          
          <div className="flex flex-col gap-3 pt-2">
            <ClerkLoaded>
              <SignedIn>
                 <Link href="/dashboard" className="w-full">
                    <Button className="w-full bg-[#ff8080] text-[#1a0808] hover:bg-[#ff9999]">
                      Go to Dashboard
                    </Button>
                 </Link>
                 <div className="flex justify-center pt-2">
                   <UserButton afterSignOutUrl="/" />
                 </div>
              </SignedIn>
              <SignedOut>
                <AuthButtons />
              </SignedOut>
            </ClerkLoaded>
          </div>
        </div>
      </div>
    </header>
  )
}