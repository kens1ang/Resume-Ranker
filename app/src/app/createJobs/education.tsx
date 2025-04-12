"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown } from "lucide-react";
import educationData from "./education.json";

// Enhanced Degree interface with field
interface Degree {
  level: string;
  degreeType: string;
  field?: string;
}

interface EducationSectionProps {
  preferredDegrees: Degree[];
  setPreferredDegrees: (degrees: Degree[]) => void;
}

export function EducationSection({
  preferredDegrees,
  setPreferredDegrees,
}: EducationSectionProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedDegreeType, setSelectedDegreeType] = useState<string | null>(
    null
  );
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Fetch fields of study from the API endpoint
  useEffect(() => {
    const fetchFields = async () => {
      setIsLoadingFields(true);
      try {
        const response = await fetch("http://localhost:8000/degrees");
        if (!response.ok) {
          throw new Error("Failed to fetch fields of study");
        }
        const data = await response.json();
        setFields(data.degrees || []);
      } catch (error) {
        console.error("Error fetching fields of study:", error);
      } finally {
        setIsLoadingFields(false);
      }
    };

    fetchFields();
  }, []);

  // Format fields for combobox
  const fieldOptions = fields.map((field) => ({
    value: field,
    label: field,
  }));

  // Handle selecting preferred degrees
  const handlePreferredDegreeSelect = (
    level: string,
    degreeType: string,
    field: string
  ) => {
    // Check if this degree+field is already selected
    const isDegreeSelected = preferredDegrees.some(
      (deg) =>
        deg.level === level &&
        deg.degreeType === degreeType &&
        deg.field === field
    );

    if (isDegreeSelected) {
      // Remove it if already selected
      setPreferredDegrees(
        preferredDegrees.filter(
          (deg) =>
            !(
              deg.level === level &&
              deg.degreeType === degreeType &&
              deg.field === field
            )
        )
      );
    } else {
      // Add it if not selected
      setPreferredDegrees([...preferredDegrees, { level, degreeType, field }]);
    }
  };

  // Format degree for display
  const formatDegreeForDisplay = (degree: Degree) => {
    if (degree.field) {
      return `${degree.degreeType} in ${degree.field}`;
    }
    return degree.degreeType;
  };

  // Remove a preferred degree
  const removePreferredDegree = (index: number) => {
    setPreferredDegrees(preferredDegrees.filter((_, i) => i !== index));
  };

  const addDegree = () => {
    if (selectedLevel && selectedDegreeType && selectedField) {
      setPreferredDegrees([
        ...preferredDegrees,
        {
          level: selectedLevel,
          degreeType: selectedDegreeType,
          field: selectedField, // Make sure this is being set
        },
      ]);
      // Reset selection states
      setSelectedLevel(null);
      setSelectedDegreeType(null);
      setSelectedField(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Education Requirements</h3>
        </div>

        <div className="w-3/5 space-y-6">
          <div>
            <Label className="mb-2 block">Preferred Qualifications</Label>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Degree Level
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        role="combobox"
                      >
                        {selectedLevel || "Select level"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                      {educationData.degrees.map((levelGroup) => (
                        <DropdownMenuItem
                          key={levelGroup.level}
                          onClick={() => {
                            setSelectedLevel(levelGroup.level);
                            if (levelGroup.degrees.length === 1) {
                              setSelectedDegreeType(levelGroup.degrees[0]);
                            } else {
                              setSelectedDegreeType(null);
                            }
                          }}
                        >
                          {levelGroup.level}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Degree Type
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        role="combobox"
                        disabled={!selectedLevel}
                      >
                        {selectedDegreeType || "Select type"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                      {selectedLevel &&
                        educationData.degrees
                          .find((group) => group.level === selectedLevel)
                          ?.degrees.map((degree) => (
                            <DropdownMenuItem
                              key={degree}
                              onClick={() => setSelectedDegreeType(degree)}
                            >
                              {degree}
                            </DropdownMenuItem>
                          ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Field of Study
                  </Label>
                  <Combobox
                    options={fieldOptions}
                    value={selectedField || ""}
                    onChange={setSelectedField}
                    placeholder="Select or search field"
                    disabled={!selectedLevel || !selectedDegreeType}
                    emptyMessage={
                      isLoadingFields ? "Loading fields..." : "No fields found."
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={
                  !selectedLevel || !selectedDegreeType || !selectedField
                }
                onClick={addDegree}
              >
                Add Preferred Qualification
              </Button>
            </div>

            {/* Display selected preferred degrees */}
            {preferredDegrees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {preferredDegrees.map((deg, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1 px-2 py-1"
                  >
                    {formatDegreeForDisplay(deg)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removePreferredDegree(index)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
