import React from "react";
import { ArrowUpDown } from "lucide-react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ResumeResult } from "@/types/evaluation";
import { ResultsTableRow } from "./ResultsTableRow";

interface ResultsTableProps {
  sortedResults: ResumeResult[];
  sortOptions: {
    field: string;
    direction: "asc" | "desc";
    toggleSort: (field: string) => void;
  };
  expandedRows: Record<string, boolean>;
  toggleRowExpand: (id: string) => void;
  topScorer: ResumeResult | null;
  averageScores: Record<string, number>;
  classificationDialog: any; // We'd properly type this in a real app
}

export function ResultsTable({
  sortedResults,
  sortOptions,
  expandedRows,
  toggleRowExpand,
  topScorer,
  averageScores,
  classificationDialog
}: ResultsTableProps) {
  const { toggleSort } = sortOptions;
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Candidate</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => toggleSort("fusion")}
            >
              <div className="flex items-center">
                AI Match Score
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <div className="flex items-center">AI Classification</div>
            </TableHead>
            <TableHead
              className="cursor-pointer hidden md:table-cell"
              onClick={() => toggleSort("skills")}
            >
              <div className="flex items-center">
                Skills
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hidden md:table-cell"
              onClick={() => toggleSort("education")}
            >
              <div className="flex items-center">
                Education
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hidden lg:table-cell"
              onClick={() => toggleSort("responsibilities")}
            >
              <div className="flex items-center">
                Experience
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResults.map((result) => (
            <ResultsTableRow
              key={result.id}
              result={result}
              isExpanded={!!expandedRows[result.id]}
              toggleRowExpand={toggleRowExpand}
              setEditingClassification={classificationDialog.setEditingClassification}
              setSelectedFit={classificationDialog.setSelectedFit}
              topScorer={topScorer}
              averageScores={averageScores}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}