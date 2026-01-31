"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, Save, Clock, Code2, BrainCircuit, Loader2 } from "lucide-react"

// If you have a Checkbox component, import it. Otherwise, we use standard input below.
// import { Checkbox } from "@/components/ui/checkbox" 

interface Question {
  id: number
  title: string
  problem_text: string
  test_input: string
  test_output: string
  points: number
}

interface Problem {
  problem_id: string
  title: string
  description: string
  difficulty: string
}

const AVAILABLE_TRAITS = [
    { id: "conscientiousness", label: "Hardworking & Organized", desc: "Disciplined, goal-oriented, and reliable." },
    { id: "agreeableness", label: "Team Player & Cooperative", desc: "Compassionate, cooperative, and good for teams." },
    { id: "openness", label: "Creative & Curious", desc: "Inventive, curious, and open to new ideas." },
    { id: "extraversion", label: "Outgoing & Leader", desc: "Energetic, assertive, and sociable." },
    { id: "neuroticism", label: "Calm Under Pressure", desc: "Resilient and stable (Low Neuroticism)." }
]

export default function CreateAssessmentPage() {
  const { jobId } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Exam Meta Data
  const [examTitle, setExamTitle] = useState("")
  const [examDuration, setExamDuration] = useState(60) // minutes
  
  // NEW: State for Trait Selection
  const [traits, setTraits] = useState<string[]>([])

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), title: "", problem_text: "", test_input: "", test_output: "", points: 10 }
  ])

  // Dialog State for Add Question
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [existingProblems, setExistingProblems] = useState<Problem[]>([])
  const [problemsLoading, setProblemsLoading] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newProblem, setNewProblem] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    function_signature: "",
    language: "python"
  })

  // Fetch existing problems when dialog opens
  useEffect(() => {
    if (showAddDialog && existingProblems.length === 0) {
      fetchProblems()
    }
  }, [showAddDialog])

  // Handlers
  const fetchProblems = async () => {
    setProblemsLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/problems")
      if (res.ok) {
        const data = await res.json()
        setExistingProblems(data.problems || [])
      }
    } catch (error) {
      console.error("Failed to fetch problems:", error)
    } finally {
      setProblemsLoading(false)
    }
  }

  const addExistingProblem = (problem: Problem) => {
    const newQuestion: Question = {
      id: Date.now(),
      title: problem.title,
      problem_text: problem.description,
      test_input: "",
      test_output: "",
      points: 10
    }
    setQuestions([...questions, newQuestion])
    setShowAddDialog(false)
    setShowCreateNew(false)
  }

  const createNewProblem = async () => {
    if (!newProblem.title || !newProblem.description) {
      alert("Please fill in title and description")
      return
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/problems/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProblem)
      })

      if (res.ok) {
        const created = await res.json()
        alert("Problem created successfully!")
        addExistingProblem(created.problem)
        setNewProblem({
          title: "",
          description: "",
          difficulty: "easy",
          function_signature: "",
          language: "python"
        })
        setShowCreateNew(false)
      } else {
        alert("Failed to create problem")
      }
    } catch (error) {
      console.error("Error creating problem:", error)
      alert("Error creating problem")
    }
  }

  const addQuestion = () => {
    setShowAddDialog(true)
  }

  const removeQuestion = (id: number) => {
    if (questions.length === 1) return
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const toggleTrait = (traitId: string) => {
      if (traits.includes(traitId)) {
          setTraits(traits.filter(t => t !== traitId))
      } else {
          setTraits([...traits, traitId])
      }
  }

  const handlePublish = async () => {
    setLoading(true)
    const payload = {
        job_id: Number(jobId), // Ensure number
        title: examTitle,
        duration_minutes: examDuration,
        questions: questions,
        preferred_traits: traits // <--- SENDING TRAITS TO BACKEND
    }

    try {
        console.log("Publishing Assessment:", payload)
        
        // --- REAL API CALL ---
        const res = await fetch("http://127.0.0.1:8000/api/assessments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }) 
        
        if (!res.ok) {
            const err = await res.json()
            console.error(err)
            throw new Error("Failed to save")
        }

        alert("Assessment & Culture Preferences Saved!")
        router.push(`/recruiter/jobs/${jobId}`)

    } catch (error) {
        console.error(error)
        alert("Error publishing assessment")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-fade-in pb-20">
      
      {/* Dialog: Add Question from Existing or Create New */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question to Assessment</DialogTitle>
            <DialogDescription>
              Select from existing problems or create a new one
            </DialogDescription>
          </DialogHeader>

          {!showCreateNew ? (
            <div className="space-y-4">
              {/* Existing Problems List */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Existing Problems
                </h3>
                
                {problemsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : existingProblems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No problems found</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {existingProblems.map((problem) => (
                      <div key={problem.problem_id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{problem.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{problem.description}</p>
                            <div className="flex gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                problem.difficulty === "easy" ? "bg-green-500/20 text-green-700" :
                                problem.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-700" :
                                "bg-red-500/20 text-red-700"
                              }`}>
                                {problem.difficulty}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => addExistingProblem(problem)}>
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Button */}
              <div className="border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateNew(true)} 
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" /> Create New Problem
                </Button>
              </div>
            </div>
          ) : (
            /* Create New Problem Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Problem Title</Label>
                <Input 
                  value={newProblem.title}
                  onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                  placeholder="e.g. Find Duplicate Number"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  className="min-h-[100px]"
                  value={newProblem.description}
                  onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                  placeholder="Explain the problem..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select 
                    value={newProblem.difficulty}
                    onChange={(e) => setNewProblem({...newProblem, difficulty: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 bg-background"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <select 
                    value={newProblem.language}
                    onChange={(e) => setNewProblem({...newProblem, language: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 bg-background"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Function Signature (Optional)</Label>
                <Input 
                  value={newProblem.function_signature}
                  onChange={(e) => setNewProblem({...newProblem, function_signature: e.target.value})}
                  placeholder="e.g. def solution(nums):"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowCreateNew(false)}>
                  Back
                </Button>
                <Button onClick={createNewProblem}>
                  Create Problem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Create Assessment</h1>
                <p className="text-muted-foreground">Setup the coding challenge & culture fit for Job ID: {jobId}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handlePublish} disabled={loading} className="gap-2">
                <Save className="w-4 h-4" /> {loading ? "Publishing..." : "Publish Exam"}
            </Button>
        </div>
      </div>

      {/* 1. General Settings & Culture Fit */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> General Configuration</CardTitle>
            <CardDescription>Set the basic rules and culture preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Assessment Title</Label>
                    <Input 
                        value={examTitle} 
                        onChange={(e) => setExamTitle(e.target.value)} 
                        placeholder="e.g. Frontend Technical Round 1" 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Total Duration (Minutes)</Label>
                    <Input 
                        type="number" 
                        value={examDuration} 
                        onChange={(e) => setExamDuration(parseInt(e.target.value))} 
                    />
                </div>
            </div>

            {/* --- NEW: CULTURE FIT SECTION --- */}
            <div className="pt-4 border-t">
                <div className="mb-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-purple-400" />
                        Culture Fit Preferences
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Select the personality traits that matter most for this role. The AI will score candidates based on these choices.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {AVAILABLE_TRAITS.map((trait) => (
                        <div 
                            key={trait.id}
                            onClick={() => toggleTrait(trait.id)}
                            className={`
                                cursor-pointer border rounded-lg p-3 transition-all select-none
                                ${traits.includes(trait.id) 
                                    ? "bg-purple-500/10 border-purple-500 ring-1 ring-purple-500" 
                                    : "bg-card border-border hover:border-gray-500"}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                {/* Custom Checkbox Look */}
                                <div className={`
                                    w-5 h-5 rounded border flex items-center justify-center
                                    ${traits.includes(trait.id) ? "bg-purple-600 border-purple-600" : "border-gray-500"}
                                `}>
                                    {traits.includes(trait.id) && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${traits.includes(trait.id) ? "text-purple-400" : "text-foreground"}`}>
                                        {trait.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                        {trait.desc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* -------------------------------- */}

        </CardContent>
      </Card>

      <div className="border-t my-8" />

      {/* 2. Questions Builder */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <Code2 className="w-5 h-5" /> Technical Questions ({questions.length})
            </h2>
            <Button onClick={addQuestion} variant="outline" className="gap-2 border-dashed">
                <Plus className="w-4 h-4" /> Add Question
            </Button>
        </div>

        {questions.map((q, index) => (
            <Card key={q.id} className="relative group transition-all hover:border-primary/50">
                <CardHeader className="bg-muted/20 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Question #{index + 1}</CardTitle>
                        {questions.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 space-y-2">
                            <Label>Problem Title</Label>
                            <Input 
                                value={q.title} 
                                onChange={(e) => updateQuestion(q.id, 'title', e.target.value)} 
                                placeholder="e.g. Reverse a String" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Points</Label>
                            <Input 
                                type="number" 
                                value={q.points} 
                                onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value))} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Problem Description (Supports Markdown)</Label>
                        <Textarea 
                            className="min-h-[120px] font-mono text-sm"
                            value={q.problem_text} 
                            onChange={(e) => updateQuestion(q.id, 'problem_text', e.target.value)} 
                            placeholder="Explain the problem statement clearly..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sample Input</Label>
                            <div className="bg-muted/30 p-2 rounded-md border">
                                <Textarea 
                                    className="border-0 bg-transparent shadow-none font-mono text-xs focus-visible:ring-0 min-h-[80px]"
                                    value={q.test_input} 
                                    onChange={(e) => updateQuestion(q.id, 'test_input', e.target.value)} 
                                    placeholder={`"hello world"`}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Expected Output</Label>
                            <div className="bg-muted/30 p-2 rounded-md border">
                                <Textarea 
                                    className="border-0 bg-transparent shadow-none font-mono text-xs focus-visible:ring-0 min-h-[80px]"
                                    value={q.test_output} 
                                    onChange={(e) => updateQuestion(q.id, 'test_output', e.target.value)} 
                                    placeholder={`"dlrow olleh"`}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
        
        <Button onClick={addQuestion} variant="outline" className="w-full py-8 border-dashed gap-2 text-muted-foreground hover:text-primary">
            <Plus className="w-6 h-6" /> Add Another Question
        </Button>
      </div>
    </div>
  )
}