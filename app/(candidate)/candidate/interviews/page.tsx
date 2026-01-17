"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"

const interviews = [
  {
    id: 101,
    title: "Technical Round: React Proficiency",
    company: "TechFlow Systems",
    duration: "45 mins",
    status: "Pending",
    difficulty: "Hard",
    dueDate: "Expires in 2 days"
  },
  {
    id: 102,
    title: "Algorithmic Thinking",
    company: "StartupAI",
    duration: "60 mins",
    status: "Completed",
    difficulty: "Medium",
    score: "92/100"
  }
]

export default function InterviewsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">My Interviews</h1>
        <p className="text-muted-foreground">Complete these assessments to move forward in the hiring process.</p>
      </div>

      <div className="grid gap-4">
        {interviews.map((interview) => (
          <Card key={interview.id} className="bg-card border-border flex flex-col md:flex-row items-center p-2">
            <div className="flex-1 p-4">
               <div className="flex items-center gap-3 mb-2">
                 <h3 className="font-bold text-lg">{interview.title}</h3>
                 <Badge variant={interview.status === "Pending" ? "default" : "secondary"}>
                    {interview.status}
                 </Badge>
               </div>
               <p className="text-muted-foreground text-sm flex items-center gap-4">
                  <span>{interview.company}</span>
                  <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {interview.duration}</span>
                  <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <span className="text-primary">{interview.difficulty}</span>
               </p>
            </div>
            
            <div className="p-4 flex items-center gap-4 border-t md:border-t-0 md:border-l border-border w-full md:w-auto justify-end">
               {interview.status === "Pending" ? (
                  <div className="text-right">
                     <p className="text-xs text-red-400 mb-2">{interview.dueDate}</p>
                     <Link href={`/candidate/interviews/${interview.id}`}>
                        <Button className="gap-2 w-full md:w-auto shadow-lg shadow-primary/20">
                           <Play className="w-4 h-4" /> Start Test Now
                        </Button>
                     </Link>
                  </div>
               ) : (
                  <div className="flex items-center gap-2 text-green-500 font-medium px-4">
                     <CheckCircle2 className="w-5 h-5" /> Score: {interview.score}
                  </div>
               )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}