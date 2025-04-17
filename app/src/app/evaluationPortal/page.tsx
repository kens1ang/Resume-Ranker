"use client";

import React, { useState, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { SelectJob } from "./selectJob";
import { ResumeUpload } from "./resumeUpload";
import { EvalResult } from "./evalResult";

// Define Job interface
interface Job {
  id: string;
  jobTitle: string;
  requiredDegree?: string;
  preferredDegree?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  additionalRequirements?: string;
  description?: string;
  weightages?: {
    skills: number;
    education: number;
    responsibilities: number;
  };
}

export default function EvaluationPortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [activeTab, setActiveTab] = useState("job-selection");
  const [hasResults, setHasResults] = useState(false);
  const { toast } = useToast();
  const db = getFirestore(app);

  useEffect(() => {
    async function fetchJobs() {
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
            additionalRequirements: data.additionalRequirements,
          };
        });

        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error",
          description: "Failed to fetch job listings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobs();
  }, [db, toast]);

  useEffect(() => {
    async function checkForResults() {
      if (!selectedJob) {
        setHasResults(false);
        return;
      }

      setIsLoadingResults(true);
      try {
        const resultsCollection = collection(db, "resumeSubmissions");
        const resultsQuery = query(
          resultsCollection,
          where("jobId", "==", selectedJob.id),
          orderBy("createdAt", "desc")
        );

        const resultsSnapshot = await getDocs(resultsQuery);
        setHasResults(!resultsSnapshot.empty);
      } catch (error) {
        console.error("Error checking for results:", error);
        toast({
          title: "Error Checking Results",
          description:
            "Could not determine if results exist for this job position.",
          variant: "destructive",
        });
        setHasResults(false);
      } finally {
        setIsLoadingResults(false);
      }
    }

    checkForResults();
  }, [selectedJob, db]);

  const handleContinue = () => {
    if (selectedJob) {
      setActiveTab("resume-upload");
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a job position first",
        variant: "destructive",
      });
    }
  };

  const handleResumeProcessingComplete = () => {
    setHasResults(true);
    setActiveTab("results");
  };

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 p-6">
        <div className="flex flex-col mb-6">
          <span className="font-bold text-2xl">Resume Evaluation Portal</span>
          <span className="text-gray-400">
            Select a job position and upload candidate resumes to evaluate
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="job-selection">Select Job</TabsTrigger>
            <TabsTrigger value="resume-upload" disabled={!selectedJob}>
              Upload Resumes
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!selectedJob || !hasResults}>
              View Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job-selection" className="space-y-4 py-4">
            <SelectJob
              jobs={jobs}
              isLoading={isLoading}
              selectedJob={selectedJob}
              setSelectedJob={setSelectedJob}
              handleContinue={handleContinue}
            />
          </TabsContent>

          <TabsContent value="resume-upload" className="py-4">
            {selectedJob && (
              <ResumeUpload
                selectedJob={selectedJob}
                onChangePosition={() => setActiveTab("job-selection")}
                onComplete={handleResumeProcessingComplete}
              />
            )}
          </TabsContent>

          <TabsContent value="results" className="py-4">
            {selectedJob && (
              <EvalResult
                selectedJob={selectedJob}
                onChangePosition={() => setActiveTab("job-selection")}
                isLoading={isLoadingResults}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
