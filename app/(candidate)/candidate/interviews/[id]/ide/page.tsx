"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs" // <--- 1. Import useAuth
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, Clock, Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, ShieldAlert, Camera, CameraOff } from "lucide-react"
import { useAntiCheat } from "@/hooks/use-anti-cheat"
import { useToast } from "@/hooks/use-toast"

export default function CodingAssessment() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { getToken } = useAuth() // <--- 2. Get token helper
  const { toast } = useToast()
  const jobId = params.id
  
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<any>(null)
  const [problemId, setProblemId] = useState<string | null>(null)
  
  // Navigation State
  const [currentQIndex, setCurrentQIndex] = useState(0)
  
  // Editor State
  const [code, setCode] = useState("// Loading...")
  const [output, setOutput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(3600)
  
  // Results State
  const [showResults, setShowResults] = useState(false)
  const [judgeResults, setJudgeResults] = useState<any>(null)
  
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [cameraLoading, setCameraLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const antiCheat = useAntiCheat(sessionId, true) 

  // Fetch Assessment Data
  useEffect(() => {
    if (jobId) {
      const fetchAssessment = async () => {
        try {
            const token = await getToken()
            const res = await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}`, { // Corrected endpoint
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            
            const data = res.ok ? await res.json() : { questions: [] }
            
            let cleanQuestions = data.questions;
            // Handle double-stringified JSON if present
            for(let i=0; i<3; i++) {
                if (typeof cleanQuestions === 'string') {
                    try { cleanQuestions = JSON.parse(cleanQuestions); } catch(e) {}
                } else { break; }
            }
            if (!Array.isArray(cleanQuestions)) cleanQuestions = [];
            data.questions = cleanQuestions;
            setAssessment(data)
            
            if (data.duration_minutes) setTimeLeft(data.duration_minutes * 60)

            if (cleanQuestions.length > 0) {
                const q = cleanQuestions[0];
                // Try to resolve problem ID
                let extractedProblemId = q.problem_id || q.id || data.problem_id;
                if (!extractedProblemId) {
                  const title = q.title?.toLowerCase() || "";
                  if (title.includes("two sum")) extractedProblemId = "two_sum";
                  else if (title.includes("reverse")) extractedProblemId = "reverse_string";
                  else if (title.includes("palindrome")) extractedProblemId = "is_palindrome";
                  else extractedProblemId = "two_sum"; 
                }
                setProblemId(extractedProblemId);
                setCode(q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solve():\n    pass`)
            } else {
                setCode("# No questions received.")
                setProblemId("two_sum")
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
      }
      fetchAssessment()
    }
  }, [jobId, getToken])

  // ... (Camera initialization useEffect remains same) ...
  useEffect(() => {
    const initCamera = async () => {
      try {
        setCameraLoading(true)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser doesn't support camera access")
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        stream.getTracks().forEach(track => track.stop())
        await antiCheat.initializeCamera()
        setCameraLoading(false)
      } catch (error: any) {
        setCameraError(error?.message || "Failed to access camera")
        setCameraLoading(false)
      }
    }
    const timer = setTimeout(() => { initCamera() }, 500)
    return () => clearTimeout(timer)
  }, [])

  // ... (Timer useEffect remains same) ...
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

  // --- 1. SECURE PROXY EXECUTION (No Token Leak) ---
  const handleRun = async () => {
    setRunning(true);
    setOutput("Running code securely...");
    try {
        const token = await getToken() // <--- Get Token
        const response = await fetch("http://127.0.0.1:8000/api/execute", { // <--- Call Backend
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({
                language: "python",
                code: code
            })
        });
        
        const data = await response.json();
        
        if (data.run) {
            setOutput(data.run.output || "No output returned.");
        } else {
            setOutput("Error: Failed to execute code via secure proxy.");
        }
    } catch (err) {
        setOutput(`Execution Error: ${err}`);
    } finally {
        setRunning(false);
    }
  }

  // --- 2. JUDGE SYSTEM (Secure) ---
  const handleRunSampleTests = async () => {
    if (!problemId) { setOutput("Error: Problem ID not found"); return; }
    setRunning(true);
    setOutput("Running sample tests...");
    
    try {
      const token = await getToken()
      const response = await fetch(
        `http://127.0.0.1:8000/api/problems/${problemId}/run-sample-tests`,
        {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            problem_id: problemId,
            code: code,
            language: "python"
          })
        }
      );

      const result = await response.json();
      if (result.error) {
        setOutput(`❌ Error: ${result.error}`);
      } else if (result.sample_results) {
        const { passed, total, tests } = result.sample_results;
        let output_text = `Sample Tests: ${passed}/${total} passed\n\n`;
        tests.forEach((t: any, i: number) => {
          output_text += `Test ${i + 1}: ${t.ok ? "✅ PASS" : "❌ FAIL"}\n`;
          if (t.error) output_text += `  Error: ${t.error}\n`;
          output_text += `  Got: ${t.got}\n\n`;
        });
        setOutput(output_text);
      }
    } catch (error) {
      setOutput(`Request error: ${error}`);
    } finally {
      setRunning(false);
    }
  }

  // --- 3. FINAL EVALUATION (Secure) ---
  const handleFinishTechnical = async () => {
    if (!user || !problemId) { alert("Error: Missing info"); return; }
    setSubmitting(true);
    setOutput("Evaluating...");

    try {
      const token = await getToken()
      const response = await fetch(`http://127.0.0.1:8000/api/problems/${problemId}/evaluate`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: problemId,
          candidate_id: user.id,
          job_id: parseInt(jobId as string),
          code: code,
          language: "python"
        })
      });
      
      const result = await response.json();
      setJudgeResults(result);
      setShowResults(true);
      await antiCheat.sendLogsOnCompletion(); // Ensure this is also secured if needed

      const summary = `
═══════════════════════════════════════
              JUDGE RESULTS
═══════════════════════════════════════
FINAL SCORE: ${result.final_score}/100
VERDICT: ${result.verdict}
Passed: ${result.passed_hidden_tests}/${result.total_hidden_tests} tests
═══════════════════════════════════════`;
      setOutput(summary);
      
    } catch (error) {
      setOutput(`❌ Evaluation error: ${error}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ... (handleSaveAndExit secure version) ...
  const handleSaveAndExit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const token = await getToken()
      await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}/submit`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: user.id,
          code: code,
          language: "python",
          output: output || "Submitted",
          score: judgeResults?.final_score || 0
        })
      });
      router.push("/candidate/interviews");
    } catch (error) { console.error(error); } 
    finally { setSubmitting(false); }
  }

  // ... (Rest of UI remains identical) ...
  // Ensure the buttons call the new handles:
  // onClick={handleRun} -> Now calls secure proxy
  // onClick={handleRunSampleTests} -> Now secure
  // onClick={handleFinishTechnical} -> Now secure

  // ... (JSX Return logic is same as before) ...
  if (loading || cameraLoading) return <div className="text-white text-center p-20">Loading Secure Environment...</div>
  if (!assessment) return <div className="text-center p-20">Assessment not found</div>

  const questions = assessment.questions || [];
  const question = questions[currentQIndex] || {};

  return (
    <div className="h-screen flex flex-col">
       {/* ... Header ... */}
       <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          {/* ... */}
          <div className="flex gap-2">
             {/* Use the new Secure Run Handle */}
             <Button variant="outline" size="sm" onClick={handleRun} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Play className="w-4 h-4 mr-2"/> Run Code</>}
             </Button>
             
             <Button variant="outline" size="sm" onClick={handleRunSampleTests} disabled={running}>
                <Play className="w-4 h-4 mr-2"/> Run Tests
             </Button>

             <Button size="sm" onClick={handleFinishTechnical} disabled={submitting} className="bg-green-600">
                <Send className="w-4 h-4 mr-2"/> Submit
             </Button>
          </div>
       </header>
       
       {/* ... Rest of Editor UI ... */}
       <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 border-r p-6">
             <h3 className="text-xl font-bold">{question.title}</h3>
             <p className="mt-4">{question.problem_text}</p>
          </div>
          <div className="flex-1 flex flex-col">
             <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={code} onChange={(v) => setCode(v||"")} />
             <div className="h-40 bg-black text-white p-4 overflow-y-auto">
                <pre>{output}</pre>
             </div>
          </div>
       </div>
       
       {/* ... Results Modal ... */}
       {showResults && judgeResults && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <Card className="w-[500px]">
               <CardHeader><CardTitle>Submission Results</CardTitle></CardHeader>
               <CardContent>
                  <p>Score: {judgeResults.final_score}</p>
                  <Button onClick={handleSaveAndExit} className="w-full mt-4">Continue</Button>
               </CardContent>
            </Card>
         </div>
       )}
    </div>
  )
}