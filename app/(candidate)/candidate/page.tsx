"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Briefcase, 
  BarChart2, 
  BookOpen, 
  ArrowRight, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Search,
  Zap,
  MapPin,
  Building2
} from "lucide-react"

// Mock Data matching the structure of Recruiter Data
const statsData = [
  { label: "Jobs Applied", value: "24", icon: Briefcase, change: "+4 this week", trend: "up" },
  { label: "Interviews", value: "3", icon: CheckCircle2, change: "1 Scheduled", trend: "neutral" },
  { label: "Profile Views", value: "142", icon: Search, change: "+12% from last month", trend: "up" },
]

const recommendedJobs = [
  { title: "Senior Frontend Engineer", company: "TechCorp", type: "Remote", salary: "$140k", match: 95 },
  { title: "Product Designer", company: "Studio X", type: "New York", salary: "$125k", match: 88 },
  { title: "Full Stack Developer", company: "StartupInc", type: "Hybrid", salary: "$130k", match: 82 },
]

const practiceTests = [
  { name: "React Assessment", level: "Advanced", time: "45 min", score: "92/100", status: "Completed" },
  { name: "System Design", level: "Intermediate", time: "60 min", score: "--", status: "Start" },
  { name: "JavaScript Core", level: "Expert", time: "30 min", score: "--", status: "Start" },
]

export default function CandidateDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Page Header (Matches Recruiter Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your job search progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Clock className="w-4 h-4" />
            History
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Search className="w-4 h-4" />
            Find Jobs
          </Button>
        </div>
      </div>

      {/* 2. Stats Row (Exact replica of Recruiter Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsData.map((stat, index) => (
          <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {stat.trend === "up" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-500" />
                )}
                <span className={`text-xs font-medium ${stat.trend === "up" ? "text-green-500" : "text-yellow-500"}`}>
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Job Opportunities (Matches "Candidate Results" style) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Job Opportunities</CardTitle>
                <CardDescription>Recommended based on your profile</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedJobs.map((job, i) => (
                <div key={i} className="group p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {job.company.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {job.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {job.company}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {job.type}</span>
                          <span className="text-primary font-medium">{job.salary}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={job.match > 90 ? "default" : "secondary"} className={job.match > 90 ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" : ""}>
                      {job.match}% Match
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                     <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs text-muted-foreground">Remote</Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">Full-time</Badge>
                     </div>
                     <Button size="sm" variant="ghost" className="gap-1 h-8 text-xs hover:text-primary">
                        Apply Now <ArrowRight className="w-3 h-3" />
                     </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chart Section (Matches "Candidate Performance" style) */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Look Where You Stand</CardTitle>
              <CardDescription>Your skills compared to market average</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full flex items-end justify-between gap-2 px-2">
                 {[40, 65, 45, 80, 55, 90, 60, 75].map((h, i) => (
                   <div key={i} className="relative w-full group">
                      <div 
                        className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary transition-all duration-500"
                        style={{ height: `${h}%` }}
                      />
                   </div>
                 ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-muted-foreground px-2">
                 <span>React</span>
                 <span>Node</span>
                 <span>TS</span>
                 <span>System</span>
                 <span>UI/UX</span>
                 <span>API</span>
                 <span>DB</span>
                 <span>Cloud</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width) - Practice Tests (Matches "Top Candidates" style) */}
        <div className="space-y-6">
          <Card className="bg-card border-border h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Test Yourself
              </CardTitle>
              <CardDescription>Recommended assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
               {practiceTests.map((test, index) => (
                 <div key={index} className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                       {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-medium text-sm truncate">{test.name}</h4>
                       <p className="text-xs text-muted-foreground">{test.level} • {test.time}</p>
                    </div>
                    {test.status === "Completed" ? (
                       <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                          {test.score}
                       </Badge>
                    ) : (
                       <Button size="icon" variant="ghost" className="h-8 w-8">
                          <ArrowRight className="w-4 h-4" />
                       </Button>
                    )}
                 </div>
               ))}
               <div className="p-4">
                  <Button variant="outline" className="w-full text-xs">View All Tests</Button>
               </div>
            </CardContent>
          </Card>

          {/* Bonus Widget: Profile Completeness */}
          <Card className="bg-gradient-to-br from-primary/20 to-card border-border">
            <CardContent className="p-6 text-center space-y-4">
               <div className="mx-auto h-16 w-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">85%</span>
               </div>
               <div>
                  <h4 className="font-bold">Profile Incomplete</h4>
                  <p className="text-xs text-muted-foreground mt-1">Add your certifications to reach 100% and appear in more searches.</p>
               </div>
               <Button size="sm" className="w-full">Complete Profile</Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}