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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Loader2 } from "lucide-react";
import { Dashboard } from "@uppy/react";
import Uppy from "@uppy/core";
import { useToast } from "@/hooks/use-toast";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";

// Import Uppy CSS
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

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
}

// Define uploaded file interface
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  meta: any;
}

export default function EvaluationPortal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uppy, setUppy] = useState<Uppy | null>(null);
  const [activeTab, setActiveTab] = useState("job-selection");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const db = getFirestore(app);

  // Fetch jobs from Firestore
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

  // Initialize Uppy
  useEffect(() => {
    if (!uppy) {
      const uppyInstance = new Uppy({
        id: "resumeUploader",
        restrictions: {
          maxNumberOfFiles: 10,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFileTypes: [".pdf", "application/pdf"],
        },
        autoProceed: false,
      });

      // Store files locally instead of uploading immediately
      uppyInstance.on("file-added", (file) => {
        console.log("File added:", file.name);
      });

      uppyInstance.on("complete", (result) => {
        if (result.successful && result.successful.length > 0) {
          toast({
            title: "Files Ready",
            description: `${result.successful.length} file(s) ready for processing`,
          });

          setUploadedFiles(
            result.successful.map((file) => ({
              id: file.id,
              name: file.name,
              type: file.type || "",
              size: file.size,
              data: file.data,
              meta: file.meta || {},
            }))
          );
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
  }, [toast]);

  // Handle job selection
  const handleJobSelect = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job);

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

  // Format degree for display
  const formatDegree = (degree: string) => {
    return degree.charAt(0).toUpperCase() + degree.slice(1);
  };

  // Process files and store in Firestore with NER integration
  const processFiles = async () => {
    if (!selectedJob) {
      toast({
        title: "Error",
        description: "No job selected",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "No files uploaded",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process each file
      for (const file of uploadedFiles) {
        try {
          console.log(`Processing file: ${file.name}`);

          // Create a FormData object to send to the FastAPI server
          const formData = new FormData();
          formData.append("file", new Blob([file.data]), file.name);

          // Call the parse-resume endpoint to get both text and NER results
          console.log("Sending file to API for parsing");
          try {
            const response = await fetch("http://localhost:8000/parse-resume", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error(
                `API response not OK: ${response.status} ${response.statusText}`
              );
            }

            const result = await response.json();
            console.log("Resume parsing successful:", result);

            // Extract data from the API response
            const extractedText = result.text || "";
            const entityData = result.entity_data || {};

            // Store in Firestore
            console.log("Storing parsed resume in Firestore");

            // Convert job title to a valid collection name
            const getCollectionNameFromJobTitle = (
              jobTitle: string
            ): string => {
              // Replace spaces with camelCase and remove special characters
              const collectionName = jobTitle
                .trim()
                .replace(/[^\w\s]/gi, "") // Remove special characters
                .replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase()) // Convert to camelCase
                .replace(/\s/g, ""); // Remove remaining spaces

              // Ensure it starts with lowercase letter (Firestore convention)
              return (
                collectionName.charAt(0).toLowerCase() +
                collectionName.slice(1) +
                "Submissions"
              );
            };

            const collectionName = getCollectionNameFromJobTitle(
              selectedJob.jobTitle
            );

            // Store in a collection named after the job title
            await addDoc(collection(db, collectionName), {
              jobId: selectedJob.id,
              jobTitle: selectedJob.jobTitle,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              candidateName: file.meta?.name || "Unknown",
              extractedText: extractedText,
              entityData: entityData,
              createdAt: serverTimestamp(),
            });

            // Success toast
            toast({
              title: "Success",
              description: `Processed: ${file.name}`,
            });
          } catch (apiError) {
            console.error(`API error for ${file.name}:`, apiError);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          toast({
            title: "Error",
            description: `Failed to process: ${file.name}`,
            variant: "destructive",
          });
        }
      }

      // Reset state after all files are processed
      setUploadedFiles([]);

      if (uppy) {
        // Cancel any ongoing uploads
        uppy.cancelAll();

        // Remove all files from the dashboard
        const fileIDs = uppy.getFiles().map((file) => file.id);
        fileIDs.forEach((fileID) => {
          uppy.removeFile(fileID);
        });

        // Optional: you can also set a new meta for the next batch
        if (selectedJob) {
          uppy.setMeta({
            jobId: selectedJob.id,
            jobTitle: selectedJob.jobTitle,
          });
        }
      }

      toast({
        title: "Processing Complete",
        description: `${uploadedFiles.length} file(s) processed`,
      });
    } catch (error) {
      console.error("Error in file processing:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 p-6">
        <Card className="w-full max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle>Resume Evaluation Portal</CardTitle>
            <CardDescription>
              Select a job position and upload candidate resumes to evaluate
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="job-selection">Select Job</TabsTrigger>
                <TabsTrigger value="resume-upload" disabled={!selectedJob}>
                  Upload Resumes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="job-selection" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Select Job Position</h3>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
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
                        <h4 className="font-medium">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.requiredSkills &&
                            selectedJob.requiredSkills.map((skill, index) => (
                              <Badge key={index} variant="default">
                                {skill}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      {selectedJob.preferredSkills &&
                        selectedJob.preferredSkills.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Preferred Skills</h4>
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
                          note="Upload resumes in PDF format (max 10MB per file)"
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

                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={processFiles}
                            disabled={
                              uploadedFiles.length === 0 || isProcessing
                            }
                            className="gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing Files...
                              </>
                            ) : (
                              <>
                                Process Files
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="justify-between border-t pt-4 text-xs text-muted-foreground">
            <p>
              Files are processed using FastAPI and your NER model before being
              stored in Firestore
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
