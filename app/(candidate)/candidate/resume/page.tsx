"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  UploadCloud, FileText, CheckCircle2, Loader2, Mail, Phone, 
  Sparkles, Briefcase, ArrowRight, User 
} from "lucide-react"
import { toast } from "sonner"

export default function ResumePage() {
  const { user } = useUser()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/candidates/${user.id}/resume`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      
      if (res.ok) {
        setParsedData(data.data)
        toast.success("Resume analyzed successfully!")
      } else {
        toast.error(data.detail || "Failed to analyze resume")
      }
    } catch (err) {
      console.error(err)
      toast.error("Server connection failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20 p-6">
      
      {/* HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI Resume Analysis</h1>
        <p className="text-muted-foreground">Upload your CV to unlock personalized job matches.</p>
      </div>

      {/* UPLOAD SECTION */}
      {!parsedData && (
        <Card className={`border-dashed border-2 border-primary/20 bg-secondary/5 hover:bg-secondary/10 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
             <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <UploadCloud className="w-10 h-10 text-primary" />
             </div>
             <div className="text-center space-y-1">
                <p className="text-xl font-medium">Click to Upload Resume</p>
                <p className="text-sm text-muted-foreground">Support for PDF documents</p>
             </div>
             <div className="relative mt-4">
                <Button disabled={isUploading} size="lg" className="gap-2">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {isUploading ? "Analyzing with AI..." : "Select Resume"}
                </Button>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  disabled={isUploading} 
                />
             </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTS SECTION */}
      {parsedData && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-700">
            
            {/* LEFT COLUMN: PROFILE & SKILLS */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* AI Summary Card */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            AI Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {parsedData.summary}
                        </p>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="w-5 h-5 text-primary" />
                            Contact Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-md">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate font-medium">{parsedData.personal.email}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-md">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{parsedData.personal.phone}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Detected Skills */}
                <Card>
                     <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" /> 
                            Detected Skills
                        </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {parsedData.skills.length > 0 ? (
                                parsedData.skills.map((skill: string) => (
                                    <Badge key={skill} variant="secondary" className="px-2 py-1">
                                        {skill}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No specific skills detected.</p>
                            )}
                        </div>
                     </CardContent>
                </Card>
                
                <Button variant="outline" className="w-full" onClick={() => setParsedData(null)}>
                    Upload Different Resume
                </Button>
            </div>

            {/* RIGHT COLUMN: RECOMMENDED JOBS */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary" />
                        Recommended Jobs
                    </h2>
                    <Badge variant="outline" className="text-sm">
                        {parsedData.recommended_jobs.length} Matches Found
                    </Badge>
                </div>

                {parsedData.recommended_jobs.length > 0 ? (
                    <div className="grid gap-4">
                        {parsedData.recommended_jobs.map((job: any) => (
                            <Card key={job.id} className="group hover:border-primary/50 transition-all cursor-pointer hover:shadow-md">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                                                {job.title}
                                            </h3>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">
                                                {job.company} • {job.location}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Badge variant={job.match_score > 75 ? "default" : "secondary"} className={job.match_score > 75 ? "bg-green-600" : ""}>
                                                    {job.match_score}% Match
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                    Matches: {job.matching_skills.join(", ")}
                                                </span>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => router.push(`/candidate/jobs/${job.id}`)}>
                                            Apply <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                        <p className="text-lg font-medium text-muted-foreground">No matching jobs found yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Try updating your resume with more keywords.</p>
                    </div>
                )}
            </div>
         </div>
      )}
    </div>
  )
}