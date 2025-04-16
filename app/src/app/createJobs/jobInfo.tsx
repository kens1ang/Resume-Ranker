"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobInfoSectionProps {
  jobTitle: string;
  workArrangement: string;
  roleSummary: string;
  companyDescription: string;
  onJobTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWorkArrangementChange: (value: string) => void;
  onRoleSummaryChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCompanyDescriptionChange: (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
}

export function JobInfoSection({
  jobTitle,
  workArrangement,
  roleSummary,
  companyDescription,
  onJobTitleChange,
  onWorkArrangementChange,
  onRoleSummaryChange,
  onCompanyDescriptionChange,
}: JobInfoSectionProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Job Information</h3>
        </div>
        <div className="w-3/5 space-y-4">
          <div className="flex justify-between gap-6">
            <div className="w-1/2">
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

            <div className="w-1/2">
              <Label htmlFor="workArrangement">Work Arrangement</Label>
              <Select
                value={workArrangement}
                onValueChange={onWorkArrangementChange}
              >
                <SelectTrigger id="workArrangement" className="w-full mt-1.5">
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

          <div>
            <Label htmlFor="roleSummary">Role Summary</Label>
            <Textarea
              id="roleSummary"
              name="roleSummary"
              placeholder="Provide a brief description of the role and main responsibilities..."
              value={roleSummary}
              onChange={onRoleSummaryChange}
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="companyDescription">Company Description</Label>
            <Textarea
              id="companyDescription"
              name="companyDescription"
              placeholder="Provide information about the company and its culture..."
              value={companyDescription}
              onChange={onCompanyDescriptionChange}
              className="mt-1.5 min-h-[100px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
