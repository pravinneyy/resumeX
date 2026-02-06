"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type ViolationType =
    | "CAMERA_VIOLATION"
    | "TAB_SWITCH"
    | "WINDOW_BLUR"
    | "COPY_ATTEMPT"
    | "PASTE_ATTEMPT"
    | "CUT_ATTEMPT"
    | "CTRL_C"
    | "CTRL_V"
    | "NO_FACE"
    | "MULTIPLE_FACES"
    | "LOOKING_AWAY"
    | "FACE_DETECTION_TIMEOUT"
    | "MALPRACTICE_AUTO_FAIL"

export interface ViolationLog {
    type: ViolationType
    reason?: string
    duration?: number
    context?: string
    timestamp: number
}

interface UseEnhancedAntiCheatOptions {
    sessionId: string
    enabled?: boolean
    candidateId?: string
    jobId?: number
    onViolation?: (violation: ViolationLog, totalCount: number) => void
    onPause?: (reason: string) => void
    onAutoFail?: () => void
    maxViolations?: number
    faceDetectionTimeoutMs?: number
}

export function useEnhancedAntiCheat({
    sessionId,
    enabled = true,
    candidateId,
    jobId,
    onViolation,
    onPause,
    onAutoFail,
    maxViolations = 5,
    faceDetectionTimeoutMs = 10000, // 10 seconds
}: UseEnhancedAntiCheatOptions) {
    const [violations, setViolations] = useState<ViolationLog[]>([])
    const [cameraActive, setCameraActive] = useState(false)
    const [faceDetectionActive, setFaceDetectionActive] = useState(false)
    const [currentFaceCount, setCurrentFaceCount] = useState<number>(0)
    const [isLookingAtScreen, setIsLookingAtScreen] = useState(true)
    const [isPaused, setIsPaused] = useState(false)
    const [pauseReason, setPauseReason] = useState<string | null>(null)
    const [faceNotDetectedSince, setFaceNotDetectedSince] = useState<number | null>(null)

    const violationsRef = useRef<ViolationLog[]>([])
    const tabHiddenTimeRef = useRef<number | null>(null)
    const windowBlurTimeRef = useRef<number | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const cameraCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const videoElementRef = useRef<HTMLVideoElement | null>(null)
    const faceMeshRef = useRef<any>(null)
    const lastFaceDetectedRef = useRef<number>(Date.now())

    // Cooldown refs to prevent rapid logging
    const lastMultipleFacesLogRef = useRef<number>(0)
    const lastLookingAwayLogRef = useRef<number>(0)
    const MULTIPLE_FACES_COOLDOWN = 10000  // 10 seconds between logs
    const LOOKING_AWAY_COOLDOWN = 5000      // 5 seconds between logs

    // ===== LOGGING FUNCTION =====
    const logViolation = useCallback((violation: ViolationLog) => {
        violationsRef.current.push(violation)
        setViolations([...violationsRef.current])
        console.warn("[EnhancedAntiCheat]", violation)

        // Push to Supabase realtime for recruiter monitoring
        if (candidateId && jobId) {
            supabase.from("violation_logs").insert({
                session_id: sessionId,
                candidate_id: candidateId,
                job_id: jobId,
                type: violation.type,
                reason: violation.reason,
                duration: violation.duration,
                context: violation.context,
                timestamp: violation.timestamp,
                logged_at: new Date().toISOString(),
            }).then(({ error }) => {
                if (error) console.warn("[EnhancedAntiCheat] Failed to log to Supabase:", error)
            })
        }

        // Notify callback
        const totalCount = violationsRef.current.length
        onViolation?.(violation, totalCount)

        // Auto-fail disabled - just log violations for monitoring
    }, [sessionId, candidateId, jobId, onViolation, onAutoFail, maxViolations])

    // ===== PAUSE/RESUME =====
    const pauseForViolation = useCallback((reason: string) => {
        setIsPaused(true)
        setPauseReason(reason)
        onPause?.(reason)
    }, [onPause])

    const resume = useCallback(() => {
        setIsPaused(false)
        setPauseReason(null)
        setFaceNotDetectedSince(null)
    }, [])

    // ===== MEDIAPIPE FACE MESH DETECTION =====
    const initializeFaceDetection = useCallback(async (videoElement: HTMLVideoElement) => {
        try {
            console.log("[EnhancedAntiCheat] Loading MediaPipe from CDN...")

            // Load MediaPipe scripts dynamically from CDN
            const loadScript = (src: string): Promise<void> => {
                return new Promise((resolve, reject) => {
                    if (document.querySelector(`script[src="${src}"]`)) {
                        resolve()
                        return
                    }
                    const script = document.createElement('script')
                    script.src = src
                    script.async = true
                    script.onload = () => resolve()
                    script.onerror = () => reject(new Error(`Failed to load ${src}`))
                    document.head.appendChild(script)
                })
            }

            // Load MediaPipe dependencies
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js')
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js')

            // @ts-ignore - MediaPipe loaded from CDN
            const FaceMesh = window.FaceMesh
            // @ts-ignore
            const Camera = window.Camera

            if (!FaceMesh || !Camera) {
                throw new Error("MediaPipe libraries not loaded")
            }

            console.log("[EnhancedAntiCheat] MediaPipe loaded, initializing Face Mesh...")

            const faceMesh = new FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                },
            })

            faceMesh.setOptions({
                maxNumFaces: 2,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            })

            faceMesh.onResults((results: any) => {
                const faceCount = results.multiFaceLandmarks?.length || 0
                setCurrentFaceCount(faceCount)

                if (faceCount === 0) {
                    const now = Date.now()
                    if (!faceNotDetectedSince) {
                        setFaceNotDetectedSince(now)
                    }

                    // Log NO_FACE every 10 seconds (reduced frequency)
                    if (lastFaceDetectedRef.current && now - lastFaceDetectedRef.current >= 10000) {
                        logViolation({
                            type: "NO_FACE",
                            reason: "No face detected",
                            timestamp: now,
                        })
                        lastFaceDetectedRef.current = now
                    }
                    // Auto-pause and auto-fail disabled
                } else if (faceCount === 1) {
                    setFaceNotDetectedSince(null)
                    lastFaceDetectedRef.current = Date.now()

                    const landmarks = results.multiFaceLandmarks[0]
                    if (landmarks) {
                        const noseTip = landmarks[1]
                        const leftEye = landmarks[33]
                        const rightEye = landmarks[263]

                        const eyeWidth = Math.abs(rightEye.x - leftEye.x)
                        const noseX = noseTip.x

                        // Less sensitive: wider range for acceptable positions
                        const lookingAway = noseX < 0.15 || noseX > 0.85 || eyeWidth < 0.03

                        setIsLookingAtScreen(!lookingAway)

                        // Only log looking away with cooldown to prevent spam
                        if (lookingAway) {
                            const now = Date.now()
                            if (now - lastLookingAwayLogRef.current >= LOOKING_AWAY_COOLDOWN) {
                                lastLookingAwayLogRef.current = now
                                logViolation({
                                    type: "LOOKING_AWAY",
                                    reason: "Candidate appears to be looking away from screen",
                                    timestamp: now,
                                })
                            }
                        }
                    }
                } else if (faceCount > 1) {
                    // Only log multiple faces with cooldown to prevent rapid increment
                    const now = Date.now()
                    if (now - lastMultipleFacesLogRef.current >= MULTIPLE_FACES_COOLDOWN) {
                        lastMultipleFacesLogRef.current = now
                        logViolation({
                            type: "MULTIPLE_FACES",
                            reason: `${faceCount} faces detected`,
                            timestamp: now,
                        })
                    }
                    // Auto-pause disabled - just log the violation
                }
            })

            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    await faceMesh.send({ image: videoElement })
                },
                width: 640,
                height: 480,
            })

            camera.start()
            faceMeshRef.current = faceMesh
            setFaceDetectionActive(true)
            console.log("[EnhancedAntiCheat] MediaPipe Face Mesh active!")
        } catch (error) {
            console.error("[EnhancedAntiCheat] MediaPipe failed, using fallback:", error)
            initializeBasicFaceDetection(videoElement)
        }
    }, [faceNotDetectedSince, faceDetectionTimeoutMs, isPaused, pauseReason, logViolation, pauseForViolation, resume, onAutoFail])

    // ===== FALLBACK: BASIC FACE DETECTION (face-api.js) =====
    const initializeBasicFaceDetection = useCallback(async (videoElement: HTMLVideoElement) => {
        try {
            const faceapi = await import("face-api.js")
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models")

            setFaceDetectionActive(true)

            faceDetectionIntervalRef.current = setInterval(async () => {
                if (!videoElement || videoElement.paused) return

                try {
                    const detections = await faceapi.detectAllFaces(
                        videoElement,
                        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                    )

                    const faceCount = detections.length
                    setCurrentFaceCount(faceCount)

                    if (faceCount === 0) {
                        logViolation({ type: "NO_FACE", reason: "No face detected", timestamp: Date.now() })
                    } else if (faceCount > 1) {
                        logViolation({ type: "MULTIPLE_FACES", reason: `${faceCount} faces`, timestamp: Date.now() })
                    }
                } catch (err) {
                    console.warn("[EnhancedAntiCheat] Detection error:", err)
                }
            }, 2000) // Check every 2 seconds for fallback
        } catch (error) {
            console.error("[EnhancedAntiCheat] Fallback detection failed:", error)
            setFaceDetectionActive(false)
        }
    }, [logViolation])

    // ===== CAMERA INITIALIZATION =====
    const initializeCamera = useCallback(async () => {
        if (!enabled) return

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera API not supported")
            }

            console.log("[EnhancedAntiCheat] Requesting camera access...")

            let stream: MediaStream
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false,
                })
            } catch (e) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            }

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
            console.log("[EnhancedAntiCheat] Camera stream playing")

            // Initialize face detection
            await initializeFaceDetection(video)

            // Monitor camera status
            cameraCheckIntervalRef.current = setInterval(() => {
                const tracks = stream.getVideoTracks()
                if (tracks.length === 0 || tracks[0].readyState !== "live") {
                    logViolation({
                        type: "CAMERA_VIOLATION",
                        reason: "Camera stopped or disconnected",
                        timestamp: Date.now(),
                    })
                }
            }, 5000)

        } catch (error: any) {
            setCameraActive(false)
            console.error("[EnhancedAntiCheat] Camera error:", error)

            logViolation({
                type: "CAMERA_VIOLATION",
                reason: error?.name || "Camera access failed",
                timestamp: Date.now(),
            })

            throw error
        }
    }, [enabled, logViolation, initializeFaceDetection])

    const stopCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop())
            cameraStreamRef.current = null
            setCameraActive(false)
        }
        if (cameraCheckIntervalRef.current) clearInterval(cameraCheckIntervalRef.current)
        if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current)
        setFaceDetectionActive(false)

        const video = document.querySelector('[data-test-video="camera-feed"]')
        if (video) video.remove()
    }, [])

    // ===== TAB VISIBILITY & WINDOW BLUR =====
    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabHiddenTimeRef.current = Date.now()
                logViolation({ type: "TAB_SWITCH", reason: "TAB_HIDDEN", timestamp: Date.now() })
            } else if (tabHiddenTimeRef.current) {
                const duration = Math.floor((Date.now() - tabHiddenTimeRef.current) / 1000)
                logViolation({ type: "TAB_SWITCH", reason: "TAB_VISIBLE", duration, timestamp: Date.now() })
                tabHiddenTimeRef.current = null
            }
        }

        const handleBlur = () => {
            windowBlurTimeRef.current = Date.now()
            logViolation({ type: "WINDOW_BLUR", timestamp: Date.now() })
        }

        const handleFocus = () => {
            if (windowBlurTimeRef.current) {
                const duration = Math.floor((Date.now() - windowBlurTimeRef.current) / 1000)
                logViolation({ type: "WINDOW_BLUR", duration, timestamp: Date.now() })
                windowBlurTimeRef.current = null
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleBlur)
        window.addEventListener("focus", handleFocus)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleBlur)
            window.removeEventListener("focus", handleFocus)
        }
    }, [enabled, logViolation])

    // ===== SMART COPY/PASTE DETECTION =====
    // Track internal clipboard to allow internal copy-paste, only flag external pastes
    const internalClipboardRef = useRef<string>("")

    useEffect(() => {
        if (!enabled) return

        // Track what candidate copies from within the IDE
        const handleCopy = (e: ClipboardEvent) => {
            const selection = window.getSelection()?.toString() || ""
            if (selection.length > 0) {
                // Store copied content to compare with paste
                internalClipboardRef.current = selection
                console.log("[EnhancedAntiCheat] Internal copy tracked (allowed)")
            }
        }

        const handleCut = (e: ClipboardEvent) => {
            const selection = window.getSelection()?.toString() || ""
            if (selection.length > 0) {
                internalClipboardRef.current = selection
                console.log("[EnhancedAntiCheat] Internal cut tracked (allowed)")
            }
        }

        // Smart paste detection - only flag EXTERNAL pastes
        const handlePaste = (e: ClipboardEvent) => {
            const pastedText = e.clipboardData?.getData("text") || ""

            if (pastedText.length === 0) return

            // Check if this paste matches what was copied internally
            const isInternalPaste = internalClipboardRef.current.length > 0 &&
                pastedText === internalClipboardRef.current

            if (isInternalPaste) {
                // This is internal copy-paste within the IDE - ALLOW IT
                console.log("[EnhancedAntiCheat] Internal paste detected - ALLOWED")
                return
            }

            // External paste detected - this is suspicious
            const pasteLength = pastedText.length

            // Only log significant external pastes (> 50 chars to avoid false positives)
            if (pasteLength > 50) {
                logViolation({
                    type: "PASTE_ATTEMPT",
                    reason: `External paste: ${pasteLength} characters`,
                    context: pasteLength > 500 ? "SUSPICIOUS_LARGE_PASTE" : "EXTERNAL",
                    timestamp: Date.now(),
                })
            }
        }

        // Block DevTools shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (view source)
            const isDevToolsShortcut =
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") ||
                (e.ctrlKey && e.key.toLowerCase() === "u")

            if (isDevToolsShortcut) {
                e.preventDefault()
                logViolation({ type: "CTRL_V", reason: "DevTools attempt blocked", timestamp: Date.now() })
            }
        }

        // Block right-click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            console.log("[EnhancedAntiCheat] Right-click blocked")
        }

        document.addEventListener("copy", handleCopy)
        document.addEventListener("paste", handlePaste)
        document.addEventListener("cut", handleCut)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("contextmenu", handleContextMenu)

        return () => {
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("paste", handlePaste)
            document.removeEventListener("cut", handleCut)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("contextmenu", handleContextMenu)
        }
    }, [enabled, logViolation])

    // ===== SEND LOGS ON COMPLETION =====
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
                console.warn("[EnhancedAntiCheat] Failed to send logs:", error)
            }
        }
    }

    // ===== CLEANUP =====
    useEffect(() => {
        return () => {
            stopCamera()
            if (cameraCheckIntervalRef.current) clearInterval(cameraCheckIntervalRef.current)
            if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current)
        }
    }, [stopCamera])

    return {
        violations,
        violationCount: violations.length,
        cameraActive,
        faceDetectionActive,
        currentFaceCount,
        isLookingAtScreen,
        isPaused,
        pauseReason,
        initializeCamera,
        stopCamera,
        resume,
        sendLogsOnCompletion,
    }
}
