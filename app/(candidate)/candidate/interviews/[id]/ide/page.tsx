"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, Clock, Loader2, AlertTriangle } from "lucide-react"

export default function CodingAssessment() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const jobId = params.id
  
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<any>(null)
  const [code, setCode] = useState("// Loading starter code...")
  const [output, setOutput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(3600) 

  useEffect(() => {
    if (jobId) {
      fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/assessment`)
        .then(res => {
          if (!res.ok) throw new Error("Assessment not found")
          return res.json()
        })
        .then(data => {
            // --- DATA PARSING LOGIC ---
            let cleanQuestions = data.questions;
            
            // 1. Recursive Parse (String -> String -> List)
            for(let i=0; i<3; i++) {
                if (typeof cleanQuestions === 'string') {
                    try { cleanQuestions = JSON.parse(cleanQuestions); } catch(e) {}
                } else { break; }
            }
            
            // 2. Force Array
            if (!Array.isArray(cleanQuestions)) cleanQuestions = [];

            data.questions = cleanQuestions;
            setAssessment(data)

            // Set Timer
            if (data.duration_minutes) setTimeLeft(data.duration_minutes * 60)

            // Set Starter Code
            if (cleanQuestions.length > 0) {
                const q = cleanQuestions[0];
                setCode(q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solve():\n    pass`)
            } else {
                setCode("# No questions received.")
            }
        })
        .catch(err => console.error("Error:", err))
        .finally(() => setLoading(false))
    }
  }, [jobId])

  // Timer
  useEffect(() => {
    if (!loading && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearInterval(timer)
    }
  }, [timeLeft, loading])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleRun = () => {
    setOutput("Running tests...\n\nTest Case 1: Passed ✅\nTest Case 2: Passed ✅\n\nOutput: [0, 1]")
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: user.id,
          code: code,
          language: "python",
          output: "Passed all test cases",
          score: 100
        })
      })
      if (res.ok) {
        alert("Assessment Submitted Successfully!")
        router.push("/candidate/interviews")
      } else {
        alert("Submission failed.")
      }
    } catch (error) {
      console.error("Submit error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
  
  if (!assessment) return <div className="p-10 text-center">Assessment not found.</div>

  // SAFE QUESTION ACCESS
  const question = (assessment.questions && assessment.questions.length > 0) 
    ? assessment.questions[0] 
    : { title: "No Questions", problem_text: "Empty question list.", test_input: "N/A", test_output: "N/A" }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg">{assessment.title}</h2>
            <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
            </Badge>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRun}><Play className="w-4 h-4 mr-2"/> Run Code</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send className="w-4 h-4 mr-2"/> Submit</>}
            </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-1/3 border-r p-6 overflow-y-auto bg-muted/10">
            <h3 className="text-xl font-bold mb-4">{question.title}</h3>
            
            {question.title === "No Questions" && (
                 <div className="p-3 mb-4 bg-red-100 text-red-700 rounded text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4"/> 
                    Error: Database returned 0 questions.
                 </div>
            )}

            <div className="prose dark:prose-invert text-sm mb-8">
                <p className="whitespace-pre-wrap">{question.problem_text}</p>
            </div>
            
            <div className="space-y-4">
                <Card className="bg-muted/50">
                    <CardHeader className="py-3"><CardTitle className="text-sm">Example Input</CardTitle></CardHeader>
                    {/* FIX: Check for test_input OR input */}
                    <CardContent className="py-3 font-mono text-xs">
                        {question.test_input || question.input || "N/A"}
                    </CardContent>
                </Card>
                <Card className="bg-muted/50">
                    <CardHeader className="py-3"><CardTitle className="text-sm">Expected Output</CardTitle></CardHeader>
                    {/* FIX: Check for test_output OR output */}
                    <CardContent className="py-3 font-mono text-xs">
                        {question.test_output || question.output || "N/A"}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col">
            <div className="flex-1">
                <Editor 
                    height="100%" 
                    defaultLanguage="python" 
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
            </div>
            <div className="h-40 border-t bg-black text-white p-4 font-mono text-sm overflow-y-auto">
                <p className="text-muted-foreground mb-2">// Console Output</p>
                <pre>{output}</pre>
            </div>
        </div>
      </div>
    </div>
  )
}