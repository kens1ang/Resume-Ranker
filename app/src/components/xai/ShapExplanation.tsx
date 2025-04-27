import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShapExplanationProps {
  featureContributions: { [key: string]: number };
  baseValue: number;
  totalScore: number;
}

export function ShapExplanation({
  featureContributions,
  baseValue,
  totalScore,
}: ShapExplanationProps) {
  // Sort features by absolute contribution
  const sortedFeatures = Object.entries(featureContributions).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Baseline marker */}
          <div className="text-xs text-muted-foreground">
            Base score: {(baseValue * 100).toFixed(1)}%
          </div>
          
          {/* Feature contributions */}
          <div className="space-y-2">
            {sortedFeatures.map(([feature, contribution]) => {
              const isPositive = contribution > 0;
              const absContribution = Math.abs(contribution);
              const width = `${Math.min(absContribution * 100 * 2, 100)}%`; // Scale for visibility
              
              return (
                <div key={feature} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span>{feature}</span>
                    <span className={isPositive ? "text-green-600" : "text-red-600"}>
                      {isPositive ? "+" : "-"}{(absContribution * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full w-full relative">
                    <div
                      className={`absolute top-0 h-2 rounded-full ${
                        isPositive ? "bg-green-500 left-1/2" : "bg-red-500 right-1/2"
                      }`}
                      style={{ width }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Final score */}
          <div className="pt-2 border-t flex justify-between text-sm">
            <span className="font-medium">Final Score:</span>
            <span className="font-bold">{(totalScore * 100).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}