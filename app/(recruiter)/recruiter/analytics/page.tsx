"use client"

import { useAuth } from "@clerk/nextjs"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Loader2, BrainCircuit, Code2, Brain, MessageSquare, TrendingUp,
    CheckCircle, XCircle, Clock, ChevronDown, BookOpen, Users, UserCheck, UserX
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"

interface Job {
    id: number
    title: string
    description: string
    requirements: string
}

interface CandidateAnalysis {
    candidate_id: string
    candidate_name: string
    application_id: number
    psychometric_score: number | null
    technical_score: number | null
    coding_score: number | null
    behavioral_score: number | null
    final_score: number
    status: string
    assessment_completed: boolean
}

interface AIRecommendation {
    strengths: string[]
    weaknesses: string[]
    role_suitability: string
    recommendation: string
    reasoning: string
}

export default function AnalyticsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
    const [candidates, setCandidates] = useState<CandidateAnalysis[]>([])
    const [aiRecommendations, setAiRecommendations] = useState<{ [key: string]: AIRecommendation }>({})
    const [loading, setLoading] = useState(true)
    const [analyzingCandidate, setAnalyzingCandidate] = useState<string | null>(null)
    const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null)
    const [actionDialog, setActionDialog] = useState<{ open: boolean, type: 'hire' | 'reject' | null, candidateId: string | null, candidateName: string, applicationId: number | null }>({
        open: false,
        type: null,
        candidateId: null,
        candidateName: "",
        applicationId: null
    })
    const [updatingStatus, setUpdatingStatus] = useState(false)

    const { getToken } = useAuth()

    // Fetch jobs
    useEffect(() => {
        async function fetchJobs() {
            try {
                const token = await getToken()
                const response = await fetch('http://127.0.0.1:8000/api/jobs', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (response.ok) {
                    const data = await response.json()
                    setJobs(data)
                    if (data.length > 0) {
                        setSelectedJobId(data[0].id)
                    }
                }
            } catch (error) {
                console.error('Error fetching jobs:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchJobs()
    }, [])

    // Fetch candidates for selected job
    useEffect(() => {
        if (!selectedJobId) return

        async function fetchCandidates() {
            setLoading(true)
            try {
                const token = await getToken()
                const response = await fetch(
                    `http://127.0.0.1:8000/api/jobs/${selectedJobId}/applications`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                )

                if (response.ok) {
                    const data = await response.json()

                    // Transform data to include scores
                    const candidatesWithScores = data.map((app: any) => {
                        // Check if assessment is completed (has at least one score)
                        const hasScores = app.psychometric_score !== null ||
                            app.technical_score !== null ||
                            app.coding_score !== null

                        return {
                            candidate_id: app.candidate_id,
                            candidate_name: app.name,
                            application_id: app.id,
                            psychometric_score: app.psychometric_score,
                            technical_score: app.technical_score,
                            coding_score: app.coding_score,
                            behavioral_score: app.behavioral_score,
                            final_score: app.score || 0,
                            status: app.status,
                            assessment_completed: hasScores
                        }
                    })

                    setCandidates(candidatesWithScores)
                }
            } catch (error) {
                console.error('Error fetching candidates:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCandidates()
    }, [selectedJobId])

    // AI Analysis function
    const analyzeCandidate = async (candidateId: string) => {
        if (!selectedJobId) return

        setAnalyzingCandidate(candidateId)
        try {
            const token = await getToken()
            const response = await fetch(
                `http://127.0.0.1:8000/api/candidates/${candidateId}/jobs/${selectedJobId}/analyze`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (response.ok) {
                const data = await response.json()
                setAiRecommendations(prev => ({
                    ...prev,
                    [candidateId]: data.analysis
                }))
                setExpandedCandidate(candidateId)
            }
        } catch (error) {
            console.error('Error analyzing candidate:', error)
        } finally {
            setAnalyzingCandidate(null)
        }
    }

    // Handle Hire/Reject action
    const handleStatusUpdate = async () => {
        if (!actionDialog.applicationId || !actionDialog.type) return

        setUpdatingStatus(true)
        try {
            const token = await getToken()
            const newStatus = actionDialog.type === 'hire' ? 'Hired' : 'Rejected'

            const response = await fetch(
                `http://127.0.0.1:8000/api/applications/${actionDialog.applicationId}/status`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                }
            )

            if (response.ok) {
                // Update local state
                setCandidates(prev => prev.map(c =>
                    c.application_id === actionDialog.applicationId
                        ? { ...c, status: newStatus }
                        : c
                ))
                setActionDialog({ open: false, type: null, candidateId: null, candidateName: "", applicationId: null })
            }
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setUpdatingStatus(false)
        }
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId)

    const getScoreColor = (score: number | null) => {
        if (score === null) return "text-gray-400"
        if (score >= 80) return "text-green-500"
        if (score >= 60) return "text-yellow-500"
        return "text-red-500"
    }

    const ScoreBar = ({ label, score, icon: Icon }: { label: string, score: number | null, icon: any }) => (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{label}</span>
                </div>
                <span className={`font-semibold ${getScoreColor(score)}`}>
                    {score !== null ? `${Math.round(score)}%` : 'N/A'}
                </span>
            </div>
            <Progress
                value={score !== null ? score : 0}
                className="h-2"
            />
        </div>
    )

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Candidate Analytics</h1>
                    <p className="text-muted-foreground">Analyze candidates by job with AI-powered insights</p>
                </div>
            </div>

            {/* Job Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Job</CardTitle>
                    <CardDescription>Choose a job to view candidate analytics</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedJobId?.toString()}
                        onValueChange={(value) => setSelectedJobId(parseInt(value))}
                    >
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                            {jobs.map((job) => (
                                <SelectItem key={job.id} value={job.id.toString()}>
                                    {job.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedJob && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-2">Job Requirements</h3>
                            <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                            {selectedJob.requirements && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    <strong>Skills:</strong> {selectedJob.requirements}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Candidates List */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : candidates.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No candidates have completed assessments for this job yet.
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            Candidate Assessment Results
                        </CardTitle>
                        <CardDescription>
                            View assessment scores and get AI-powered hiring recommendations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {candidates.map((candidate) => (
                                <div key={candidate.candidate_id} className="border rounded-lg overflow-hidden">
                                    {/* Candidate Header */}
                                    <div className="p-4 bg-card">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">{candidate.candidate_name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={
                                                        candidate.status === 'Hired' ? 'default' :
                                                            candidate.status === 'Rejected' ? 'destructive' :
                                                                'secondary'
                                                    }>
                                                        {candidate.status}
                                                    </Badge>
                                                    {candidate.assessment_completed && (
                                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Assessment Complete
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-primary">
                                                    {candidate.final_score}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">Weighted Score</div>
                                            </div>
                                        </div>

                                        {/* Score Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <ScoreBar
                                                label="Coding"
                                                score={candidate.coding_score}
                                                icon={Code2}
                                            />
                                            <ScoreBar
                                                label="Technical"
                                                score={candidate.technical_score}
                                                icon={BookOpen}
                                            />
                                            <ScoreBar
                                                label="Psychometric"
                                                score={candidate.psychometric_score}
                                                icon={Brain}
                                            />
                                            <ScoreBar
                                                label="Behavioral"
                                                score={candidate.behavioral_score}
                                                icon={Users}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {candidate.assessment_completed && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => analyzeCandidate(candidate.candidate_id)}
                                                        disabled={analyzingCandidate === candidate.candidate_id}
                                                    >
                                                        {analyzingCandidate === candidate.candidate_id ? (
                                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                                                        ) : (
                                                            <><BrainCircuit className="w-4 h-4 mr-2" /> AI Analysis</>
                                                        )}
                                                    </Button>

                                                    {candidate.status !== 'Hired' && candidate.status !== 'Rejected' && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700"
                                                                onClick={() => setActionDialog({
                                                                    open: true,
                                                                    type: 'hire',
                                                                    candidateId: candidate.candidate_id,
                                                                    candidateName: candidate.candidate_name,
                                                                    applicationId: candidate.application_id
                                                                })}
                                                            >
                                                                <UserCheck className="w-4 h-4 mr-2" />
                                                                Hire
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => setActionDialog({
                                                                    open: true,
                                                                    type: 'reject',
                                                                    candidateId: candidate.candidate_id,
                                                                    candidateName: candidate.candidate_name,
                                                                    applicationId: candidate.application_id
                                                                })}
                                                            >
                                                                <UserX className="w-4 h-4 mr-2" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {aiRecommendations[candidate.candidate_id] && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedCandidate(
                                                        expandedCandidate === candidate.candidate_id ? null : candidate.candidate_id
                                                    )}
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedCandidate === candidate.candidate_id ? 'rotate-180' : ''
                                                        }`} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI Recommendation Panel */}
                                    {aiRecommendations[candidate.candidate_id] && expandedCandidate === candidate.candidate_id && (
                                        <div className="border-t bg-muted/30 p-4">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <BrainCircuit className="w-5 h-5 text-purple-500" />
                                                    <h4 className="font-semibold">AI Recommendation</h4>
                                                    <Badge
                                                        variant={
                                                            aiRecommendations[candidate.candidate_id].recommendation === 'STRONG_HIRE' ||
                                                                aiRecommendations[candidate.candidate_id].recommendation === 'HIRE'
                                                                ? 'default'
                                                                : aiRecommendations[candidate.candidate_id].recommendation === 'BORDERLINE'
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                        }
                                                        className={
                                                            aiRecommendations[candidate.candidate_id].recommendation === 'STRONG_HIRE'
                                                                ? 'bg-green-600'
                                                                : aiRecommendations[candidate.candidate_id].recommendation === 'HIRE'
                                                                    ? 'bg-blue-600'
                                                                    : ''
                                                        }
                                                    >
                                                        {aiRecommendations[candidate.candidate_id].recommendation}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-green-600 font-medium">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Strengths
                                                        </div>
                                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                            {aiRecommendations[candidate.candidate_id].strengths.map((strength, i) => (
                                                                <li key={i}>{strength}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-orange-600 font-medium">
                                                            <XCircle className="w-4 h-4" />
                                                            Weaknesses
                                                        </div>
                                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                            {aiRecommendations[candidate.candidate_id].weaknesses.map((weakness, i) => (
                                                                <li key={i}>{weakness}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="font-medium">Role Suitability Analysis:</p>
                                                    <p className="text-sm text-muted-foreground italic bg-background p-3 rounded border">
                                                        {aiRecommendations[candidate.candidate_id].role_suitability}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="font-medium">Reasoning:</p>
                                                    <p className="text-sm text-muted-foreground bg-background p-3 rounded border">
                                                        {aiRecommendations[candidate.candidate_id].reasoning}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={actionDialog.open} onOpenChange={(open) => !updatingStatus && setActionDialog({ ...actionDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionDialog.type === 'hire' ? 'Hire Candidate?' : 'Reject Candidate?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionDialog.type === 'hire'
                                ? `Are you sure you want to hire ${actionDialog.candidateName}? This will update their status to "Hired".`
                                : `Are you sure you want to reject ${actionDialog.candidateName}? This will update their status to "Rejected".`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updatingStatus}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStatusUpdate}
                            disabled={updatingStatus}
                            className={actionDialog.type === 'hire' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {actionDialog.type === 'hire' ? 'Hire' : 'Reject'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}