"use client"

import type React from "react"

// FIX: Removed DashboardLayout import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Briefcase, GraduationCap, Code, MapPin, DollarSign, Clock, Save, Sparkles } from "lucide-react"
import { useState } from "react"

const initialSkills = ["React", "TypeScript", "Node.js"]

export default function RecruitPage() {
  const [skills, setSkills] = useState<string[]>(initialSkills)
  const [newSkill, setNewSkill] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  return (
    // FIX: Removed <DashboardLayout> wrapper
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Job Requirement</h1>
          <p className="text-muted-foreground mt-1">Define the requirements for your ideal candidate</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Requirements
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="bg-card border-border animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Basic Information
            </CardTitle>
            <CardDescription>Enter the job title and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g., Senior Software Engineer" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role and responsibilities..."
                className="bg-secondary/50 min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills & Expertise */}
        <Card className="bg-card border-border animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Required Skills
            </CardTitle>
            <CardDescription>Add the technical and soft skills required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a skill..."
                className="bg-secondary/50"
              />
              <Button onClick={addSkill} size="icon" variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-secondary/30 rounded-lg">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 transition-colors cursor-default group"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && (
                <p className="text-muted-foreground text-sm">No skills added yet. Start typing above.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Skill Level Required</Label>
              <Select>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Experience Requirements */}
        <Card className="bg-card border-border animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Experience & Education
            </CardTitle>
            <CardDescription>Specify experience and educational requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minExp">Min Experience (years)</Label>
                <Input id="minExp" type="number" min="0" placeholder="0" className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxExp">Max Experience (years)</Label>
                <Input id="maxExp" type="number" min="0" placeholder="10" className="bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                  <SelectItem value="masters">Master's Degree</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="certifications">Preferred Certifications</Label>
              <Input id="certifications" placeholder="e.g., AWS Certified, PMP" className="bg-secondary/50" />
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card className="bg-card border-border animate-slide-up" style={{ animationDelay: "150ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Job Details
            </CardTitle>
            <CardDescription>Location, salary, and employment type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="e.g., New York, NY or Remote" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Min Salary
                </Label>
                <Input id="salaryMin" type="number" placeholder="50000" className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Max Salary
                </Label>
                <Input id="salaryMax" type="number" placeholder="100000" className="bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Work Schedule
              </Label>
              <Select>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9-5">9 AM - 5 PM</SelectItem>
                  <SelectItem value="flexible">Flexible Hours</SelectItem>
                  <SelectItem value="shifts">Shift-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions Card */}
      <Card
        className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 animate-slide-up"
        style={{ animationDelay: "200ms" }}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">AI-Powered Matching</h3>
            <p className="text-sm text-muted-foreground">
              Once you save these requirements, our AI will automatically match and rank candidates based on their
              resumes.
            </p>
          </div>
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10 bg-transparent">
            Learn More
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}