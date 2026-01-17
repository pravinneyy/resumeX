"use client"

import { useState } from "react"
import "./candidate.css" 
import { CandidateSidebar } from "@/components/candidate/sidebar"

// FIX: Update import to point to the new 'recruiter' folder
import { Header } from "@/components/recruiter/header" 

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50 h-full transition-[width] duration-300 ease-in-out"
           style={{ width: sidebarCollapsed ? '70px' : '240px' }}>
        <CandidateSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Main Content */}
      <div 
        className="flex flex-col flex-1 w-full transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarCollapsed ? '70px' : '240px' }}
      >
        <Header />
        <main className="flex-1 py-8 px-6 overflow-y-auto h-[calc(100vh-64px)] will-change-transform">
          {children}
        </main>
      </div>
    </div>
  )
}