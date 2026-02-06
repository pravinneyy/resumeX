"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Upload,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Users,
    TrendingUp,
    Clock,
    RefreshCw,
    Download,
    Trash2,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"

interface BulkUploadResult {
    id: number
    filename: string
    status: "pending" | "processing" | "passed" | "rejected" | "error"
    decision: "ADVANCE" | "REVIEW" | "REJECT" | null
    match_score: number | null
    candidate_name: string | null
    candidate_email: string | null
    experience_years: number | null
    skills: string[]
    score_breakdown: {
        skills: number | null
        experience: number | null
        education: number | null
        bonus: number | null
    }
    rejection_reasons: string[]
    processing_time_ms: number | null
    candidate_id: string | null
    application_id: number | null
}

interface BulkUploadStatus {
    id: number
    job_id: number
    status: "pending" | "processing" | "completed" | "failed"
    progress: number
    total: number
    processed: number
    passed: number
    rejected: number
    errors: number
    processing_time_seconds: number | null
    created_at: string
    completed_at: string | null
}

interface BulkUploadProps {
    jobId: number
    jobTitle: string
    onComplete?: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function BulkUpload({ jobId, jobTitle, onComplete }: BulkUploadProps) {
    const { getToken } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [files, setFiles] = useState<File[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<BulkUploadStatus | null>(null)
    const [results, setResults] = useState<BulkUploadResult[]>([])
    const [autoAdvanceThreshold, setAutoAdvanceThreshold] = useState(75)
    const [autoRejectThreshold, setAutoRejectThreshold] = useState(40)
    const [showResults, setShowResults] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentBulkJobId, setCurrentBulkJobId] = useState<number | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(true)

    // Polling interval ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null)
    const pollCountRef = useRef(0)

    // Fetch existing bulk upload history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoadingHistory(true)
                const token = await getToken()

                // Fetch bulk upload history for this job
                const response = await fetch(`${API_URL}/api/bulk/history/${jobId}?limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (response.ok) {
                    const history = await response.json()

                    if (history.length > 0) {
                        const latestJob = history[0]
                        setCurrentBulkJobId(latestJob.id)

                        // If job is still processing, resume polling
                        if (latestJob.status === 'pending' || latestJob.status === 'processing') {
                            console.log("[BulkUpload] Found in-progress job, resuming polling:", latestJob.id)
                            setIsUploading(true)
                            startPolling(latestJob.id)
                        } else if (latestJob.status === 'completed') {
                            // Fetch and show results of completed job
                            console.log("[BulkUpload] Found completed job, fetching results:", latestJob.id)

                            // Fetch full status
                            const statusRes = await fetch(`${API_URL}/api/bulk/status/${latestJob.id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                            if (statusRes.ok) {
                                const status = await statusRes.json()
                                setUploadStatus(status)
                            }

                            // Fetch results
                            await fetchResults(latestJob.id)
                        }
                    }
                }
            } catch (err) {
                console.error("[BulkUpload] Failed to fetch history:", err)
            } finally {
                setLoadingHistory(false)
            }
        }

        fetchHistory()

        // Cleanup on unmount
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
            }
        }
    }, [jobId])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        const pdfFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'))

        if (pdfFiles.length !== selectedFiles.length) {
            setError("Some files were skipped. Only PDF files are accepted.")
        }

        if (pdfFiles.length > 500) {
            setError("Maximum 500 files per upload. Please split into smaller batches.")
            setFiles(pdfFiles.slice(0, 500))
        } else {
            setFiles(pdfFiles)
            setError(null)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const droppedFiles = Array.from(e.dataTransfer.files)
        const pdfFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'))

        if (pdfFiles.length > 500) {
            setError("Maximum 500 files per upload.")
            setFiles(pdfFiles.slice(0, 500))
        } else {
            setFiles(pdfFiles)
            setError(null)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
    }, [])

    const startUpload = async () => {
        if (files.length === 0) return

        setIsUploading(true)
        setError(null)
        setUploadStatus(null)
        setResults([])
        pollCountRef.current = 0

        try {
            const token = await getToken()

            const formData = new FormData()
            files.forEach(file => formData.append('files', file))
            formData.append('auto_advance_threshold', autoAdvanceThreshold.toString())
            formData.append('auto_reject_threshold', autoRejectThreshold.toString())

            toast.loading("Uploading resumes...", { id: "bulk-upload" })

            const response = await fetch(`${API_URL}/api/bulk/jobs/${jobId}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Upload failed')
            }

            const data = await response.json()

            // Save bulk job ID to localStorage for persistence
            localStorage.setItem(`bulk_upload_job_${jobId}`, data.bulk_job_id.toString())
            setCurrentBulkJobId(data.bulk_job_id)

            toast.success(`Upload started! Processing ${files.length} resumes...`, { id: "bulk-upload" })

            // Start polling for status
            startPolling(data.bulk_job_id)

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed'
            setError(errorMessage)
            setIsUploading(false)
            toast.error(`Upload failed: ${errorMessage}`, { id: "bulk-upload" })
        }
    }

    const startPolling = (bulkJobId: number) => {
        // Clear any existing polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
        }

        const poll = async () => {
            pollCountRef.current++

            try {
                const token = await getToken()
                const response = await fetch(`${API_URL}/api/bulk/status/${bulkJobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (response.ok) {
                    const status: BulkUploadStatus = await response.json()
                    setUploadStatus(status)

                    if (status.status === 'completed' || status.status === 'failed') {
                        // Stop polling and fetch results
                        if (pollingRef.current) {
                            clearInterval(pollingRef.current)
                            pollingRef.current = null
                        }
                        setIsUploading(false)

                        // Clear localStorage
                        localStorage.removeItem(`bulk_upload_job_${jobId}`)

                        if (status.status === 'completed') {
                            await fetchResults(bulkJobId)
                            toast.success(`✅ Screening complete! ${status.passed} passed, ${status.rejected} rejected`, {
                                duration: 5000
                            })
                            // Trigger refresh of applicants list
                            onComplete?.()
                        } else {
                            toast.error("Processing failed. Please try again.", { duration: 5000 })
                        }
                    } else if (status.status === 'processing' && status.processed > 0) {
                        // Live update: Fetch results while processing
                        await fetchResults(bulkJobId)
                    }
                } else if (response.status === 404) {
                    // Job not found - might have been deleted or errored
                    console.error("Bulk job not found")
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current)
                        pollingRef.current = null
                    }
                    setIsUploading(false)
                    localStorage.removeItem(`bulk_upload_job_${jobId}`)
                    setError("Upload job not found. It may have expired.")
                }
            } catch (err) {
                console.error('Polling error:', err)
                // After 60 poll attempts (2 minutes), stop and show error
                if (pollCountRef.current > 60) {
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current)
                        pollingRef.current = null
                    }
                    setIsUploading(false)
                    localStorage.removeItem(`bulk_upload_job_${jobId}`)
                    setError("Processing timed out. Please check your uploads.")
                    toast.error("Processing timed out", { duration: 5000 })
                }
            }
        }

        // Initial poll
        poll()

        // Poll every 2 seconds
        pollingRef.current = setInterval(poll, 2000)
    }

    const fetchResults = async (bulkJobId: number) => {
        try {
            const token = await getToken()
            const response = await fetch(`${API_URL}/api/bulk/results/${bulkJobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setResults(data.results)
                setShowResults(true)
            }
        } catch (err) {
            console.error('Failed to fetch results:', err)
        }
    }

    const clearFiles = () => {
        setFiles([])
        setUploadStatus(null)
        setResults([])
        setShowResults(false)
        setError(null)
        setCurrentBulkJobId(null)
        pollCountRef.current = 0

        // Clear localStorage
        localStorage.removeItem(`bulk_upload_job_${jobId}`)

        // Stop any active polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const getStatusIcon = (decision: string | null) => {
        switch (decision) {
            case 'ADVANCE':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'REVIEW':
                return <AlertCircle className="h-4 w-4 text-yellow-500" />
            case 'REJECT':
                return <XCircle className="h-4 w-4 text-red-500" />
            default:
                return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        }
    }

    const getDecisionBadge = (decision: string | null) => {
        switch (decision) {
            case 'ADVANCE':
                return <Badge className="bg-green-500 hover:bg-green-600">Assessment Invited</Badge>
            case 'REVIEW':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Review</Badge>
            case 'REJECT':
                return <Badge variant="destructive">Rejected</Badge>
            default:
                return <Badge variant="outline">Processing</Badge>
        }
    }

    return (
        <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-purple-400" />
                    Bulk Resume Upload
                </CardTitle>
                <CardDescription>
                    Upload multiple resumes to screen candidates for {jobTitle}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Loading State */}
                {loadingHistory && (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading upload history...</span>
                    </div>
                )}

                {/* Drop Zone */}
                {!loadingHistory && !isUploading && !uploadStatus?.status?.includes('completed') && results.length === 0 && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Upload className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <p className="text-gray-300 mb-2">
                            Drag and drop PDF resumes here, or click to browse
                        </p>
                        <p className="text-gray-500 text-sm">
                            Supports up to 500 PDFs per upload (max 10MB each)
                        </p>
                    </div>
                )}

                {/* Selected Files Preview */}
                {files.length > 0 && !isUploading && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-400" />
                                <span className="text-white font-medium">{files.length} files selected</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearFiles}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        </div>

                        {/* Threshold Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 flex justify-between">
                                    <span>Auto-Advance Threshold</span>
                                    <span className="text-green-400 font-medium">{autoAdvanceThreshold}%</span>
                                </label>
                                <Slider
                                    value={[autoAdvanceThreshold]}
                                    onValueChange={(v) => setAutoAdvanceThreshold(v[0])}
                                    min={50}
                                    max={95}
                                    step={5}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    Candidates scoring above this get auto-invited to assessment
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 flex justify-between">
                                    <span>Auto-Reject Threshold</span>
                                    <span className="text-red-400 font-medium">{autoRejectThreshold}%</span>
                                </label>
                                <Slider
                                    value={[autoRejectThreshold]}
                                    onValueChange={(v) => setAutoRejectThreshold(v[0])}
                                    min={20}
                                    max={60}
                                    step={5}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    Candidates scoring below this get auto-rejected
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={startUpload}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Start ATS Screening ({files.length} resumes)
                        </Button>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                            <p className="text-red-300 font-medium">Error</p>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Processing Status */}
                {uploadStatus && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {uploadStatus.status === 'processing' ? (
                                    <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                                ) : uploadStatus.status === 'completed' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                )}
                                <span className="text-white font-medium capitalize">
                                    {uploadStatus.status === 'processing' ? 'Screening in progress...' : uploadStatus.status}
                                </span>
                            </div>
                            <span className="text-gray-400 text-sm">
                                {uploadStatus.processed} / {uploadStatus.total}
                            </span>
                        </div>

                        <Progress value={uploadStatus.progress} className="h-2" />

                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <Users className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                                <div className="text-xl font-bold text-white">{uploadStatus.total}</div>
                                <div className="text-xs text-gray-400">Total</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <TrendingUp className="h-5 w-5 mx-auto text-green-400 mb-1" />
                                <div className="text-xl font-bold text-green-400">{uploadStatus.passed}</div>
                                <div className="text-xs text-gray-400">Passed</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <XCircle className="h-5 w-5 mx-auto text-red-400 mb-1" />
                                <div className="text-xl font-bold text-red-400">{uploadStatus.rejected}</div>
                                <div className="text-xs text-gray-400">Rejected</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <Clock className="h-5 w-5 mx-auto text-purple-400 mb-1" />
                                <div className="text-xl font-bold text-white">
                                    {uploadStatus.processing_time_seconds
                                        ? `${uploadStatus.processing_time_seconds.toFixed(1)}s`
                                        : '-'}
                                </div>
                                <div className="text-xs text-gray-400">Time</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Table */}
                {results.length > 0 && (
                    <Collapsible open={showResults} onOpenChange={setShowResults}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                            <span className="text-white font-medium">Screening Results ({results.length})</span>
                            {showResults ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <ScrollArea className="h-[400px] mt-4">
                                <div className="space-y-2">
                                    {results.map((result) => (
                                        <div
                                            key={result.id}
                                            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(result.decision)}
                                                <div>
                                                    <div className="text-white font-medium">
                                                        {result.candidate_name || result.filename}
                                                    </div>
                                                    <div className="text-gray-400 text-sm">
                                                        {result.candidate_email || 'No email detected'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {result.match_score !== null && (
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${result.match_score >= 75 ? 'text-green-400' :
                                                            result.match_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                            }`}>
                                                            {result.match_score}%
                                                        </div>
                                                        <div className="text-xs text-gray-500">Match Score</div>
                                                    </div>
                                                )}
                                                {getDecisionBadge(result.decision)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Actions for completed upload */}
                {uploadStatus?.status === 'completed' && (
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={clearFiles} className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Upload More
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                onComplete?.()
                                toast.success("Applicants list refreshed!")
                            }}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Refresh Applicants
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
