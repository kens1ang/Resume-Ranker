"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown } from "lucide-react";
import educationData from "./education.json";

// Define types for the degree and props
interface Degree {
  level: string;
  degreeType: string;
}

interface EducationSectionProps {
  requiredDegree: Degree | null;
  preferredDegrees: Degree[];
  // Remove selectedFields from props
  setRequiredDegree: (degree: Degree | null) => void;
  setPreferredDegrees: (degrees: Degree[]) => void;
  // Remove setSelectedFields from props
}

export function EducationSection({
  requiredDegree,
  preferredDegrees,
  setRequiredDegree,
  setPreferredDegrees,
}: EducationSectionProps) {
  // Handle selecting the required degree level and type
  const handleRequiredDegreeSelect = (level: string, degreeType: string) => {
    setRequiredDegree({
      level,
      degreeType,
    });
  };

  // Handle selecting preferred degrees
  const handlePreferredDegreeSelect = (level: string, degreeType: string) => {
    // Check if this degree is already selected
    const isDegreeSelected = preferredDegrees.some(
      (deg) => deg.level === level && deg.degreeType === degreeType
    );

    if (isDegreeSelected) {
      // Remove it if already selected
      setPreferredDegrees(
        preferredDegrees.filter(
          (deg) => !(deg.level === level && deg.degreeType === degreeType)
        )
      );
    } else {
      // Add it if not selected
      setPreferredDegrees([...preferredDegrees, { level, degreeType }]);
    }
  };

  // Format degree for display
  const formatDegreeForDisplay = (level: string, degreeType: string) => {
    return `${degreeType} (${level})`;
  };

  // Remove a preferred degree
  const removePreferredDegree = (level: string, degreeType: string) => {
    setPreferredDegrees(
      preferredDegrees.filter(
        (deg) => !(deg.level === level && deg.degreeType === degreeType)
      )
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Education Requirements</h3>
        </div>

        <div className="w-3/5 flex justify-between gap-16">
          {/* Required Degree Selection */}
          <div className="w-1/2">
            <Label>Required Qualification</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  role="combobox"
                >
                  {requiredDegree
                    ? formatDegreeForDisplay(
                        requiredDegree.level,
                        requiredDegree.degreeType
                      )
                    : "Select required qualification"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                {educationData.degrees.map((levelGroup) => (
                  <div key={levelGroup.level}>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-sm font-semibold">
                      {levelGroup.level}
                    </div>
                    {levelGroup.degrees.map((degree) => (
                      <DropdownMenuItem
                        key={degree}
                        onClick={() =>
                          handleRequiredDegreeSelect(levelGroup.level, degree)
                        }
                      >
                        {degree}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preferred Degrees Selection */}
          <div className="w-1/2">
            <Label>Preferred Qualifications (Optional)</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  role="combobox"
                >
                  {preferredDegrees.length > 0
                    ? `${preferredDegrees.length} qualifications selected`
                    : "Select preferred qualifications"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                {educationData.degrees.map((levelGroup) => (
                  <div key={levelGroup.level}>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-sm font-semibold">
                      {levelGroup.level}
                    </div>
                    {levelGroup.degrees.map((degree) => {
                      const isSelected = preferredDegrees.some(
                        (deg) =>
                          deg.level === levelGroup.level &&
                          deg.degreeType === degree
                      );
                      return (
                        <DropdownMenuCheckboxItem
                          key={degree}
                          checked={isSelected}
                          onCheckedChange={() =>
                            handlePreferredDegreeSelect(
                              levelGroup.level,
                              degree
                            )
                          }
                        >
                          {degree}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Display selected preferred degrees */}
            {preferredDegrees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {preferredDegrees.map((deg, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1 px-2 py-1"
                  >
                    {formatDegreeForDisplay(deg.level, deg.degreeType)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() =>
                        removePreferredDegree(deg.level, deg.degreeType)
                      }
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
