"use client";

import React, { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileText, ChevronRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Import Uppy properly with type information
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import Tus from "@uppy/tus";
// Import Uppy styles
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

// Job interface
interface Job {
  id: string;
  jobTitle: string;
  requiredDegree: string;
  preferredDegree: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  additionalRequirements: string;
  createdAt: any;
}

export default function EvaluationPortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uppy, setUppy] = useState<Uppy | null>(null);
  const [activeTab, setActiveTab] = useState("job-selection");
  const { toast } = useToast();
  const db = getFirestore(app);

  // Fetch jobs from Firestore
  useEffect(() => {
    async function fetchJobs() {
      try {
        const jobsCollection = collection(db, "jobs");
        const jobsQuery = query(jobsCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(jobsQuery);

        const jobsData: Job[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Job, "id">;
          jobsData.push({
            id: doc.id,
            ...data,
          });
        });

        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error",
          description: "Failed to load jobs. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobs();
  }, [db, toast]);

  // Initialize Uppy
  useEffect(() => {
    // Only create Uppy instance if it doesn't exist
    if (!uppy) {
      const uppyInstance = new Uppy({
        id: "resumeUploader",
        restrictions: {
          maxNumberOfFiles: 10,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFileTypes: [
            "application/pdf",
            ".pdf",
            ".doc",
            ".docx",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        },
        autoProceed: false,
      });

      // Add Tus plugin for uploads
      uppyInstance.use(Tus, {
        endpoint: "https://tusd.tusdemo.net/files/", // Change this to your actual endpoint
      });

      // Handle successful uploads
      uppyInstance.on("complete", (result) => {
        if (result.successful && result.successful.length > 0) {
          toast({
            title: "Upload Complete",
            description: `Successfully uploaded ${result.successful.length} file(s)`,
          });

          // Here you could add code to save the file references to Firebase
          // along with the job ID they're for
        }
      });

      setUppy(uppyInstance);
    }

    // Clean up Uppy instance on component unmount
    return () => {
      if (uppy) {
        uppy.close();
      }
    };
  }, [toast]); // Dependencies

  // Format degree text
  const formatDegree = (degree: string) => {
    if (!degree) return "None";
    return degree.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Handle job selection
  const handleJobSelect = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      // Automatically move to upload tab after selecting a job
      setActiveTab("resume-upload");

      // If you want to add job metadata to uploads
      if (uppy) {
        uppy.setMeta({
          jobId: job.id,
          jobTitle: job.jobTitle,
        });
      }
    }
  };

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

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <UserRound className="mr-2 h-6 w-6" />
            Resume Evaluation Portal
          </h1>
        </div>

        <Card className="w-full max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle>Submit Resumes for Evaluation</CardTitle>
            <CardDescription>
              Select a job position and upload candidate resumes to evaluate
              their fit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="job-selection">
                  <span className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Job Selection
                  </span>
                </TabsTrigger>
                <TabsTrigger value="resume-upload" disabled={!selectedJob}>
                  <span className="flex items-center">
                    <FileUp className="mr-2 h-4 w-4" />
                    Resume Upload
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="job-selection" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Job Position
                    </label>
                    {isLoading ? (
                      <div className="h-10 w-full animate-pulse rounded-md bg-muted"></div>
                    ) : (
                      <Select
                        onValueChange={handleJobSelect}
                        value={selectedJob?.id}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a job position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Available Positions</SelectLabel>
                            {jobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.jobTitle}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedJob && (
                    <div className="mt-6 space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">
                          {selectedJob.jobTitle}
                        </h3>
                        <div className="flex gap-2">
                          {selectedJob.requiredDegree && (
                            <Badge variant="secondary">
                              {formatDegree(selectedJob.requiredDegree)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.requiredSkills.map((skill, index) => (
                            <Badge key={index} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {selectedJob.preferredSkills &&
                        selectedJob.preferredSkills.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                              Preferred Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedJob.preferredSkills.map(
                                (skill, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-background/50"
                                  >
                                    {skill}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={handleContinue} disabled={!selectedJob}>
                    Continue to Upload
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="resume-upload" className="py-4">
                {selectedJob && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">
                          Uploading for: {selectedJob.jobTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upload candidate resumes to evaluate against this
                          position
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("job-selection")}
                      >
                        Change Position
                      </Button>
                    </div>

                    <Separator />

                    {uppy && (
                      <div className="py-4">
                        <Dashboard
                          uppy={uppy}
                          proudlyDisplayPoweredByUppy={false}
                          showProgressDetails={true}
                          note="Upload resumes in PDF or Word format (max 10MB per file)"
                          width="100%"
                          height={450}
                          metaFields={[
                            {
                              id: "name",
                              name: "Candidate Name",
                              placeholder: "Enter candidate name (optional)",
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Files uploaded will be automatically evaluated against the
              selected job requirements
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
