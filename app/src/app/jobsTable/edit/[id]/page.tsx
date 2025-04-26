"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import React from "react";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EducationSection } from "../../../createJobs/education";
import { SkillsSection } from "../../../createJobs/skills";
import {
  ResponsibilitiesSection,
  ResponsibilitiesSectionRef,
} from "../../../createJobs/responsibilities";
import { JobInfoSection } from "../../../createJobs/jobInfo";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import { WeightageSection } from "../../../../components/weightage";
import Link from "next/link";

// Define the Degree type
interface Degree {
  level: string;
  degreeType: string;
  field?: string;
}

export default function EditJobPage() {
  const params = useParams();
  const jobId = params.id as string;
  // Initialize Firestore and router
  const db = getFirestore(app);
  const router = useRouter();
  const { toast } = useToast();

  // State management
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    workArrangement: "",
    roleSummary: "",
    companyDescription: "",
    jobDescription: "",
  });

  const [weightages, setWeightages] = useState({
    skills: "medium" as "high" | "medium" | "low",
    education: "medium" as "high" | "medium" | "low",
    responsibilities: "medium" as "high" | "medium" | "low",
  });

  const [preferredDegrees, setPreferredDegrees] = useState<Degree[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);

  const responsibilitiesRef = useRef<ResponsibilitiesSectionRef>(null);

  // This ensures hydration happens safely
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch job data
  useEffect(() => {
    async function fetchJobData() {
      if (!jobId) return;

      try {
        const jobRef = doc(db, "jobs", jobId);
        const jobSnap = await getDoc(jobRef);

        if (jobSnap.exists()) {
          const data = jobSnap.data();

          // Set form data
          setFormData({
            jobTitle: data.jobTitle || "",
            workArrangement: data.workArrangement || "",
            roleSummary: data.roleSummary || "",
            companyDescription: data.companyDescription || "",
            jobDescription: data.jobDescription || "",
          });

          // Set skills and responsibilities
          setRequiredSkills(data.requiredSkills || []);
          setPreferredSkills(data.preferredSkills || []);
          setResponsibilities(data.responsibilities || []);

          // Parse preferred degrees from string format
          // Replace lines 98-103 with this code:

          if (data.preferredDegree) {
            const degreeParts = data.preferredDegree
              .split(";")
              .map((d: string) => d.trim());
            const parsedDegrees = degreeParts.map((degreePart: string) => {
              const match = degreePart.match(/(.+) in (.+)/);
              if (match) {
                return {
                  level: "",
                  degreeType: match[1].trim(),
                  field: match[2].trim(),
                };
              }
              return {
                level: "",
                degreeType: degreePart,
                field: "",
              };
            });
            setPreferredDegrees(parsedDegrees);
          }

          // Convert numeric weightages to high/medium/low
          if (data.weightages) {
            setWeightages({
              skills: getWeightCategory(data.weightages.skills),
              education: getWeightCategory(data.weightages.education),
              responsibilities: getWeightCategory(
                data.weightages.responsibilities
              ),
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Job not found",
            variant: "destructive",
          });
          router.push("/jobsTable");
        }
      } catch (error) {
        console.error("Error fetching job:", error);
        toast({
          title: "Error",
          description: "Failed to load job details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchJobData();
  }, [db, jobId, router, toast]);

  const getWeightCategory = (value: number): "high" | "medium" | "low" => {
    if (value >= 40) return "high";
    if (value >= 30) return "medium";
    return "low";
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add a handler for the Select component:
  const handleWorkArrangementChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      workArrangement: value,
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
        description: "Job title is required",
        variant: "destructive",
      });
      return false;
    }

    if (requiredSkills.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one required skill is needed",
        variant: "destructive",
      });
      return false;
    }

    if (responsibilities.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one responsibility is needed",
        variant: "destructive",
      });
      return false;
    }

    return true;
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

  const formatJobDescription = (
    data: any,
    reqSkills: string[],
    prefSkills: string[],
    resps: string[]
  ) => {
    // Basic template
    let template = `Company: ${data.companyDescription || "Not specified"}
  
Position: ${data.jobTitle || "Not specified"}
Location: ${data.workArrangement || "Not specified"}

Role Summary:
${data.roleSummary || "Not specified"}
`;

    // Add preferred degrees if available
    if (preferredDegrees.length > 0) {
      template += `\nMinimum Qualifications:`;
      preferredDegrees.forEach((degree) => {
        template += `\n• ${degree.level} ${degree.degreeType}${
          degree.field ? ` in ${degree.field}` : ""
        }`;
      });
    }

    // Add required skills
    if (reqSkills.length > 0) {
      template += `\n\nRequired Skills:`;
      reqSkills.forEach((skill) => {
        template += `\n• ${skill}`;
      });
    }

    // Add preferred skills if available
    if (prefSkills.length > 0) {
      template += `\n\nPreferred Skills:`;
      prefSkills.forEach((skill) => {
        template += `\n• ${skill}`;
      });
    }

    // Add responsibilities
    if (resps.length > 0) {
      template += `\n\nKey Responsibilities:`;
      resps.forEach((resp) => {
        template += `\n• ${resp}`;
      });
    }

    return template;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Add any pending responsibility before validation
    if (responsibilitiesRef.current) {
      responsibilitiesRef.current.addPendingResponsibility();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPreferredDegrees =
        preferredDegrees.length > 0
          ? preferredDegrees
              .map((deg) => `${deg.degreeType} in ${deg.field || ""}`)
              .join("; ")
          : "";

      const allResponsibilities = [...responsibilities];

      const weights = calculateWeightDistribution(
        weightages.skills,
        weightages.education,
        weightages.responsibilities
      );

      const formattedJobDescription = formatJobDescription(
        formData,
        requiredSkills,
        preferredSkills,
        allResponsibilities
      );

      const jobData = {
        jobTitle: formData.jobTitle,
        workArrangement: formData.workArrangement,
        roleSummary: formData.roleSummary,
        companyDescription: formData.companyDescription,
        preferredDegree: formattedPreferredDegrees,
        requiredSkills,
        preferredSkills,
        responsibilities: allResponsibilities,
        jobDescription: formattedJobDescription,
        weightages: {
          skills: weights.skills,
          education: weights.education,
          responsibilities: weights.responsibilities,
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "jobs", jobId), jobData);

      toast({
        title: "Success!",
        description: "Job updated successfully",
      });

      router.push("/jobsTable");
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return <div className="p-8">Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col w-full">
        <AppHeader />
        <main className="flex-1 p-6 flex justify-center items-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 px-6 py-8">
        <div className="flex justify-between">
          <div className="flex flex-col mb-6">
            <div className="flex items-center">
              <Link href="/jobsTable">
                <Button variant="outline" size="icon" className="mr-4">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <span className="font-bold text-2xl">Edit Job</span>
            </div>
            <span className="text-gray-400 mt-1">
              Update the job details and save changes
            </span>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Job
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="mt-6"
        >
          <div className="flex flex-col">
            <JobInfoSection
              jobTitle={formData.jobTitle}
              workArrangement={formData.workArrangement}
              roleSummary={formData.roleSummary}
              companyDescription={formData.companyDescription}
              onJobTitleChange={handleInputChange}
              onWorkArrangementChange={handleWorkArrangementChange}
              onRoleSummaryChange={handleInputChange}
              onCompanyDescriptionChange={handleInputChange}
            />

            <Separator />

            <div>
              <EducationSection
                preferredDegrees={preferredDegrees}
                setPreferredDegrees={setPreferredDegrees}
              />
            </div>

            <Separator />

            <div>
              <SkillsSection
                requiredSkills={requiredSkills}
                preferredSkills={preferredSkills}
                setRequiredSkills={setRequiredSkills}
                setPreferredSkills={setPreferredSkills}
              />
            </div>

            <Separator />

            <div className="flex flex-col">
              <ResponsibilitiesSection
                ref={responsibilitiesRef}
                responsibilities={responsibilities}
                setResponsibilities={setResponsibilities}
              />
            </div>

            <Separator />

            <div className="flex flex-col">
              <WeightageSection
                skillsWeight={weightages.skills}
                educationWeight={weightages.education}
                responsibilitiesWeight={weightages.responsibilities}
                onWeightChange={handleWeightChange}
              />
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
