"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Sparkles, FileText, Download, Eye, Plus, X, Github, Linkedin,
    GraduationCap, Code2, Wrench, User, Mail, Phone, MapPin,
    AlertTriangle, CheckCircle2, Loader2, RefreshCw, Palette,
    Building2, BookOpen, Zap, Minimize2, FlaskConical, Users, Heart,
    Briefcase, Trash2
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL;
// ===== PREDEFINED SKILL OPTIONS =====
const SKILL_OPTIONS = [
    "Problem Solving", "Team Collaboration", "Communication", "Leadership",
    "Project Management", "Agile/Scrum", "Data Analysis", "Research",
    "Critical Thinking", "Public Speaking", "Technical Writing", "Adaptability"
]

const PROGRAMMING_LANGUAGES = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "R", "Scala", "Dart", "SQL"
]

const TOOLS_OPTIONS = [
    "Git", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux",
    "VS Code", "React", "Node.js", "Django", "Flask", "FastAPI",
    "TensorFlow", "PyTorch", "MongoDB", "PostgreSQL", "Redis", "Figma"
]

// ===== RESUME STYLES =====
const RESUME_STYLES = [
    {
        id: "academic",
        name: "Academic / Research",
        description: "Formal, scholarly tone for university or research roles",
        icon: BookOpen,
        color: "from-blue-500/20 to-blue-600/20",
        borderColor: "border-blue-500"
    },
    {
        id: "industry",
        name: "Industry / Corporate",
        description: "Professional, results-oriented for business roles",
        icon: Building2,
        color: "from-slate-500/20 to-slate-600/20",
        borderColor: "border-slate-500"
    },
    {
        id: "technical",
        name: "Technical / ATS",
        description: "Keyword-rich, optimized for engineering roles",
        icon: Code2,
        color: "from-green-500/20 to-green-600/20",
        borderColor: "border-green-500"
    },
    {
        id: "minimal",
        name: "Minimal / Clean",
        description: "Concise, elegant prose with maximum impact",
        icon: Minimize2,
        color: "from-gray-400/20 to-gray-500/20",
        borderColor: "border-gray-400"
    },
    {
        id: "creative",
        name: "Creative / Startup",
        description: "Energetic, modern tone for startups and creative roles",
        icon: Zap,
        color: "from-purple-500/20 to-pink-500/20",
        borderColor: "border-purple-500"
    }
]

interface Education {
    institution: string
    degree: string
    year: string
}

interface Research {
    title: string
    role: string
    institution: string
    year: string
    description: string
}

interface Reference {
    name: string
    title: string
    department: string
    institution: string
    email: string
}

interface GitHubRepo {
    name: string
    description: string
    language: string
    url: string
    stars: number
    year: string
}

interface CustomProject {
    title: string
    description: string
    technologies: string
    year: string
}

interface WorkExperience {
    company: string
    role: string
    type: string // "Full-time" | "Internship" | "Part-time" | "Contract"
    startDate: string
    endDate: string
    description: string
}

interface ResumeData {
    name: string
    email: string
    phone: string | null
    location: string | null
    github: string | null
    linkedin: string | null
    summary: string | null
    skills: string[]
    projects: Array<{
        title: string
        description: string
        tech: string
        year: string | null
    }>
    research: Array<{
        title: string
        role: string
        institution: string
        year: string
        description: string
    }>
    education: Array<{
        institution: string
        degree: string
        year: string
    }>
    references: Array<{
        name: string
        title: string
        department: string
        institution: string
        email: string
    }>
    hobbies: string[]
}

export default function AIResumePage() {
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()

    // Form state
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [location, setLocation] = useState("")
    const [aboutMe, setAboutMe] = useState("")

    // Skills state
    const [selectedSkills, setSelectedSkills] = useState<string[]>([])
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
    const [selectedTools, setSelectedTools] = useState<string[]>([])

    // GitHub state
    const [githubUsername, setGithubUsername] = useState("")
    const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
    const [selectedRepos, setSelectedRepos] = useState<string[]>([])
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [reposError, setReposError] = useState("")

    // Custom Projects state (non-GitHub projects)
    const [customProjects, setCustomProjects] = useState<CustomProject[]>([
        { title: "", description: "", technologies: "", year: "" }
    ])

    // LinkedIn state
    const [linkedin, setLinkedin] = useState("")

    // Education state
    const [educationList, setEducationList] = useState<Education[]>([
        { institution: "", degree: "", year: "" }
    ])

    // Work Experience state
    const [workExperienceList, setWorkExperienceList] = useState<WorkExperience[]>([
        { company: "", role: "", type: "Internship", startDate: "", endDate: "", description: "" }
    ])

    // Years of Experience state
    const [yearsOfExperience, setYearsOfExperience] = useState<string>("fresher")

    // Research state
    const [researchList, setResearchList] = useState<Research[]>([
        { title: "", role: "", institution: "", year: "", description: "" }
    ])

    // References state
    const [referencesList, setReferencesList] = useState<Reference[]>([
        { name: "", title: "", department: "", institution: "", email: "" }
    ])

    // Hobbies state
    const [hobbies, setHobbies] = useState("")

    // Style state (replaces template)
    const [selectedStyle, setSelectedStyle] = useState("technical")

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState<ResumeData | null>(null)
    const [htmlContent, setHtmlContent] = useState("")
    const [activeTab, setActiveTab] = useState("form")
    const [isCompilingPdf, setIsCompilingPdf] = useState(false)
    const [error, setError] = useState("")

    // Pre-fill user data from Clerk
    useEffect(() => {
        if (user && isLoaded) {
            setName(user.fullName || "")
            setEmail(user.emailAddresses[0]?.emailAddress || "")
        }
    }, [user, isLoaded])

    // Fetch GitHub repos
    const fetchGitHubRepos = useCallback(async () => {
        if (!githubUsername.trim()) return

        setLoadingRepos(true)
        setReposError("")
        setGithubRepos([])

        try {
            const token = await getToken()
            const res = await fetch(`${API_URL}/api/resume-generator/github-repos/${githubUsername}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const data = await res.json()

            if (data.success && data.repos) {
                setGithubRepos(data.repos)
            } else {
                setReposError(data.error || "Failed to fetch repos")
            }
        } catch (e) {
            setReposError("Failed to connect to server")
        } finally {
            setLoadingRepos(false)
        }
    }, [githubUsername])

    // Toggle functions
    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        )
    }

    const toggleLanguage = (lang: string) => {
        setSelectedLanguages(prev =>
            prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
        )
    }

    const toggleTool = (tool: string) => {
        setSelectedTools(prev =>
            prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
        )
    }

    const toggleRepo = (repoUrl: string) => {
        setSelectedRepos(prev =>
            prev.includes(repoUrl) ? prev.filter(r => r !== repoUrl) : [...prev, repoUrl]
        )
    }

    // Education functions
    const addEducation = () => {
        setEducationList([...educationList, { institution: "", degree: "", year: "" }])
    }

    const removeEducation = (index: number) => {
        if (educationList.length > 1) {
            setEducationList(educationList.filter((_, i) => i !== index))
        }
    }

    const updateEducation = (index: number, field: keyof Education, value: string) => {
        const updated = [...educationList]
        updated[index][field] = value
        setEducationList(updated)
    }

    // Work Experience functions
    const addWorkExperience = () => {
        setWorkExperienceList([...workExperienceList, { company: "", role: "", type: "Internship", startDate: "", endDate: "", description: "" }])
    }

    const removeWorkExperience = (index: number) => {
        if (workExperienceList.length > 1) {
            setWorkExperienceList(workExperienceList.filter((_, i) => i !== index))
        }
    }

    const updateWorkExperience = (index: number, field: keyof WorkExperience, value: string) => {
        const updated = [...workExperienceList]
        updated[index][field] = value
        setWorkExperienceList(updated)
    }

    // Research functions
    const addResearch = () => {
        setResearchList([...researchList, { title: "", role: "", institution: "", year: "", description: "" }])
    }

    const removeResearch = (index: number) => {
        if (researchList.length > 1) {
            setResearchList(researchList.filter((_, i) => i !== index))
        }
    }

    const updateResearch = (index: number, field: keyof Research, value: string) => {
        const updated = [...researchList]
        updated[index][field] = value
        setResearchList(updated)
    }

    // Reference functions
    const addReference = () => {
        setReferencesList([...referencesList, { name: "", title: "", department: "", institution: "", email: "" }])
    }

    const removeReference = (index: number) => {
        if (referencesList.length > 1) {
            setReferencesList(referencesList.filter((_, i) => i !== index))
        }
    }

    const updateReference = (index: number, field: keyof Reference, value: string) => {
        const updated = [...referencesList]
        updated[index][field] = value
        setReferencesList(updated)
    }

    // Custom Project functions
    const addCustomProject = () => {
        setCustomProjects([...customProjects, { title: "", description: "", technologies: "", year: "" }])
    }

    const removeCustomProject = (index: number) => {
        if (customProjects.length > 1) {
            setCustomProjects(customProjects.filter((_, i) => i !== index))
        }
    }

    const updateCustomProject = (index: number, field: keyof CustomProject, value: string) => {
        const updated = [...customProjects]
        updated[index][field] = value
        setCustomProjects(updated)
    }

    // Generate Resume with style-based rewriting
    const handleGenerate = async () => {
        if (!name.trim()) {
            setError("Please enter your name")
            return
        }
        if (!email.trim() || !email.includes("@")) {
            setError("Please enter a valid email")
            return
        }

        setError("")
        setIsGenerating(true)

        try {
            const token = await getToken()

            const requestBody = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                location: location.trim() || null,
                about_me: aboutMe.trim() || null,
                skills: selectedSkills,
                programming_languages: selectedLanguages,
                tools: selectedTools,
                github_username: githubUsername.trim() || null,
                github_repos: selectedRepos,
                custom_projects: customProjects.filter(p => p.title.trim() || p.description.trim()),
                linkedin: linkedin.trim() || null,
                education: educationList.filter(e => e.institution.trim() || e.degree.trim()),
                work_experience: workExperienceList.filter(w => w.company.trim() || w.role.trim()),
                years_of_experience: yearsOfExperience,
                research: researchList.filter(r => r.title.trim() || r.description.trim()),
                references: referencesList.filter(ref => ref.name.trim() || ref.email.trim()),
                hobbies: hobbies.trim() ? hobbies.split(',').map(h => h.trim()).filter(h => h) : [],
                style_id: selectedStyle
            }

            console.log("[AI-Resume] Sending request body:", requestBody)

            const res = await fetch("${API_URL}/api/resume-generator/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            })

            const data = await res.json()

            if (data.success) {
                setGeneratedResume(data.resume_data)
                setHtmlContent(data.html_content || "")
                setActiveTab("preview")
            } else {
                setError(data.error || "Failed to generate resume")
            }
        } catch (e) {
            setError("Failed to connect to server")
        } finally {
            setIsGenerating(false)
        }
    }

    // Download PDF
    const handleDownloadPdf = async () => {
        if (!htmlContent) {
            setError("No HTML content to compile")
            return
        }

        setIsCompilingPdf(true)
        setError("")

        try {
            const token = await getToken()

            const res = await fetch(`${API_URL}/api/resume-generator/compile-pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ html_content: htmlContent })
            })

            const data = await res.json()

            if (data.success && data.pdf_base64) {
                const byteCharacters = atob(data.pdf_base64)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: 'application/pdf' })

                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${name.replace(/\s+/g, '_')}_Resume.pdf`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            } else {
                setError(data.error || "PDF compilation not available. Try downloading HTML.")
            }
        } catch (e) {
            setError("PDF compilation failed. Try downloading HTML instead.")
        } finally {
            setIsCompilingPdf(false)
        }
    }

    // Download HTML
    const downloadHtml = () => {
        if (!htmlContent) return

        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name.replace(/\s+/g, '_')}_Resume.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">AI Resume Generator</h1>
                            <p className="text-muted-foreground">Create a professional, ATS-friendly resume</p>
                        </div>
                    </div>

                    {/* Quick Guide */}
                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm font-medium text-primary mb-2">📋 Quick Guide</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li><strong>Choose a style</strong> — Academic, Industry, Technical, Minimal, or Creative</li>
                            <li><strong>Fill your details</strong> — Add personal info, skills, projects & education</li>
                            <li><strong>Add projects</strong> — Connect GitHub or add custom projects manually</li>
                            <li><strong>Generate</strong> — AI will polish your content in your chosen style</li>
                            <li><strong>Download</strong> — Get your resume as PDF or HTML</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-96">
                    <TabsTrigger value="form" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Build Resume
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2" disabled={!generatedResume}>
                        <Eye className="w-4 h-4" />
                        Preview
                    </TabsTrigger>
                </TabsList>

                {/* Build Form Tab */}
                <TabsContent value="form" className="space-y-6">
                    {/* Style Selection - NEW */}
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="w-5 h-5 text-primary" />
                                Resume Style
                            </CardTitle>
                            <CardDescription>
                                Choose how the AI will rewrite your content. Style affects <strong>language and tone only</strong>, not facts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {RESUME_STYLES.map((style) => {
                                    const IconComponent = style.icon
                                    const isSelected = selectedStyle === style.id

                                    return (
                                        <div
                                            key={style.id}
                                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${isSelected
                                                ? `${style.borderColor} bg-gradient-to-br ${style.color} ring-2 ring-primary/30`
                                                : 'border-border hover:border-primary/40'
                                                }`}
                                            onClick={() => setSelectedStyle(style.id)}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                            <div className="flex items-start gap-3">
                                                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${style.color} flex items-center justify-center`}>
                                                    <IconComponent className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm">{style.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {style.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>Your basic contact details</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="location"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="New York, USA"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="about">About Me / Objective</Label>
                                <Textarea
                                    id="about"
                                    value={aboutMe}
                                    onChange={(e) => setAboutMe(e.target.value)}
                                    placeholder="Brief description of your background and career goals. The AI will rewrite this in your selected style..."
                                    rows={3}
                                    maxLength={500}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {aboutMe.length}/500 characters • Will be rewritten in {RESUME_STYLES.find(s => s.id === selectedStyle)?.name} style
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skills & Languages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code2 className="w-5 h-5 text-primary" />
                                Skills & Technologies
                            </CardTitle>
                            <CardDescription>Select your skills and expertise</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* General Skills */}
                            <div className="space-y-3">
                                <Label>General Skills</Label>
                                <div className="flex flex-wrap gap-2">
                                    {SKILL_OPTIONS.map((skill) => (
                                        <Badge
                                            key={skill}
                                            variant={selectedSkills.includes(skill) ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                                            onClick={() => toggleSkill(skill)}
                                        >
                                            {selectedSkills.includes(skill) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Programming Languages */}
                            <div className="space-y-3">
                                <Label>Programming Languages</Label>
                                <div className="flex flex-wrap gap-2">
                                    {PROGRAMMING_LANGUAGES.map((lang) => (
                                        <Badge
                                            key={lang}
                                            variant={selectedLanguages.includes(lang) ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                                            onClick={() => toggleLanguage(lang)}
                                        >
                                            {selectedLanguages.includes(lang) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {lang}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Tools & Frameworks */}
                            <div className="space-y-3">
                                <Label>Tools & Frameworks</Label>
                                <div className="flex flex-wrap gap-2">
                                    {TOOLS_OPTIONS.map((tool) => (
                                        <Badge
                                            key={tool}
                                            variant={selectedTools.includes(tool) ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                                            onClick={() => toggleTool(tool)}
                                        >
                                            {selectedTools.includes(tool) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {tool}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* GitHub & LinkedIn */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Github className="w-5 h-5 text-primary" />
                                Links & Projects
                            </CardTitle>
                            <CardDescription>Connect your GitHub to import projects</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* GitHub */}
                            <div className="space-y-3">
                                <Label>GitHub Username</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            value={githubUsername}
                                            onChange={(e) => setGithubUsername(e.target.value)}
                                            placeholder="username"
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={fetchGitHubRepos}
                                        disabled={!githubUsername.trim() || loadingRepos}
                                    >
                                        {loadingRepos ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        <span className="ml-2">Fetch Repos</span>
                                    </Button>
                                </div>

                                {reposError && (
                                    <p className="text-sm text-destructive">{reposError}</p>
                                )}

                                {/* Repo Selection */}
                                {githubRepos.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <Label>Select Projects to Include (descriptions will be rewritten)</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                            {githubRepos.map((repo) => (
                                                <div
                                                    key={repo.url}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedRepos.includes(repo.url)
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                    onClick={() => toggleRepo(repo.url)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <Checkbox
                                                            checked={selectedRepos.includes(repo.url)}
                                                            className="mt-1"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{repo.name}</p>
                                                            {repo.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                                    {repo.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-2">
                                                                {repo.language && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {repo.language}
                                                                    </Badge>
                                                                )}
                                                                {repo.stars > 0 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ⭐ {repo.stars}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* LinkedIn */}
                            <div className="space-y-2">
                                <Label>LinkedIn</Label>
                                <div className="relative">
                                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        placeholder="linkedin.com/in/username or just username"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Custom Projects (Non-GitHub) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Additional Projects
                            </CardTitle>
                            <CardDescription>Add projects that are not on GitHub (personal projects, coursework, etc.)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {customProjects.map((project, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-card">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Project Title</Label>
                                        <Input
                                            value={project.title}
                                            onChange={(e) => updateCustomProject(index, 'title', e.target.value)}
                                            placeholder="My Awesome Project"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Technologies</Label>
                                        <Input
                                            value={project.technologies}
                                            onChange={(e) => updateCustomProject(index, 'technologies', e.target.value)}
                                            placeholder="React, Node.js, etc."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={project.year}
                                                onChange={(e) => updateCustomProject(index, 'year', e.target.value)}
                                                placeholder="2024"
                                            />
                                            {customProjects.length > 1 && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => removeCustomProject(index)}
                                                    className="shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={project.description}
                                            onChange={(e) => updateCustomProject(index, 'description', e.target.value)}
                                            placeholder="Brief description of what the project does, your role, and technologies used..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={addCustomProject}
                                className="w-full"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Project
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Education */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-primary" />
                                Education
                            </CardTitle>
                            <CardDescription>Add your educational background</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {educationList.map((edu, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-card">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Institution</Label>
                                        <Input
                                            value={edu.institution}
                                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                            placeholder="University Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Degree</Label>
                                        <Input
                                            value={edu.degree}
                                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                            placeholder="B.S. Computer Science"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={edu.year}
                                                onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                                placeholder="2024"
                                            />
                                            {educationList.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeEducation(index)}
                                                    className="shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={addEducation} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Education
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Work Experience / Internships */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Work Experience / Internships
                            </CardTitle>
                            <CardDescription>Add your work experience and internships</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Years of Experience Selector */}
                            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                                <Label className="text-sm font-medium">Years of Experience</Label>
                                <div className="flex flex-wrap gap-2">
                                    {["fresher", "1", "2", "3", "4", "5", "6+"].map((year) => (
                                        <Badge
                                            key={year}
                                            variant={yearsOfExperience === year ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary/80 transition-colors px-4 py-1"
                                            onClick={() => setYearsOfExperience(year)}
                                        >
                                            {yearsOfExperience === year && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {year === "fresher" ? "Fresher" : year === "6+" ? "6+ years" : `${year} year${year === "1" ? "" : "s"}`}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Work Experience Entries */}
                            {workExperienceList.map((work, index) => (
                                <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <Label>Company/Organization</Label>
                                            <Input
                                                value={work.company}
                                                onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                                                placeholder="Company Name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Role/Position</Label>
                                            <Input
                                                value={work.role}
                                                onChange={(e) => updateWorkExperience(index, 'role', e.target.value)}
                                                placeholder="Software Engineer Intern"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <select
                                                value={work.type}
                                                onChange={(e) => updateWorkExperience(index, 'type', e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            >
                                                <option value="Internship">Internship</option>
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Freelance">Freelance</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Start Date</Label>
                                            <Input
                                                value={work.startDate}
                                                onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                                                placeholder="Jan 2024"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>End Date</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={work.endDate}
                                                    onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                                                    placeholder="Present or Jun 2024"
                                                />
                                                {workExperienceList.length > 1 && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => removeWorkExperience(index)}
                                                        className="shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={work.description}
                                            onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                                            placeholder="Describe your responsibilities and achievements..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addWorkExperience} className="w-full gap-2">
                                <Plus className="w-4 h-4" />
                                Add Work Experience
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Research */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-primary" />
                                Research Experience
                            </CardTitle>
                            <CardDescription>Add your research projects and publications (optional)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {researchList.map((research, index) => (
                                <div key={index} className="space-y-3 p-4 rounded-lg border bg-card">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Research Title</Label>
                                            <Input
                                                value={research.title}
                                                onChange={(e) => updateResearch(index, 'title', e.target.value)}
                                                placeholder="e.g., AI-based Image Recognition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Your Role</Label>
                                            <Input
                                                value={research.role}
                                                onChange={(e) => updateResearch(index, 'role', e.target.value)}
                                                placeholder="e.g., Research Assistant, Lead Researcher"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Institution / Lab</Label>
                                            <Input
                                                value={research.institution}
                                                onChange={(e) => updateResearch(index, 'institution', e.target.value)}
                                                placeholder="e.g., MIT CSAIL, Stanford AI Lab"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Input
                                                value={research.year}
                                                onChange={(e) => updateResearch(index, 'year', e.target.value)}
                                                placeholder="e.g., 2023-2024"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <div className="flex gap-2">
                                            <Textarea
                                                value={research.description}
                                                onChange={(e) => updateResearch(index, 'description', e.target.value)}
                                                placeholder="Briefly describe the research, methodology, and outcomes..."
                                                rows={2}
                                            />
                                            {researchList.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeResearch(index)}
                                                    className="shrink-0 self-start"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={addResearch} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Research
                            </Button>
                        </CardContent>
                    </Card>

                    {/* References */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                References
                            </CardTitle>
                            <CardDescription>Add professional references (optional)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {referencesList.map((reference, index) => (
                                <div key={index} className="space-y-3 p-4 rounded-lg border bg-card">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Full Name *</Label>
                                            <Input
                                                value={reference.name}
                                                onChange={(e) => updateReference(index, 'name', e.target.value)}
                                                placeholder="Dr. John Smith"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Title / Position</Label>
                                            <Input
                                                value={reference.title}
                                                onChange={(e) => updateReference(index, 'title', e.target.value)}
                                                placeholder="e.g., Principal Investigator, Professor"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <Label>Department</Label>
                                            <Input
                                                value={reference.department}
                                                onChange={(e) => updateReference(index, 'department', e.target.value)}
                                                placeholder="e.g., Department of Robotics"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Institution</Label>
                                            <Input
                                                value={reference.institution}
                                                onChange={(e) => updateReference(index, 'institution', e.target.value)}
                                                placeholder="e.g., MIT, Stanford University"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={reference.email}
                                                    onChange={(e) => updateReference(index, 'email', e.target.value)}
                                                    placeholder="reference@example.com"
                                                    type="email"
                                                />
                                                {referencesList.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeReference(index)}
                                                        className="shrink-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={addReference} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Reference
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Hobbies & Interests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="w-5 h-5 text-primary" />
                                Hobbies & Interests
                            </CardTitle>
                            <CardDescription>Add your hobbies and interests (optional, comma-separated)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label>Hobbies</Label>
                                <Input
                                    value={hobbies}
                                    onChange={(e) => setHobbies(e.target.value)}
                                    placeholder="e.g., Photography, Hiking, Open Source Contributing, Chess"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Separate each hobby with a comma
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <div className="flex justify-end gap-3">
                        <Button
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="gap-2 shadow-lg shadow-primary/20"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Rewriting in {RESUME_STYLES.find(s => s.id === selectedStyle)?.name} Style...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Resume
                                </>
                            )}
                        </Button>
                    </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-6">
                    {generatedResume && (
                        <>
                            {/* Preview Controls */}
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">
                                        Resume generated in <strong>{RESUME_STYLES.find(s => s.id === selectedStyle)?.name}</strong> style!
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={downloadHtml} className="gap-2">
                                        <FileText className="w-4 h-4" />
                                        Download HTML
                                    </Button>
                                    <Button
                                        onClick={handleDownloadPdf}
                                        disabled={isCompilingPdf}
                                        className="gap-2"
                                    >
                                        {isCompilingPdf ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Compiling PDF...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                Download PDF
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Error in preview */}
                            {error && (
                                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                    <p className="text-sm text-yellow-600">{error}</p>
                                </div>
                            )}

                            {/* Live HTML Preview */}
                            {htmlContent && (
                                <Card className="overflow-hidden">
                                    <CardHeader className="bg-muted/50 py-3">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <Eye className="w-4 h-4" />
                                            Live Preview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="bg-white min-h-[600px]">
                                            <iframe
                                                srcDoc={htmlContent}
                                                className="w-full min-h-[800px] border-0"
                                                title="Resume Preview"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Data Preview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Code2 className="w-4 h-4" />
                                        Generated Data (JSON)
                                    </CardTitle>
                                    <CardDescription>
                                        Review the AI-rewritten content
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                                        {JSON.stringify(generatedResume, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
