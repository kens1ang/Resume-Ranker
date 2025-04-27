import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bertLabelToText } from "@/lib/ranking";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumeResult, Job } from "@/types/evaluation";

interface EditClassificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingResult: ResumeResult | undefined;
  selectedFit: number;
  setSelectedFit: (fit: number) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  selectedJob: Job;
}

export function EditClassificationDialog({
  isOpen,
  onClose,
  editingResult,
  selectedFit,
  setSelectedFit,
  isSubmitting,
  onSubmit,
  selectedJob,
}: EditClassificationDialogProps) {
  if (!editingResult) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Candidate Classification</DialogTitle>
          <DialogDescription>
            Change how this candidate is classified based on your review.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Candidate</h4>
            <p className="text-sm">{editingResult.candidateName}</p>
            <p className="text-xs text-muted-foreground">
              {editingResult.fileName}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Current Classification</h4>
            <Badge
              className={
                editingResult.bertPrediction?.prediction_label === 2
                  ? "bg-green-100 text-green-800"
                  : editingResult.bertPrediction?.prediction_label === 1
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {editingResult.bertPrediction
                ? bertLabelToText(editingResult.bertPrediction.prediction_label)
                : "Not classified"}
            </Badge>
            {editingResult.bertPrediction?.manually_updated && (
              <span className="text-xs text-muted-foreground block mt-1">
                (Manually updated)
              </span>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">New Classification</h4>
            <Select
              value={selectedFit.toString()}
              onValueChange={(value) => setSelectedFit(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Good Fit</SelectItem>
                <SelectItem value="1">Potential Fit</SelectItem>
                <SelectItem value="0">No Fit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Classification"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}