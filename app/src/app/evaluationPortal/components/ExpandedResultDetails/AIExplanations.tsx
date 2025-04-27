import React from "react";
import { ResumeResult } from "@/types/evaluation";
import { calculateFusionScore, bertLabelToText } from "@/lib/ranking";
import { calculateShapValues } from "@/lib/explainability";
import { ShapExplanation } from "@/components/xai/ShapExplanation";
import { DecisionRules } from "@/components/xai/DecisionRules";
import { ComparativeAnalysis } from "@/components/xai/ComparativeAnalysis";

interface AIExplanationsProps {
  result: ResumeResult;
  topScorer: ResumeResult | null;
  averageScores: Record<string, number>;
}

export function AIExplanations({
  result,
  topScorer,
  averageScores,
}: AIExplanationsProps) {
  const fusionResult = calculateFusionScore(
    result.similarityScores.overall,
    result.bertPrediction || null
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SHAP explanation */}
      <ShapExplanation {...calculateShapValues(result)} />

      {/* Decision Rules */}
      <DecisionRules
        fusionResult={fusionResult}
        semanticScore={result.similarityScores.overall}
        bertLabel={result.bertPrediction?.prediction_label}
        bertLabelText={
          result.bertPrediction
            ? bertLabelToText(result.bertPrediction.prediction_label)
            : undefined
        }
      />

      {/* Comparative Analysis */}
      {topScorer && (
        <div className="col-span-1 lg:col-span-2">
          <ComparativeAnalysis
            currentScore={result.similarityScores}
            topScore={topScorer.similarityScores}
            avgScore={averageScores}
          />
        </div>
      )}
    </div>
  );
}