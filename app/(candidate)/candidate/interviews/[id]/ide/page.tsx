"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Send, Clock, Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, ShieldAlert, Camera, CameraOff, Users, Maximize } from "lucide-react"
import { useEnhancedAntiCheat } from "@/hooks/useEnhancedAntiCheat"
import { useToast } from "@/hooks/use-toast"
import { useExam } from "@/contexts/ExamContext"

export default function CodingAssessment() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { getToken } = useAuth()
  const { toast } = useToast()
  const jobId = params.id

  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<any>(null)
  const [problemIds, setProblemIds] = useState<{ [key: number]: string }>({})
  const [testCasesByQuestion, setTestCasesByQuestion] = useState<{ [key: number]: any[] }>({})
  const API_URL = process.env.NEXT_PUBLIC_API_URL 

  // Navigation State
  const [currentQIndex, setCurrentQIndex] = useState(0)

  // Editor State - Code cache for each question
  const [codeByQuestion, setCodeByQuestion] = useState<{ [key: number]: string }>({})
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
  const antiCheat = useEnhancedAntiCheat({
    sessionId,
    enabled: true,
    candidateId: user?.id,
    jobId: jobId ? parseInt(jobId as string) : undefined,
    maxViolations: 5,
    faceDetectionTimeoutMs: 10000,
    onViolation: (violation, count) => {
      console.log(`[IDE] Violation #${count}:`, violation.type)
      if (count >= 5) {
        toast({
          title: "⚠️ Too Many Violations",
          description: "You have been flagged for malpractice. Assessment will be auto-submitted.",
          variant: "destructive",
        })
      }
    },
    onPause: (reason) => {
      toast({
        title: "⚠️ Assessment Paused",
        description: reason,
        variant: "destructive",
      })
    },
    onAutoFail: () => {
      toast({
        title: "🚨 Auto-Fail Triggered",
        description: "Too many violations detected. Your submission has been flagged.",
        variant: "destructive",
      })
    },
  })

  // Exam lockdown mode
  const { startExam, endExam, isExamActive, enterFullscreen, isFullscreen } = useExam()

  // Activate lockdown mode when assessment loads
  useEffect(() => {
    if (!loading && assessment && !isExamActive && jobId) {
      startExam(parseInt(jobId as string), "coding", timeLeft)
      console.log("[IDE] Exam lockdown mode activated")
    }
  }, [loading, assessment, isExamActive, jobId, timeLeft, startExam])

  // End exam on unmount
  useEffect(() => {
    return () => {
      if (isExamActive) {
        endExam("completed")
      }
    }
  }, [isExamActive, endExam])


  useEffect(() => {
    const fetchAssessment = async () => {
      if (!jobId) return
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/api/assessments/${jobId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        const data = res.ok ? await res.json() : { questions: [] }
        // Robust Parsing Logic
        let cleanQuestions = data.questions;
        for (let i = 0; i < 3; i++) {
          if (typeof cleanQuestions === 'string') {
            try { cleanQuestions = JSON.parse(cleanQuestions); } catch (e) { }
          } else { break; }
        }
        if (!Array.isArray(cleanQuestions)) cleanQuestions = [];
        data.questions = cleanQuestions;
        setAssessment(data)

        if (data.duration_minutes) setTimeLeft(data.duration_minutes * 60)

        // Load ALL questions and extract problem_id for each
        if (cleanQuestions.length > 0) {
          const problemIdMap: { [key: number]: string } = {};
          const codeMap: { [key: number]: string } = {};
          const testCasesMap: { [key: number]: any[] } = {};

          // Process each question and fetch problem details from DB
          for (let idx = 0; idx < cleanQuestions.length; idx++) {
            const q = cleanQuestions[idx];

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

            problemIdMap[idx] = extractedProblemId;

            // Fetch problem details to get the correct function signature
            try {
              const problemRes = await fetch(
                `${API_URL}/api/problems/${extractedProblemId}`,
                { headers: { "Authorization": `Bearer ${token}` } }
              );

              if (problemRes.ok) {
                const problemData = await problemRes.json();
                // Use the starter_code from DB which has correct function signature
                codeMap[idx] = problemData.starter_code || q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solution():\n    pass`;
                // Store test cases for this question (API returns sample_tests)
                testCasesMap[idx] = problemData.sample_tests || [];
                console.log(`[IDE] Loaded starter code for ${extractedProblemId}:`, problemData.function_signature);
              } else {
                // Fallback if problem not found in DB
                codeMap[idx] = q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solution():\n    # Your code here\n    pass`;
              }
            } catch (err) {
              console.error(`[IDE] Error fetching problem ${extractedProblemId}:`, err);
              codeMap[idx] = q.starter_code || `# Write your Python solution for: ${q.title}\n\ndef solution():\n    pass`;
            }
          }

          setProblemIds(problemIdMap);
          setCodeByQuestion(codeMap);
          setTestCasesByQuestion(testCasesMap);
          console.log("Extracted problem IDs:", problemIdMap);
          console.log("Loaded test cases:", testCasesMap);

          // Set code for first question
          setCode(codeMap[0]);
        } else {
          setCode("# No questions received.")
          setProblemIds({});
          setCodeByQuestion({});
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessment()
  }, [jobId, getToken])

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
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          })
        } catch (e) {
          console.warn("[IDE] Primary camera request failed, trying fallback...", e)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
        }

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

  // --- 1. RUN CODE (Just execute and show output - for debugging) ---
  const handleRunCode = async () => {
    setRunning(true);
    setOutput("🔧 Compiling code...");

    try {
      const token = await getToken();

      // Step 1: Compile first on our backend
      const compileResponse = await fetch(`${API_URL}/api/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: code,
          language: "python"
        })
      });

      const compileResult = await compileResponse.json();

      if (!compileResult.success) {
        let output_text = `❌ COMPILATION ERROR\n\n`;
        output_text += `Error: ${compileResult.error}\n`;
        if (compileResult.error_line) {
          output_text += `Line: ${compileResult.error_line}\n`;
        }
        output_text += `\n💡 Fix the syntax error above to run your code.`;
        setOutput(output_text);
        return;
      }

      // Step 2: Compilation successful - run on Piston to get actual output
      setOutput("✅ Compilation successful!\n\n⏳ Running code...");

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
        const stdout = data.run.stdout || "";
        const stderr = data.run.stderr || "";
        const exitCode = data.run.code;

        let output_text = `✅ Compilation Successful!\n`;
        output_text += `═══════════════════════════════════════\n`;
        output_text += `                CODE OUTPUT\n`;
        output_text += `═══════════════════════════════════════\n\n`;

        if (stdout) {
          output_text += `${stdout}\n`;
        }

        if (stderr) {
          output_text += `\n⚠️ Stderr:\n${stderr}\n`;
        }

        if (!stdout && !stderr) {
          output_text += `(No output - your code didn't print anything)\n`;
        }

        output_text += `\n═══════════════════════════════════════\n`;
        output_text += `Exit Code: ${exitCode}\n`;

        setOutput(output_text);
      } else {
        setOutput("Error: Failed to execute code on Piston.");
      }
    } catch (err) {
      setOutput(`Execution Error: ${err}`);
    } finally {
      setRunning(false);
    }
  }

  // --- 2. JUDGE SYSTEM: Run Sample Tests (with Compile First) ---
  const handleRunSampleTests = async () => {
    const currentProblemId = problemIds[currentQIndex];
    if (!currentProblemId) {
      setOutput("Error: Problem ID not found for current question");
      return;
    }

    setRunning(true);
    setOutput("🔧 Compiling code...");

    try {
      const token = await getToken()

      // Step 1: Compile first (backend now does this automatically, but we show the status)
      const response = await fetch(
        `${API_URL}/api/problems/${currentProblemId}/run-sample-tests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            problem_id: currentProblemId,
            code: code,
            language: "python"
          })
        }
      );

      const result = await response.json();

      // Handle compilation errors specifically
      if (result.error_type === "COMPILATION_ERROR") {
        let output_text = `❌ COMPILATION ERROR\n\n`;
        output_text += `Error: ${result.error}\n`;
        if (result.error_line) {
          output_text += `Line: ${result.error_line}\n`;
        }
        if (result.compilation_details?.text) {
          output_text += `Code: ${result.compilation_details.text}\n`;
        }
        output_text += `\n💡 Tip: Fix the syntax error above before running tests.`;
        setOutput(output_text);
        return;
      }

      // Handle signature errors
      if (result.error_type === "SIGNATURE_ERROR") {
        setOutput(`❌ FUNCTION SIGNATURE ERROR\n\n${result.error}\n\n💡 Tip: Make sure your function name and parameters match the expected signature.`);
        return;
      }

      // Handle other errors
      if (result.error && !result.sample_results) {
        setOutput(`❌ Error: ${result.error}`);
        return;
      }

      // Success - show test results
      if (result.sample_results) {
        const { passed, total, tests } = result.sample_results;
        let output_text = `✅ Compilation Successful!\n\n`;
        output_text += `═══════════════════════════════════════\n`;
        output_text += `Sample Tests: ${passed}/${total} passed\n`;
        output_text += `═══════════════════════════════════════\n\n`;

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
    const currentProblemId = problemIds[currentQIndex];
    if (!user || !currentProblemId) {
      alert("Error: Missing user or problem information for current question");
      return;
    }

    setSubmitting(true);
    setOutput("🔧 Compiling code...");

    try {
      const token = await getToken()
      const url = `${API_URL}/api/problems/${currentProblemId}/evaluate`;
      console.log("Calling evaluate API:", url);

      setOutput("🔧 Compiling code...\n⏳ Running hidden tests...");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: currentProblemId,
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
      console.log("[📋 IDE PAGE] Storing evaluation_id:", result.evaluation_id);

      // Handle compilation errors
      if (result.verdict === "COMPILATION_ERROR") {
        let output_text = `❌ COMPILATION ERROR\n\n`;
        output_text += `Your code failed to compile.\n\n`;
        output_text += `Error: ${result.error}\n`;
        if (result.error_line) {
          output_text += `Line: ${result.error_line}\n`;
        }
        output_text += `\n💡 Tip: Fix the syntax error and try again.\n`;
        output_text += `\nVerdict: COMPILATION_ERROR\n`;
        output_text += `Final Score: 0/100`;

        setOutput(output_text);
        setJudgeResults(result);
        setShowResults(true);
        // Removed alert - modal shows the error
        return;
      }

      // ✅ PHASE 2 FIX: Store evaluation_id as single source of truth
      setEvaluationId(result.evaluation_id);

      // Save to sessionStorage for persistence across page reloads
      if (result.evaluation_id) {
        sessionStorage.setItem(`eval_${jobId}_${user?.id}`, result.evaluation_id);
        console.log("[💾 STORED] evaluation_id saved to sessionStorage");
      }

      setJudgeResults(result);
      setShowResults(true);

      // Send anti-cheat logs on completion


      // Construct output for display
      const summary = `
═══════════════════════════════════════
              JUDGE RESULTS
═══════════════════════════════════════

✅ Compilation: SUCCESS

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

✅ This evaluation is now permanently stored in the database.
   You can safely navigate away and come back to view results.
      `.trim();

      setOutput(summary);
      // Removed alert - modal shows the results

    } catch (error) {
      setOutput(`❌ Evaluation error: ${error}`);
      // Removed alert - error shown in output
    } finally {
      setSubmitting(false);
    }
  }

  // --- 4. OLD: Save & Redirect (kept for backward compatibility) ---
  const handleSaveAndExit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/assessments/${jobId}/submit`, {
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
    } catch (error: any) {
      console.error("Camera toggle error:", error)
      let description = "Failed to access camera. Check browser permissions."

      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        description = "Camera access is blocked. Please allow access in your browser settings (look for the lock/camera icon in the address bar) and then click 'Enable Camera' again."
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        description = "No camera found. Please ensure your camera is connected and try again."
      } else if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
        description = "Camera is already in use by another application. Please close other software and retry."
      }

      toast({
        title: "Camera Access Issue",
        description: description,
        variant: "destructive",
      })
    }
  }
  const handleNext = () => {
    if (currentQIndex < (assessment?.questions?.length || 0) - 1) {
      // Save current code before switching
      setCodeByQuestion(prev => ({ ...prev, [currentQIndex]: code }));
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      // Load code for next question
      const nextCode = codeByQuestion[nextIdx] || assessment?.questions[nextIdx]?.starter_code || "# New question";
      setCode(nextCode);
    }
  }

  const handlePrev = () => {
    if (currentQIndex > 0) {
      // Save current code before switching
      setCodeByQuestion(prev => ({ ...prev, [currentQIndex]: code }));
      const prevIdx = currentQIndex - 1;
      setCurrentQIndex(prevIdx);
      // Load code for previous question
      const prevCode = codeByQuestion[prevIdx] || assessment?.questions[prevIdx]?.starter_code || "# Previous question";
      setCode(prevCode);
    }
  }

  // --- 5. NEW: Submit ALL Questions at Once with Weighted Scoring ---
  const handleSubmitAll = async () => {
    if (!user || !assessment?.questions?.length) {
      alert("Error: Missing user or questions");
      return;
    }

    // Confirm with user
    const confirmed = window.confirm(
      `📝 Submit All ${assessment.questions.length} Questions?\n\n` +
      `This will evaluate all your code submissions at once.\n` +
      `Each question is worth ${(100 / assessment.questions.length).toFixed(1)}% of your final score.\n\n` +
      `Make sure you have completed all questions before submitting.`
    );

    if (!confirmed) return;

    setSubmitting(true);
    setOutput("🔧 Preparing all submissions...");

    try {
      const token = await getToken();

      // Save current code before submitting
      const finalCodeByQuestion = { ...codeByQuestion, [currentQIndex]: code };

      // Build submissions array for all questions
      const submissions = Object.entries(problemIds).map(([idx, problemId]) => ({
        problem_id: problemId,
        code: finalCodeByQuestion[parseInt(idx)] || "",
        language: "python"
      }));

      console.log("[IDE] Submitting all questions:", submissions);

      setOutput(`🔧 Submitting ${submissions.length} questions...\n⏳ Evaluating code...`);

      const response = await fetch(
        `${API_URL}/api/assessments/${jobId}/evaluate-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            candidate_id: user.id,
            job_id: parseInt(jobId as string),
            submissions
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log("[IDE] All questions evaluated:", result);

      // Store evaluation ID
      setEvaluationId(result.evaluation_id);
      sessionStorage.setItem(`eval_all_${jobId}_${user?.id}`, result.evaluation_id);

      // Send anti-cheat logs on completion


      // Build summary output
      let summary = `
═══════════════════════════════════════
      ALL QUESTIONS EVALUATED
═══════════════════════════════════════

📊 OVERALL RESULT:
   Total Score: ${result.total_score}/100
   Verdict: ${result.verdict}
   Questions: ${result.num_questions}

═══════════════════════════════════════
   INDIVIDUAL SCORES
═══════════════════════════════════════
`;

      result.question_results.forEach((qr: any, idx: number) => {
        const icon = qr.verdict === "ACCEPTED" ? "✅" :
          qr.verdict === "PARTIAL_ACCEPTED" ? "⚡" : "❌";
        summary += `
Question ${idx + 1} (${qr.problem_id}):
  ${icon} Score: ${qr.score}/100
  Verdict: ${qr.verdict}
  Tests: ${qr.passed_tests || 0}/${qr.total_tests || 0}
`;
        if (qr.error) {
          summary += `  Error: ${qr.error}\n`;
        }
      });

      summary += `
═══════════════════════════════════════
WEIGHTED AVERAGE: ${result.total_score}/100
═══════════════════════════════════════

✅ All evaluations are now stored in the database.
   You can safely navigate away.
`;

      setOutput(summary.trim());
      setJudgeResults(result);
      setShowResults(true);

      // Removed alert - modal shows all results

    } catch (error) {
      console.error("[IDE] Submit all error:", error);
      setOutput(`❌ Submission error: ${error}`);
      // Removed alert - error shown in output
    } finally {
      setSubmitting(false);
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="font-bold text-lg">{assessment.title}</h2>
          <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> {formatTime(timeLeft)}</Badge>
          {antiCheat.violationCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="w-3 h-3" /> {antiCheat.violationCount} violation{antiCheat.violationCount > 1 ? 's' : ''}
            </Badge>
          )}
          {antiCheat.faceDetectionActive && (
            <>
              {antiCheat.currentFaceCount === 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <Users className="w-3 h-3" /> No Face
                </Badge>
              ) : antiCheat.currentFaceCount === 1 ? (
                <Badge variant="outline" className="gap-1 text-green-500 border-green-500/50">
                  <Users className="w-3 h-3" /> 1 Face
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                  <Users className="w-3 h-3" /> {antiCheat.currentFaceCount} Faces Detected!
                </Badge>
              )}
            </>
          )}

          {/* Gaze Detection Badge */}
          {antiCheat.faceDetectionActive && antiCheat.currentFaceCount === 1 && !antiCheat.isLookingAtScreen && (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> Looking Away!
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
              <><Camera className="w-4 h-4 mr-2" /> Camera ON</>
            ) : (
              <><CameraOff className="w-4 h-4 mr-2" /> Enable Camera</>
            )}
          </Button>

          {/* Fullscreen Mode */}
          {!isFullscreen && (
            <Button variant="outline" size="sm" onClick={enterFullscreen} title="Enter Fullscreen Mode">
              <Maximize className="w-4 h-4 mr-2" /> Fullscreen
            </Button>
          )}

          {/* Run Code - Just execute and show output */}
          <Button variant="secondary" size="sm" onClick={handleRunCode} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Run Code</>}
          </Button>

          {/* Run Sample Tests - Check against test cases */}
          <Button variant="outline" size="sm" onClick={handleRunSampleTests} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Run Tests</>}
          </Button>

          <Button size="sm" onClick={handleFinishTechnical} disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit Q{currentQIndex + 1}</>}
          </Button>

          {/* Submit All Questions - Multi-question weighted scoring */}
          <Button size="sm" onClick={handleSubmitAll} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit All ({Object.keys(problemIds).length})</>}
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
                  <p className="text-4xl font-bold text-blue-600">
                    {judgeResults.total_score || judgeResults.final_score || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">/100</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {judgeResults.num_questions ? 'Questions' : 'Tests Passed'}
                  </p>
                  <p className="text-4xl font-bold text-purple-600">
                    {judgeResults.num_questions || judgeResults.passed_hidden_tests || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {judgeResults.num_questions ? 'submitted' : `/${judgeResults.total_hidden_tests || 0}`}
                  </p>
                </div>
              </div>

              {/* Score Breakdown - Only for single question results */}
              {!judgeResults.num_questions && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Score Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Correctness (Tests Passed)</span>
                      <span className="font-semibold">{(judgeResults?.correctness_points || 0).toFixed(1)}/70</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${((judgeResults?.correctness_points || 0) / 70) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm">Performance (Execution Speed)</span>
                      <span className="font-semibold">{(judgeResults?.performance_points || 0).toFixed(1)}/15</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${((judgeResults?.performance_points || 0) / 15) * 100}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm">Code Quality (No Errors)</span>
                      <span className="font-semibold">{(judgeResults?.quality_points || 0).toFixed(1)}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${((judgeResults?.quality_points || 0) / 10) * 100}%` }}
                      ></div>
                    </div>

                    {(judgeResults?.penalty_points || 0) > 0 && (
                      <>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-sm text-red-600">Penalties (Anti-Cheat)</span>
                          <span className="font-semibold text-red-600">-{(judgeResults?.penalty_points || 0).toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
              {/* Test Cases from Supabase problems table */}
              {testCasesByQuestion[currentQIndex] && testCasesByQuestion[currentQIndex].length > 0 ? (
                <>
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Example Input</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 font-mono text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(testCasesByQuestion[currentQIndex][0]?.input, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Expected Output</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 font-mono text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(testCasesByQuestion[currentQIndex][0]?.expected_output, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Example Input</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 font-mono text-xs">
                      {question.test_input || question.input || "N/A"}
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Expected Output</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 font-mono text-xs">
                      {question.test_output || question.output || "N/A"}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* NAVIGATION BAR */}
          <div className="p-4 border-t flex justify-between bg-card">
            <Button variant="outline" onClick={handlePrev} disabled={currentQIndex === 0}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <Button variant="outline" onClick={handleNext} disabled={currentQIndex === questions.length - 1}>
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL: EDITOR */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                quickSuggestions: false, // Disable suggestions for better performance
                suggestOnTriggerCharacters: false,
                wordBasedSuggestions: "off"
              }}
            />
          </div>
          {/* Console - hide when results modal is open */}
          {!showResults && (
            <div className="h-64 border-t bg-black text-white p-4 font-mono text-sm overflow-y-auto">
              <p className="text-muted-foreground mb-2">// Console / Test Output</p>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}