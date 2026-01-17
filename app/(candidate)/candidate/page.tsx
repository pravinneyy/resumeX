"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Briefcase, ArrowRight, TrendingUp, CheckCircle2, Clock, Calendar } from "lucide-react"
import Link from "next/link"

export default function CandidateDashboard() {
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold">Welcome back, Alex</h1>
           <p className="text-muted-foreground">You have 2 active interviews pending action.</p>
        </div>
        <Link href="/candidate/jobs">
           <Button className="bg-primary text-primary-foreground">Find More Jobs</Button>
        </Link>
      </div>

      {/* Main Focus: Interview Progress */}
      <section>
         <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Active Applications
         </h2>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Active Card 1 */}
            <Card className="bg-card border-border border-l-4 border-l-primary">
               <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                     <div>
                        <CardTitle className="text-lg">Senior Frontend Engineer</CardTitle>
                        <CardDescription>TechFlow Systems</CardDescription>
                     </div>
                     <Badge>In Progress</Badge>
                  </div>
               </CardHeader>
               <CardContent>
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Interview Process</span>
                        <span>Step 2 of 4</span>
                     </div>
                     <Progress value={50} className="h-2" />
                     <div className="bg-secondary/30 p-4 rounded-lg flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                              <Clock className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="font-bold text-sm">Technical Assessment</p>
                              <p className="text-xs text-muted-foreground">Due in 2 days</p>
                           </div>
                        </div>
                        <Link href="/candidate/interviews/101">
                           <Button size="sm">Start Test</Button>
                        </Link>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* Active Card 2 */}
            <Card className="bg-card border-border">
               <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                     <div>
                        <CardTitle className="text-lg">Backend Developer</CardTitle>
                        <CardDescription>StartupAI</CardDescription>
                     </div>
                     <Badge variant="secondary">Applied</Badge>
                  </div>
               </CardHeader>
               <CardContent>
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Application Status</span>
                        <span>Under Review</span>
                     </div>
                     <Progress value={20} className="h-2" />
                     <div className="bg-secondary/30 p-4 rounded-lg flex items-center gap-3 mt-4 opacity-70">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                           <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="font-bold text-sm">Awaiting Recruiter</p>
                           <p className="text-xs text-muted-foreground">Estimated response: 3 days</p>
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>

         </div>
      </section>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-secondary/20 border-border">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Briefcase className="w-6 h-6" /></div>
               <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Jobs Applied</p>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-secondary/20 border-border">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-green-500/10 text-green-500 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div>
               <div>
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-xs text-muted-foreground">Interviews Passed</p>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-secondary/20 border-border">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg"><Clock className="w-6 h-6" /></div>
               <div>
                  <p className="text-2xl font-bold">85%</p>
                  <p className="text-xs text-muted-foreground">Profile Completion</p>
               </div>
            </CardContent>
         </Card>
      </section>

    </div>
  )
}