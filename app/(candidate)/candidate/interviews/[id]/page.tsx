"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronLeft, Loader2, Save, CheckCircle, AlertCircle } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import AssessmentTabs from "@/components/candidate/AssessmentTabs" 

const QUESTIONS = [
  { id: "q1", text: "I am always prepared." },
  { id: "q2", text: "I sympathize with others' feelings." },
  { id: "q3", text: "I have excellent ideas." },
  { id: "q4", text: "I get stressed out easily." },
  { id: "q5", text: "I am the life of the party." },
  { id: "q6", text: "I pay attention to details." },
  { id: "q7", text: "I am interested in people." },
  { id: "q8", text: "I am quick to understand things." },
  { id: "q9", text: "I worry about things." },
  { id: "q10", text: "I talk to a lot of different people at parties." }
]

export default function PsychometricPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  const { id } = use(params)
  const jobId = id
  
  // State
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedStatus, setSavedStatus] = useState("Syncing...")
  const [isLoaded, setIsLoaded] = useState(false) // <--- CRITICAL FIX

  // 1. LOAD FROM STORAGE (Only run once)
  useEffect(() => {
    if (!jobId) return

    try {
        const saved = localStorage.getItem(`draft_psy_${jobId}`)
        if (saved) {
            console.log("Found saved answers:", saved)
            setAnswers(JSON.parse(saved))
        }
    } catch (e) {
        console.error("Error loading from storage:", e)
    } finally {
        setIsLoaded(true) // Allow saving only after loading is done
        setSavedStatus("Saved")
    }
  }, [jobId])

  // 2. HANDLE CHANGE & SAVE
  const handleAnswerChange = (qId: string, val: number) => {
    if (!isLoaded) return // Don't save if we haven't loaded yet!

    const newAnswers = { ...answers, [qId]: val }
    setAnswers(newAnswers)
    setSavedStatus("Saving...")
    
    // Save to LocalStorage
    localStorage.setItem(`draft_psy_${jobId}`, JSON.stringify(newAnswers))
    
    setTimeout(() => setSavedStatus("Saved"), 500)
  }

  // 3. SUBMIT
  const submitPsychometric = async () => {
    if (!user) {
        alert("User not found. Please log in.")
        return
    }

    // Validation
    const answeredCount = Object.keys(answers).length
    if (answeredCount < QUESTIONS.length) {
        alert(`You have answered ${answeredCount} of ${QUESTIONS.length} questions.\nPlease complete all questions.`)
        return
    }

    setIsSubmitting(true)
    try {
        console.log("Submitting Payload:", {
            job_id: Number(jobId),
            candidate_id: user.id,
            answers: answers
        })

        const res = await fetch("http://127.0.0.1:8000/api/assessments/psychometric", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                job_id: Number(jobId),
                candidate_id: user.id,
                answers: answers
            })
        })

        if (!res.ok) {
            const errorData = await res.json()
            console.error("Submission Error:", errorData)
            throw new Error(errorData.detail || "Server rejected submission")
        }

        alert("Psychometric Assessment Submitted Successfully!")
        
        // Optional: Clear storage only on success
        localStorage.removeItem(`draft_psy_${jobId}`)
        router.push("/candidate/interviews")

    } catch (e: any) { 
        console.error(e)
        alert(`Submission Failed: ${e.message}`) 
    } 
    finally { 
        setIsSubmitting(false) 
    }
  }

  // Loading State
  if (!isLoaded) return <div className="min-h-screen bg-[#1e1e1e] text-white flex items-center justify-center"><Loader2 className="animate-spin" /> Loading your progress...</div>

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white flex flex-col">
      {/* HEADER */}
      <header className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-[#1e1e1e] sticky top-0 z-10">
         <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={() => router.push('/candidate/interviews')} className="text-gray-400 hover:text-white">
                 <ChevronLeft className="w-4 h-4" /> Exit
             </Button>
         </div>

         <AssessmentTabs jobId={jobId} />

         <div className="flex items-center gap-4 w-[150px] justify-end">
             <span className={`text-xs flex items-center gap-1 transition-colors ${savedStatus === "Saved" ? "text-green-500" : "text-yellow-500"}`}>
                 {savedStatus === "Saved" ? <CheckCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />} 
                 {savedStatus}
             </span>
             <Button size="sm" onClick={submitPsychometric} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Submit
             </Button>
         </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 max-w-3xl mx-auto w-full p-8 pb-20 animate-fade-in">
          <div className="text-center mb-10 space-y-2">
              <h1 className="text-3xl font-bold">Culture Fit Assessment</h1>
              <p className="text-gray-400">Select the option that best describes you.</p>
          </div>

          <div className="space-y-6">
              {QUESTIONS.map((q, index) => (
                  <div key={q.id} className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <p className="text-lg font-medium text-gray-200">
                              <span className="text-purple-400 mr-2">{index + 1}.</span> {q.text}
                          </p>
                          
                          <div className="flex items-center gap-4 bg-black/20 p-2 rounded-full px-4">
                              <span className="text-xs text-gray-500 font-medium">Disagree</span>
                              
                              <RadioGroup 
                                  value={answers[q.id] ? answers[q.id].toString() : ""} 
                                  onValueChange={(val) => handleAnswerChange(q.id, parseInt(val))}
                                  className="flex gap-3"
                              >
                                  {[1, 2, 3, 4, 5].map((val) => (
                                      <div key={val} className="relative group flex items-center justify-center">
                                          <RadioGroupItem 
                                            value={val.toString()} 
                                            id={`${q.id}-${val}`} 
                                            className={`
                                                w-6 h-6 border-2 transition-all cursor-pointer z-10
                                                ${answers[q.id] === val 
                                                    ? "border-purple-500 text-purple-500 scale-110" 
                                                    : "border-gray-600 text-transparent hover:border-gray-400"}
                                            `}
                                          />
                                          {/* Invisible larger click target for better UX */}
                                          <label htmlFor={`${q.id}-${val}`} className="absolute inset-0 w-8 h-8 -ml-1 -mt-1 cursor-pointer" />
                                      </div>
                                  ))}
                              </RadioGroup>
                              
                              <span className="text-xs text-gray-500 font-medium">Agree</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          {/* Validation Error Message Area */}
          {Object.keys(answers).length < QUESTIONS.length && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-6 py-3 rounded-full text-sm flex items-center gap-2 backdrop-blur-md">
                <AlertCircle className="w-4 h-4" />
                {QUESTIONS.length - Object.keys(answers).length} questions remaining
            </div>
          )}

      </div>
    </div>
  )
}