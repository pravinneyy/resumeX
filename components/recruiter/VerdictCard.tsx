"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, AlertOctagon } from "lucide-react";

// This matches the JSON output from the Python "Strict Prompt"
interface ResumeAnalysisResult {
  decision: "YES" | "NO";
  match_score: number;
  rationale: string;
  missing_skills: string[];
}

interface ResumeCardProps {
  analysis: ResumeAnalysisResult | null;
  isLoading: boolean;
}

export default function ResumeScreeningCard({ analysis, isLoading }: ResumeCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-[#1e1e1e] border-gray-700 animate-pulse">
        <CardContent className="h-32 flex items-center justify-center text-gray-500">
          Analyzing Resume...
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const isApproved = analysis.decision === "YES";

  return (
    <Card className="bg-[#1e1e1e] border-gray-700 mb-6">
      <CardHeader className="pb-2 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-blue-400" />
            Resume Screening
          </CardTitle>
          
          {/* The Big YES / NO Badge */}
          <Badge 
            className={`px-3 py-1 text-sm font-bold flex items-center gap-2 ${
              isApproved 
                ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30" 
                : "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
            }`}
          >
            {isApproved ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {isApproved ? "MATCH" : "REJECTED"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        
        {/* Rationale Section */}
        <div className={`p-3 rounded-lg border ${
          isApproved 
            ? "bg-green-900/10 border-green-900/30 text-green-100" 
            : "bg-red-900/10 border-red-900/30 text-red-100"
        }`}>
          <p className="text-sm font-medium leading-relaxed">
            "{analysis.rationale}"
          </p>
        </div>

        {/* Missing Skills (Only show if there are missing skills) */}
        {analysis.missing_skills && analysis.missing_skills.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <AlertOctagon className="w-4 h-4 text-orange-400" />
              <span>Missing Critical Skills:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.missing_skills.map((skill) => (
                <Badge key={skill} variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Match Score Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Pattern Match Score</span>
            <span>{analysis.match_score}%</span>
          </div>
          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                analysis.match_score > 75 ? "bg-green-500" : 
                analysis.match_score > 50 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${analysis.match_score}%` }}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}