"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Editor from "@monaco-editor/react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Send, ChevronLeft, Loader2, AlertTriangle, Eraser } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useUser } from "@clerk/nextjs"

export default function IDEPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useUser()
  
  // FIX: Unwrap the params Promise using React.use()
  const { id } = use(params)
  const jobId = id 
  
  // State for Editor & Execution
  const [code, setCode] = useState("# Write your solution here\nprint('Hello World')")
  const [language, setLanguage] = useState("python")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // State for Assessment Data
  const [examData, setExamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // 1. Fetch the Exam Problem
  useEffect(() => {
    if (!jobId) return;

    setLoading(true)
    fetch(`http://127.0.0.1:8000/api/jobs/${jobId}/assessment`)
        .then(async (res) => {
            if (!res.ok) throw new Error("Assessment not found")
            return res.json()
        })
        .then(data => {
            if (!data.questions || data.questions.length === 0) {
                setError("This exam has no questions configured.")
            } else {
                setExamData(data)
            }
        })
        .catch(err => {
            console.error(err)
            setError("No assessment found for this job. Recruiter may need to save one.")
        })
        .finally(() => setLoading(false))
  }, [jobId])

  // 2. Run Code (Piston API)
  const runCode = async () => {
    if (!examData) return
    setIsRunning(true)
    setOutput("Running...")
    
    try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: language,
                version: "*",
                files: [{ content: code }],
                stdin: examData.questions[0].test_input || "" 
            })
        })
        const result = await response.json()
        if (result.run) {
            setOutput(result.run.stdout || result.run.stderr)
        } else {
            setOutput("Error executing code.")
        }
    } catch (error) {
        setOutput("Execution failed.")
    } finally {
        setIsRunning(false)
    }
  }

  // 3. Submit Code (Backend API)
  const submitExam = async () => {
    if (!user || !examData) return
    setIsSubmitting(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          candidate_id: user.id,
          code: code,
          language: language
        })
      })

      if (res.ok) {
        alert("Assessment Submitted Successfully!")
        router.push("/candidate/interviews")
      } else {
        alert("Failed to submit. Please try again.")
      }
    } catch (error) {
      console.error(error)
      alert("Network error. Check console.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Loading / Error States ---
  if (loading) {
      return <div className="flex h-screen items-center justify-center bg-[#1e1e1e] text-white"><Loader2 className="animate-spin w-8 h-8" /></div>
  }

  if (error || !examData) {
      return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#1e1e1e] text-white gap-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
            <h2 className="text-xl font-bold">Assessment Unavailable</h2>
            <p className="text-gray-400">{error}</p>
            <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
        </div>
      )
  }

  // Safe access to the first question
  const currentQuestion = examData.questions[0]

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-gray-700 flex items-center justify-between px-4 bg-[#1e1e1e]">
         <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-400 hover:text-white">
                 <ChevronLeft className="w-4 h-4" /> Exit
             </Button>
             <h2 className="font-semibold">{examData.title}</h2>
         </div>
         <div className="flex items-center gap-2">
             <div className="text-sm text-gray-400 mr-4">Time Left: {examData.duration}m</div>
             
             {/* Run Button */}
             <Button size="sm" variant="secondary" onClick={runCode} disabled={isRunning} className="bg-green-600 hover:bg-green-700 text-white border-0">
                 {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} 
                 Run
             </Button>

             {/* Submit Button */}
             <Button size="sm" onClick={submitExam} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} 
                 Submit
             </Button>
         </div>
      </header>

      {/* PANELS */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        
        {/* LEFT: PROBLEM DESCRIPTION */}
        <ResizablePanel defaultSize={40} minSize={30} className="border-r border-gray-700 bg-[#1e1e1e]">
            <div className="h-full overflow-y-auto p-6 prose prose-invert max-w-none">
                <h1 className="text-2xl font-bold mb-4">{currentQuestion.title}</h1>
                <div className="bg-gray-800 p-4 rounded-md mb-6 text-sm">
                   <ReactMarkdown>{currentQuestion.problem_text}</ReactMarkdown>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-2">Example 1</h3>
                <div className="bg-black/50 p-3 rounded-md font-mono text-sm border border-gray-700">
                    <p className="text-gray-400">Input:</p>
                    <div className="text-white mb-2">{currentQuestion.test_input}</div>
                    <p className="text-gray-400">Output:</p>
                    <div className="text-white">{currentQuestion.test_output}</div>
                </div>
            </div>
        </ResizablePanel>
        
        <ResizableHandle className="bg-gray-700" />

        {/* RIGHT: EDITOR & CONSOLE */}
        <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical">
                {/* EDITOR (Top 70%) */}
                <ResizablePanel defaultSize={70} minSize={30} className="bg-[#1e1e1e]">
                    <div className="h-full pt-2">
                        <div className="px-4 pb-2 border-b border-gray-800 flex justify-between items-center">
                             <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="w-[120px] h-8 bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                </ResizablePanel>
                
                {/* DRAG HANDLE */}
                <ResizableHandle withHandle className="bg-gray-700 h-2" />

                {/* CONSOLE (Bottom 30%) */}
                <ResizablePanel defaultSize={30} minSize={10} className="bg-[#1e1e1e] border-t border-gray-700">
                    <div className="h-full flex flex-col">
                        <div className="px-4 py-2 bg-gray-800 text-xs text-gray-400 font-bold uppercase tracking-wider flex justify-between items-center">
                            <span>Console / Test Results</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 text-[10px] text-gray-500 hover:text-white" 
                                onClick={() => setOutput("")}
                            >
                                <Eraser className="w-3 h-3 mr-1"/> Clear
                            </Button>
                        </div>
                        <div className="p-4 font-mono text-sm flex-1 overflow-auto text-gray-300 whitespace-pre-wrap h-full bg-black/40">
                            {output || <span className="text-gray-600 italic">Run your code to see output here...</span>}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  )
}