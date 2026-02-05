"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Shield, AlertTriangle, Eye, EyeOff, Copy,
    Clipboard, Monitor, MonitorOff, Clock, RefreshCw,
    Loader2, Users, UserX
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Violation {
    type: string
    reason?: string
    duration?: number
    context?: string
    timestamp: number
    logged_at?: string
}

interface ProctoringLogsProps {
    evaluationId?: string | null
    sessionId?: string | null
    candidateId?: string
    jobId?: number
}

const violationConfig: Record<string, {
    icon: any,
    label: string,
    color: string,
    bgColor: string,
    severity: "low" | "medium" | "high"
}> = {
    CAMERA_VIOLATION: {
        icon: EyeOff,
        label: "Camera Issue",
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        severity: "high"
    },
    NO_FACE: {
        icon: UserX,
        label: "No Face Detected",
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        severity: "high"
    },
    MULTIPLE_FACES: {
        icon: Users,
        label: "Multiple Faces",
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        severity: "high"
    },
    TAB_SWITCH: {
        icon: Monitor,
        label: "Tab Switch",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        severity: "medium"
    },
    WINDOW_BLUR: {
        icon: MonitorOff,
        label: "Window Lost Focus",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        severity: "medium"
    },
    COPY_ATTEMPT: {
        icon: Copy,
        label: "Copy Detected",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        severity: "low"
    },
    PASTE_ATTEMPT: {
        icon: Clipboard,
        label: "Paste Detected",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        severity: "low"
    },
    CUT_ATTEMPT: {
        icon: Copy,
        label: "Cut Detected",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        severity: "low"
    },
    CTRL_C: {
        icon: Copy,
        label: "Ctrl+C",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        severity: "low"
    },
    CTRL_V: {
        icon: Clipboard,
        label: "Ctrl+V",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        severity: "low"
    },
}

export function ProctoringLogs({ evaluationId, sessionId, candidateId, jobId }: ProctoringLogsProps) {
    const [violations, setViolations] = useState<Violation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchViolations = async () => {
        setLoading(true)
        setError(null)

        try {
            let data: Violation[] = []

            // Try fetching by evaluation_id first (includes anti_cheat_violations)
            if (evaluationId) {
                console.log(`[ProctoringLogs] Fetching by evaluation_id: ${evaluationId}`)
                const res = await fetch(`http://127.0.0.1:8000/api/evaluation/${evaluationId}`)
                if (res.ok) {
                    const evalData = await res.json()
                    data = evalData.anti_cheat_violations || []
                    console.log(`[ProctoringLogs] Found ${data.length} violations via evaluation`)
                }
            }

            // Fallback: try session_id directly
            if (data.length === 0 && sessionId) {
                console.log(`[ProctoringLogs] Fetching by session_id: ${sessionId}`)
                const res = await fetch(`http://127.0.0.1:8000/api/anti-cheat/violations/${sessionId}`)
                if (res.ok) {
                    const sessionData = await res.json()
                    data = sessionData.violations || []
                    console.log(`[ProctoringLogs] Found ${data.length} violations via session`)
                }
            }

            // Fallback: try to find evaluation_id by job_id + candidate_id
            if (data.length === 0 && candidateId && jobId) {
                console.log(`[ProctoringLogs] Fetching latest evaluation for job=${jobId}, candidate=${candidateId}`)
                const res = await fetch(`http://127.0.0.1:8000/api/evaluation/latest/${jobId}/${candidateId}`)
                if (res.ok) {
                    const latestData = await res.json()
                    if (latestData.has_evaluation && latestData.evaluation_id) {
                        const evalRes = await fetch(`http://127.0.0.1:8000/api/evaluation/${latestData.evaluation_id}`)
                        if (evalRes.ok) {
                            const evalData = await evalRes.json()
                            data = evalData.anti_cheat_violations || []
                            console.log(`[ProctoringLogs] Found ${data.length} violations via latest evaluation`)
                        }
                    }
                }
            }

            setViolations(data)
        } catch (err) {
            console.error("[ProctoringLogs] Error fetching violations:", err)
            setError("Failed to load proctoring logs")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchViolations()
    }, [evaluationId, sessionId, candidateId, jobId])

    const formatTime = (timestamp: number) => {
        try {
            const date = new Date(timestamp)
            return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
        } catch {
            return "Unknown"
        }
    }

    const getConfig = (type: string) => {
        return violationConfig[type] || {
            icon: AlertTriangle,
            label: type,
            color: "text-muted-foreground",
            bgColor: "bg-muted",
            severity: "low"
        }
    }

    const highSeverityCount = violations.filter(v => {
        const config = getConfig(v.type)
        return config.severity === "high"
    }).length

    const mediumSeverityCount = violations.filter(v => {
        const config = getConfig(v.type)
        return config.severity === "medium"
    }).length

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading proctoring logs...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-orange-200/50 dark:border-orange-800/30">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Proctoring Logs
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {violations.length > 0 && (
                            <>
                                {highSeverityCount > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                        {highSeverityCount} High
                                    </Badge>
                                )}
                                {mediumSeverityCount > 0 && (
                                    <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/50">
                                        {mediumSeverityCount} Medium
                                    </Badge>
                                )}
                            </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchViolations}>
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {error ? (
                    <div className="text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                ) : violations.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="p-2 bg-green-500/20 rounded-full">
                            <Eye className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-green-600 dark:text-green-400">Clean Session</p>
                            <p className="text-xs text-muted-foreground">No suspicious activity detected</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] pr-2">
                        <div className="space-y-2">
                            {violations.map((violation, idx) => {
                                const config = getConfig(violation.type)
                                const Icon = config.icon

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                            config.bgColor,
                                            "hover:bg-opacity-80"
                                        )}
                                    >
                                        <div className={cn("p-1.5 rounded-md", config.bgColor)}>
                                            <Icon className={cn("w-3.5 h-3.5", config.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={cn("font-medium text-sm", config.color)}>
                                                    {config.label}
                                                </span>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(violation.timestamp)}
                                                </div>
                                            </div>
                                            {violation.reason && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {violation.reason}
                                                </p>
                                            )}
                                            {violation.duration && violation.duration > 0 && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Duration: {violation.duration}s
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
