"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, Clock, Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"

export default function CodingAssessment() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const jobId = params.id
  
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<any>(null)
  
  // Navigation State
  const [currentQIndex, setCurrentQIndex] = useState(0)
  
  // Editor State
  const [code, setCode] = useState("// Loading...")
  const [output, setOutput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(3600) 

  useEffect(() => {
    if (jobId) {
      fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/assessment`)
        .then(res => res.ok ? res.json() : { questions: [] })
        .then(data => {
            // Robust Parsing Logic
            let cleanQuestions = data.questions;
            for(let i=0; i<3; i++) {
                if (typeof cleanQuestions === 'string') {
                    try { cleanQuestions = JSON.parse(cleanQuestions); } catch(e) {}
                } else { break; }
            }
            if (!Array.isArray(cleanQuestions)) cleanQuestions = [];
            data.questions = cleanQuestions;
            setAssessment(data)
            
            if (data.duration_minutes) setTimeLeft(data.duration_minutes * 60)

            // Load first question code
            if (cleanQuestions.length > 0) {
                const q = cleanQuestions[0];
                setCode(q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solve():\n    pass`)
            } else {
                setCode("# No questions received.")
            }
        })
        .catch(err => console.error(err))
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

  // --- 1. PISTON INTEGRATION ---
  const handleRun = async () => {
    setRunning(true);
    setOutput("Running code on Piston Engine...");
    try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: "python",
                version: "3.10.0",
                files: [{ content: code }]
            })
        });
        const data = await response.json();
        if (data.run) {
            setOutput(data.run.output || "No output returned.");
        } else {
            setOutput("Error: Failed to execute code.");
        }
    } catch (err) {
        setOutput(`Execution Error: ${err}`);
    } finally {
        setRunning(false);
    }
  }

  // --- 2. WORKFLOW FIX: Save & Redirect (Do NOT Submit App) ---
  const handleFinishTechnical = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      // Save Technical Score (Mock logic for now, ideally calculates based on test cases)
      await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: user.id,
          code: code,
          language: "python",
          output: output || "Submitted",
          score: 85 // Mock score: In real app, backend validates this
        })
      })

      alert("Technical Section Saved! Redirecting to Dashboard to complete Psychometric Test.")
      router.push("/candidate/interviews") // FORCE BACK TO DASHBOARD
      
    } catch (error) {
      console.error("Submit error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  // --- 3. NAVIGATION LOGIC ---
  const handleNext = () => {
    if (currentQIndex < (assessment?.questions?.length || 0) - 1) {
        setCurrentQIndex(prev => prev + 1);
        // Ideally save current code to a temporary state before switching
    }
  }

  const handlePrev = () => {
    if (currentQIndex > 0) {
        setCurrentQIndex(prev => prev - 1);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
  if (!assessment) return <div className="p-10 text-center">Assessment not found.</div>

  const questions = assessment.questions || [];
  const question = questions[currentQIndex] || { title: "No Questions", problem_text: "Empty list." };

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5"/></Button>
            <h2 className="font-bold text-lg">{assessment.title}</h2>
            <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {formatTime(timeLeft)}</Badge>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRun} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Play className="w-4 h-4 mr-2"/> Run Code</>}
            </Button>
            
            {/* Show 'Finish' only on last question, otherwise show 'Next' (optional UX choice) 
                For now, we keep Finish always available to save & exit. */}
            <Button size="sm" onClick={handleFinishTechnical} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send className="w-4 h-4 mr-2"/> Finish Technical</>}
            </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-1/3 border-r flex flex-col bg-muted/10">
            <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{question.title}</h3>
                    <Badge>Q {currentQIndex + 1} / {questions.length}</Badge>
                </div>
                
                <div className="prose dark:prose-invert text-sm mb-8"><p className="whitespace-pre-wrap">{question.problem_text}</p></div>
                
                <div className="space-y-4">
                    <Card className="bg-muted/50"><CardHeader className="py-3"><CardTitle className="text-sm">Example Input</CardTitle></CardHeader><CardContent className="py-3 font-mono text-xs">{question.test_input || question.input || "N/A"}</CardContent></Card>
                    <Card className="bg-muted/50"><CardHeader className="py-3"><CardTitle className="text-sm">Expected Output</CardTitle></CardHeader><CardContent className="py-3 font-mono text-xs">{question.test_output || question.output || "N/A"}</CardContent></Card>
                </div>
            </div>

            {/* NAVIGATION BAR */}
            <div className="p-4 border-t flex justify-between bg-card">
                <Button variant="outline" onClick={handlePrev} disabled={currentQIndex === 0}>
                    <ChevronLeft className="w-4 h-4 mr-2"/> Previous
                </Button>
                <Button variant="outline" onClick={handleNext} disabled={currentQIndex === questions.length - 1}>
                    Next <ChevronRight className="w-4 h-4 ml-2"/>
                </Button>
            </div>
        </div>

        {/* RIGHT PANEL: EDITOR */}
        <div className="flex-1 flex flex-col">
            <div className="flex-1">
                <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={(val) => setCode(val || "")} options={{ minimap: { enabled: false }, fontSize: 14 }} />
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