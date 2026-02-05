"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, Code2, MessageSquare, Users, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface VerdictProps {
  jobId: number;
  candidateId: string;
}

interface ScoreBreakdown {
  coding?: { score: number; max_score: number; status: string; details?: any };
  technical?: { score: number; max_score: number; status: string; details?: any };
  psychometric?: { score: number; max_score: number; status: string; details?: any };
  behavioral?: { score: number; max_score: number; status: string; details?: any };
}

interface ScoringResult {
  final_score: number;
  decision: string;
  component_breakdown: ScoreBreakdown;
  weights_used: Record<string, number>;
  flags: Record<string, any>;
  hard_gate_result: { passed: boolean; failed_gate?: string; reason?: string };
  calculated_at?: string;
}

export default function VerdictCard({ jobId, candidateId }: VerdictProps) {
  const [data, setData] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        // First try to get the scoring engine result
        const scoreRes = await fetch(
          `http://127.0.0.1:8000/api/scoring/result/${jobId}/${candidateId}`
        );

        if (scoreRes.ok) {
          const result = await scoreRes.json();
          setData({
            final_score: result.final_score,
            decision: result.decision,
            component_breakdown: result.full_breakdown || {},
            weights_used: result.weights_used || {},
            flags: result.flags || {},
            hard_gate_result: result.hard_gate_result || { passed: true },
            calculated_at: result.calculated_at
          });
        } else if (scoreRes.status === 404) {
          // Fallback to legacy endpoint if no score calculated yet
          const legacyRes = await fetch(
            `http://127.0.0.1:8000/api/assessments/final_grade/${jobId}/${candidateId}`
          );
          if (legacyRes.ok) {
            const legacyData = await legacyRes.json();
            // Convert legacy format to new format
            setData({
              final_score: legacyData.final_score || 0,
              decision: legacyData.verdict || "Pending",
              component_breakdown: {
                coding: {
                  score: legacyData.technical_score || 0,
                  max_score: 40,
                  status: legacyData.technical_score ? "evaluated" : "not_evaluated"
                },
                psychometric: {
                  score: legacyData.psychometric_score || 0,
                  max_score: 25,
                  status: legacyData.psychometric_score ? "evaluated" : "not_evaluated"
                }
              },
              weights_used: {},
              flags: {},
              hard_gate_result: { passed: true }
            });
          } else {
            setError("No score data available");
          }
        } else {
          setError("Failed to fetch score data");
        }
      } catch (err) {
        console.error("[VerdictCard] Error:", err);
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [jobId, candidateId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 p-4">
        <Loader2 className="animate-spin w-4 h-4" /> Loading score...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        {error || "No assessment data available yet."}
      </div>
    );
  }

  const isHire = ["STRONG_HIRE", "HIRE", "Strong Hire", "Hire", "Interview"].includes(data.decision);
  const isBorderline = data.decision === "BORDERLINE_REVIEW";

  const getDecisionColor = () => {
    if (isHire) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (isBorderline) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getDecisionIcon = () => {
    if (isHire) return <CheckCircle className="w-4 h-4" />;
    if (isBorderline) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const formatDecision = (decision: string) => {
    return decision.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const ScoreBar = ({
    label,
    score,
    maxScore,
    status,
    icon: Icon,
    color
  }: {
    label: string;
    score: number;
    maxScore: number;
    status: string;
    icon: any;
    color: string;
  }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const isEvaluated = status === "evaluated";

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-gray-300">{label}</span>
          </div>
          <span className={`font-semibold ${isEvaluated ? color : 'text-gray-500'}`}>
            {isEvaluated ? `${score.toFixed(1)}/${maxScore}` : 'N/A'}
          </span>
        </div>
        {isEvaluated && (
          <Progress
            value={percentage}
            className="h-2 bg-gray-800"
          />
        )}
      </div>
    );
  };

  const breakdown = data.component_breakdown;

  return (
    <Card className="bg-[#1e1e1e] border-gray-700 mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-center text-white">
          <span className="flex items-center gap-2">
            Assessment Verdict
          </span>
          <Badge className={`gap-1.5 ${getDecisionColor()}`}>
            {getDecisionIcon()}
            {formatDecision(data.decision)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hard Gate Warning */}
        {!data.hard_gate_result.passed && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              Hard Gate Failed
            </div>
            <p className="text-xs text-red-400/80 mt-1">
              {data.hard_gate_result.reason || "Minimum threshold not met"}
            </p>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-3">
          {breakdown.coding && (
            <ScoreBar
              label="Coding"
              score={breakdown.coding.score}
              maxScore={breakdown.coding.max_score}
              status={breakdown.coding.status}
              icon={Code2}
              color="text-purple-400"
            />
          )}

          {breakdown.technical && (
            <ScoreBar
              label="Technical Text"
              score={breakdown.technical.score}
              maxScore={breakdown.technical.max_score}
              status={breakdown.technical.status}
              icon={MessageSquare}
              color="text-blue-400"
            />
          )}

          {breakdown.psychometric && (
            <ScoreBar
              label="Psychometric"
              score={breakdown.psychometric.score}
              maxScore={breakdown.psychometric.max_score}
              status={breakdown.psychometric.status}
              icon={Brain}
              color="text-pink-400"
            />
          )}

          {breakdown.behavioral && (
            <ScoreBar
              label="Behavioral"
              score={breakdown.behavioral.score}
              maxScore={breakdown.behavioral.max_score}
              status={breakdown.behavioral.status}
              icon={Users}
              color="text-cyan-400"
            />
          )}
        </div>

        {/* Flags */}
        {data.flags && Object.keys(data.flags).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {data.flags.weak_fundamentals && (
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                Weak Fundamentals
              </Badge>
            )}
            {data.flags.behavioral_reliability === "low" && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                Low Reliability
              </Badge>
            )}
            {data.flags.severe_imbalance && (
              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                Severe Imbalance
              </Badge>
            )}
          </div>
        )}

        {/* Final Score */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Final Score</span>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold ${data.final_score >= 70 ? 'text-green-400' :
                data.final_score >= 55 ? 'text-yellow-400' :
                  'text-red-400'
              }`}>
              {data.final_score.toFixed(0)}
            </span>
            <span className="text-gray-500 text-lg">/100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}