import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, PenLine } from "lucide-react";
import { ResumeResult } from "@/types/evaluation";
import { calculateFusionScore, bertLabelToText } from "@/lib/ranking";
import { IdentifiedData } from "./ExpandedResultDetails/IdentifiedData";
import { AIExplanations } from "./ExpandedResultDetails/AIExplanations";

interface ResultsTableRowProps {
  result: ResumeResult;
  isExpanded: boolean;
  toggleRowExpand: (id: string) => void;
  setEditingClassification: (id: string) => void;
  setSelectedFit: (fit: number) => void;
  topScorer: ResumeResult | null;
  averageScores: Record<string, number>;
}

export function ResultsTableRow({
  result,
  isExpanded,
  toggleRowExpand,
  setEditingClassification,
  setSelectedFit,
  topScorer,
  averageScores,
}: ResultsTableRowProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const fusionResult = calculateFusionScore(
    result.similarityScores.overall,
    result.bertPrediction || null
  );

  return (
    <React.Fragment>
      <TableRow>
        <TableCell className="font-medium">
          <div>
            {result.candidateName}
            <div className="text-xs text-muted-foreground mt-1 truncate max-w-[220px]">
              {result.fileName}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div
              className={`font-bold ${getScoreColor(fusionResult.fusionScore)}`}
            >
              {formatPercentage(fusionResult.fusionScore)}
            </div>
            <Progress value={fusionResult.fusionScore * 100} className="h-2" />
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <div>
            {result.bertPrediction ? (
              <Badge
                className={
                  result.bertPrediction.prediction_label === 2
                    ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer flex items-center justify-between w-24" // Fixed width
                    : result.bertPrediction.prediction_label === 1
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer flex items-center justify-between w-24" // Fixed width
                    : "bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer flex items-center justify-between w-24" // Fixed width
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingClassification(result.id);
                  setSelectedFit(result.bertPrediction?.prediction_label || 1);
                }}
              >
                <span>
                  {bertLabelToText(result.bertPrediction.prediction_label)}
                </span>
                <PenLine className="h-3 w-3" />
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-gray-100 flex items-center justify-between w-24" // Fixed width
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingClassification(result.id);
                  setSelectedFit(1); // Default to Potential Fit
                }}
              >
                <span>Not classified</span>
                <PenLine className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div
            className={`font-medium ${getScoreColor(
              result.similarityScores.skills
            )}`}
          >
            {formatPercentage(result.similarityScores.skills)}
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div
            className={`font-medium ${getScoreColor(
              result.similarityScores.education
            )}`}
          >
            {formatPercentage(result.similarityScores.education)}
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div
            className={`font-medium ${getScoreColor(
              result.similarityScores.responsibilities
            )}`}
          >
            {formatPercentage(result.similarityScores.responsibilities)}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleRowExpand(result.id)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="px-4 py-4 bg-slate-50">
            <Tabs defaultValue="details" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Candidate Details</h4>
                <TabsList>
                  <TabsTrigger value="details">Identified Data</TabsTrigger>
                  <TabsTrigger value="ai-explanations">
                    AI Explanations
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="mt-0">
                <IdentifiedData
                  result={result}
                  formatPercentage={formatPercentage}
                  getScoreColor={getScoreColor}
                />
              </TabsContent>

              <TabsContent value="ai-explanations" className="mt-0">
                <AIExplanations
                  result={result}
                  topScorer={topScorer}
                  averageScores={averageScores}
                />
              </TabsContent>
            </Tabs>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}
