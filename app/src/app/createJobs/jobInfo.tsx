"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface JobInfoSectionProps {
  jobTitle: string;
  onJobTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function JobInfoSection({
  jobTitle,
  onJobTitleChange,
}: JobInfoSectionProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Job Information</h3>
        </div>
        <div className="w-3/5">
          <Label htmlFor="jobTitle">Job Position</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            placeholder="e.g. Software Engineer"
            value={jobTitle}
            onChange={onJobTitleChange}
            required
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
