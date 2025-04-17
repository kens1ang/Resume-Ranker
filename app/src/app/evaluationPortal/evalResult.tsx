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
import { generateInstitutionSummary } from "@/lib/openrouter";

interface Job {
  id: string;
  jobTitle: string;
  preferredDegree?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  description?: string;
  weightages?: {
    skills: number;
    education: number;
    responsibilities: number;
  };
}

interface ResumeResult {
  id: string;
  jobId: string;
  jobTitle: string;
  fileName: string;
  candidateName: string;
  similarity: number;
  similarityScores: {
    overall: number;
    skills: number;
    education: number;
    job_title: number;
    responsibilities: number;
  };
  entityData: {
    [key: string]: string[];
  };
  matchDetails?: {
    applied_weightages?: {
      skills: number;
      education: number;
      responsibilities: number;
    };
  };
  createdAt: any;
  resumeFile?: {
    name: string;
    data: string | Blob;
  };
}

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
  const [institutionSummaries, setInstitutionSummaries] = useState<
    Record<string, string>
  >({});
  const [loadingInstitutions, setLoadingInstitutions] = useState<
    Record<string, boolean>
  >({});
  const [results, setResults] = useState<ResumeResult[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const isLoading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const [sortField, setSortField] = useState<string>("overall");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const db = getFirestore(app);
  const [expandedResponsibilities, setExpandedResponsibilities] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    async function fetchResults() {
      if (!selectedJob) return;

      if (externalLoading === undefined) {
        setInternalLoading(true);
      }

      try {
        const resultsCollection = collection(db, "resumeSubmissions");
        const resultsQuery = query(
          resultsCollection,
          where("jobId", "==", selectedJob.id),
          orderBy("createdAt", "desc")
        );

        const resultsSnapshot = await getDocs(resultsQuery);

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
  }, [db, selectedJob, toast, externalLoading]);

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

  const toggleResponsibilitiesView = (id: string) => {
    setExpandedResponsibilities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sortedResults = [...results].sort((a, b) => {
    let valA: number;
    let valB: number;

    switch (sortField) {
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
        valA = a.similarityScores.overall;
        valB = b.similarityScores.overall;
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

  // Add this function inside your EvalResult component
  const fetchInstitutionSummary = async (
    resultId: string,
    institutionName: string
  ) => {
    // Skip if we already have this summary
    if (institutionSummaries[`${resultId}-${institutionName}`]) return;

    // Set loading state
    setLoadingInstitutions((prev) => ({
      ...prev,
      [`${resultId}-${institutionName}`]: true,
    }));

    try {
      const summary = await generateInstitutionSummary(institutionName);

      // Store the summary
      setInstitutionSummaries((prev) => ({
        ...prev,
        [`${resultId}-${institutionName}`]: summary,
      }));
    } catch (error) {
      console.error("Error fetching institution summary:", error);
      // Handle error if needed
    } finally {
      // Clear loading state
      setLoadingInstitutions((prev) => ({
        ...prev,
        [`${resultId}-${institutionName}`]: false,
      }));
    }
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
                      (acc, r) => acc + r.similarityScores.overall,
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
                    Math.max(...results.map((r) => r.similarityScores.overall))
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
                          <div
                            className={`font-bold ${getScoreColor(
                              result.similarityScores.overall
                            )}`}
                          >
                            {formatPercentage(result.similarityScores.overall)}
                          </div>
                          <Progress
                            value={result.similarityScores.overall * 100}
                            className="h-2"
                          />
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
                                      <div key={index} className="text-sm mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                            Institution
                                          </Badge>
                                          {institution}
                                        </div>

                                        {/* Institution Summary Section */}
                                        <div className="mt-1 pl-2 border-l-2 border-purple-200">
                                          {institutionSummaries[
                                            `${result.id}-${institution}`
                                          ] ? (
                                            <p className="text-xs text-muted-foreground">
                                              {
                                                institutionSummaries[
                                                  `${result.id}-${institution}`
                                                ]
                                              }
                                            </p>
                                          ) : (
                                            <div>
                                              {loadingInstitutions[
                                                `${result.id}-${institution}`
                                              ] ? (
                                                <div className="flex items-center gap-2 py-1">
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                  <span className="text-xs text-muted-foreground">
                                                    Loading institution
                                                    profile...
                                                  </span>
                                                </div>
                                              ) : (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-xs h-6 px-2 mt-1"
                                                  onClick={() =>
                                                    fetchInstitutionSummary(
                                                      result.id,
                                                      institution
                                                    )
                                                  }
                                                >
                                                  Load institution information
                                                </Button>
                                              )}
                                            </div>
                                          )}
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
                                Identified Responsibilities
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  (
                                  {result.entityData?.Responsibilities
                                    ?.length || 0}{" "}
                                  found)
                                </span>
                              </h4>
                              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto bg-white p-3 rounded-md border">
                                {result.entityData?.Responsibilities?.length >
                                0 ? (
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
                                    No responsibilities identified
                                  </span>
                                )}
                              </div>

                              <h4 className="font-semibold mt-4 mb-2">
                                Detailed Match Scores
                              </h4>

                              <div className="bg-slate-100 p-3 rounded-md mb-3">
                                <h5 className="text-sm font-medium mb-2">
                                  Applied Weightages:
                                </h5>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Skills:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {result.matchDetails?.applied_weightages
                                        ?.skills || 33}
                                      %
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Education:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {result.matchDetails?.applied_weightages
                                        ?.education || 33}
                                      %
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Responsibilities:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {result.matchDetails?.applied_weightages
                                        ?.responsibilities || 34}
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {Object.entries(result.similarityScores).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span>
                                          {key.charAt(0).toUpperCase() +
                                            key.slice(1).replace("_", " ")}
                                        </span>
                                        <span className={getScoreColor(value)}>
                                          {formatPercentage(value)}
                                        </span>
                                      </div>
                                      <Progress
                                        value={value * 100}
                                        className="h-2"
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
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
