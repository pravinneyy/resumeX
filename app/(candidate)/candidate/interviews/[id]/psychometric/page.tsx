"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, BrainCircuit, Save, CheckCircle2, CloudOff, Camera, CameraOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { MCQQuestion } from "@/components/assessments/mcq-question";
import AssessmentTabs from "@/components/candidate/AssessmentTabs";
import { useEnhancedAntiCheat } from "@/hooks/useEnhancedAntiCheat";
import { useExam } from "@/contexts/ExamContext";

type QuestionType = "slider" | "mcq" | "text";

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: { value: string; label: string }[]; // For MCQ only
  leftLabel?: string;
  rightLabel?: string;
}

// Save status type for UI feedback
type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function PsychometricPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [submitting, setSubmitting] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedAnswersRef = useRef<string>("");

  // Mixed state handling (number for slider, string for others)
  const [answers, setAnswers] = useState<Record<string, any>>({}); // Empty default
  const API_URL = process.env.NEXT_PUBLIC_API_URL 

  const [questions, setQuestions] = useState<Question[]>([]); // Empty default

  // ===== PROCTORING: Anti-Cheat Hook =====
  const [sessionId] = useState(() => `psychometric_${Date.now()}`);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const antiCheat = useEnhancedAntiCheat({
    sessionId,
    enabled: true,
    candidateId: user?.id,
    jobId: jobId ? parseInt(jobId) : undefined,
    maxViolations: 10,
    onViolation: (violation, count) => {
      console.log(`[Psychometric] Violation #${count}:`, violation.type);
      if (count >= 5) {
        toast.error("⚠️ Multiple violations detected", {
          description: "Your activity is being monitored."
        });
      }
    },
  });

  // Initialize camera on mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        setCameraLoading(true);
        await antiCheat.initializeCamera();
        setCameraLoading(false);
      } catch (error: any) {
        console.error("[Psychometric] Camera error:", error);
        setCameraError(error?.message || "Camera access failed");
        setCameraLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initCamera, 500);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      antiCheat.stopCamera();
    };
  }, []);

  // ===== EXAM LOCKDOWN MODE =====
  const { startExam, endExam, isExamActive } = useExam();

  // Activate lockdown mode when page loads
  useEffect(() => {
    if (!loadingProgress && questions.length >= 0 && !isExamActive && jobId) {
      startExam(parseInt(jobId), "psychometric", 1800); // 30 min default
      console.log("[Psychometric] Exam lockdown mode activated");
    }
  }, [loadingProgress, questions, isExamActive, jobId, startExam]);

  // End exam on unmount (when navigating to next section)
  useEffect(() => {
    return () => {
      if (isExamActive) {
        endExam("completed");
      }
    };
  }, [isExamActive, endExam]);

  // Auto-save progress to database
  const saveProgress = useCallback(async (answersToSave: Record<string, any>) => {
    if (!user || !jobId) return;

    const answersJson = JSON.stringify(answersToSave);

    // Skip if nothing changed
    if (answersJson === lastSavedAnswersRef.current) return;

    setSaveStatus("saving");

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/assessments/psychometric/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: Number(jobId),
          candidate_id: user.id,
          answers: answersToSave
        })
      });

      if (res.ok) {
        lastSavedAnswersRef.current = answersJson;
        setSaveStatus("saved");
        console.log("[psychometric] Progress auto-saved");
      } else {
        setSaveStatus("error");
        console.error("[psychometric] Failed to save progress");
      }
    } catch (e) {
      setSaveStatus("error");
      console.error("[psychometric] Error saving progress:", e);
    }
  }, [user, jobId, getToken]);

  // Debounced save - triggers 1 second after last change
  const debouncedSave = useCallback((newAnswers: Record<string, any>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(newAnswers);
    }, 1000); // Save after 1 second of inactivity
  }, [saveProgress]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !jobId) {
        setLoadingProgress(false);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(
          `${API_URL}/api/assessments/psychometric/progress/${jobId}/${user.id}`,
          {
            headers: { "Authorization": `Bearer ${token}` }
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.found && data.answers && Object.keys(data.answers).length > 0) {
            console.log("[psychometric] Loaded saved progress:", data.answers);
            setAnswers(prev => ({ ...prev, ...data.answers }));
            lastSavedAnswersRef.current = JSON.stringify({ ...answers, ...data.answers });
            toast.success("Your previous progress has been restored!", {
              description: "You can continue where you left off.",
              duration: 4000
            });
          }
        }
      } catch (e) {
        console.error("[psychometric] Failed to load progress:", e);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadProgress();
  }, [user, jobId, getToken]);

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = await getToken();
        // Fetch questions assigned to this job (or random fallback from backend)
        const res = await fetch(`${API_URL}/api/assessments/${jobId}/psychometric`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.questions) {
            setQuestions(data.questions);

            // Initialize default values for sliders if not set
            setAnswers(prev => {
              const defaults: Record<string, any> = {};
              data.questions.forEach((q: Question) => {
                if (q.type === 'slider' && prev[q.id] === undefined) {
                  defaults[q.id] = 3; // Default to Neutral
                }
              });
              return { ...prev, ...defaults };
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch psychometric questions", e);
      }
    };
    fetchQuestions();
  }, [getToken, jobId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSliderChange = (id: string, val: number[]) => {
    const newAnswers = { ...answers, [id]: val[0] };
    setAnswers(newAnswers);
    debouncedSave(newAnswers);
  };

  const handleMCQChange = (id: string, val: string) => {
    const newAnswers = { ...answers, [id]: val };
    setAnswers(newAnswers);
    debouncedSave(newAnswers);
  };

  const handleTextChange = (id: string, val: string) => {
    const newAnswers = { ...answers, [id]: val };
    setAnswers(newAnswers);
    debouncedSave(newAnswers);
  };

  const submitPsychometric = async () => {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }
    if (!jobId) {
      toast.error("Missing job ID. Please refresh and try again.");
      return;
    }

    // Validate all fields answered
    const missing = questions.filter(q => {
      if (q.type === 'slider') return false; // Always has value
      const val = answers[q.id];
      return !val || (typeof val === 'string' && val.trim() === '');
    });

    if (missing.length > 0) {
      toast.error(`Please answer all questions. (${missing.length} remaining)`);
      return;
    }

    setSubmitting(true);

    try {
      console.log("[psychometric] Submitting answers for jobId:", jobId, "user:", user?.id, "answers:", answers)
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/assessments/psychometric`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: Number(jobId),
          candidate_id: user.id,
          answers: answers
        }),
      });

      console.log("[psychometric] Response status:", res.status)
      let payload = null
      try { payload = await res.json() } catch (e) { console.warn("[psychometric] No JSON response") }
      console.log("[psychometric] Response payload:", payload)

      if (res.ok) {
        toast.success("Assessment saved! Redirecting to technical questions...");
        await router.push(`/candidate/interviews/${jobId}/technical-text`);
      } else {
        const errMsg = (payload && (payload.detail || payload.message)) || `Status ${res.status}`
        console.error("[psychometric] Save failed:", errMsg)
        toast.error("Failed to save results. Please try again.");
      }
    } catch (err) {
      console.error("[psychometric] Exception while submitting:", err);
      toast.error("Server connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while restoring progress
  if (loadingProgress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 sticky top-0 z-10 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isExamActive) {
              const confirmed = window.confirm("⚠️ You are in an active exam. Are you sure you want to exit? Your progress will be saved.");
              if (!confirmed) return;
              endExam("completed");
            }
            router.push("/candidate/interviews");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Exit
        </Button>

        <AssessmentTabs jobId={jobId as string} />

        <div className="flex items-center gap-3">
          {/* Proctoring Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${antiCheat.cameraActive ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            {cameraLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">Camera...</span>
              </>
            ) : antiCheat.cameraActive ? (
              <>
                <Camera className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Proctored</span>
              </>
            ) : (
              <>
                <CameraOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">No Camera</span>
              </>
            )}
          </div>

          {/* Auto-save Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <CloudOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Error</span>
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <Save className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Auto-save</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full flex-1 space-y-8 animate-fade-in pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-purple-500" />
            Psychometric Assessment
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This assessment helps us understand your working style, decision-making, and communication skills.
          </p>
        </div>

        {/* Empty State - No Questions */}
        {questions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <BrainCircuit className="w-16 h-16 text-muted-foreground/50" />
              <div>
                <h3 className="font-semibold text-lg">No Psychometric Questions Posted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The recruiter hasn't added psychometric questions for this role yet.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push(`/candidate/interviews/${jobId}/technical-text`)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Skip to Technical Questions
                <BrainCircuit className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </span>
                  {q.type === 'slider' && q.text}
                  {q.type !== 'slider' && <span className="text-muted-foreground text-sm font-normal uppercase tracking-wider">{q.type === 'text' ? 'Free Response' : 'Scenario'}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">

                {/* SLIDER RENDERER */}
                {q.type === 'slider' && (
                  <div className="space-y-6 px-2">
                    <Slider
                      value={[answers[q.id]]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={(val) => handleSliderChange(q.id, val)}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      <span>{q.leftLabel || "Strongly Disagree"}</span>
                      <span>Neutral</span>
                      <span>{q.rightLabel || "Strongly Agree"}</span>
                    </div>
                  </div>
                )}

                {/* MCQ RENDERER */}
                {q.type === 'mcq' && q.options && (
                  <MCQQuestion
                    id={q.id}
                    question={q.text}
                    options={q.options}
                    value={answers[q.id]}
                    onChange={(val) => handleMCQChange(q.id, val)}
                    className="bg-transparent border-none p-0"
                  />
                )}

                {/* TEXT RENDERER */}
                {q.type === 'text' && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">{q.text}</Label>
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[q.id]}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>

        {/* FOOTER ACTION */}
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            onClick={submitPsychometric}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Proceed to Technical Questions
                <BrainCircuit className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
