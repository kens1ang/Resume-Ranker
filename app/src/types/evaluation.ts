export type SimilarityScoreKey =
  | "overall"
  | "skills"
  | "education"
  | "job_title"
  | "responsibilities"
  | "fusion";

export interface ResumeResult {
  id: string;
  jobId: string;
  jobTitle: string;
  fileName: string;
  candidateName: string;
  similarity: number;
  similarityScores: {
    [key in SimilarityScoreKey]: number;
  };
  entityData: {
    [key: string]: string[];
  };
  matchDetails?: {
    applied_weightages?: {
      skills: number;
      education: number;
      responsibilities: number;
    };
  };
  bertPrediction?: {
    match: string;
    probabilities: number[];
    prediction_label: number;
  } | null;
  createdAt: any;
  resumeFile?: {
    name: string;
    data: string | Blob;
  };
}

export interface Job {
  id: string;
  jobTitle: string;
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
