"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  FileText,
  BarChart,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  calculateFusionScore,
  bertLabelToText,
  getFusionDisplayInfo,
} from "@/lib/ranking";
import { ShapExplanation } from "@/components/xai/ShapExplanation";
import { DecisionRules } from "@/components/xai/DecisionRules";
import { ComparativeAnalysis } from "@/components/xai/ComparativeAnalysis";
import {
  calculateShapValues,
  calculateAverageScores,
  findTopScorer,
} from "@/lib/explainability";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResumeResult, Job } from "@/types/evaluation";

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
  const [results, setResults] = useState<ResumeResult[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const isLoading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const [sortField, setSortField] = useState<string>("fusion");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const db = getFirestore(app);
  const [bertPrediction, setBertPrediction] = useState<{
    match: string;
    probabilities: number[];
    prediction_label: number;
  } | null>(null);
  const [averageScores, setAverageScores] = useState<Record<string, number>>(
    {}
  );
  const [topScorer, setTopScorer] = useState<ResumeResult | null>(null);

  useEffect(() => {
    async function fetchResults() {
      if (!selectedJob) return;

      if (externalLoading === undefined) {
        setInternalLoading(true);
      }

      try {
        // Get the dynamic collection name
        const getCollectionNameFromJobTitle = (jobTitle: string): string => {
          const collectionName = jobTitle
            .trim()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase())
            .replace(/\s/g, "");
          return (
            collectionName.charAt(0).toLowerCase() +
            collectionName.slice(1) +
            "Submissions"
          );
        };

        const collectionName = getCollectionNameFromJobTitle(
          selectedJob.jobTitle
        );
        console.log(`Fetching results from collection: ${collectionName}`);

        // Try to fetch from job-specific collection first
        let resultsCollection;
        let resultsQuery;
        let resultsSnapshot;

        try {
          resultsCollection = collection(db, collectionName);
          resultsQuery = query(
            resultsCollection,
            where("jobId", "==", selectedJob.id),
            orderBy("createdAt", "desc")
          );
          resultsSnapshot = await getDocs(resultsQuery);

          // If no results in job-specific collection, fall back to main collection
          if (resultsSnapshot.empty) {
            console.log(
              "No results in job-specific collection, checking resumeSubmissions"
            );
            resultsCollection = collection(db, "resumeSubmissions");
            resultsQuery = query(
              resultsCollection,
              where("jobId", "==", selectedJob.id),
              orderBy("createdAt", "desc")
            );
            resultsSnapshot = await getDocs(resultsQuery);
          }
        } catch (error) {
          // If there's an error with the job-specific collection, fall back
          console.warn(
            `Error accessing ${collectionName}, falling back to resumeSubmissions`
          );
          resultsCollection = collection(db, "resumeSubmissions");
          resultsQuery = query(
            resultsCollection,
            where("jobId", "==", selectedJob.id),
            orderBy("createdAt", "desc")
          );
          resultsSnapshot = await getDocs(resultsQuery);
        }

        if (resultsSnapshot.empty) {
          setResults([]);
          toast({
            title: "No Results",
            description: "No evaluation results found for this position",
          });
        } else {
          const resultsData = resultsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              jobId: data.jobId,
              jobTitle: data.jobTitle,
              fileName: data.fileName,
              candidateName: data.candidateName || "Unnamed Candidate",
              similarity: data.similarity,
              similarityScores: data.similarityScores || {
                overall: data.similarity,
                skills: 0,
                education: 0,
                job_title: 0,
                responsibilities: 0,
              },
              entityData: data.entityData || {},
              matchDetails: data.matchDetails || {},
              bertPrediction: data.bertPrediction || null,
              createdAt: data.createdAt,
            };
          });

          setResults(resultsData);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        toast({
          title: "Error",
          description: "Failed to fetch evaluation results",
          variant: "destructive",
        });
      } finally {
        if (externalLoading === undefined) {
          setInternalLoading(false);
        }
      }
    }

    fetchResults();

    if (results.length > 0) {
      setAverageScores(calculateAverageScores(results));
      setTopScorer(findTopScorer(results));
    }
  }, [db, selectedJob, toast, externalLoading, results]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sortedResults = [...results].sort((a, b) => {
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
      case "job_title":
        valA = a.similarityScores.job_title;
        valB = b.similarityScores.job_title;
        break;
      case "responsibilities":
        valA = a.similarityScores.responsibilities;
        valB = b.similarityScores.responsibilities;
        break;
      case "overall":
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

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Results for: {selectedJob.jobTitle}
          </h3>
          <p className="text-sm text-muted-foreground">
            Showing evaluation results for all processed resumes
          </p>
        </div>
        <Button variant="outline" onClick={onChangePosition}>
          Change Position
        </Button>
      </div>

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
                    ) / results.length
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Top Match
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(
                    Math.max(
                      ...results.map(
                        (r) =>
                          calculateFusionScore(
                            r.similarityScores.overall,
                            r.bertPrediction || null
                          ).fusionScore
                      )
                    )
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Avg. Skills Match
                </div>
                <div className="text-2xl font-bold">
                  {formatPercentage(
                    results.reduce(
                      (acc, r) => acc + r.similarityScores.skills,
                      0
                    ) / results.length
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Candidate</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => toggleSort("overall")}
                  >
                    <div className="flex items-center">
                      Overall Match
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hidden md:table-cell"
                    onClick={() => toggleSort("skills")}
                  >
                    <div className="flex items-center">
                      Skills
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hidden md:table-cell"
                    onClick={() => toggleSort("education")}
                  >
                    <div className="flex items-center">
                      Education
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hidden lg:table-cell"
                    onClick={() => toggleSort("responsibilities")}
                  >
                    <div className="flex items-center">
                      Experience
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result) => (
                  <React.Fragment key={result.id}>
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
                          {(() => {
                            const fusionResult = calculateFusionScore(
                              result.similarityScores.overall,
                              result.bertPrediction || null
                            );
                            return (
                              <>
                                <div
                                  className={`font-bold ${getScoreColor(
                                    fusionResult.fusionScore
                                  )}`}
                                >
                                  {formatPercentage(fusionResult.fusionScore)}
                                </div>
                                <Progress
                                  value={fusionResult.fusionScore * 100}
                                  className="h-2"
                                />
                              </>
                            );
                          })()}
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
                          {formatPercentage(
                            result.similarityScores.responsibilities
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRowExpand(result.id)}
                        >
                          {expandedRows[result.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows[result.id] && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="px-4 py-4 bg-slate-50"
                        >
                          <Tabs defaultValue="details" className="w-full">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold">
                                Candidate Details
                              </h4>
                              <TabsList>
                                <TabsTrigger value="details">
                                  Identified Data
                                </TabsTrigger>
                                <TabsTrigger value="ai-explanations">
                                  AI Explanations
                                </TabsTrigger>
                              </TabsList>
                            </div>

                            <TabsContent value="details" className="mt-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Identified Skills
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {result.entityData?.Skills?.length > 0 ? (
                                      result.entityData.Skills.map(
                                        (skill, index) => (
                                          <Badge key={index} variant="outline">
                                            {skill}
                                          </Badge>
                                        )
                                      )
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No skills identified
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-semibold mt-4 mb-2">
                                    Identified Education
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    {result.entityData?.Degree?.length > 0 ? (
                                      result.entityData.Degree.map(
                                        (degree, index) => (
                                          <div key={index} className="text-sm">
                                            <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                                              Degree
                                            </Badge>
                                            {degree}
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No education identified
                                      </span>
                                    )}
                                    {result.entityData?.["Institution Name"]
                                      ?.length > 0 &&
                                      result.entityData["Institution Name"].map(
                                        (institution, index) => (
                                          <div key={index} className="text-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                                Institution
                                              </Badge>
                                              {institution}
                                            </div>
                                          </div>
                                        )
                                      )}
                                  </div>

                                  <h4 className="font-semibold mt-4 mb-2">
                                    Identified Certifications
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    {result.entityData?.Certifications?.length >
                                    0 ? (
                                      result.entityData.Certifications.map(
                                        (cert, index) => (
                                          <div key={index} className="text-sm">
                                            <Badge className="mr-2 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                                              Certification
                                            </Badge>
                                            {cert}
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No certifications identified
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mt-4 mb-2">
                                    Identified Experiences
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                      (
                                      {result.entityData?.Responsibilities
                                        ?.length || 0}{" "}
                                      found)
                                    </span>
                                  </h4>
                                  <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto bg-white p-3 rounded-md border">
                                    {result.entityData?.Responsibilities
                                      ?.length > 0 ? (
                                      <ol className="list-decimal pl-5 space-y-2">
                                        {result.entityData.Responsibilities.map(
                                          (resp, index) => (
                                            <li
                                              key={index}
                                              className="text-sm text-gray-800"
                                            >
                                              <span>{resp}</span>
                                            </li>
                                          )
                                        )}
                                      </ol>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No experiences identified
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-semibold mt-4 mb-2">
                                    Detailed Match Scores
                                  </h4>

                                  <div className="space-y-3">
                                    {Object.entries(result.similarityScores)
                                      .filter(([key]) => key !== "overall")
                                      // Sort by score value in descending order
                                      .sort(
                                        ([, valueA], [, valueB]) =>
                                          valueB - valueA
                                      )
                                      .map(([key, value]) => (
                                        <div key={key}>
                                          <div className="flex justify-between text-sm mb-1">
                                            <span>
                                              {key === "responsibilities"
                                                ? "Experiences"
                                                : key.charAt(0).toUpperCase() +
                                                  key
                                                    .slice(1)
                                                    .replace("_", " ")}
                                            </span>
                                            <span
                                              className={getScoreColor(value)}
                                            >
                                              {formatPercentage(value)}
                                            </span>
                                          </div>
                                          <Progress
                                            value={value * 100}
                                            className="h-2"
                                          />
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent
                              value="ai-explanations"
                              className="mt-0"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* SHAP explanation */}
                                <ShapExplanation
                                  {...calculateShapValues(result)}
                                />

                                {/* Decision Rules */}
                                <DecisionRules
                                  fusionResult={calculateFusionScore(
                                    result.similarityScores.overall,
                                    result.bertPrediction || null
                                  )}
                                  semanticScore={
                                    result.similarityScores.overall
                                  }
                                  bertLabel={
                                    result.bertPrediction?.prediction_label
                                  }
                                  bertLabelText={
                                    result.bertPrediction
                                      ? bertLabelToText(
                                          result.bertPrediction.prediction_label
                                        )
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
                            </TabsContent>
                          </Tabs>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
