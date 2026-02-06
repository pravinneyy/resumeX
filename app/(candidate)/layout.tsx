"use client"

import { useState } from "react"
import "./candidate.css"
import { CandidateSidebar } from "@/components/candidate/sidebar"
import { Header } from "@/components/recruiter/header"
import { ExamProvider, useExam } from "@/contexts/ExamContext"

function CandidateLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isExamActive, isFullscreen } = useExam()

  // Hide sidebar completely during exam
  const showSidebar = !isExamActive

  return (
    <div className={`min-h-screen bg-background text-foreground flex font-sans overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      {/* Sidebar - hidden during exam */}
      {showSidebar && (
        <div className="hidden md:block fixed inset-y-0 left-0 z-50 h-full transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarCollapsed ? '70px' : '240px' }}>
          <CandidateSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      )}

      {/* Main Content */}
      <div
        className="flex flex-col flex-1 w-full transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: showSidebar ? (sidebarCollapsed ? '70px' : '240px') : '0' }}
      >
        {/* Hide header during exam for distraction-free mode */}
        {!isExamActive && <Header />}
        <main className={`flex-1 overflow-y-auto will-change-transform ${isExamActive ? 'h-screen p-0' : 'py-8 px-6 h-[calc(100vh-64px)]'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ExamProvider>
      <CandidateLayoutContent>{children}</CandidateLayoutContent>
    </ExamProvider>
  )
}
