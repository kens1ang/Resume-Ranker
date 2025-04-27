import { useState, useMemo } from "react";
import { ResumeResult } from "@/types/evaluation";
import { calculateFusionScore } from "@/lib/ranking";

export function useResultSorting(results: ResumeResult[]) {
  const [sortField, setSortField] = useState<string>("fusion");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let valA: number;
      let valB: number;

      switch (sortField) {
        case "fusion":
          const fusionA = calculateFusionScore(
            a.similarityScores.overall,
            a.bertPrediction || null
          ).fusionScore;
          const fusionB = calculateFusionScore(
            b.similarityScores.overall,
            b.bertPrediction || null
          ).fusionScore;
          valA = fusionA;
          valB = fusionB;
          break;
        case "skills":
          valA = a.similarityScores.skills;
          valB = b.similarityScores.skills;
          break;
        case "education":
          valA = a.similarityScores.education;
          valB = b.similarityScores.education;
          break;
        case "responsibilities":
          valA = a.similarityScores.responsibilities;
          valB = b.similarityScores.responsibilities;
          break;
        default:
          const defaultFusionA = calculateFusionScore(
            a.similarityScores.overall,
            a.bertPrediction || null
          ).fusionScore;
          const defaultFusionB = calculateFusionScore(
            b.similarityScores.overall,
            b.bertPrediction || null
          ).fusionScore;
          valA = defaultFusionA;
          valB = defaultFusionB;
          break;
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [results, sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    sortedResults,
    toggleSort,
  };
}