"use client"

import type React from "react"

import { useRef, useState } from "react"
import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mail, CheckCircle2, Loader2 } from "lucide-react"

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@resumex.com",
    href: "mailto:hello@resumex.com",
  },
]

export function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { threshold: 0.2 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSubmitted(true)
    setFormData({ name: "", email: "", message: "" })

    setTimeout(() => setIsSubmitted(false), 5000)
  }

  return (
    <section ref={sectionRef} id="contact" className="snap-section py-24 px-6 min-h-screen flex items-center relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#2a1010]/50 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div
          className={cn(
            "text-center mb-16 transition-all duration-700",
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
          )}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#e8a0a0] mb-4 hover:text-[#f0c0c0] hover:drop-shadow-[0_0_20px_rgba(232,160,160,0.5)] transition-all duration-300 cursor-default">
            Contact Us
          </h2>
          <p className="text-[#b8a0a0] text-lg max-w-2xl mx-auto hover:text-[#d0b8b8] transition-colors cursor-default">
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as
            possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div
            className={cn(
              "transition-all duration-700",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10",
            )}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-white text-sm font-medium group-hover:text-[#f0c0c0] transition-colors">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-[#2a1010] border-[#5a3030] text-white placeholder:text-[#8a5050] focus:border-[#e8a0a0] focus:ring-[#e8a0a0]/20 hover:border-[#e8a0a0]/50 hover:shadow-[0_0_10px_rgba(232,160,160,0.15)] transition-all duration-300 h-12"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-white text-sm font-medium group-hover:text-[#f0c0c0] transition-colors">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-[#2a1010] border-[#5a3030] text-white placeholder:text-[#8a5050] focus:border-[#e8a0a0] focus:ring-[#e8a0a0]/20 hover:border-[#e8a0a0]/50 hover:shadow-[0_0_10px_rgba(232,160,160,0.15)] transition-all duration-300 h-12"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-white text-sm font-medium group-hover:text-[#f0c0c0] transition-colors">
                  Message
                </label>
                <Textarea
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="bg-[#2a1010] border-[#5a3030] text-white placeholder:text-[#8a5050] focus:border-[#e8a0a0] focus:ring-[#e8a0a0]/20 hover:border-[#e8a0a0]/50 hover:shadow-[0_0_10px_rgba(232,160,160,0.15)] transition-all duration-300 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isSubmitted}
                className={cn(
                  "w-full h-12 rounded-xl transition-all duration-300 font-semibold group",
                  isSubmitted
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[#e8a0a0] hover:bg-[#f0c0c0] text-[#2a1010] hover:shadow-2xl hover:shadow-[#e8a0a0]/40 hover:scale-[1.02]",
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : isSubmitted ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Message Sent!
                  </>
                ) : (
                  <>
                    Submit
                    <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info Card */}
          <div
            className={cn(
              "transition-all duration-700",
              isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
            )}
          >
            <div className="bg-[#2a1010]/80 border border-[#5a3030]/50 rounded-2xl p-8 h-full hover:border-[#e8a0a0]/40 hover:shadow-2xl hover:shadow-[#e8a0a0]/20 transition-all duration-500 group flex flex-col justify-center">
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 group/item transition-all duration-500",
                      isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10",
                    )}
                    style={{ transitionDelay: `${index * 100 + 200}ms` }}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#5a3030] flex items-center justify-center group-hover/item:bg-[#e8a0a0] group-hover/item:scale-125 group-hover/item:shadow-[0_0_20px_rgba(232,160,160,0.6)] transition-all duration-300">
                      <item.icon className="w-5 h-5 text-[#e8a0a0] group-hover/item:text-[#2a1010] transition-colors duration-300" />
                    </div>
                    <div>
                      <p className="text-[#8a5050] text-sm group-hover/item:text-[#b8a0a0] transition-colors">
                        {item.label}
                      </p>
                      <p className="text-white font-medium group-hover/item:text-[#f0c0c0] transition-colors">
                        {item.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Decorative element to fill the space */}
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-[#3a1818] to-[#2a1010] border border-[#5a3030]/30 group-hover:border-[#e8a0a0]/30 transition-all duration-500">
                <p className="text-[#b8a0a0] text-center group-hover:text-[#d0b8b8] transition-colors">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
