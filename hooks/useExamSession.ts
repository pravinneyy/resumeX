"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

interface ExamSession {
    id?: number
    candidate_id: string
    job_id: number
    assessment_type: "psychometric" | "technical" | "coding"
    start_time: string
    time_remaining_seconds: number
    is_active: boolean
    violation_count: number
    status: "in_progress" | "completed" | "malpractice"
    codes_by_question?: Record<number, string> // For coding assessments
}

interface UseExamSessionOptions {
    candidateId: string
    jobId: number
    assessmentType: ExamSession["assessment_type"]
    initialDurationSeconds: number
    onTimeUp?: () => void
    onMalpractice?: () => void
}

export function useExamSession({
    candidateId,
    jobId,
    assessmentType,
    initialDurationSeconds,
    onTimeUp,
    onMalpractice,
}: UseExamSessionOptions) {
    const [session, setSession] = useState<ExamSession | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds)
    const [isLoading, setIsLoading] = useState(true)
    const [violationCount, setViolationCount] = useState(0)
    const [codesByQuestion, setCodesByQuestion] = useState<Record<number, string>>({})

    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const sessionIdRef = useRef<number | null>(null)

    // Load or create session on mount
    useEffect(() => {
        const loadOrCreateSession = async () => {
            try {
                // Try to find existing active session
                const { data: existingSession, error: fetchError } = await supabase
                    .from("assessment_sessions")
                    .select("*")
                    .eq("candidate_id", candidateId)
                    .eq("job_id", jobId)
                    .eq("assessment_type", assessmentType)
                    .eq("is_active", true)
                    .single()

                if (existingSession && !fetchError) {
                    // Resume existing session
                    console.log("[ExamSession] Resuming existing session:", existingSession.id)
                    setSession(existingSession)
                    setTimeRemaining(existingSession.time_remaining_seconds)
                    setViolationCount(existingSession.violation_count || 0)
                    if (existingSession.codes_by_question) {
                        setCodesByQuestion(existingSession.codes_by_question)
                    }
                    sessionIdRef.current = existingSession.id
                } else {
                    // Create new session
                    console.log("[ExamSession] Creating new session")
                    const newSession: Omit<ExamSession, "id"> = {
                        candidate_id: candidateId,
                        job_id: jobId,
                        assessment_type: assessmentType,
                        start_time: new Date().toISOString(),
                        time_remaining_seconds: initialDurationSeconds,
                        is_active: true,
                        violation_count: 0,
                        status: "in_progress",
                        codes_by_question: {},
                    }

                    const { data: created, error: createError } = await supabase
                        .from("assessment_sessions")
                        .insert(newSession)
                        .select()
                        .single()

                    if (createError) {
                        console.error("[ExamSession] Failed to create session:", createError)
                    } else if (created) {
                        setSession(created)
                        sessionIdRef.current = created.id
                        console.log("[ExamSession] Created session:", created.id)
                    }
                }
            } catch (error) {
                console.error("[ExamSession] Error loading session:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadOrCreateSession()
    }, [candidateId, jobId, assessmentType, initialDurationSeconds])

    // Timer countdown
    useEffect(() => {
        if (isLoading || !session) return

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Time's up
                    onTimeUp?.()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isLoading, session, onTimeUp])

    // Save session to Supabase every 30 seconds
    useEffect(() => {
        if (!sessionIdRef.current) return

        const saveSession = async () => {
            const { error } = await supabase
                .from("assessment_sessions")
                .update({
                    time_remaining_seconds: timeRemaining,
                    violation_count: violationCount,
                    codes_by_question: codesByQuestion,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", sessionIdRef.current)

            if (error) {
                console.warn("[ExamSession] Failed to save session:", error)
            } else {
                console.log("[ExamSession] Session saved, time remaining:", timeRemaining)
            }
        }

        saveIntervalRef.current = setInterval(saveSession, 30000)

        return () => {
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current)
        }
    }, [timeRemaining, violationCount, codesByQuestion])

    // Increment violation and check for auto-fail
    const addViolation = useCallback(async (type: string, reason?: string) => {
        const newCount = violationCount + 1
        setViolationCount(newCount)

        // Update in Supabase immediately for realtime
        if (sessionIdRef.current) {
            await supabase
                .from("assessment_sessions")
                .update({
                    violation_count: newCount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", sessionIdRef.current)
        }

        // Check for auto-fail (5 violations)
        if (newCount >= 5) {
            console.warn("[ExamSession] 5 violations reached - MALPRACTICE")
            await markAsMalpractice()
            onMalpractice?.()
        }

        return newCount
    }, [violationCount, onMalpractice])

    // Save code for a specific question
    const saveCodeForQuestion = useCallback((questionIndex: number, code: string) => {
        setCodesByQuestion(prev => ({
            ...prev,
            [questionIndex]: code
        }))
    }, [])

    // Mark session as completed
    const completeSession = useCallback(async () => {
        if (!sessionIdRef.current) return

        await supabase
            .from("assessment_sessions")
            .update({
                is_active: false,
                status: "completed",
                time_remaining_seconds: timeRemaining,
                codes_by_question: codesByQuestion,
                updated_at: new Date().toISOString(),
            })
            .eq("id", sessionIdRef.current)

        console.log("[ExamSession] Session completed")
    }, [timeRemaining, codesByQuestion])

    // Mark session as malpractice
    const markAsMalpractice = useCallback(async () => {
        if (!sessionIdRef.current) return

        await supabase
            .from("assessment_sessions")
            .update({
                is_active: false,
                status: "malpractice",
                updated_at: new Date().toISOString(),
            })
            .eq("id", sessionIdRef.current)

        console.log("[ExamSession] Session marked as MALPRACTICE")
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current)
        }
    }, [])

    return {
        isLoading,
        timeRemaining,
        violationCount,
        codesByQuestion,
        addViolation,
        saveCodeForQuestion,
        completeSession,
        markAsMalpractice,
        sessionId: sessionIdRef.current,
    }
}
