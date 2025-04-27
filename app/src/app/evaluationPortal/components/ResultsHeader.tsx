import React from "react";
import { Button } from "@/components/ui/button";

interface ResultsHeaderProps {
  jobTitle: string;
  onChangePosition: () => void;
}

export function ResultsHeader({ jobTitle, onChangePosition }: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium">Results for: {jobTitle}</h3>
        <p className="text-sm text-muted-foreground">
          Showing evaluation results for all processed resumes
        </p>
      </div>
      <Button variant="outline" onClick={onChangePosition}>
        Change Position
      </Button>
    </div>
  );
}