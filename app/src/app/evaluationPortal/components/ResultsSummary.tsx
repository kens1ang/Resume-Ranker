import React from "react";
import { BarChart } from "lucide-react";
import { ResumeResult } from "@/types/evaluation";
import { calculateFusionScore } from "@/lib/ranking";

interface ResultsSummaryProps {
  results: ResumeResult[];
  averageScores: Record<string, number>;
  formatPercentage: (value: number) => string;
}

export function ResultsSummary({
  results,
  averageScores,
  formatPercentage,
}: ResultsSummaryProps) {
  const getMaxScore = () => {
    if (results.length === 0) return 0;
    return Math.max(
      ...results.map(
        (r) => calculateFusionScore(r.similarityScores.overall, r.bertPrediction || null).fusionScore
      )
    );
  };

  return (
    <div className="bg-muted/30 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <BarChart className="h-5 w-5 text-primary" />
        <h4 className="font-medium">Summary</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Total Resumes
          </div>
          <div className="text-2xl font-bold">{results.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Avg. Overall Match
          </div>
          <div className="text-2xl font-bold">
            {formatPercentage(
              results.reduce(
                (acc, r) =>
                  acc +
                  calculateFusionScore(
                    r.similarityScores.overall,
                    r.bertPrediction || null
                  ).fusionScore,
                0
              ) / (results.length || 1)
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Top Match
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatPercentage(getMaxScore())}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Avg. Skills Match
          </div>
          <div className="text-2xl font-bold">
            {formatPercentage(
              results.reduce((acc, r) => acc + r.similarityScores.skills, 0) / 
              (results.length || 1)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}