"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText } from "lucide-react";

import { useEvaluationResults } from "./hooks/useEvaluationResults";
import { ResultsHeader } from "./components/ResultsHeader";
import { ResultsSummary } from "./components/ResultsSummary";
import { ResultsTable } from "./components/ResultsTable";
import { EditClassificationDialog } from "./dialogs/EditClassificationDialog";
import { Job } from "@/types/evaluation";

interface EvalResultProps {
  selectedJob: Job;
  onChangePosition: () => void;
  isLoading?: boolean;
}

export function EvalResult({
  selectedJob,
  onChangePosition,
  isLoading: externalLoading,
}: EvalResultProps) {
  const {
    results,
    isLoading,
    sortedResults,
    averageScores,
    topScorer,
    sortOptions,
    expandedRows,
    classificationDialog,
    formatPercentage,
    toggleRowExpand,
  } = useEvaluationResults(selectedJob, externalLoading);
  
  return (
    <div className="space-y-4">
      <ResultsHeader 
        jobTitle={selectedJob.jobTitle}
        onChangePosition={onChangePosition}
      />

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No Results Available</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2">
            There are no evaluation results for this position yet. Try uploading
            some resumes first.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ResultsSummary 
            results={results} 
            averageScores={averageScores}
            formatPercentage={formatPercentage} 
          />
          
          <ResultsTable 
            sortedResults={sortedResults}
            sortOptions={sortOptions}
            expandedRows={expandedRows}
            toggleRowExpand={toggleRowExpand}
            classificationDialog={classificationDialog}
            topScorer={topScorer}
            averageScores={averageScores}
          />
        </div>
      )}
      
      <EditClassificationDialog 
        {...classificationDialog}
        selectedJob={selectedJob}
      />
    </div>
  );
}