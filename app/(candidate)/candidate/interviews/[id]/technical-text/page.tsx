"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Send, Clock, Loader2, MessageSquare, AlertCircle, ChevronLeft } from "lucide-react"
import AssessmentTabs from "@/components/candidate/AssessmentTabs"

interface TechnicalQuestion {
    id: number
    section: string
    question: string
    question_type: string
}

export default function TechnicalTextPage() {
    const { id: jobId } = useParams()
    const router = useRouter()
    const { getToken } = useAuth()
    const { user } = useUser()

    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<TechnicalQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: number]: string }>({})
    const [submitting, setSubmitting] = useState(false)
    const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes default
    const [hasStarted, setHasStarted] = useState(false)

    // Fetch questions on mount
    useEffect(() => {
        const fetchQuestions = async () => {
            if (!jobId) return
            try {
                const token = await getToken()

                // First get assessment to get technical_question_ids
                const assessmentRes = await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })

                if (!assessmentRes.ok) {
                    console.error("Failed to fetch assessment")
                    setLoading(false)
                    return
                }

                const assessment = await assessmentRes.json()
                const techIds = assessment.technical_question_ids || []

                if (techIds.length === 0) {
                    console.log("No technical questions in this assessment")
                    setLoading(false)
                    return
                }

                // Fetch the actual questions
                const questionsRes = await fetch(
                    `http://127.0.0.1:8000/api/technical-questions/by-ids?ids=${techIds.join(",")}`,
                    { headers: { "Authorization": `Bearer ${token}` } }
                )

                if (questionsRes.ok) {
                    const data = await questionsRes.json()
                    setQuestions(data.questions || [])
                }

                // Load saved progress
                const progressRes = await fetch(
                    `http://127.0.0.1:8000/api/assessments/technical/progress/${jobId}/${user?.id}`,
                    { headers: { "Authorization": `Bearer ${token}` } }
                )

                if (progressRes.ok) {
                    const progressData = await progressRes.json()
                    if (progressData.found && progressData.answers) {
                        // Convert string keys back to numbers
                        const loadedAnswers: { [key: number]: string } = {}
                        Object.entries(progressData.answers).forEach(([k, v]) => {
                            loadedAnswers[parseInt(k)] = v as string
                        })
                        setAnswers(loadedAnswers)
                    }
                }

            } catch (err) {
                console.error("Error fetching technical questions:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchQuestions()
    }, [jobId, getToken, user?.id])

    // Timer countdown
    useEffect(() => {
        if (!hasStarted || timeLeft <= 0) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Auto-submit when time runs out
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [hasStarted, timeLeft])

    // Auto-save progress every 30 seconds
    useEffect(() => {
        if (!hasStarted || Object.keys(answers).length === 0) return

        const autoSave = setInterval(() => {
            saveProgress()
        }, 30000)

        return () => clearInterval(autoSave)
    }, [hasStarted, answers])

    const saveProgress = useCallback(async () => {
        if (!jobId || !user?.id) return

        try {
            const token = await getToken()
            await fetch("http://127.0.0.1:8000/api/assessments/technical/progress", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    job_id: Number(jobId),
                    candidate_id: user.id,
                    answers: answers
                })
            })
            console.log("[AutoSave] Technical progress saved")
        } catch (err) {
            console.error("Error saving progress:", err)
        }
    }, [jobId, user?.id, answers, getToken])

    const handleAnswerChange = (questionId: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }))
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            saveProgress() // Save on navigation
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
            saveProgress() // Save on navigation
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)

        try {
            const token = await getToken()

            // Convert answers to the format expected by the API
            // API expects {question_id: answer_text} where question_id is string
            const formattedAnswers: { [key: string]: string } = {}
            Object.entries(answers).forEach(([key, value]) => {
                formattedAnswers[String(key)] = value
            })

            // Submit answers for grading and scoring
            const submitRes = await fetch("http://127.0.0.1:8000/api/technical-text/submit", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    job_id: Number(jobId),
                    candidate_id: user?.id,
                    answers: formattedAnswers
                })
            })

            const submitData = await submitRes.json()
            console.log("[Technical Text] Submit response:", submitData)

            if (!submitRes.ok) {
                const errMsg = submitData.detail || "Submission failed"
                console.error("[Technical Text] Submission error:", errMsg)
                alert(`Error: ${errMsg}`)
                return
            }

            // Delete progress after successful submission
            await fetch(
                `http://127.0.0.1:8000/api/assessments/technical/progress/${jobId}/${user?.id}`,
                {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                }
            )

            console.log("[Technical Text] Submitted successfully. Score:", submitData.total_score, "Final:", submitData.new_final_score)
            alert(`Technical assessment submitted! Score: ${submitData.total_score}`)

            // Redirect to IDE for coding questions
            router.push(`/candidate/interviews/${jobId}/ide`)

        } catch (err) {
            console.error("Error submitting:", err)
            alert("Error submitting assessment. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const currentQuestion = questions[currentIndex]
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
    const answeredCount = Object.keys(answers).length

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="text-white/70">Loading technical assessment...</p>
                </div>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                        <h2 className="text-xl font-bold">No Technical Questions</h2>
                        <p className="text-muted-foreground">
                            This assessment doesn't have any technical text questions.
                        </p>
                        <Button onClick={() => router.push(`/candidate/interviews/${jobId}/ide`)}>
                            Go to Coding Section
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!hasStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-lg glass-card border-white/10">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <MessageSquare className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl">Technical Assessment</CardTitle>
                        <CardDescription>
                            Answer {questions.length} technical questions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Questions:</span>
                                <span className="font-semibold">{questions.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Time Limit:</span>
                                <span className="font-semibold">{Math.floor(timeLeft / 60)} minutes</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Question Types:</span>
                                <span className="font-semibold">Conceptual, Situational, Behavioral</span>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-400 mb-2">💡 Tips</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Be specific and provide examples where possible</li>
                                <li>• Focus on key concepts and best practices</li>
                                <li>• Your answers are auto-saved every 30 seconds</li>
                            </ul>
                        </div>

                        <Button
                            onClick={() => setHasStarted(true)}
                            className="w-full py-6 text-lg gap-2"
                        >
                            Start Technical Assessment
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 px-6 py-3 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/candidate/interviews')} className="text-white/60 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Exit
                </Button>

                <AssessmentTabs jobId={jobId as string} />

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${timeLeft < 300 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/5 text-white/70 border-white/10'}`}>
                        <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 w-full max-w-4xl mx-auto flex-1 space-y-8">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-blue-400" />
                            Technical Questions
                        </h1>
                        <p className="text-white/50">Question {currentIndex + 1} of {questions.length}</p>
                    </div>
                    <span className="text-sm text-white/40">{answeredCount}/{questions.length} completed</span>
                </div>

                <Progress value={progress} className="h-1 bg-white/10" />

                {/* Question Card Container */}
                <div className="w-full">
                    <Card className="glass-card border-white/10">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${currentQuestion.section === "Conceptual Questions"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : currentQuestion.section === "Situational Questions"
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-purple-500/20 text-purple-400"
                                    }`}>
                                    {currentQuestion.section}
                                </span>
                            </div>
                            <CardTitle className="text-lg leading-relaxed text-white">
                                {currentQuestion.question}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                placeholder="Type your answer here... Be specific and provide examples where possible."
                                className="min-h-[250px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                                onBlur={saveProgress}
                            />

                            <div className="flex justify-between text-xs text-white/40">
                                <span>
                                    {(answers[currentQuestion.id] || "").length} characters
                                </span>
                                <span>Auto-saved</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-6">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                        </Button>

                        {/* Question Pills */}
                        <div className="flex gap-2 flex-wrap justify-center max-w-[400px]">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${idx === currentIndex
                                        ? "bg-primary text-primary-foreground scale-110"
                                        : answers[q.id]
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-white/10 text-white/50 hover:bg-white/20"
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {currentIndex === questions.length - 1 ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit & Continue
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={handleNext} className="gap-2">
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div >
            </div >
        </div >

    )
}
