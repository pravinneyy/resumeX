"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FileClock, UserPlus, FileText, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface LogItem {
    id: string
    type: string
    title: string
    message: string
    job_title: string
    candidate_name: string
    timestamp: string | null
    severity: "info" | "success" | "warning" | "error" | "default"
}

export default function LogsPage() {
    const { getToken, isLoaded } = useAuth()
    const [logs, setLogs] = useState<LogItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isLoaded) {
            fetchLogs()
        }
    }, [isLoaded])

    const fetchLogs = async () => {
        try {
            const token = await getToken()
            const res = await fetch("http://127.0.0.1:8000/api/logs/activity", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setLogs(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (type: string, severity: string) => {
        if (severity === "success") return <CheckCircle2 className="w-5 h-5 text-green-500" />
        if (severity === "warning") return <AlertTriangle className="w-5 h-5 text-yellow-500" />
        if (type === "APPLICATION") return <FileText className="w-5 h-5 text-blue-500" />
        return <Info className="w-5 h-5 text-gray-500" />
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Unknown date"
        return new Date(dateStr).toLocaleString()
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <FileClock className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Activity Logs</h1>
                    <p className="text-muted-foreground">Track recent applications and status changes.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                            <p>No activity logged yet.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-4">
                                {logs.map((log, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-colors"
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(log.type, log.severity)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-sm">{log.title}</h4>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDate(log.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/80">{log.message}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {log.job_title}
                                                </Badge>
                                                {log.type === "APPLICATION" && (
                                                    <Badge variant="secondary" className="text-xs font-normal">
                                                        Candidate: {log.candidate_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
