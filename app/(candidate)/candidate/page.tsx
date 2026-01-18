"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UploadCloud, FileText, CheckCircle2, Loader2, Mail, Phone, User, Briefcase, GraduationCap, Cpu } from "lucide-react"

export default function ResumePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [error, setError] = useState("")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError("")
    
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://127.0.0.1:5000/api/resume/parse", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        setParsedData(data)
      } else {
        setError(data.message || "Failed to parse resume")
      }
    } catch (err) {
      console.error(err)
      setError("Server connection failed. Is Python running?")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Resume Analysis</h1>
        <p className="text-muted-foreground">Upload your CV to extract experience, education, and skills.</p>
      </div>

      {!parsedData && (
        <Card className={`border-dashed border-2 border-border bg-secondary/10 hover:bg-secondary/20 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
             <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                <UploadCloud className="w-10 h-10 text-primary" />
             </div>
             <div className="text-center">
                <p className="text-lg font-medium">Click to Upload Resume</p>
                <p className="text-sm text-muted-foreground">PDF or DOCX supported</p>
             </div>
             <div className="relative">
                <Button disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                    {isUploading ? "Analyzing..." : "Select File"}
                </Button>
                <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
             </div>
             {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
        </Card>
      )}

      {parsedData && (
         <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-green-500">
               <CheckCircle2 className="w-6 h-6" />
               <div>
                  <h3 className="font-bold">Resume Parsed Successfully</h3>
                  <p className="text-xs opacity-90">Review the extracted data below.</p>
               </div>
               <Button variant="ghost" size="sm" className="ml-auto hover:bg-green-500/20" onClick={() => setParsedData(null)}>Upload New</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-6">
                  <Card className="bg-card border-border">
                     <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Info</CardTitle></CardHeader>
                     <CardContent className="space-y-3 text-sm">
                        <div className="p-3 bg-secondary/50 rounded-lg">
                           <p className="text-xs text-muted-foreground">Full Name</p>
                           <p className="font-bold text-base">{parsedData.personal.name}</p>
                        </div>
                        <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" /><span className="truncate">{parsedData.personal.email}</span></div>
                        <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /><span>{parsedData.personal.phone}</span></div>
                     </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                     <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Skills</CardTitle></CardHeader>
                     <CardContent>
                        {parsedData.skills.length === 0 ? <p className="text-muted-foreground text-sm italic">No skills matched.</p> : (
                           <div className="flex flex-wrap gap-2">
                              {parsedData.skills.map((skill: string) => <Badge key={skill} variant="secondary" className="capitalize">{skill}</Badge>)}
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </div>
               <div className="md:col-span-2 space-y-6">
                  <Card className="bg-card border-border">
                     <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Work Experience</CardTitle></CardHeader>
                     <CardContent>
                        {parsedData.experience && parsedData.experience.length > 0 ? (
                           <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">{parsedData.experience.map((line: string, i: number) => <li key={i}>{line}</li>)}</ul>
                        ) : <div className="p-6 text-center border border-dashed rounded-lg text-muted-foreground">No experience section detected.</div>}
                     </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                     <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Education</CardTitle></CardHeader>
                     <CardContent>
                        {parsedData.education && parsedData.education.length > 0 ? (
                           <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">{parsedData.education.map((line: string, i: number) => <li key={i}>{line}</li>)}</ul>
                        ) : <p className="text-sm text-muted-foreground italic">No education section detected.</p>}
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}