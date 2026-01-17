"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, Play, Save, CheckCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function SandboxPage({ params }: { params: { id: string } }) {
  const [code, setCode] = useState(`function solution(A) {
  // Your code here
  // Given an array A, return the sorted version
  
  return A;
}`)
  const [output, setOutput] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = () => {
    setIsRunning(true)
    // Simulate compilation delay
    setTimeout(() => {
       setIsRunning(false)
       setOutput("Test Case 1: Passed \nTest Case 2: Passed \nTest Case 3: Passed \n\nAll tests passed successfully.")
    }, 1500)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-4">
            <Link href="/candidate/interviews">
               <Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
               <h1 className="font-bold text-lg">Question 1: Array Manipulation</h1>
               <p className="text-xs text-muted-foreground">Time Remaining: 42:30</p>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRun} disabled={isRunning}>
               {isRunning ? "Running..." : <><Play className="w-4 h-4 mr-2" /> Run Code</>}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
               <Save className="w-4 h-4 mr-2" /> Submit
            </Button>
         </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
         
         {/* Left: Problem Description */}
         <Card className="bg-card border-border overflow-y-auto p-6 text-sm leading-relaxed">
            <h2 className="text-lg font-bold mb-4">Problem Description</h2>
            <p className="mb-4">
               Write a function that accepts an array of integers and returns a new array with all duplicates removed, sorted in ascending order.
            </p>
            <h3 className="font-semibold mb-2">Example:</h3>
            <pre className="bg-secondary/50 p-3 rounded-lg font-mono text-xs mb-4">
Input: [4, 2, 2, 8, 4]
Output: [2, 4, 8]
            </pre>
            <h3 className="font-semibold mb-2">Constraints:</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
               <li>Array length will be between 1 and 1000.</li>
               <li>Integers will be between -1,000,000 and 1,000,000.</li>
            </ul>
         </Card>

         {/* Right: Code Editor & Console */}
         <div className="flex flex-col gap-4 h-full">
            {/* Fake Editor */}
            <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-border p-4 font-mono text-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-8 bg-[#252526] flex items-center px-4 text-xs text-[#858585] select-none">
                  main.js
               </div>
               <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-full mt-6 bg-transparent text-[#d4d4d4] resize-none focus:outline-none font-mono"
                  spellCheck={false}
               />
            </div>

            {/* Console Output */}
            <div className="h-40 bg-black rounded-xl border border-border p-4 font-mono text-xs overflow-y-auto">
               <p className="text-muted-foreground mb-2">// Console Output</p>
               {output && (
                  <pre className="text-green-400">{output}</pre>
               )}
            </div>
         </div>

      </div>
    </div>
  )
}