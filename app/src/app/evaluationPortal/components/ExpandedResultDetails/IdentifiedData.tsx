import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResumeResult } from "@/types/evaluation";

interface IdentifiedDataProps {
  result: ResumeResult;
  formatPercentage: (value: number) => string;
  getScoreColor: (score: number) => string;
}

export function IdentifiedData({ result, formatPercentage, getScoreColor }: IdentifiedDataProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold mb-2">Identified Skills</h4>
        <div className="flex flex-wrap gap-2">
          {result.entityData?.Skills?.length > 0 ? (
            result.entityData.Skills.map((skill, index) => (
              <Badge key={index} variant="outline">
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No skills identified</span>
          )}
        </div>

        <h4 className="font-semibold mt-4 mb-2">Identified Education</h4>
        <div className="flex flex-col gap-2">
          {result.entityData?.Degree?.length > 0 ? (
            result.entityData.Degree.map((degree, index) => (
              <div key={index} className="text-sm">
                <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                  Degree
                </Badge>
                {degree}
              </div>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No education identified</span>
          )}
          {result.entityData?.["Institution Name"]?.length > 0 &&
            result.entityData["Institution Name"].map((institution, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    Institution
                  </Badge>
                  {institution}
                </div>
              </div>
            ))}
        </div>

        <h4 className="font-semibold mt-4 mb-2">Identified Certifications</h4>
        <div className="flex flex-col gap-2">
          {result.entityData?.Certifications?.length > 0 ? (
            result.entityData.Certifications.map((cert, index) => (
              <div key={index} className="text-sm">
                <Badge className="mr-2 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                  Certification
                </Badge>
                {cert}
              </div>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No certifications identified</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mt-4 mb-2">
          Identified Experiences
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({result.entityData?.Responsibilities?.length || 0} found)
          </span>
        </h4>
        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto bg-white p-3 rounded-md border">
          {result.entityData?.Responsibilities?.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-2">
              {result.entityData.Responsibilities.map((resp, index) => (
                <li key={index} className="text-sm text-gray-800">
                  <span>{resp}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-sm text-muted-foreground">No experiences identified</span>
          )}
        </div>

        <h4 className="font-semibold mt-4 mb-2">Detailed Match Scores</h4>

        <div className="space-y-3">
          {Object.entries(result.similarityScores)
            .filter(([key]) => key !== "overall")
            // Sort by score value in descending order
            .sort(([, valueA], [, valueB]) => valueB - valueA)
            .map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {key === "responsibilities"
                      ? "Experiences"
                      : key.charAt(0).toUpperCase() + key.slice(1).replace("_", " ")}
                  </span>
                  <span className={getScoreColor(value)}>
                    {formatPercentage(value)}
                  </span>
                </div>
                <Progress value={value * 100} className="h-2" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}