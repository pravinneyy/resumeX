"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
    ShieldAlert, Eye, EyeOff, Copy, Monitor, MonitorOff,
    Clock, RefreshCw, Layers, Search, AlertTriangle, Users, UserX
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"

interface GlobalViolation {
    id: number
    type: string
    reason?: string
    duration?: number
    context?: string
    timestamp: number
    logged_at: string
    candidate_name: string
    candidate_id?: string
    job_title: string
    job_id?: number
    session_id: string
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
    // Default fallback
    DEFAULT: {
        icon: AlertTriangle,
        label: "Suspicious Activity",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        severity: "low"
    }
}

export default function LogsPage() {
    const [violations, setViolations] = useState<GlobalViolation[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<string>("ALL")
    const { getToken } = useAuth()

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const token = await getToken()
            // URL already matches backend default
            const res = await fetch("http://127.0.0.1:8000/api/anti-cheat/all-violations?limit=100", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setViolations(data.violations || [])
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error)
        } finally {
            setLoading(false)
        }
    }

    const clearLogs = async () => {
        if (!confirm("Are you sure you want to delete all security logs? This cannot be undone.")) return

        try {
            const token = await getToken()
            const res = await fetch("http://127.0.0.1:8000/api/anti-cheat/clear-logs", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (res.ok) {
                setViolations([])
            }
        } catch (error) {
            console.error("Failed to clear logs:", error)
        }
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 15000) // Auto refresh every 15s
        return () => clearInterval(interval)
    }, [])

    const filteredViolations = violations.filter(v =>
        (v.candidate_name && v.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.job_title && v.job_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        v.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getConfig = (type: string) => violationConfig[type] || violationConfig["DEFAULT"]

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-orange-500" />
                        Security & Proctoring Logs
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor active assessments and review flagged suspicious activities.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={clearLogs} variant="destructive" size="sm">
                        <UserX className="w-4 h-4 mr-2" />
                        Clear Logs
                    </Button>
                    <Button onClick={fetchLogs} variant="outline" size="sm">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Violations</CardTitle>
                            <CardDescription>
                                Showing last 100 flagged events across all active sessions
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search candidate or violation..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        {filteredViolations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                                <p>No violations found matching your criteria</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Severity</th>
                                        <th className="px-6 py-3 font-medium">Violation</th>
                                        <th className="px-6 py-3 font-medium">Candidate / Job</th>
                                        <th className="px-6 py-3 font-medium">Time</th>
                                        <th className="px-6 py-3 font-medium">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredViolations.map((v) => {
                                        const config = getConfig(v.type)
                                        const Icon = config.icon
                                        const date = new Date(v.timestamp)

                                        return (
                                            <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant={config.severity === 'high' ? 'destructive' : 'outline'}
                                                        className={cn(
                                                            config.severity === 'medium' && "text-orange-500 border-orange-500/50",
                                                            config.severity === 'low' && "text-yellow-500 border-yellow-500/50"
                                                        )}
                                                    >
                                                        {config.severity.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("p-2 rounded-full", config.bgColor)}>
                                                            <Icon className={cn("w-4 h-4", config.color)} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{config.label}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{v.type}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium">
                                                        {v.candidate_name !== "Unknown" ? v.candidate_name : (v.candidate_id ? `ID: ${v.candidate_id.substring(0, 12)}...` : "Unknown")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {v.job_title !== "Unknown Job" ? v.job_title : (v.job_id ? `Job #${v.job_id}` : "Unknown Job")}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {date.toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {v.reason && <p>{v.reason}</p>}
                                                    {v.duration && v.duration > 0 && <p>Duration: {v.duration}s</p>}
                                                    {v.context && <p className="text-xs opacity-70">Context: {v.context}</p>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
