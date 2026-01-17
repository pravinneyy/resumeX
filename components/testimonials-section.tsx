"use client"

import { useRef, useState } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

const testimonials = [
  {
    quote:
      "ResumeX completely transformed our hiring process. We reduced time-to-hire by 60% while improving candidate quality significantly.",
    author: "Sarah Chen",
    role: "Head of Talent Acquisition",
    company: "TechCorp Inc.",
    avatar: "/professional-woman-headshot.png",
    rating: 5,
  },
  {
    quote:
      "The AI-powered matching is incredibly accurate. I found my dream job within two weeks of signing up. The assessment process was fair and transparent.",
    author: "Marcus Johnson",
    role: "Senior Software Engineer",
    company: "Hired via ResumeX",
    avatar: "/professional-man-headshot.png",
    rating: 5,
  },
  {
    quote:
      "Finally, a recruitment platform that shows me exactly why I was or wasn't selected. The transparency is refreshing and helps me improve.",
    author: "Emily Rodriguez",
    role: "Product Designer",
    company: "Hired via ResumeX",
    avatar: "/professional-woman-designer-headshot.png",
    rating: 5,
  },
  {
    quote:
      "We've hired 50+ candidates through ResumeX. The quality of matches and the structured assessment process saves us countless hours.",
    author: "David Kim",
    role: "VP of Engineering",
    company: "StartupXYZ",
    avatar: "/professional-man-executive-headshot.jpg",
    rating: 5,
  },
]

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2 })
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section ref={sectionRef} className="snap-section py-24 px-6 min-h-screen flex items-center relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#3a1818]/50 via-transparent to-[#3a1818]/50 pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div
            className={cn(
              "transition-all duration-700",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10",
            )}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#e8a0a0] mb-4 hover:text-[#f0c0c0] hover:drop-shadow-[0_0_20px_rgba(232,160,160,0.5)] transition-all duration-300 cursor-default">
              Real Voices
            </h2>
            <p className="text-[#b8a0a0] text-lg mb-8 hover:text-[#d0b8b8] transition-colors cursor-default">
              Candidates and recruiters speak about their experience with ResumeX
            </p>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-[#5a3030] text-[#e8a0a0] hover:bg-[#e8a0a0] hover:text-[#2a1010] hover:border-[#e8a0a0] bg-transparent transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(232,160,160,0.5)]"
                onClick={prevTestimonial}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 hover:scale-150 hover:bg-[#f0c0c0]",
                      currentIndex === index
                        ? "bg-[#e8a0a0] w-6 shadow-[0_0_10px_rgba(232,160,160,0.5)]"
                        : "bg-[#5a3030] hover:bg-[#e8a0a0]/50",
                    )}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-[#5a3030] text-[#e8a0a0] hover:bg-[#e8a0a0] hover:text-[#2a1010] hover:border-[#e8a0a0] bg-transparent transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(232,160,160,0.5)]"
                onClick={nextTestimonial}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Testimonial Card */}
          <div
            className={cn(
              "relative transition-all duration-700",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
            )}
          >
            <div className="bg-[#2a1010]/90 border border-[#5a3030]/50 rounded-2xl p-8 relative overflow-hidden group hover:border-[#e8a0a0]/40 hover:shadow-2xl hover:shadow-[#e8a0a0]/20 transition-all duration-500">
              <Quote className="absolute top-6 right-6 w-12 h-12 text-[#5a3030] group-hover:text-[#e8a0a0]/50 group-hover:scale-110 transition-all duration-500" />

              <div className="relative z-10">
                {/* Rating with hover */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-[#e8a0a0] text-[#e8a0a0] hover:fill-[#f0c0c0] hover:text-[#f0c0c0] hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(232,160,160,0.6)] transition-all duration-300"
                    />
                  ))}
                </div>

                <p className="text-white text-lg leading-relaxed mb-6 italic group-hover:text-[#f0e8e8] transition-colors">
                  &quot;{testimonials[currentIndex].quote}&quot;
                </p>

                <div className="flex items-center gap-4">
                  <img
                    src={testimonials[currentIndex].avatar || "/placeholder.svg"}
                    alt={testimonials[currentIndex].author}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#e8a0a0]/30 group-hover:border-[#e8a0a0] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(232,160,160,0.4)] transition-all duration-300"
                  />
                  <div>
                    <p className="text-white font-semibold group-hover:text-[#f0c0c0] transition-colors">
                      {testimonials[currentIndex].author}
                    </p>
                    <p className="text-[#b8a0a0] text-sm group-hover:text-[#d0b8b8] transition-colors">
                      {testimonials[currentIndex].role}
                    </p>
                    <p className="text-[#e8a0a0] text-sm group-hover:text-[#f0c0c0] transition-colors">
                      {testimonials[currentIndex].company}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hover glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#e8a0a0]/0 to-[#e8a0a0]/0 group-hover:from-[#e8a0a0]/10 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
