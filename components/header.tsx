"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
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
        // FIX: Changed background to a nicer translucent dark red with blur
        isScrolled 
          ? "bg-[#2d1010]/80 backdrop-blur-md border-b border-[#5a3030]/30 shadow-lg" 
          : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold text-[#ffb3b3] hover:text-white transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(255,179,179,0.5)]"
        >
          ResumeX
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {["For candidates", "For recruiters", "How it works"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-sm text-[#ebd0d0] hover:text-white transition-all duration-300 relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#ffb3b3] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 min-w-[200px] justify-end">
          <ClerkLoading>
            <AuthButtons />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <AuthButtons />
            </SignedOut>
          </ClerkLoaded>
        </div>

        <button
          className="md:hidden text-[#ebd0d0] hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-500",
          isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="bg-[#2d1010]/95 backdrop-blur-md px-6 py-4 space-y-4 border-b border-[#5a3030]/30">
          {["For candidates", "For recruiters", "How it works"].map((item) => (
            <Link key={item} href="#" className="block text-[#ebd0d0] hover:text-white transition-colors">
              {item}
            </Link>
          ))}
          <div className="flex gap-3 pt-2">
            <ClerkLoaded>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
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