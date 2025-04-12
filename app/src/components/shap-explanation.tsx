"use client";

import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FeatureContribution {
  feature: string;
  value: number;
  contribution: number;
  relative_importance: number;
}

interface ShapExplanationProps {
  matchScore: number;
  baseValue: number;
  featureContributions: FeatureContribution[];
  visualizationUrl: string;
  isLoading?: boolean;
}

export function ShapExplanation({
  matchScore,
  baseValue,
  featureContributions,
  visualizationUrl,
  isLoading = false,
}: ShapExplanationProps) {
  // Sort features by absolute contribution (most impactful first)
  const sortedFeatures = [...featureContributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  // Format percentage for display
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Color based on contribution (positive = green, negative = red)
  const getContributionColor = (value: number) =>
    value > 0 ? "text-green-600" : "text-red-600";

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analyzing Match...</CardTitle>
          <CardDescription>
            Calculating feature contributions with SHAP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-60">
            <div className="animate-pulse text-muted-foreground">
              Generating explanation...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Match Score Explanation</span>
          <span className="font-bold">{formatPercent(matchScore)}</span>
        </CardTitle>
        <CardDescription>
          Understanding how each factor contributes to your match score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base score and total */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Value</span>
            <span>{formatPercent(baseValue)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Match Score</span>
            <span>{formatPercent(matchScore)}</span>
          </div>
          <Progress value={matchScore * 100} className="h-2" />
        </div>

        {/* Feature contributions */}
        <div>
          <h3 className="text-sm font-medium mb-3">Feature Contributions</h3>
          <div className="space-y-3">
            {sortedFeatures.map((feature) => (
              <div key={feature.feature} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{feature.feature}</span>
                  <span className={getContributionColor(feature.contribution)}>
                    {feature.contribution > 0 ? "+" : ""}
                    {formatPercent(feature.contribution)}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      feature.contribution > 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.abs(feature.contribution) * 100}%`,
                      marginLeft: feature.contribution < 0 ? "auto" : "0",
                    }}
                  ></div>
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-50"
                  >
                    Value: {formatPercent(feature.value)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-50"
                  >
                    Importance: {formatPercent(feature.relative_importance)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SHAP Visualization */}
        {visualizationUrl && (
          <div>
            <h3 className="text-sm font-medium mb-3">Visual Explanation</h3>
            <div className="relative w-full h-60 bg-slate-50 rounded-md overflow-hidden">
              <Image
                src={visualizationUrl}
                alt="SHAP explanation visualization"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Green bars show factors that increased your match score, red bars show factors that decreased it.
            </p>
          </div>
        )}

        {/* Explanation */}
        <div className="bg-slate-50 p-4 rounded-md mt-4">
          <h3 className="text-sm font-medium mb-2">How This Works</h3>
          <p className="text-xs text-muted-foreground">
            This explanation uses SHAP (SHapley Additive exPlanations), a method based on game theory to fairly distribute the contribution of each feature to the final match score. The base value represents the average match score, and each feature either increases or decreases this value.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}