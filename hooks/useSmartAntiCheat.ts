"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// ===== VIOLATION TYPES WITH SEVERITY LEVELS =====
export type ViolationType =
    | "CAMERA_VIOLATION"
    | "TAB_SWITCH"
    | "WINDOW_BLUR"
    | "EXTERNAL_PASTE"      // NEW: Only external paste (not internal copy-paste)
    | "SUSPICIOUS_PASTE"    // NEW: Very long paste, likely from external source
    | "DEVTOOLS_ATTEMPT"    // NEW: Tried to open DevTools
    | "RIGHT_CLICK"         // NEW: Right-click context menu
    | "PRINT_SCREEN"        // NEW: Print screen attempt
    | "FULLSCREEN_EXIT"     // NEW: Exited fullscreen mode
    | "NO_FACE"
    | "MULTIPLE_FACES"
    | "LOOKING_AWAY"
    | "AUDIO_DETECTED"      // NEW: Audio/speaking detected
    | "MALPRACTICE_AUTO_FAIL"

export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface ViolationLog {
    type: ViolationType
    severity: SeverityLevel
    reason?: string
    duration?: number
    context?: string
    pastedContent?: string  // For paste violations, store content length
    timestamp: number
}

// Severity mapping for each violation type
const VIOLATION_SEVERITY: Record<ViolationType, SeverityLevel> = {
    CAMERA_VIOLATION: "HIGH",
    TAB_SWITCH: "MEDIUM",
    WINDOW_BLUR: "LOW",
    EXTERNAL_PASTE: "HIGH",
    SUSPICIOUS_PASTE: "CRITICAL",
    DEVTOOLS_ATTEMPT: "CRITICAL",
    RIGHT_CLICK: "LOW",
    PRINT_SCREEN: "MEDIUM",
    FULLSCREEN_EXIT: "MEDIUM",
    NO_FACE: "MEDIUM",
    MULTIPLE_FACES: "HIGH",
    LOOKING_AWAY: "LOW",
    AUDIO_DETECTED: "MEDIUM",
    MALPRACTICE_AUTO_FAIL: "CRITICAL",
}

// Cooldown periods to prevent spam logging (in ms)
const COOLDOWN_PERIODS: Partial<Record<ViolationType, number>> = {
    NO_FACE: 10000,         // 10 seconds between NO_FACE logs
    LOOKING_AWAY: 5000,     // 5 seconds between LOOKING_AWAY logs
    WINDOW_BLUR: 3000,      // 3 seconds between blur logs
    RIGHT_CLICK: 2000,      // 2 seconds between right-click logs
}

// Minimum duration for temporal violations to be logged (in seconds)
const MIN_DURATION_TO_LOG = {
    TAB_SWITCH: 2,      // Only log tab switches lasting > 2 seconds
    WINDOW_BLUR: 2,     // Only log window blurs lasting > 2 seconds
}

interface UseSmartAntiCheatOptions {
    sessionId: string
    enabled?: boolean
    candidateId?: string
    jobId?: number
    onViolation?: (violation: ViolationLog, totalCount: number) => void
    onPause?: (reason: string) => void
    onAutoFail?: () => void
    maxViolations?: number
    faceDetectionTimeoutMs?: number
    enableFullscreenLock?: boolean
    enableAudioMonitoring?: boolean
}

export function useSmartAntiCheat({
    sessionId,
    enabled = true,
    candidateId,
    jobId,
    onViolation,
    onPause,
    onAutoFail,
    maxViolations = 10,
    faceDetectionTimeoutMs = 15000,
    enableFullscreenLock = false,  // Off by default, can be enabled
    enableAudioMonitoring = false, // Off by default, can be enabled
}: UseSmartAntiCheatOptions) {
    const [violations, setViolations] = useState<ViolationLog[]>([])
    const [cameraActive, setCameraActive] = useState(false)
    const [faceDetectionActive, setFaceDetectionActive] = useState(false)
    const [currentFaceCount, setCurrentFaceCount] = useState<number>(0)
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true)
    const [isPaused, setIsPaused] = useState(false)
    const [pauseReason, setPauseReason] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [audioMonitorActive, setAudioMonitorActive] = useState(false)

    // Refs
    const violationsRef = useRef<ViolationLog[]>([])
    const tabHiddenTimeRef = useRef<number | null>(null)
    const windowBlurTimeRef = useRef<number | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const audioStreamRef = useRef<MediaStream | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const cameraCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const videoElementRef = useRef<HTMLVideoElement | null>(null)
    const faceMeshRef = useRef<any>(null)

    // Track internal clipboard to distinguish internal vs external paste
    const internalClipboardRef = useRef<string>("")
    const lastViolationTimeRef = useRef<Partial<Record<ViolationType, number>>>({})

    // ===== COOLDOWN CHECK =====
    const isOnCooldown = useCallback((type: ViolationType): boolean => {
        const cooldown = COOLDOWN_PERIODS[type]
        if (!cooldown) return false

        const lastTime = lastViolationTimeRef.current[type]
        if (!lastTime) return false

        return Date.now() - lastTime < cooldown
    }, [])

    // ===== LOGGING FUNCTION WITH SEVERITY =====
    const logViolation = useCallback((violation: Omit<ViolationLog, 'severity'>) => {
        // Check cooldown
        if (isOnCooldown(violation.type)) {
            console.log(`[SmartAntiCheat] Skipping ${violation.type} - on cooldown`)
            return
        }

        const fullViolation: ViolationLog = {
            ...violation,
            severity: VIOLATION_SEVERITY[violation.type],
        }

        violationsRef.current.push(fullViolation)
        setViolations([...violationsRef.current])
        lastViolationTimeRef.current[violation.type] = Date.now()

        console.warn(`[SmartAntiCheat] [${fullViolation.severity}]`, fullViolation)

        // Push to Supabase
        if (candidateId && jobId) {
            supabase.from("violation_logs").insert({
                session_id: sessionId,
                candidate_id: candidateId,
                job_id: jobId,
                type: fullViolation.type,
                severity: fullViolation.severity,
                reason: fullViolation.reason,
                duration: fullViolation.duration,
                context: fullViolation.context,
                timestamp: fullViolation.timestamp,
                logged_at: new Date().toISOString(),
            }).then(({ error }) => {
                if (error) console.warn("[SmartAntiCheat] DB log error:", error)
            })
        }

        // Notify callback
        const totalCount = violationsRef.current.length
        onViolation?.(fullViolation, totalCount)

        // Check critical violations for auto-fail
        const criticalCount = violationsRef.current.filter(v => v.severity === "CRITICAL").length
        if (criticalCount >= 3) {
            onAutoFail?.()
        }
    }, [sessionId, candidateId, jobId, onViolation, onAutoFail, isOnCooldown])

    // ===== SMART COPY/PASTE DETECTION =====
    useEffect(() => {
        if (!enabled) return

        // Track what candidate copies from within the IDE
        const handleCopy = (e: ClipboardEvent) => {
            const selection = window.getSelection()?.toString() || ""
            if (selection.length > 0) {
                // Store copied content to compare with paste
                internalClipboardRef.current = selection
                console.log("[SmartAntiCheat] Internal copy tracked:", selection.substring(0, 50) + "...")
            }
        }

        const handleCut = (e: ClipboardEvent) => {
            const selection = window.getSelection()?.toString() || ""
            if (selection.length > 0) {
                internalClipboardRef.current = selection
                console.log("[SmartAntiCheat] Internal cut tracked:", selection.substring(0, 50) + "...")
            }
        }

        // Smart paste detection
        const handlePaste = (e: ClipboardEvent) => {
            const pastedText = e.clipboardData?.getData("text") || ""

            if (pastedText.length === 0) return

            // Check if this paste matches what was copied internally
            const isInternalPaste = internalClipboardRef.current.length > 0 &&
                pastedText === internalClipboardRef.current

            if (isInternalPaste) {
                // This is internal copy-paste within the IDE - ALLOW IT
                console.log("[SmartAntiCheat] Internal paste detected - ALLOWED")
                return
            }

            // External paste detected
            const pasteLength = pastedText.length

            // Check for suspicious paste (very long code, likely from ChatGPT/Stack Overflow)
            if (pasteLength > 500) {
                logViolation({
                    type: "SUSPICIOUS_PASTE",
                    reason: `Pasted ${pasteLength} characters from external source`,
                    context: `First 100 chars: ${pastedText.substring(0, 100)}...`,
                    timestamp: Date.now(),
                })
            } else if (pasteLength > 50) {
                // Regular external paste
                logViolation({
                    type: "EXTERNAL_PASTE",
                    reason: `Pasted ${pasteLength} characters from external source`,
                    timestamp: Date.now(),
                })
            }
            // Small pastes (< 50 chars) are ignored - could be variable names, etc.
        }

        document.addEventListener("copy", handleCopy)
        document.addEventListener("cut", handleCut)
        document.addEventListener("paste", handlePaste)

        return () => {
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("cut", handleCut)
            document.removeEventListener("paste", handlePaste)
        }
    }, [enabled, logViolation])

    // ===== DEVTOOLS DETECTION =====
    useEffect(() => {
        if (!enabled) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Detect DevTools shortcuts
            const isDevToolsShortcut =
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") ||
                (e.ctrlKey && e.key.toLowerCase() === "u")  // View source

            if (isDevToolsShortcut) {
                e.preventDefault()
                logViolation({
                    type: "DEVTOOLS_ATTEMPT",
                    reason: `Attempted to open DevTools: ${e.key}`,
                    timestamp: Date.now(),
                })
            }

            // Detect Print Screen
            if (e.key === "PrintScreen") {
                logViolation({
                    type: "PRINT_SCREEN",
                    reason: "Print Screen key pressed",
                    timestamp: Date.now(),
                })
            }
        }

        // Right-click detection
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            logViolation({
                type: "RIGHT_CLICK",
                reason: "Right-click context menu blocked",
                timestamp: Date.now(),
            })
        }

        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("contextmenu", handleContextMenu)

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("contextmenu", handleContextMenu)
        }
    }, [enabled, logViolation])

    // ===== TAB VISIBILITY (with minimum duration) =====
    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabHiddenTimeRef.current = Date.now()
            } else if (tabHiddenTimeRef.current) {
                const duration = Math.floor((Date.now() - tabHiddenTimeRef.current) / 1000)

                // Only log if duration exceeds minimum
                if (duration >= MIN_DURATION_TO_LOG.TAB_SWITCH) {
                    logViolation({
                        type: "TAB_SWITCH",
                        reason: "Switched away from exam tab",
                        duration,
                        timestamp: Date.now(),
                    })
                }
                tabHiddenTimeRef.current = null
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [enabled, logViolation])

    // ===== WINDOW BLUR (with minimum duration) =====
    useEffect(() => {
        if (!enabled) return

        const handleBlur = () => {
            windowBlurTimeRef.current = Date.now()
        }

        const handleFocus = () => {
            if (windowBlurTimeRef.current) {
                const duration = Math.floor((Date.now() - windowBlurTimeRef.current) / 1000)

                // Only log if duration exceeds minimum
                if (duration >= MIN_DURATION_TO_LOG.WINDOW_BLUR) {
                    logViolation({
                        type: "WINDOW_BLUR",
                        reason: "Window lost focus",
                        duration,
                        timestamp: Date.now(),
                    })
                }
                windowBlurTimeRef.current = null
            }
        }

        window.addEventListener("blur", handleBlur)
        window.addEventListener("focus", handleFocus)

        return () => {
            window.removeEventListener("blur", handleBlur)
            window.removeEventListener("focus", handleFocus)
        }
    }, [enabled, logViolation])

    // ===== FULLSCREEN LOCK =====
    useEffect(() => {
        if (!enabled || !enableFullscreenLock) return

        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement
            setIsFullscreen(isNowFullscreen)

            if (!isNowFullscreen && isFullscreen) {
                // Exited fullscreen
                logViolation({
                    type: "FULLSCREEN_EXIT",
                    reason: "Exited fullscreen mode",
                    timestamp: Date.now(),
                })
            }
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [enabled, enableFullscreenLock, isFullscreen, logViolation])

    // ===== AUDIO MONITORING (Optional) =====
    const initializeAudioMonitoring = useCallback(async () => {
        if (!enableAudioMonitoring) return

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioStreamRef.current = stream

            const audioContext = new AudioContext()
            audioContextRef.current = audioContext

            const analyser = audioContext.createAnalyser()
            const microphone = audioContext.createMediaStreamSource(stream)
            microphone.connect(analyser)

            analyser.fftSize = 256
            const bufferLength = analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            let speechDetectedSince: number | null = null

            const checkAudio = () => {
                analyser.getByteFrequencyData(dataArray)
                const average = dataArray.reduce((a, b) => a + b) / bufferLength

                // Threshold for speech detection
                if (average > 30) {
                    if (!speechDetectedSince) {
                        speechDetectedSince = Date.now()
                    } else if (Date.now() - speechDetectedSince > 3000) {
                        // Speech detected for more than 3 seconds
                        logViolation({
                            type: "AUDIO_DETECTED",
                            reason: "Prolonged audio/speech detected",
                            duration: Math.floor((Date.now() - speechDetectedSince) / 1000),
                            timestamp: Date.now(),
                        })
                        speechDetectedSince = null // Reset
                    }
                } else {
                    speechDetectedSince = null
                }

                if (audioStreamRef.current) {
                    requestAnimationFrame(checkAudio)
                }
            }

            checkAudio()
            setAudioMonitorActive(true)
        } catch (error) {
            console.warn("[SmartAntiCheat] Audio monitoring failed:", error)
        }
    }, [enableAudioMonitoring, logViolation])

    // ===== CAMERA & FACE DETECTION (simplified - reuse existing logic) =====
    const initializeCamera = useCallback(async () => {
        if (!enabled) return

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            })

            cameraStreamRef.current = stream
            setCameraActive(true)

            // Create video element
            let video = document.querySelector<HTMLVideoElement>('[data-test-video="camera-feed"]')
            if (!video) {
                video = document.createElement("video")
                video.setAttribute("data-test-video", "camera-feed")
                video.style.cssText = `
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    width: 120px;
                    height: 90px;
                    border-radius: 8px;
                    border: 2px solid #22c55e;
                    z-index: 9999;
                    object-fit: cover;
                `
                document.body.appendChild(video)
            }

            video.srcObject = stream
            video.autoplay = true
            video.playsInline = true
            video.muted = true
            videoElementRef.current = video

            await video.play()
            setFaceDetectionActive(true)

            // Also initialize audio if enabled
            if (enableAudioMonitoring) {
                initializeAudioMonitoring()
            }

        } catch (error: any) {
            setCameraActive(false)
            logViolation({
                type: "CAMERA_VIOLATION",
                reason: error?.name || "Camera access failed",
                timestamp: Date.now(),
            })
            throw error
        }
    }, [enabled, enableAudioMonitoring, logViolation, initializeAudioMonitoring])

    const stopCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop())
            cameraStreamRef.current = null
            setCameraActive(false)
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop())
            audioStreamRef.current = null
            setAudioMonitorActive(false)
        }
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        if (cameraCheckIntervalRef.current) clearInterval(cameraCheckIntervalRef.current)
        if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current)
        setFaceDetectionActive(false)

        const video = document.querySelector('[data-test-video="camera-feed"]')
        if (video) video.remove()
    }, [])

    // ===== REQUEST FULLSCREEN =====
    const requestFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } catch (error) {
            console.warn("[SmartAntiCheat] Fullscreen request failed:", error)
        }
    }, [])

    // ===== PAUSE/RESUME =====
    const pauseForViolation = useCallback((reason: string) => {
        setIsPaused(true)
        setPauseReason(reason)
        onPause?.(reason)
    }, [onPause])

    const resume = useCallback(() => {
        setIsPaused(false)
        setPauseReason(null)
    }, [])

    // ===== SEND LOGS =====
    const sendLogsOnCompletion = async () => {
        if (violationsRef.current.length > 0 && candidateId && jobId) {
            try {
                await fetch("http://127.0.0.1:8000/api/anti-cheat/logs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: sessionId,
                        candidate_id: candidateId,
                        job_id: jobId,
                        violations: violationsRef.current,
                    }),
                })
            } catch (error) {
                console.warn("[SmartAntiCheat] Failed to send logs:", error)
            }
        }
    }

    // ===== GET SUMMARY =====
    const getViolationSummary = useCallback(() => {
        const summary = {
            total: violationsRef.current.length,
            bySeverity: {
                LOW: 0,
                MEDIUM: 0,
                HIGH: 0,
                CRITICAL: 0,
            },
            byType: {} as Record<string, number>,
        }

        violationsRef.current.forEach(v => {
            summary.bySeverity[v.severity]++
            summary.byType[v.type] = (summary.byType[v.type] || 0) + 1
        })

        return summary
    }, [])

    // ===== CLEANUP =====
    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [stopCamera])

    return {
        violations,
        violationCount: violations.length,
        getViolationSummary,
        cameraActive,
        faceDetectionActive,
        audioMonitorActive,
        currentFaceCount,
        isLookingAtScreen,
        isPaused,
        pauseReason,
        isFullscreen,
        initializeCamera,
        stopCamera,
        requestFullscreen,
        resume,
        sendLogsOnCompletion,
    }
}
