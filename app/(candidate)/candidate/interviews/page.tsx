"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, BrainCircuit, Loader2 } from "lucide-react"

export default function InterviewsPage() {
    const { user } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()
    const [applications, setApplications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

    useEffect(() => {
        const fetchApps = async () => {
            if (!user) return
            try {
                const token = await getToken()
                const res = await fetch(`${API_URL}/api/candidate/applications?candidateId=${user.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                const data = res.ok ? await res.json() : []
                setApplications(Array.isArray(data) ? data : [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchApps()
    }, [user, getToken])

    const getStatusBadge = (status: string) => {
        if (status === 'Rejected') return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
        if (status === 'Interview') return <Badge className="bg-green-600 gap-1">Interview Selected</Badge>
        if (status === 'Assessment') return <Badge variant="default">Assessment Pending</Badge>
        return <Badge variant="secondary">{status}</Badge>
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold">My Applications</h1>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : applications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><p>No applications found.</p></div>
            ) : (
                <div className="grid gap-4">
                    {applications.map(app => (
                        <Card key={app.id} className="flex flex-col md:flex-row items-center justify-between p-2">
                            <CardHeader className="flex-1">
                                <CardTitle>{app.job_title}</CardTitle>
                                <CardDescription>{app.company_name}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center gap-6 md:justify-end flex-1 pt-6 md:pt-0">
                                {getStatusBadge(app.status)}
                                {(app.status === 'Assessment' || app.status === 'Interview') && (
                                    <Button
                                        className="gap-2"
                                        onClick={() => router.push(`/candidate/interviews/${app.job_id}/psychometric`)}
                                    >
                                        <BrainCircuit className="w-4 h-4" /> Start Assessment
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
