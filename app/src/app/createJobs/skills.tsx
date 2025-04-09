"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface SkillsSectionProps {
  requiredSkills: string[];
  preferredSkills: string[];
  setRequiredSkills: (skills: string[]) => void;
  setPreferredSkills: (skills: string[]) => void;
}

export function SkillsSection({
  requiredSkills,
  preferredSkills,
  setRequiredSkills,
  setPreferredSkills,
}: SkillsSectionProps) {
  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");

  // Add a skill when Enter is pressed
  const handleSkillKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "required" | "preferred"
  ) => {
    if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
      e.preventDefault();
      addSkill(type);
    }
  };

  // Add skill with button or Enter key
  const addSkill = (type: "required" | "preferred") => {
    if (type === "required" && newRequiredSkill.trim()) {
      if (!requiredSkills.includes(newRequiredSkill.trim())) {
        setRequiredSkills([...requiredSkills, newRequiredSkill.trim()]);
        setNewRequiredSkill("");
      }
    } else if (type === "preferred" && newPreferredSkill.trim()) {
      if (!preferredSkills.includes(newPreferredSkill.trim())) {
        setPreferredSkills([...preferredSkills, newPreferredSkill.trim()]);
        setNewPreferredSkill("");
      }
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Skills</h3>
        </div>

        <div className="w-3/5 flex justify-between gap-16">
          {/* Required Skills Section */}
          <div className="w-1/2">
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
            <div className="flex gap-2">
              <Input
                id="requiredSkills"
                placeholder="Type a skill and press Enter"
                value={newRequiredSkill}
                onChange={(e) => setNewRequiredSkill(e.target.value)}
                onKeyDown={(e) => handleSkillKeyDown(e, "required")}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => addSkill("required")}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add Required Skill</span>
              </Button>
            </div>
          </div>

          {/* Preferred Skills Section */}
          <div className="w-1/2">
            <Label htmlFor="preferredSkills">Preferred Skills (Optional)</Label>
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
            <div className="flex gap-2">
              <Input
                id="preferredSkills"
                placeholder="Type a skill and press Enter"
                value={newPreferredSkill}
                onChange={(e) => setNewPreferredSkill(e.target.value)}
                onKeyDown={(e) => handleSkillKeyDown(e, "preferred")}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => addSkill("preferred")}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add Preferred Skill</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
