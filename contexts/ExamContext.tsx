"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

interface ExamState {
    isExamActive: boolean
    isFullscreen: boolean
    currentAssessmentType: "psychometric" | "technical" | "coding" | null
    jobId: number | null
    startTime: number | null
    timeRemaining: number
    violationCount: number
    isPaused: boolean
    pauseReason: string | null
}

interface ExamContextType extends ExamState {
    startExam: (jobId: number, type: ExamState["currentAssessmentType"], durationSeconds: number) => void
    endExam: (status: "completed" | "malpractice") => void
    pauseExam: (reason: string) => void
    resumeExam: () => void
    incrementViolation: () => number
    setTimeRemaining: (seconds: number) => void
    enterFullscreen: () => void
    exitFullscreen: () => void
}

const ExamContext = createContext<ExamContextType | null>(null)

export function ExamProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    const [examState, setExamState] = useState<ExamState>({
        isExamActive: false,
        isFullscreen: false,
        currentAssessmentType: null,
        jobId: null,
        startTime: null,
        timeRemaining: 0,
        violationCount: 0,
        isPaused: false,
        pauseReason: null,
    })

    // Prevent navigation during active exam
    useEffect(() => {
        if (!examState.isExamActive) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = "You have an active exam. Are you sure you want to leave?"
            return e.returnValue
        }

        const handlePopState = (e: PopStateEvent) => {
            if (examState.isExamActive) {
                e.preventDefault()
                window.history.pushState(null, "", pathname)
                alert("⚠️ Navigation is disabled during the exam. Please complete or submit your assessment.")
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        window.addEventListener("popstate", handlePopState)
        window.history.pushState(null, "", pathname)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            window.removeEventListener("popstate", handlePopState)
        }
    }, [examState.isExamActive, pathname])

    const startExam = useCallback((jobId: number, type: ExamState["currentAssessmentType"], durationSeconds: number) => {
        setExamState({
            isExamActive: true,
            isFullscreen: false,
            currentAssessmentType: type,
            jobId,
            startTime: Date.now(),
            timeRemaining: durationSeconds,
            violationCount: 0,
            isPaused: false,
            pauseReason: null,
        })
        console.log("[ExamContext] Exam started:", { jobId, type, durationSeconds })
    }, [])

    const endExam = useCallback((status: "completed" | "malpractice") => {
        console.log("[ExamContext] Exam ended:", status)
        setExamState({
            isExamActive: false,
            isFullscreen: false,
            currentAssessmentType: null,
            jobId: null,
            startTime: null,
            timeRemaining: 0,
            violationCount: 0,
            isPaused: false,
            pauseReason: null,
        })

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { })
        }
    }, [])

    const pauseExam = useCallback((reason: string) => {
        setExamState(prev => ({
            ...prev,
            isPaused: true,
            pauseReason: reason,
        }))
    }, [])

    const resumeExam = useCallback(() => {
        setExamState(prev => ({
            ...prev,
            isPaused: false,
            pauseReason: null,
        }))
    }, [])

    const incrementViolation = useCallback(() => {
        let newCount = 0
        setExamState(prev => {
            newCount = prev.violationCount + 1
            return { ...prev, violationCount: newCount }
        })
        return newCount
    }, [])

    const setTimeRemaining = useCallback((seconds: number) => {
        setExamState(prev => ({ ...prev, timeRemaining: seconds }))
    }, [])

    const enterFullscreen = useCallback(() => {
        document.documentElement.requestFullscreen().then(() => {
            setExamState(prev => ({ ...prev, isFullscreen: true }))
        }).catch((err) => {
            console.warn("[ExamContext] Fullscreen request failed:", err)
        })
    }, [])

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen().then(() => {
                setExamState(prev => ({ ...prev, isFullscreen: false }))
            }).catch(() => { })
        }
    }, [])

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setExamState(prev => ({
                ...prev,
                isFullscreen: !!document.fullscreenElement
            }))
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [])

    return (
        <ExamContext.Provider
            value={{
                ...examState,
                startExam,
                endExam,
                pauseExam,
                resumeExam,
                incrementViolation,
                setTimeRemaining,
                enterFullscreen,
                exitFullscreen,
            }}
        >
            {children}
        </ExamContext.Provider>
    )
}

export function useExam() {
    const context = useContext(ExamContext)
    if (!context) {
        throw new Error("useExam must be used within an ExamProvider")
    }
    return context
}
