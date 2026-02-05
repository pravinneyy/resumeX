"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Code2, Sparkles } from "lucide-react";

interface ScoreBadgesProps {
    jobId: number;
    candidateId: string;
    compact?: boolean;
}

interface ScoreData {
    final_score: number;
    decision: string;
    coding_score?: number;
    psychometric_score?: number;
    technical_score?: number;
}

export default function CandidateScoreBadges({ jobId, candidateId, compact = false }: ScoreBadgesProps) {
    const [data, setData] = useState<ScoreData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScore = async () => {
            try {
                const res = await fetch(
                    `http://127.0.0.1:8000/api/scoring/result/${jobId}/${candidateId}`
                );

                if (res.ok) {
                    const result = await res.json();
                    setData({
                        final_score: result.final_score,
                        decision: result.decision,
                        coding_score: result.component_breakdown?.coding,
                        psychometric_score: result.component_breakdown?.psychometric,
                        technical_score: result.component_breakdown?.technical
                    });
                }
            } catch (err) {
                console.error("[ScoreBadges] Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchScore();
    }, [jobId, candidateId]);

    if (loading) {
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    }

    if (!data) {
        return null;
    }

    const getScoreColor = (score: number) => {
        if (score >= 70) return "bg-green-500/20 text-green-400 border-green-500/30";
        if (score >= 55) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        return "bg-red-500/20 text-red-400 border-red-500/30";
    };

    const formatDecision = (decision: string) => {
        const map: Record<string, string> = {
            "STRONG_HIRE": "Strong Hire",
            "HIRE": "Hire",
            "BORDERLINE_REVIEW": "Review",
            "NO_HIRE": "No Hire"
        };
        return map[decision] || decision;
    };

    if (compact) {
        return (
            <Badge variant="outline" className={`text-xs gap-1 ${getScoreColor(data.final_score)}`}>
                <Sparkles className="w-3 h-3" />
                {data.final_score.toFixed(0)}%
            </Badge>
        );
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-xs gap-1 ${getScoreColor(data.final_score)}`}>
                <Sparkles className="w-3 h-3" />
                {data.final_score.toFixed(0)}% ({formatDecision(data.decision)})
            </Badge>

            {data.coding_score !== undefined && (
                <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10 text-purple-400 border-purple-500/30">
                    <Code2 className="w-3 h-3" />
                    {typeof data.coding_score === 'number' ? data.coding_score.toFixed(0) : 0}
                </Badge>
            )}

            {data.psychometric_score !== undefined && (
                <Badge variant="outline" className="text-xs gap-1 bg-pink-500/10 text-pink-400 border-pink-500/30">
                    <Brain className="w-3 h-3" />
                    {typeof data.psychometric_score === 'number' ? data.psychometric_score.toFixed(0) : 0}
                </Badge>
            )}
        </div>
    );
}
