"use client";

import { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EducationSection } from "./education";
import { SkillsSection } from "./skills";
import {
  ResponsibilitiesSection,
  ResponsibilitiesSectionRef,
} from "./responsibilities";
import { JobInfoSection } from "./jobInfo";
import { Save, Loader2 } from "lucide-react";

// Define the Degree type
interface Degree {
  level: string;
  degreeType: string;
  field?: string;
}

export default function CreateJobPage() {
  // Initialize Firestore
  const db = getFirestore(app);
  const { toast } = useToast();

  // Add client-side only initialization with useEffect
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
  });

  // Education requirements
  const [preferredDegrees, setPreferredDegrees] = useState<Degree[]>([]);

  // Skills and responsibilities as separate arrays for tag-based input
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);

  const responsibilitiesRef = useRef<ResponsibilitiesSectionRef>(null);

  // This ensures hydration happens safely
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  const resetForm = () => {
    setFormData({
      jobTitle: "",
    });
    setPreferredDegrees([]);
    setRequiredSkills([]);
    setPreferredSkills([]);
    setResponsibilities([]);
    if (responsibilitiesRef.current?.resetInput) {
      responsibilitiesRef.current.resetInput();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Add any pending responsibility before validation
    if (responsibilitiesRef.current) {
      responsibilitiesRef.current.addPendingResponsibility();

      // Need a small delay to ensure state updates before validation
      await new Promise((resolve) => setTimeout(resolve, 0));
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

      const jobData = {
        jobTitle: formData.jobTitle,
        preferredDegree: formattedPreferredDegrees,
        requiredSkills,
        preferredSkills,
        responsibilities: allResponsibilities,
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
      console.error("Error adding job to Firestore:", error);
      toast({
        title: "Error",
        description: "Failed to save job. Please try again.",
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
            <span className="font-bold text-2xl">Create Job</span>
            <span className="text-gray-400">
              Fill in the details for the new job position
            </span>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={resetForm}
              type="button"
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Job
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
              onJobTitleChange={handleInputChange}
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
          </div>
        </form>
      </main>
    </div>
  );
}
