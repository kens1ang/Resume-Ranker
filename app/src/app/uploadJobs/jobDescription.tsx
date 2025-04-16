"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUp, X, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobDescriptionUploadProps {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
}

export function JobDescriptionUpload({
  jobDescription,
  onJobDescriptionChange,
}: JobDescriptionUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept text files for simplicity
    if (
      file.type !== "text/plain" &&
      file.type !== "application/pdf" &&
      file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .pdf, or .docx file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      // For text files, we can read directly
      if (file.type === "text/plain") {
        const text = await file.text();
        onJobDescriptionChange(text);
        toast({
          title: "Success",
          description: "Job description uploaded successfully",
        });
      } else {
        // For PDF or DOCX, we would need server-side processing
        toast({
          title: "Note",
          description:
            "PDF and DOCX parsing requires server processing, which is simplified here. Please paste text for now.",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to process the file",
        variant: "destructive",
      });
      setUploadedFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex justify-between">
        <div className="w-2/5">
          <h3 className="font-medium text-lg">Job Description</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload or paste your existing job description here
          </p>
        </div>

        <div className="w-3/5 space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.docx"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <FileUp className="h-4 w-4" />
              Upload Description
            </Button>

            {uploadedFileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium truncate max-w-[200px]">
                  {uploadedFileName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearUpload}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            )}
          </div>

          <div>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              placeholder="Or paste your complete job description here..."
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              className="mt-1.5 min-h-[300px] font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
