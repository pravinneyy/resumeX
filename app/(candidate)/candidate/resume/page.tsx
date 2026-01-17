"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function ResumePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [parsedData, setParsedData] = useState<boolean>(false)

  const handleUpload = () => {
    setIsUploading(true)
    // Simulate upload and python parsing
    let progress = 0
    const interval = setInterval(() => {
       progress += 10
       setUploadProgress(progress)
       if (progress >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          setParsedData(true)
       }
    }, 300)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Resume Analysis</h1>
        <p className="text-muted-foreground">Upload your CV to let our AI extract your skills and match you with jobs.</p>
      </div>

      {/* Upload Area */}
      {!parsedData && (
        <Card className="border-dashed border-2 border-border bg-secondary/10 hover:bg-secondary/20 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
             <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                <UploadCloud className="w-10 h-10 text-primary" />
             </div>
             <div className="text-center">
                <p className="text-lg font-medium">Drag & drop your resume here</p>
                <p className="text-sm text-muted-foreground">PDF or DOCX up to 10MB</p>
             </div>
             
             {isUploading ? (
                <div className="w-full max-w-xs space-y-2">
                   <Progress value={uploadProgress} className="h-2" />
                   <p className="text-xs text-center text-muted-foreground">Analyzing with AI...</p>
                </div>
             ) : (
                <Button onClick={handleUpload} className="mt-2">Select File</Button>
             )}
          </CardContent>
        </Card>
      )}

      {/* Results View (After "Parsing") */}
      {parsedData && (
         <div className="space-y-6">
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-green-500">
               <CheckCircle2 className="w-6 h-6" />
               <div>
                  <h3 className="font-bold">Resume Parsed Successfully</h3>
                  <p className="text-xs opacity-90">Our AI has extracted the following profile data.</p>
               </div>
               <Button variant="ghost" size="sm" className="ml-auto hover:bg-green-500/20" onClick={() => setParsedData(false)}>Upload New</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Extracted Skills</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                     {["Python", "React", "Next.js", "TypeScript", "Machine Learning", "Data Analysis", "SQL"].map(skill => (
                        <span key={skill} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                           {skill}
                        </span>
                     ))}
                  </CardContent>
               </Card>

               <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Experience Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex gap-4">
                        <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center font-bold text-muted-foreground">G</div>
                        <div>
                           <h4 className="font-bold">Senior Engineer</h4>
                           <p className="text-sm text-muted-foreground">Google • 2020 - Present</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center font-bold text-muted-foreground">A</div>
                        <div>
                           <h4 className="font-bold">Software Developer</h4>
                           <p className="text-sm text-muted-foreground">Amazon • 2018 - 2020</p>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>
      )}
    </div>
  )
}