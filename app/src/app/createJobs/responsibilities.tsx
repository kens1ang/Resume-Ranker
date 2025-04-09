"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface ResponsibilitiesSectionProps {
  responsibilities: string[];
  setResponsibilities: (responsibilities: string[]) => void;
}

export function ResponsibilitiesSection({
  responsibilities,
  setResponsibilities,
}: ResponsibilitiesSectionProps) {
  const [newResponsibility, setNewResponsibility] = useState("");

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

  // Remove a responsibility
  const removeResponsibility = (responsibility: string) => {
    setResponsibilities(responsibilities.filter((r) => r !== responsibility));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Responsibilities</h3>
        </div>

        <div className="w-3/5">
          <div className="space-y-2">
            <Label htmlFor="responsibilities">Job Responsibilities</Label>

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
        </div>
      </div>
    </div>
  );
}
