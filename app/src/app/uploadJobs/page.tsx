"use client";

import { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Save, Loader2, Upload, Sparkles, X } from "lucide-react";
import { app } from "@/firebase/firebaseConfig";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { WeightageSection } from "../createJobs/weightage";
import { JobDescriptionUpload } from "./jobDescription";
import { extractJobData } from "@/lib/jobParser";
import { Input } from "@/components/ui/input";

export default function UploadJobPage() {
  // Initialize Firestore
  const db = getFirestore(app);
  const { toast } = useToast();

  const formRef = useRef<HTMLFormElement>(null);

  // Add client-side only initialization with useEffect
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({
    jobDescription: "",
    jobTitle: "",
    workArrangement: "",
    roleSummary: "",
    companyDescription: "",
    preferredDegree: "",
  });

  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);

  const [weightages, setWeightages] = useState({
    skills: "medium" as "high" | "medium" | "low",
    education: "medium" as "high" | "medium" | "low",
    responsibilities: "medium" as "high" | "medium" | "low",
  });

  // This ensures hydration happens safely
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleJobDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      jobDescription: value,
    }));
  };

  const handleWeightChange = (
    category: string,
    value: "high" | "medium" | "low"
  ) => {
    setWeightages((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.jobTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a job title",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.jobDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required",
        variant: "destructive",
      });
      return false;
    }

    if (requiredSkills.length === 0 && preferredSkills.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "No skills could be extracted. Try rewording your job description or adding a skills section.",
        variant: "destructive",
      });
      return false;
    }

    if (responsibilities.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "No responsibilities could be extracted. Please check your job description.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setFormData({
      jobDescription: "",
      jobTitle: "",
      workArrangement: "",
      roleSummary: "",
      companyDescription: "",
      preferredDegree: "",
    });
    setRequiredSkills([]);
    setPreferredSkills([]);
    setResponsibilities([]);
    setWeightages({
      skills: "medium",
      education: "medium",
      responsibilities: "medium",
    });
  };

  const getWeightPercentage = (priority: "high" | "medium" | "low"): number => {
    switch (priority) {
      case "high":
        return 50;
      case "medium":
        return 30;
      case "low":
        return 20;
    }
  };

  const handleExtract = async () => {
    if (!formData.jobDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required for extraction",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      toast({
        title: "Extracting Job Details",
        description: "Please wait while we analyze the job description...",
      });

      const extractedData = await extractJobData(formData.jobDescription);

      if (!extractedData) {
        throw new Error("Failed to extract job data");
      }

      // Update form with extracted data
      setFormData((prev) => ({
        ...prev,
        workArrangement: extractedData.workArrangement || "",
        roleSummary: extractedData.roleSummary || "",
        companyDescription: extractedData.companyDescription || "",
        preferredDegree: extractedData.preferredDegree || "",
      }));

      // Update skills and responsibilities
      setRequiredSkills(extractedData.requiredSkills || []);
      setPreferredSkills(extractedData.preferredSkills || []);
      setResponsibilities(extractedData.responsibilities || []);

      toast({
        title: "Success!",
        description: "Job details extracted successfully",
      });
    } catch (error) {
      console.error("Error extracting job details:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to extract job details: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jobDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // If no job details have been extracted yet, do it automatically
      if (requiredSkills.length === 0 && responsibilities.length === 0) {
        toast({
          title: "Extracting Job Details",
          description: "Please wait while we analyze the job description...",
        });

        try {
          const extractedData = await extractJobData(formData.jobDescription);

          if (!extractedData) {
            throw new Error("Failed to extract job data");
          }

          // Update form with extracted data
          setFormData((prev) => ({
            ...prev,
            workArrangement: extractedData.workArrangement || "",
            roleSummary: extractedData.roleSummary || "",
            companyDescription: extractedData.companyDescription || "",
            preferredDegree: extractedData.preferredDegree || "",
          }));

          setRequiredSkills(extractedData.requiredSkills || []);
          setPreferredSkills(extractedData.preferredSkills || []);
          setResponsibilities(extractedData.responsibilities || []);

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (extractError) {
          console.error("Error extracting job details:", extractError);
          toast({
            title: "Extraction Error",
            description:
              "Failed to extract job details. Please try the Extract button first.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const jobData = {
        // Original job description
        jobDescription: formData.jobDescription,

        // Extracted fields
        jobTitle: formData.jobTitle,
        workArrangement: formData.workArrangement,
        roleSummary: formData.roleSummary,
        companyDescription: formData.companyDescription,
        preferredDegree: formData.preferredDegree,
        requiredSkills,
        preferredSkills,
        responsibilities,

        // Weightages
        weightages: {
          skills: getWeightPercentage(weightages.skills), // These are the actual percentage values
          education: getWeightPercentage(weightages.education), // e.g., 50, 30, 20
          responsibilities: getWeightPercentage(weightages.responsibilities),
        },

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "jobs"), jobData);

      toast({
        title: "Success!",
        description: `Job created with ID: ${docRef.id}`,
      });

      resetForm();
    } catch (error) {
      console.error("Error processing job:", error);
      toast({
        title: "Error",
        description: "Failed to process and upload job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 px-6 py-8">
        <div className="flex justify-between">
          <div className="flex flex-col mb-6">
            <span className="font-bold text-2xl">Upload Job</span>
            <span className="text-gray-400">
              Paste your job description, then extract details or directly
              upload. The system will analyze the description automatically if
              needed.
            </span>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={resetForm}
              type="button"
              disabled={isSubmitting || isExtracting}
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSubmitting || isExtracting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="mt-6"
        >
          <div className="flex flex-col">
            <div className="space-y-4 p-4">
              <JobDescriptionUpload
                jobDescription={formData.jobDescription}
                onJobDescriptionChange={handleJobDescriptionChange}
              />

              <div className="mt-6">
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h3 className="font-medium text-lg">Job Title</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the job title
                    </p>
                  </div>

                  <div className="w-3/5">
                    <div className="flex items-center gap-3">
                      <Input
                        id="jobTitle"
                        name="jobTitle"
                        placeholder="e.g. Senior Software Engineer"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            jobTitle: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                      {formData.jobTitle && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, jobTitle: "" }))
                          }
                          type="button"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleExtract}
                  disabled={isExtracting || !formData.jobDescription.trim()}
                  className="gap-2"
                  variant="secondary"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Extract Job Details
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Display extracted data as read-only */}
            {(formData.jobTitle ||
              requiredSkills.length > 0 ||
              responsibilities.length > 0) && (
              <div className="bg-slate-50 p-4 rounded-md border mt-4">
                <h3 className="font-medium text-lg mb-4">
                  Extracted Job Details
                </h3>

                <div className="space-y-4">
                  {formData.jobTitle && (
                    <div>
                      <h4 className="font-medium">Job Title</h4>
                      <p>{formData.jobTitle}</p>
                    </div>
                  )}

                  {formData.workArrangement && (
                    <div>
                      <h4 className="font-medium">Work Arrangement</h4>
                      <p>{formData.workArrangement}</p>
                    </div>
                  )}

                  {formData.preferredDegree && (
                    <div>
                      <h4 className="font-medium">Preferred Degree</h4>
                      <p>{formData.preferredDegree}</p>
                    </div>
                  )}

                  {requiredSkills.length > 0 && (
                    <div>
                      <h4 className="font-medium">Required Skills</h4>
                      <ul className="list-disc pl-5">
                        {requiredSkills.map((skill, index) => (
                          <li key={`req-skill-${index}`}>{skill}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preferredSkills.length > 0 && (
                    <div>
                      <h4 className="font-medium">Preferred Skills</h4>
                      <ul className="list-disc pl-5">
                        {preferredSkills.map((skill, index) => (
                          <li key={`pref-skill-${index}`}>{skill}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {responsibilities.length > 0 && (
                    <div>
                      <h4 className="font-medium">Responsibilities</h4>
                      <ul className="list-disc pl-5">
                        {responsibilities.map((resp, index) => (
                          <li key={`resp-${index}`}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <div className="flex flex-col">
              <WeightageSection
                skillsWeight={weightages.skills}
                educationWeight={weightages.education}
                responsibilitiesWeight={weightages.responsibilities}
                onWeightChange={handleWeightChange}
              />
            </div>

            <div className="hidden">
              <button type="submit" aria-hidden="true"></button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
