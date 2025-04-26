"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Loader2 } from "lucide-react";

interface Job {
  id: string;
  jobTitle: string;
  requiredDegree?: string;
  preferredDegree?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  description?: string;
  weightages?: {
    skills: number;
    education: number;
    responsibilities: number;
  };
}

interface SelectJobProps {
  jobs: Job[];
  isLoading: boolean;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  handleContinue: () => void;
}

export function SelectJob({
  jobs,
  isLoading,
  selectedJob,
  setSelectedJob,
  handleContinue,
}: SelectJobProps) {
  
  // Handle job selection
  const handleJobSelect = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job);
    }
  };

  // Format degree for display
  const formatDegree = (degree: string) => {
    return degree.charAt(0).toUpperCase() + degree.slice(1);
  };

  return (
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

      <div className="flex justify-end mt-6">
        <Button onClick={handleContinue} disabled={!selectedJob}>
          Continue to Upload
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}