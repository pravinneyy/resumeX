"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Briefcase, Calendar, CheckCircle, XCircle, Clock,
    TrendingUp, Brain, Code2, MessageSquare
} from "lucide-react"

interface Application {
    application_id: number
    job_id: number
    job_title: string
    company: string
    applied_date: string
    status: string
    assessment_completed: boolean
    final_score: number | null
    psychometric_score: number | null
    technical_score: number | null
    coding_score: number | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export default function ApplicationsPage() {
    const { getToken } = useAuth()
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchApplications() {
            try {
                const token = await getToken()
                const response = await fetch(`${API_URL}/api/candidates/me/applications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    setApplications(data)
                }
            } catch (error) {
                console.error('Error fetching applications:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchApplications()
    }, [getToken])

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'hired':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'rejected':
            case 'not hired':
                return <XCircle className="w-5 h-5 text-red-500" />
            case 'interview':
                return <Briefcase className="w-5 h-5 text-blue-500" />
            default:
                return <Clock className="w-5 h-5 text-yellow-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        const variant =
            status === 'Hired' ? 'default' :
                status === 'Interview' ? 'default' :
                    status === 'Rejected' || status === 'Not Hired' ? 'destructive' :
                        'secondary'

        const className =
            status === 'Hired' ? 'bg-green-600' :
                status === 'Interview' ? 'bg-blue-600' : ''

        return <Badge variant={variant} className={className}>{status}</Badge>
    }

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-32 bg-muted rounded"></div>
                    <div className="h-32 bg-muted rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Applications</h1>
                <p className="text-muted-foreground">Track your job applications and assessment results</p>
            </div>

            {applications.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                        <p className="text-muted-foreground">
                            You haven't applied to any jobs yet. Browse available positions to get started!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {applications.map((app) => (
                        <Card key={app.application_id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-3">
                                            {getStatusIcon(app.status)}
                                            {app.job_title}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-4 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                Applied: {new Date(app.applied_date).toLocaleDateString()}
                                            </span>
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(app.status)}
                                </div>
                            </CardHeader>

                            <CardContent>
                                {app.assessment_completed ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            Assessment Completed
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Brain className="w-4 h-4 text-purple-500" />
                                                    <span className="text-xs text-muted-foreground">Psychometric</span>
                                                </div>
                                                <p className="text-lg font-bold">
                                                    {app.psychometric_score ?? '--'}<span className="text-sm text-muted-foreground">/25</span>
                                                </p>
                                            </div>

                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                                    <span className="text-xs text-muted-foreground">Technical</span>
                                                </div>
                                                <p className="text-lg font-bold">
                                                    {app.technical_score ?? '--'}<span className="text-sm text-muted-foreground">/25</span>
                                                </p>
                                            </div>

                                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Code2 className="w-4 h-4 text-green-500" />
                                                    <span className="text-xs text-muted-foreground">Coding</span>
                                                </div>
                                                <p className="text-lg font-bold">
                                                    {app.coding_score ?? '--'}<span className="text-sm text-muted-foreground">/40</span>
                                                </p>
                                            </div>

                                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-4 h-4 text-orange-500" />
                                                    <span className="text-xs text-muted-foreground">Total Score</span>
                                                </div>
                                                <p className="text-lg font-bold">
                                                    {app.final_score ?? '--'}<span className="text-sm text-muted-foreground">/100</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                        Assessment not completed yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
