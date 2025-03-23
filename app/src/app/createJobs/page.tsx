"use client";

import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { FileText, Save, X, ChevronDown, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CreateJobPage() {
  // Initialize Firestore
  const db = getFirestore(app);
  const { toast } = useToast();

  // Add client-side only initialization with useEffect
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    requiredDegree: "",
    preferredDegree: "",
    additionalRequirements: "",
  });

  // Skills and responsibilities as separate arrays for tag-based input
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");

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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add a skill when Enter is pressed
  const handleSkillKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "required" | "preferred"
  ) => {
    if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
      e.preventDefault();

      if (type === "required") {
        if (!requiredSkills.includes(newRequiredSkill.trim())) {
          setRequiredSkills([...requiredSkills, newRequiredSkill.trim()]);
          setNewRequiredSkill("");
        }
      } else {
        if (!preferredSkills.includes(newPreferredSkill.trim())) {
          setPreferredSkills([...preferredSkills, newPreferredSkill.trim()]);
          setNewPreferredSkill("");
        }
      }
    }
  };

  // Add a responsibility when Enter is pressed
  const handleResponsibilityKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
      e.preventDefault();
      addResponsibility();
    }
  };

  // Add responsibility with button or Enter key
  const addResponsibility = () => {
    if (newResponsibility.trim() !== "") {
      setResponsibilities([...responsibilities, newResponsibility.trim()]);
      setNewResponsibility("");
    }
  };

  // Remove a skill
  const removeSkill = (skill: string, type: "required" | "preferred") => {
    if (type === "required") {
      setRequiredSkills(requiredSkills.filter((s) => s !== skill));
    } else {
      setPreferredSkills(preferredSkills.filter((s) => s !== skill));
    }
  };

  // Remove a responsibility
  const removeResponsibility = (responsibility: string) => {
    setResponsibilities(responsibilities.filter((r) => r !== responsibility));
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
      requiredDegree: "",
      preferredDegree: "",
      additionalRequirements: "",
    });
    setRequiredSkills([]);
    setPreferredSkills([]);
    setResponsibilities([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine form data with arrays for submission
      const jobData = {
        ...formData,
        requiredSkills,
        preferredSkills,
        responsibilities,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add document to "jobs" collection
      const docRef = await addDoc(collection(db, "jobs"), jobData);

      toast({
        title: "Success!",
        description: `Job created with ID: ${docRef.id}`,
      });

      // Reset form after successful submission
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

  // Common education options for dropdown
  const educationOptions = [
    { value: "high-school", label: "High School" },
    { value: "associates", label: "Associate's Degree" },
    { value: "bachelors", label: "Bachelor's Degree" },
    { value: "masters", label: "Master's Degree" },
    { value: "phd", label: "PhD" },
  ];

  // Don't render the real content until client-side hydration is complete
  if (!isClient) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full">
      <AppHeader />

      <main className="flex-1 px-6 py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Create Job</CardTitle>
            <CardDescription>
              Fill in the details for the new job position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    placeholder="e.g. Software Engineer"
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requiredDegree">Required Degree</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          role="combobox"
                        >
                          {formData.requiredDegree
                            ? educationOptions.find(
                                (opt) => opt.value === formData.requiredDegree
                              )?.label
                            : "Select degree requirement"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        {educationOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() =>
                              handleSelectChange("requiredDegree", option.value)
                            }
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredDegree">Preferred Degree</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          role="combobox"
                        >
                          {formData.preferredDegree
                            ? educationOptions.find(
                                (opt) => opt.value === formData.preferredDegree
                              )?.label
                            : "Select preferred degree"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        {educationOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() =>
                              handleSelectChange(
                                "preferredDegree",
                                option.value
                              )
                            }
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="requiredSkills">Required Skills</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {requiredSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 px-2 py-1"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeSkill(skill, "required")}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {skill}</span>
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="requiredSkills"
                    placeholder="Type a skill and press Enter"
                    value={newRequiredSkill}
                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                    onKeyDown={(e) => handleSkillKeyDown(e, "required")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredSkills">Preferred Skills</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {preferredSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="gap-1 px-2 py-1"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeSkill(skill, "preferred")}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {skill}</span>
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    id="preferredSkills"
                    placeholder="Type a skill and press Enter"
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    onKeyDown={(e) => handleSkillKeyDown(e, "preferred")}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsibilities</Label>

                  {/* List of responsibilities */}
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
                          onClick={() => removeResponsibility(responsibility)}
                          className="h-7 w-7 p-0"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add new responsibility */}
                  <div className="flex gap-2">
                    <Input
                      id="newResponsibility"
                      placeholder="Type a responsibility and press Enter"
                      value={newResponsibility}
                      onChange={(e) => setNewResponsibility(e.target.value)}
                      onKeyDown={handleResponsibilityKeyDown}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addResponsibility}
                      variant="outline"
                      size="icon"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add Responsibility</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="additionalRequirements">
                    Additional Requirements
                  </Label>
                  <Textarea
                    id="additionalRequirements"
                    name="additionalRequirements"
                    placeholder="Enter any additional requirements or notes"
                    rows={4}
                    value={formData.additionalRequirements}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
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
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
