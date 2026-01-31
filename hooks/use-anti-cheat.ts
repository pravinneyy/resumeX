import { useEffect, useRef, useState } from "react"

export interface ViolationLog {
  type: "CAMERA_VIOLATION" | "TAB_SWITCH" | "WINDOW_BLUR" | "COPY_ATTEMPT" | "PASTE_ATTEMPT" | "CUT_ATTEMPT" | "CTRL_C" | "CTRL_V"
  reason?: string
  duration?: number
  context?: string
  timestamp: number
}

export function useAntiCheat(sessionId: string, enabled: boolean = true) {
  const [violations, setViolations] = useState<ViolationLog[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const violationsRef = useRef<ViolationLog[]>([])
  const tabHiddenTimeRef = useRef<number | null>(null)
  const windowBlurTimeRef = useRef<number | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ===== 1. CAMERA DETECTION =====
  const initializeCamera = async () => {
    if (!enabled) return

    try {
      // Step 1: Check for browser support (API availability)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("[AntiCheat] Camera API not supported in this browser")
        setCameraActive(false)
        logViolation({
          type: "CAMERA_VIOLATION",
          reason: "BROWSER_NOT_SUPPORTED",
          timestamp: Date.now(),
        })
        throw new Error("Camera API not supported in this browser")
      }

      console.log("[AntiCheat] Starting camera access request...")

      // Step 2: Request camera access with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", // Front camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      console.log("[AntiCheat] Camera permission granted, stream obtained")
      
      cameraStreamRef.current = stream
      setCameraActive(true)
      
      // Step 3: Display the stream in a hidden video element
      const video = document.createElement("video")
      video.setAttribute("data-test-video", "camera-feed") // For testing/debugging
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      
      // Add to DOM but hide it
      video.style.display = "none"
      document.body.appendChild(video)
      
      // Ensure video plays
      video.play().then(() => {
        console.log("[AntiCheat] Video stream playing successfully")
      }).catch((err) => {
        console.warn("[AntiCheat] Video play error:", err)
      })

      // Step 4: Monitor camera status
      cameraCheckIntervalRef.current = setInterval(() => {
        const videoTracks = stream.getVideoTracks()
        if (videoTracks.length === 0) {
          console.warn("[AntiCheat] No video tracks found")
          logViolation({
            type: "CAMERA_VIOLATION",
            reason: "CAMERA_TRACK_LOST",
            timestamp: Date.now(),
          })
        } else if (videoTracks[0].readyState !== "live") {
          console.warn("[AntiCheat] Camera track state:", videoTracks[0].readyState)
          logViolation({
            type: "CAMERA_VIOLATION",
            reason: "CAMERA_STOPPED",
            timestamp: Date.now(),
          })
        }
      }, 5000)

      console.log("[AntiCheat] Camera initialized successfully")
    } catch (error: any) {
      setCameraActive(false)
      console.error("[AntiCheat] Camera access error:", error?.name, error?.message)
      
      // Map specific errors for better debugging
      let reason = "PERMISSION_DENIED"
      if (error?.name === "NotAllowedError") {
        reason = "PERMISSION_DENIED"
      } else if (error?.name === "NotFoundError") {
        reason = "NO_CAMERA_FOUND"
      } else if (error?.name === "NotReadableError") {
        reason = "CAMERA_IN_USE"
      } else if (error?.name === "SecurityError") {
        reason = "SECURITY_ERROR"
      }
      
      logViolation({
        type: "CAMERA_VIOLATION",
        reason: reason,
        timestamp: Date.now(),
      })
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      setCameraActive(false)
    }
    if (cameraCheckIntervalRef.current) {
      clearInterval(cameraCheckIntervalRef.current)
      cameraCheckIntervalRef.current = null
    }
  }

  // ===== 2. TAB VISIBILITY & WINDOW BLUR DETECTION =====
  useEffect(() => {
    if (!enabled) return

    // Tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now()
        logViolation({
          type: "TAB_SWITCH",
          reason: "TAB_HIDDEN",
          timestamp: Date.now(),
        })
      } else if (tabHiddenTimeRef.current) {
        const duration = Math.floor((Date.now() - tabHiddenTimeRef.current) / 1000)
        logViolation({
          type: "TAB_SWITCH",
          reason: "TAB_VISIBLE",
          duration,
          timestamp: Date.now(),
        })
        tabHiddenTimeRef.current = null
      }
    }

    // Window blur/focus
    const handleBlur = () => {
      windowBlurTimeRef.current = Date.now()
      logViolation({
        type: "WINDOW_BLUR",
        timestamp: Date.now(),
      })
    }

    const handleFocus = () => {
      if (windowBlurTimeRef.current) {
        const duration = Math.floor((Date.now() - windowBlurTimeRef.current) / 1000)
        logViolation({
          type: "WINDOW_BLUR",
          duration,
          timestamp: Date.now(),
        })
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
  }, [enabled])

  // ===== 3. COPY / PASTE / KEYBOARD DETECTION =====
  useEffect(() => {
    if (!enabled) return

    const handleCopy = (e: ClipboardEvent) => {
      // Only log if text was actually selected/copied from the editor
      const selectedText = window.getSelection()?.toString()
      if (selectedText && selectedText.length > 0) {
        logViolation({
          type: "COPY_ATTEMPT",
          context: "EDITOR",
          timestamp: Date.now(),
        })
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      // Only log if paste is happening in the editor (has focus)
      const target = e.target as HTMLElement
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.closest('[contenteditable]')) {
        logViolation({
          type: "PASTE_ATTEMPT",
          context: "EDITOR",
          timestamp: Date.now(),
        })
      }
    }

    const handleCut = (e: ClipboardEvent) => {
      const selectedText = window.getSelection()?.toString()
      if (selectedText && selectedText.length > 0) {
        logViolation({
          type: "CUT_ATTEMPT",
          context: "EDITOR",
          timestamp: Date.now(),
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        logViolation({
          type: "CTRL_C",
          timestamp: Date.now(),
        })
      }
      if (e.ctrlKey && e.key.toLowerCase() === "v") {
        logViolation({
          type: "CTRL_V",
          timestamp: Date.now(),
        })
      }
    }

    document.addEventListener("copy", handleCopy)
    document.addEventListener("paste", handlePaste)
    document.addEventListener("cut", handleCut)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("paste", handlePaste)
      document.removeEventListener("cut", handleCut)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled])

  // ===== LOGGING FUNCTION =====
  const logViolation = (violation: ViolationLog) => {
    violationsRef.current.push(violation)
    setViolations([...violationsRef.current])
    console.warn("[AntiCheat]", violation)
  }

  // ===== SEND LOGS PERIODICALLY =====
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(async () => {
      if (violationsRef.current.length > 0) {
        await sendLogsToBackend(violationsRef.current.slice())
      }
    }, 15000) // Every 15 seconds

    return () => clearInterval(interval)
  }, [enabled])

  // ===== SEND ALL LOGS ON COMPLETION =====
  const sendLogsOnCompletion = async () => {
    if (violationsRef.current.length > 0) {
      await sendLogsToBackend(violationsRef.current)
    }
  }

  // ===== BACKEND COMMUNICATION =====
  const sendLogsToBackend = async (logs: ViolationLog[]) => {
    try {
      const response = await fetch("http://127.0.0.1:8001/api/anti-cheat/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          violations: logs,
        }),
      })

      if (response.ok) {
        // Clear sent logs
        violationsRef.current = violationsRef.current.filter(
          (v) => !logs.includes(v)
        )
        console.log("[AntiCheat] Sent", logs.length, "violations to backend")
      } else {
        console.warn("[AntiCheat] Backend returned non-OK status:", response.status)
      }
    } catch (error) {
      console.warn("[AntiCheat] Failed to send logs (backend may not be running):", error)
      // Don't throw - allow tests to continue even if logging fails
    }
  }

  // ===== CLEANUP =====
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (cameraCheckIntervalRef.current) {
        clearInterval(cameraCheckIntervalRef.current)
      }
    }
  }, [])

  return {
    violations,
    initializeCamera,
    stopCamera,
    sendLogsOnCompletion,
    violationCount: violations.length,
    cameraActive,
  }
}
