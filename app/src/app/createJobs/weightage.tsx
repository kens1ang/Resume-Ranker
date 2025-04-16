"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface WeightageSectionProps {
  skillsWeight: "high" | "medium" | "low";
  educationWeight: "high" | "medium" | "low";
  responsibilitiesWeight: "high" | "medium" | "low";
  onWeightChange: (category: string, value: "high" | "medium" | "low") => void;
}

export function WeightageSection({
  skillsWeight,
  educationWeight,
  responsibilitiesWeight,
  onWeightChange,
}: WeightageSectionProps) {
  // Function to get percentage value based on priority
  const getPercentage = (priority: "high" | "medium" | "low"): number => {
    switch (priority) {
      case "high": return 50;
      case "medium": return 30;
      case "low": return 20;
    }
  };

  // Calculate total to show preview to user
  const calculateTotal = (): number => {
    return (
      getPercentage(skillsWeight) +
      getPercentage(educationWeight) +
      getPercentage(responsibilitiesWeight)
    );
  };

  // Format priority for display
  const formatPriority = (priority: "high" | "medium" | "low"): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  // Get percentage value for display
  const getPriorityPercentage = (priority: "high" | "medium" | "low"): string => {
    return `${getPercentage(priority)}%`;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg flex items-center">
            Matching Priorities
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Set the importance of each category in the overall match score calculation.
                    High priority factors contribute 50%, medium 30%, and low 20% to the match score.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Determine how much emphasis to place on each factor when matching candidates.
          </p>
        </div>
        
        <div className="w-3/5 space-y-6">
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-md border">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-medium">Skills</Label>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                  {formatPriority(skillsWeight)} ({getPriorityPercentage(skillsWeight)})
                </span>
              </div>
              <RadioGroup 
                value={skillsWeight}
                onValueChange={(value) => onWeightChange("skills", value as "high" | "medium" | "low")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="skills-high" />
                  <Label htmlFor="skills-high" className="cursor-pointer">High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="skills-medium" />
                  <Label htmlFor="skills-medium" className="cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="skills-low" />
                  <Label htmlFor="skills-low" className="cursor-pointer">Low</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md border">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-medium">Education</Label>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                  {formatPriority(educationWeight)} ({getPriorityPercentage(educationWeight)})
                </span>
              </div>
              <RadioGroup 
                value={educationWeight}
                onValueChange={(value) => onWeightChange("education", value as "high" | "medium" | "low")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="education-high" />
                  <Label htmlFor="education-high" className="cursor-pointer">High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="education-medium" />
                  <Label htmlFor="education-medium" className="cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="education-low" />
                  <Label htmlFor="education-low" className="cursor-pointer">Low</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md border">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-medium">Responsibilities</Label>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                  {formatPriority(responsibilitiesWeight)} ({getPriorityPercentage(responsibilitiesWeight)})
                </span>
              </div>
              <RadioGroup 
                value={responsibilitiesWeight}
                onValueChange={(value) => onWeightChange("responsibilities", value as "high" | "medium" | "low")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="responsibilities-high" />
                  <Label htmlFor="responsibilities-high" className="cursor-pointer">High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="responsibilities-medium" />
                  <Label htmlFor="responsibilities-medium" className="cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="responsibilities-low" />
                  <Label htmlFor="responsibilities-low" className="cursor-pointer">Low</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex justify-between items-center pt-3 mt-2 border-t">
              <span className="text-sm font-medium">Effective Distribution:</span>
              <span className="text-sm font-medium">
                Skills: {getPriorityPercentage(skillsWeight)} • 
                Education: {getPriorityPercentage(educationWeight)} • 
                Responsibilities: {getPriorityPercentage(responsibilitiesWeight)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}