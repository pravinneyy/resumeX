"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
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
  
  // Judge Results State
  const [showResults, setShowResults] = useState(false)
  const [judgeResults, setJudgeResults] = useState<any>(null)
  const [evaluationId, setEvaluationId] = useState<string | null>(null)
  
  // Anti-cheat & Camera State
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [cameraLoading, setCameraLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const antiCheat = useAntiCheat(sessionId, true) 

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

            // Load first question code and extract problem_id
            if (cleanQuestions.length > 0) {
                const q = cleanQuestions[0];
                // Map common problem titles to problem IDs
                let extractedProblemId = q.problem_id || q.id || data.problem_id;
                
                if (!extractedProblemId) {
                  // Try to infer from title
                  const title = q.title?.toLowerCase() || "";
                  if (title.includes("two sum")) extractedProblemId = "two_sum";
                  else if (title.includes("reverse")) extractedProblemId = "reverse_string";
                  else if (title.includes("palindrome")) extractedProblemId = "is_palindrome";
                  else extractedProblemId = "two_sum"; // default
                }
                
                setProblemId(extractedProblemId);
                console.log("Extracted problem ID:", extractedProblemId);
                
                setCode(q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solve():\n    pass`)
            } else {
                setCode("# No questions received.")
                setProblemId("two_sum") // default
            }
        })
        .catch(err => console.error(err))
        .finally(() => {
          setLoading(false)
        })
    }
  }, [jobId])

  // AUTO-INITIALIZE CAMERA on component mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log("[IDE] Requesting camera access automatically...")
        setCameraLoading(true)
        setCameraError(null)
        
        // Check if browser supports camera API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser doesn't support camera access")
        }

        // Try to request camera - this will show the permission dialog
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })

        console.log("[IDE] Camera permission granted!")
        
        // Stop the test stream and let antiCheat hook manage it
        stream.getTracks().forEach(track => track.stop())
        
        // Now initialize via antiCheat hook
        await antiCheat.initializeCamera()
        
        setCameraLoading(false)
      } catch (error: any) {
        console.error("[IDE] Camera error:", error)
        
        // Map error messages
        let errorMsg = "Failed to access camera"
        if (error?.name === "NotFoundError") {
          errorMsg = "No camera found on your device. Please connect a camera and refresh."
        } else if (error?.name === "NotAllowedError") {
          errorMsg = "Camera permission denied. Please allow camera access and refresh."
        } else if (error?.name === "NotReadableError") {
          errorMsg = "Camera is in use by another application. Please close it and refresh."
        } else if (error?.name === "SecurityError") {
          errorMsg = "Camera access blocked by browser security. Make sure you're using HTTPS or localhost."
        } else if (error?.message?.includes("doesn't support")) {
          errorMsg = error.message
        }
        
        setCameraError(errorMsg)
        setCameraLoading(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initCamera()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

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

  // --- 2. JUDGE SYSTEM: Run Sample Tests ---
  const handleRunSampleTests = async () => {
    if (!problemId) {
      setOutput("Error: Problem ID not found");
      return;
    }

    setRunning(true);
    setOutput("Running sample tests...");
    
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/problems/${problemId}/run-sample-tests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          output_text += `  Time: ${t.time}s\n`;
          output_text += `  Input: ${t.input}\n`;
          output_text += `  Expected: ${t.expected}\n`;
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

  // --- 3. JUDGE SYSTEM: Final Evaluation (Hidden Tests) ---
  const handleFinishTechnical = async () => {
    if (!user || !problemId) {
      alert("Error: Missing user or problem information");
      return;
    }

    setSubmitting(true);
    setOutput("Evaluating submission with hidden tests...");

    try {
      const url = `http://127.0.0.1:8000/api/problems/${problemId}/evaluate`;
      console.log("Calling evaluate API:", url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problemId,
          candidate_id: user.id,
          job_id: parseInt(jobId as string),
          code: code,
          language: "python"
        })
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Server error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Evaluation result:", result);
      
      setEvaluationId(result.evaluation_id);
      setJudgeResults(result);
      setShowResults(true);

      // Send anti-cheat logs on completion
      await antiCheat.sendLogsOnCompletion();

      // Construct output for display
      const summary = `
═══════════════════════════════════════
              JUDGE RESULTS
═══════════════════════════════════════

Problem ID: ${result.problem_id}
Evaluation ID: ${result.evaluation_id}

CORRECTNESS: ${result.passed_hidden_tests}/${result.total_hidden_tests} tests passed
  Points: ${result.correctness_points}/70

PERFORMANCE: Max execution time: ${result.max_execution_time}s
  Points: ${result.performance_points}/15

CODE QUALITY: 
  Points: ${result.quality_points}/10

PENALTIES:
  Points: -${result.penalty_points}

═══════════════════════════════════════
FINAL SCORE: ${result.final_score}/100
VERDICT: ${result.verdict}
═══════════════════════════════════════
      `.trim();

      setOutput(summary);
      
      // Lock editor
      alert(`✅ Submission evaluated!\n\nFinal Score: ${result.final_score}/100\nVerdict: ${result.verdict}`);
      
    } catch (error) {
      setOutput(`❌ Evaluation error: ${error}`);
      alert(`Error during evaluation: ${error}`);
    } finally {
      setSubmitting(false);
    }
  }

  // --- 4. OLD: Save & Redirect (kept for backward compatibility) ---
  const handleSaveAndExit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/assessments/${jobId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: user.id,
          code: code,
          language: "python",
          output: output || "Submitted",
          score: judgeResults?.final_score || 0
        })
      });

      alert("Technical Section Saved! Redirecting to Dashboard.");
      router.push("/candidate/interviews");
      
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const handleToggleCamera = async () => {
    try {
      if (antiCheat.cameraActive) {
        antiCheat.stopCamera()
        console.log("Camera disabled")
        toast({
          title: "Camera Disabled",
          description: "Anti-cheat monitoring is now OFF",
        })
      } else {
        await antiCheat.initializeCamera()
        console.log("Camera enabled")
        toast({
          title: "Camera Enabled",
          description: "Anti-cheat monitoring is now ON",
        })
      }
    } catch (error) {
      console.error("Camera toggle error:", error)
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Check browser permissions.",
        variant: "destructive",
      })
    }
  }
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

  // Show loading or camera error screen
  if (loading || cameraLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-3">
            <div className="flex justify-center">
              <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Initializing Assessment</h2>
            <p className="text-gray-400">Setting up your camera and loading the coding environment...</p>
          </div>
          
          {cameraError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-left">
              <p className="text-red-400 font-semibold mb-2">⚠️ Camera Issue</p>
              <p className="text-red-300 text-sm">{cameraError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                onClick={() => {
                  setCameraError(null)
                  setCameraLoading(true)
                  // Retry camera initialization
                  const initCamera = async () => {
                    try {
                      await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: "user" },
                        audio: false
                      })
                      await antiCheat.initializeCamera()
                      setCameraLoading(false)
                    } catch (error: any) {
                      setCameraError(error?.message || "Failed to access camera")
                      setCameraLoading(false)
                    }
                  }
                  initCamera()
                }}
              >
                Retry Camera
              </Button>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p>Camera Permission: {antiCheat.cameraActive ? "✅ Active" : "⏳ Pending"}</p>
            <p>Assessment: {loading ? "⏳ Loading" : "✅ Ready"}</p>
          </div>
        </div>
      </div>
    )
  }

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
            {antiCheat.violationCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="w-3 h-3" /> {antiCheat.violationCount} violation{antiCheat.violationCount > 1 ? 's' : ''}
              </Badge>
            )}
        </div>
        <div className="flex gap-2">
            <Button 
              variant={antiCheat.cameraActive ? "default" : "outline"} 
              size="sm" 
              onClick={handleToggleCamera}
              title={antiCheat.cameraActive ? "Camera is ON" : "Camera is OFF"}
            >
              {antiCheat.cameraActive ? (
                <><Camera className="w-4 h-4 mr-2"/> Camera ON</>
              ) : (
                <><CameraOff className="w-4 h-4 mr-2"/> Enable Camera</>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleRunSampleTests} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Play className="w-4 h-4 mr-2"/> Run Sample Tests</>}
            </Button>
            
            <Button size="sm" onClick={handleFinishTechnical} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Send className="w-4 h-4 mr-2"/> Submit for Evaluation</>}
            </Button>
        </div>
      </header>

      {/* RESULTS PANEL (Modal/Side Panel) */}
      {showResults && judgeResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600">
              <CardTitle className="text-white text-2xl">
                {judgeResults.verdict === "ACCEPTED" ? "✅ ACCEPTED" : 
                 judgeResults.verdict === "PARTIAL_ACCEPTED" ? "⚠️ PARTIAL ACCEPTED" :
                 "❌ FAILED"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Score Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <p className="text-4xl font-bold text-blue-600">{judgeResults.final_score}</p>
                  <p className="text-xs text-muted-foreground">/100</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tests Passed</p>
                  <p className="text-4xl font-bold text-purple-600">{judgeResults.passed_hidden_tests}</p>
                  <p className="text-xs text-muted-foreground">/{judgeResults.total_hidden_tests}</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold">Score Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Correctness (Tests Passed)</span>
                    <span className="font-semibold">{judgeResults.correctness_points.toFixed(1)}/70</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(judgeResults.correctness_points / 70) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm">Performance (Execution Speed)</span>
                    <span className="font-semibold">{judgeResults.performance_points.toFixed(1)}/15</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(judgeResults.performance_points / 15) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm">Code Quality (No Errors)</span>
                    <span className="font-semibold">{judgeResults.quality_points.toFixed(1)}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${(judgeResults.quality_points / 10) * 100}%` }}
                    ></div>
                  </div>

                  {judgeResults.penalty_points > 0 && (
                    <>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-red-600">Penalties (Anti-Cheat)</span>
                        <span className="font-semibold text-red-600">-{judgeResults.penalty_points.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Execution Time */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded">
                <p className="text-sm">Max Execution Time: <span className="font-mono font-semibold">{judgeResults.max_execution_time}s</span></p>
              </div>

              {/* Error Message (if any) */}
              {judgeResults.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 rounded">
                  <p className="text-sm text-red-700 dark:text-red-300">Error: {judgeResults.error}</p>
                </div>
              )}

              {/* Evaluation ID */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded">
                <p className="text-xs text-muted-foreground">Evaluation ID: <span className="font-mono">{judgeResults.evaluation_id}</span></p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowResults(false)}>Close</Button>
                <Button 
                  onClick={handleSaveAndExit} 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                  Save & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <p className="text-muted-foreground mb-2">// Console / Test Output</p>
                <pre>{output}</pre>
            </div>
        </div>
      </div>
    </div>
  )
}