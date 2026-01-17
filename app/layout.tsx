import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./global.css"
import { ClerkProvider } from "@clerk/nextjs"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ResumeX - AI-Powered Recruitment Platform",
  description: "Recruitment built on intelligence and fairness.",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "blockButton",
        },
        variables: { 
          colorPrimary: "#ff8080", 
          colorText: "#ffffff", 
          colorTextSecondary: "#ffd9d9", 
          colorBackground: "#2d1010", 
          colorInputBackground: "#3d1818", 
          colorInputText: "#ffffff", 
        },
        elements: {
          card: "bg-[#2d1010] shadow-2xl border border-[#5a3030]",
          
          userButtonPopoverCard: "bg-[#2d1010] border border-[#5a3030]",
          userButtonPopoverActionButton: "text-white hover:bg-[#3a1515] hover:text-[#ff8080]",
          userButtonPopoverActionButtonText: "text-white",
          userButtonPopoverActionButtonIcon: "text-[#ff8080]",
          
          // --- FIX: Matched Google Button Color to Primary Button (#ff8080) ---
          socialButtonsBlockButton: "bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] border-none transition-all duration-200",
          socialButtonsBlockButtonText: "text-[#1a0808] font-bold",
          socialButtonsProviderIcon: "mr-2 text-[#1a0808]",
          
          formButtonPrimary: "bg-[#ff8080] hover:bg-[#ff9999] text-[#1a0808] transition-colors font-bold",
          formFieldInput: "bg-[#3d1818] border-[#5a3030] text-white focus:border-[#ff8080]",
          footerActionLink: "text-[#ff8080] hover:text-[#ffb3b3]",
          dividerLine: "bg-[#5a3030]",
          dividerText: "text-[#ebd0d0]"
        },
      }}
    >
      <html lang="en">
        <body className={`font-sans antialiased`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}