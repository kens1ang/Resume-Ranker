import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { FusionResult } from "@/lib/ranking";

interface DecisionRulesProps {
  fusionResult: FusionResult;
  semanticScore: number;
  bertLabel?: number;
  bertLabelText?: string;
}

export function DecisionRules({
  fusionResult,
  semanticScore,
  bertLabel,
  bertLabelText,
}: DecisionRulesProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Decision Logic Explanation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
              1
            </div>
            <span>
              Semantic score ({(semanticScore * 100).toFixed(1)}%) was combined with
              {bertLabel !== undefined ? (
                <> BERT classification (&quot;{bertLabelText}&quot;)</>
              ) : (
                <> no BERT classification data</>
              )}
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
              2
            </div>
            <span>
              Agreement between scores was determined to be <strong>{fusionResult.agreementLevel}</strong>
              {fusionResult.agreementLevel === "high"
                ? ", boosting confidence"
                : fusionResult.agreementLevel === "low"
                ? ", reducing confidence"
                : ""}
            </span>
          </div>
          
          {fusionResult.edgeCase.isEdgeCase && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <span className="text-amber-700">
                Edge case detected: {fusionResult.edgeCase.recommendedAction}
              </span>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
              3
            </div>
            <span>
              Final weights applied: {Math.round(fusionResult.weights.appliedSemanticWeight * 100)}% semantic,{" "}
              {Math.round(fusionResult.weights.appliedClassificationWeight * 100)}% classification
            </span>
          </div>
          
          <div className="flex items-start gap-2 pt-2 border-t mt-2">
            <div className="w-6 h-6 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
              ✓
            </div>
            <span>
              Final score: <strong>{(fusionResult.fusionScore * 100).toFixed(1)}%</strong> with{" "}
              {Math.round(fusionResult.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}