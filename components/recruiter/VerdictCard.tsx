"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface VerdictProps {
  jobId: number;
  candidateId: string;
}

export default function VerdictCard({ jobId, candidateId }: VerdictProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/assessments/final_grade/${jobId}/${candidateId}`)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [jobId, candidateId]);

  if (loading) return <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin w-4 h-4"/> Calculating...</div>;
  if (!data) return null;

  const isHire = ["Strong Hire", "Hire", "Interview"].includes(data.verdict);
  const badgeColor = isHire ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";

  return (
    <Card className="bg-[#1e1e1e] border-gray-700 mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center text-white">
          Hiring Verdict
          <Badge className={badgeColor}>{data.verdict}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* CHANGED GRID: Removed AI Resume, Renamed others */}
        <div className="grid grid-cols-2 gap-4 text-center">
          
          <div className="bg-black/30 p-3 rounded-lg border border-gray-800">
            <p className="text-xs text-gray-500 uppercase">Technical (Code)</p>
            <p className="text-xl font-bold text-purple-400">{data.technical_score}%</p>
          </div>
          
          <div className="bg-black/30 p-3 rounded-lg border border-gray-800">
            <p className="text-xs text-gray-500 uppercase">Psychometric</p>
            <p className="text-xl font-bold text-pink-400">{data.psychometric_score}%</p>
          </div>

        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
           <span className="text-gray-400 text-sm">Final Score</span>
           <span className="text-2xl font-bold text-white">{data.final_grade}/100</span>
        </div>
      </CardContent>
    </Card>
  );
}