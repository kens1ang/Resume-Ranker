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
import { WeightageSection } from "../../components/weightage";
import { JobDescriptionUpload } from "./jobDescription";
import { extractJobData } from "@/lib/jobParser";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UploadJobPage() {
  // Initialize Firestore
  const db = getFirestore(app);
  const { toast } = useToast();

  const formRef = useRef<HTMLFormElement>(null);

  // Add client-side only initialization with useEffect
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    jobDescription: "",
    jobTitle: "",
    workArrangement: "",
    roleSummary: "",
    companyDescription: "",
    preferredDegree: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
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
    setExtractionComplete(false);
    setReviewConfirmed(false);
  };

  const calculateWeightDistribution = (
    skills: "high" | "medium" | "low",
    education: "high" | "medium" | "low",
    responsibilities: "high" | "medium" | "low"
  ) => {
    // Convert priorities to numeric values
    const priorityToValue = (priority: "high" | "medium" | "low"): number => {
      switch (priority) {
        case "high":
          return 5;
        case "medium":
          return 3;
        case "low":
          return 1;
      }
    };

    const values = {
      skills: priorityToValue(skills),
      education: priorityToValue(education),
      responsibilities: priorityToValue(responsibilities),
    };

    // Calculate sum
    const total = values.skills + values.education + values.responsibilities;

    // Calculate percentages
    let distribution = {
      skills: Math.round((values.skills / total) * 100),
      education: Math.round((values.education / total) * 100),
      responsibilities: Math.round((values.responsibilities / total) * 100),
    };

    // Ensure total is exactly 100% (fix rounding errors)
    const sum =
      distribution.skills +
      distribution.education +
      distribution.responsibilities;
    if (sum !== 100) {
      // Adjust the largest value
      const keys = ["skills", "education", "responsibilities"] as const;
      const largestKey = keys.reduce((a, b) =>
        distribution[a] > distribution[b] ? a : b
      );
      distribution[largestKey] += 100 - sum;
    }

    return distribution;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jobTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a job title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.jobDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required",
        variant: "destructive",
      });
      return;
    }

    // If we've already extracted and now we're confirming the upload
    if (extractionComplete) {
      // Run validation only after extraction is complete
      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const weights = calculateWeightDistribution(
          weightages.skills,
          weightages.education,
          weightages.responsibilities
        );

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
            skills: weights.skills,
            education: weights.education,
            responsibilities: weights.responsibilities,
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
        setExtractionComplete(false);
        setReviewConfirmed(false);
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
      return;
    }

    // If we're still at the extraction step
    setIsExtracting(true);

    try {
      // Extract job details
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

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Mark extraction as complete
      setExtractionComplete(true);

      toast({
        title: "Job Details Extracted",
        description:
          "Please review and edit the extracted details below before uploading.",
      });

      setIsSubmitting(false);
      return;
    } catch (extractError) {
      console.error("Error extracting job details:", extractError);
      toast({
        title: "Extraction Error",
        description: "Failed to extract job details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
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

            <div className="relative">
              {extractionComplete && !reviewConfirmed && (
                <div className="absolute -top-10 right-0 bg-red-400 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Please confirm review first
                </div>
              )}
              <Button
                onClick={handleSubmit}
                className="gap-2"
                disabled={
                  isSubmitting ||
                  isExtracting ||
                  (extractionComplete && !reviewConfirmed)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : extractionComplete ? (
                  <>
                    <Save className="h-4 w-4" />
                    Upload Job
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extract Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {extractionComplete && (
          <>
            <Separator className="my-6" />

            <div className="space-y-6 p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Extracted Information</h3>
                <p className="text-sm text-muted-foreground">
                  Review and edit the extracted information before uploading
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-muted">
                <input
                  type="checkbox"
                  id="reviewConfirmed"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="reviewConfirmed"
                  className="text-sm font-medium"
                >
                  I have reviewed all extracted job details and confirmed they
                  are correct
                </label>
              </div>

              <div className="space-y-4">
                {/* Work Arrangement */}
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Work Arrangement</h4>
                  </div>
                  <div className="w-3/5">
                    <Select
                      value={formData.workArrangement}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          workArrangement: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select work arrangement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Role Summary */}
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Role Summary</h4>
                  </div>
                  <div className="w-3/5">
                    <Textarea
                      value={formData.roleSummary}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          roleSummary: e.target.value,
                        }))
                      }
                      placeholder="Role summary..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                {/* Company Description */}
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Company Description</h4>
                  </div>
                  <div className="w-3/5">
                    <Textarea
                      value={formData.companyDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          companyDescription: e.target.value,
                        }))
                      }
                      placeholder="Company description..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                {/* Preferred Degree */}
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Preferred Degree</h4>
                  </div>
                  <div className="w-3/5">
                    <Input
                      value={formData.preferredDegree}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferredDegree: e.target.value,
                        }))
                      }
                      placeholder="e.g. Bachelor's in Computer Science"
                    />
                  </div>
                </div>

                {/* Required Skills */}
                <div className="flex justify-between">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Required Skills</h4>
                  </div>
                  <div className="w-3/5">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {requiredSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          className="pl-2 pr-1 py-1 flex items-center gap-1"
                        >
                          {skill}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() =>
                              setRequiredSkills(
                                requiredSkills.filter((_, i) => i !== index)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove {skill}</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="newRequiredSkill"
                        placeholder="Add a required skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSkill.trim()) {
                            e.preventDefault();
                            if (!requiredSkills.includes(newSkill.trim())) {
                              setRequiredSkills([
                                ...requiredSkills,
                                newSkill.trim(),
                              ]);
                            }
                            setNewSkill("");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (
                            newSkill.trim() &&
                            !requiredSkills.includes(newSkill.trim())
                          ) {
                            setRequiredSkills([
                              ...requiredSkills,
                              newSkill.trim(),
                            ]);
                            setNewSkill("");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Preferred Skills</h4>
                  </div>
                  <div className="w-3/5">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {preferredSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="pl-2 pr-1 py-1 flex items-center gap-1"
                        >
                          {skill}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() =>
                              setPreferredSkills(
                                preferredSkills.filter((_, i) => i !== index)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove {skill}</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="newPreferredSkill"
                        placeholder="Add a preferred skill..."
                        value={newPreferredSkill}
                        onChange={(e) => setNewPreferredSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newPreferredSkill.trim()) {
                            e.preventDefault();
                            if (
                              !preferredSkills.includes(
                                newPreferredSkill.trim()
                              )
                            ) {
                              setPreferredSkills([
                                ...preferredSkills,
                                newPreferredSkill.trim(),
                              ]);
                            }
                            setNewPreferredSkill("");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (
                            newPreferredSkill.trim() &&
                            !preferredSkills.includes(newPreferredSkill.trim())
                          ) {
                            setPreferredSkills([
                              ...preferredSkills,
                              newPreferredSkill.trim(),
                            ]);
                            setNewPreferredSkill("");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="flex justify-between mt-6">
                  <div className="w-2/5">
                    <h4 className="text-sm font-medium">Responsibilities</h4>
                  </div>
                  <div className="w-3/5">
                    <div className="space-y-2 mb-3">
                      {responsibilities.map((responsibility, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-md border border-input bg-background"
                        >
                          <div className="flex-1">{responsibility}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setResponsibilities(
                                responsibilities.filter((_, i) => i !== index)
                              )
                            }
                            className="h-7 w-7 p-0"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="newResponsibility"
                        placeholder="Add a responsibility..."
                        value={newResponsibility}
                        onChange={(e) => setNewResponsibility(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newResponsibility.trim()) {
                            e.preventDefault();
                            setResponsibilities([
                              ...responsibilities,
                              newResponsibility.trim(),
                            ]);
                            setNewResponsibility("");
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newResponsibility.trim()) {
                            setResponsibilities([
                              ...responsibilities,
                              newResponsibility.trim(),
                            ]);
                            setNewResponsibility("");
                          }
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
              <div>
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

              <JobDescriptionUpload
                jobDescription={formData.jobDescription}
                onJobDescriptionChange={handleJobDescriptionChange}
              />
            </div>

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
