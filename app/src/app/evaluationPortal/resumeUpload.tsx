"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";

// Import Uppy CSS
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

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
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  meta: any;
}

interface ResumeUploadProps {
  selectedJob: Job;
  onChangePosition: () => void;
  onComplete: () => void;
}

export function ResumeUpload({ selectedJob, onChangePosition, onComplete }: ResumeUploadProps) {
  const [uppy, setUppy] = useState<Uppy | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const db = getFirestore(app);

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
              name: file.name || "unnamed-file",
              type: file.type || "",
              size: file.size || 0,
              data: file.data,
              meta: file.meta || {},
            }))
          );
        }
      });

      // Set job metadata
      uppyInstance.setMeta({
        jobId: selectedJob.id,
        jobTitle: selectedJob.jobTitle,
      });

      setUppy(uppyInstance);
    }

    // Clean up Uppy instance on component unmount
    return () => {
      if (uppy) {
        uppy.cancelAll();
      }
    };
  }, [selectedJob, toast]);

  // Process files and store in Firestore with NER integration
  const processFiles = async () => {
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

          if (selectedJob?.additionalRequirements) {
            formData.append(
              "job_description",
              selectedJob.additionalRequirements
            );
          }

          const jobRequirements = {
            jobTitle: selectedJob.jobTitle,
            requiredSkills: selectedJob.requiredSkills || [],
            preferredSkills: selectedJob.preferredSkills || [],
            requiredDegree: selectedJob.requiredDegree || "",
            preferredDegree: selectedJob.preferredDegree || "",
            responsibilities: selectedJob.responsibilities || [],
            additionalRequirements: selectedJob.additionalRequirements || "",
            description: selectedJob.description || "",
          };
          formData.append(
            "job_requirements",
            JSON.stringify(jobRequirements)
          );

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
            const similarity = result.similarity || 0;
            
            const similarityScores = result.similarity_scores || {
              overall: result.similarity_scores?.overall || similarity,
              skills: result.similarity_scores?.skills || 0,
              education: result.similarity_scores?.education || 0,
              job_title: result.similarity_scores?.job_title || 0,
              responsibilities: result.similarity_scores?.responsibilities || 0,
            };

            // Store in Firestore
            console.log("Storing parsed resume in Firestore");
            console.log("Overall similarity:", similarityScores.overall);

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

            // Store in a collection named after the job title
            await addDoc(collection(db, "resumeSubmissions"), {
              jobId: selectedJob.id,
              jobTitle: selectedJob.jobTitle,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              candidateName: file.meta?.name || "Unknown",
              extractedText: extractedText,
              entityData: entityData,
              similarity: similarity,
              similarityScores: similarityScores,
              createdAt: serverTimestamp(),
            });

            // Success toast
            const overallPercent = (similarityScores.overall * 100).toFixed(1);
            const skillsPercent = (similarityScores.skills * 100).toFixed(1);
            const jobTitlePercent = (similarityScores.job_title * 100).toFixed(1);

            toast({
              title: "Success",
              description: `Processed: ${file.name} (Overall: ${overallPercent}%, Skills: ${skillsPercent}%, Job Match: ${jobTitlePercent}%)`,
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

        // Reset meta for the next batch
        uppy.setMeta({
          jobId: selectedJob.id,
          jobTitle: selectedJob.jobTitle,
        });
      }

      toast({
        title: "Processing Complete",
        description: `${uploadedFiles.length} file(s) processed`,
      });

      onComplete();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            Uploading for: {selectedJob.jobTitle}
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload candidate resumes to evaluate against this position
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onChangePosition}
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
              disabled={uploadedFiles.length === 0 || isProcessing}
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
  );
}