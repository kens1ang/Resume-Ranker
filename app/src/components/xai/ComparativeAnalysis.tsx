import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CategoryScore {
  [key: string]: number;
}

interface ComparativeAnalysisProps {
  currentScore: CategoryScore;
  topScore: CategoryScore;
  avgScore: CategoryScore;
}

export function ComparativeAnalysis({
  currentScore,
  topScore,
  avgScore,
}: ComparativeAnalysisProps) {
  // Get common categories between all three
  const categories = Object.keys(currentScore).filter(
    (k) => k !== "overall" && k in topScore && k in avgScore
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Comparative Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => {
            const current = currentScore[category] * 100;
            const top = topScore[category] * 100;
            const avg = avgScore[category] * 100;
            const displayName = category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{displayName}</span>
                  <span>{current.toFixed(1)}%</span>
                </div>
                
                <div className="relative h-6 bg-gray-100 rounded">
                  {/* Candidate's score */}
                  <div
                    className="absolute h-6 bg-blue-500 rounded-l"
                    style={{ width: `${current}%` }}
                  ></div>
                  
                  {/* Average score marker */}
                  <div
                    className="absolute w-0.5 h-6 bg-gray-500"
                    style={{ left: `${avg}%` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 text-xs text-gray-500">
                      Avg
                    </span>
                  </div>
                  
                  {/* Top score marker */}
                  <div
                    className="absolute w-0.5 h-6 bg-green-500"
                    style={{ left: `${top}%` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 text-xs text-green-600">
                      Top
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="text-xs text-muted-foreground mt-1">
            This visualization shows how this candidate compares to the top candidate and average scores.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}