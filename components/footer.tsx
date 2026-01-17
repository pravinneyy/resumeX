"use client"

import Link from "next/link"
import { Github, Twitter, Linkedin, Instagram, ArrowUp } from "lucide-react"

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "API"],
  Company: ["About", "Blog", "Careers", "Press"],
  Resources: ["Documentation", "Help Center", "Privacy", "Terms"],
  Connect: ["Contact", "Support", "Partners", "Community"],
}

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Instagram, href: "#", label: "Instagram" },
]

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="snap-section bg-[#2a1010] border-t border-[#5a3030]/30 py-16 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="text-2xl font-bold text-[#e8a0a0] mb-4 block hover:text-[#f0c0c0] transition-colors"
            >
              ResumeX
            </Link>
            <p className="text-[#b8a0a0] mb-6 max-w-sm">
              AI-powered recruitment platform that makes hiring fair, transparent, and efficient for everyone.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-[#5a3030] flex items-center justify-center hover:bg-[#e8a0a0] transition-colors duration-300 group"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-[#e8a0a0] group-hover:text-[#2a1010] transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4 hover:text-[#f0c0c0] transition-colors cursor-default">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-[#b8a0a0] hover:text-[#f0c0c0] transition-colors duration-300 text-sm"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-[#5a3030]/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#8a5050] text-sm">© 2026 ResumeX. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-[#8a5050] hover:text-[#f0c0c0] text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-[#8a5050] hover:text-[#f0c0c0] text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-[#8a5050] hover:text-[#f0c0c0] text-sm transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={scrollToTop}
        className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-[#5a3030] border border-[#7a4040] flex items-center justify-center hover:bg-[#e8a0a0] hover:border-[#e8a0a0] transition-all duration-300 group hover:scale-110 hover:shadow-[0_0_20px_rgba(232,160,160,0.4)]"
        aria-label="Go to top"
      >
        <ArrowUp className="w-5 h-5 text-[#e8a0a0] group-hover:text-[#2a1010] transition-colors" />
      </button>
    </footer>
  )
}
