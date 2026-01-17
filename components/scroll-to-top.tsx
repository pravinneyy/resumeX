"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <Button
      size="icon"
      className={cn(
        "fixed bottom-8 right-8 z-50 rounded-full w-12 h-12 shadow-xl shadow-[#e8a0a0]/20 transition-all duration-500",
        "bg-[#e8a0a0] hover:bg-[#f0c0c0] text-[#1a0808] border border-[#5a3030]",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
      onClick={scrollToTop}
    >
      <ArrowUp className="h-6 w-6" />
    </Button>
  )
}