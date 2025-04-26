"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { useToast } from "@/hooks/use-toast";
import { EvalResult } from "../evaluationPortal/evalResult";
import { Loader2 } from "lucide-react";

// Define Job interface
interface Job {
  id: string;
  jobTitle: string;
  requiredDegree?: string;
  preferredDegree?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  jobDescription?: string;
  description?: string;
  weightages?: {
    skills: number;
    education: number;
    responsibilities: number;
  };
}

export default function ResultsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [hasResults, setHasResults] = useState(false);
  const { toast } = useToast();
  const db = getFirestore(app);

  // Fetch jobs from Firestore
  useEffect(() => {
    async function fetchJobs() {
      setIsLoadingJobs(true);
      try {
        const jobsCollection = collection(db, "jobs");
        const jobsSnapshot = await getDocs(
          query(jobsCollection, orderBy("createdAt", "desc"))
        );

        const jobsData = jobsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            jobTitle: data.jobTitle,
            requiredDegree: data.requiredDegree,
            preferredDegree: data.preferredDegree,
            requiredSkills: data.requiredSkills,
            preferredSkills: data.preferredSkills,
            responsibilities: data.responsibilities,
            jobDescription: data.jobDescription,
            description: data.description,
            weightages: data.weightages,
          };
        });

        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error",
          description: "Failed to load job positions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingJobs(false);
      }
    }

    fetchJobs();
  }, [db, toast]);

  // Handle job selection
  const handleJobChange = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setHasResults(true); // We'll assume there might be results and let the EvalResult component handle "no results" state
    }
  };

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Job Position</CardTitle>
            <CardDescription>
              Choose a job position to view its evaluation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-full sm:w-72">
                <Select
                  disabled={isLoadingJobs}
                  onValueChange={handleJobChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoadingJobs ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading job positions...</span>
          </div>
        ) : selectedJob ? (
          <div className="mt-6">
            <EvalResult
              selectedJob={selectedJob}
              onChangePosition={() => setSelectedJob(null)}
              isLoading={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-full max-w-md">
              <h3 className="text-lg font-medium">Select a Job Position</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Select a job position from the dropdown above to view evaluation results.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}