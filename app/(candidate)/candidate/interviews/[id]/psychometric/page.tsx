"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, ArrowLeft, CheckCircle, BrainCircuit, Activity } from "lucide-react";
import { toast } from "sonner"; 
import { cn } from "@/lib/utils"; 

export default function PsychometricPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const jobId = params.id;

  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Initialize with 3 (Neutral)
  const [answers, setAnswers] = useState<Record<string, number>>({
    q1: 3, q2: 3, q3: 3, q4: 3, q5: 3
  });

  const questions = [
    { id: "q1", text: "I prefer working independently rather than in a team environment." },
    { id: "q2", text: "I remain calm and focused even under tight deadlines." },
    { id: "q3", text: "I often suggest improvements to existing processes." },
    { id: "q4", text: "I am willing to put in extra hours to solve critical issues." },
    { id: "q5", text: "Fast delivery is more important than perfect code quality." },
  ];

  const submitPsychometric = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/assessment/psychometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: Number(jobId),
          candidate_id: user.id,
          answers: answers
        }),
      });

      if (res.ok) {
        setCompleted(true);
        setTimeout(() => router.push("/candidate/interviews"), 2000);
      } else {
        toast.error("Failed to save results. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="flex h-[80vh] items-center justify-center animate-fade-in">
        <div className="text-center space-y-6 p-8 rounded-2xl bg-secondary/20 border border-border">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Assessment Saved!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()} 
            className="pl-0 text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2"/> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-purple-500" />
            Culture Fit Assessment
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This assessment helps us understand your working style. There are no right or wrong answers—just be honest!
          </p>
        </div>
        
        {/* Progress Badge */}
        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full border border-border">
          <Activity className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">{questions.length} Questions</span>
          <span className="text-xs text-muted-foreground">| ~2 mins</span>
        </div>
      </div>

      {/* QUESTIONS LIST */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id} className="border-border bg-card/50 hover:bg-card transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                
                {/* Question Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {i+1}
                    </span>
                    <p className="text-lg font-medium text-foreground leading-snug pt-0.5">
                        {q.text}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-center bg-secondary/50 px-3 py-1 rounded-md">
                    <span className="block text-xl font-bold text-primary">{answers[q.id]}</span>
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Rating</span>
                  </div>
                </div>

                {/* Slider Input */}
                <div className="px-2 pt-2">
                    <Slider
                      defaultValue={[3]} 
                      max={5} 
                      min={1} 
                      step={1} 
                      className="py-4 cursor-pointer"
                      onValueChange={(val) => setAnswers(prev => ({...prev, [q.id]: val[0]}))}
                    />
                    <div className="flex justify-between mt-2 text-xs font-medium text-muted-foreground select-none">
                        <span className="hover:text-red-400 transition-colors">Strongly Disagree</span>
                        <span className="hover:text-foreground transition-colors">Neutral</span>
                        <span className="hover:text-green-400 transition-colors">Strongly Agree</span>
                    </div>
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SUBMIT FOOTER */}
      <div className="flex flex-col items-center gap-4 pt-4 pb-10">
        <Button 
            onClick={submitPsychometric} 
            disabled={submitting} 
            size="lg"
            className="w-full md:w-1/3 h-12 text-lg font-semibold shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
        >
            {submitting ? (
                <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5"/> Saving...
                </>
            ) : (
                <>
                    Submit Assessment <Save className="ml-2 h-5 w-5 opacity-70"/>
                </>
            )} 
        </Button>
        <p className="text-xs text-muted-foreground">
            Your responses are confidential and used solely for matching purposes.
        </p>
      </div>

    </div>
  );
}