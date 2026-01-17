"use client"

import { useState, useEffect } from "react"
import "./recruiter.css"
import { Sidebar } from "@/components/recruiter/sidebar"
import { Header } from "@/components/recruiter/header"

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Prevent hydration mismatch by waiting for mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null // or a simple loading spinner
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">

      {/* Sidebar Container - Fixed Position */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50 h-full transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarCollapsed ? '70px' : '240px' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content - Optimized Transition */}
      {/* We only transition 'margin-left', not 'all', to save CPU */}
      <div
        className="flex flex-col flex-1 w-full transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? '70px' : '240px' }}
      >
        <Header />

        {/* 'will-change-transform' helps browser optimize rendering */}
        <main className="flex-1 py-8 px-6 overflow-y-auto h-[calc(100vh-64px)] will-change-transform">
          {children}
        </main>
      </div>
    </div>
  )
}