import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { useToast } from "@/hooks/use-toast";
import { calculateAverageScores, findTopScorer } from "@/lib/explainability";
import { ResumeResult, Job } from "@/types/evaluation";
import { useResultSorting } from "./useResultSorting";
import { doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { bertLabelToText } from "@/lib/ranking";

export function useEvaluationResults(
  selectedJob: Job,
  externalLoading?: boolean
) {
  const [results, setResults] = useState<ResumeResult[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const isLoading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [averageScores, setAverageScores] = useState<Record<string, number>>(
    {}
  );
  const [topScorer, setTopScorer] = useState<ResumeResult | null>(null);
  const [editingClassification, setEditingClassification] = useState<
    string | null
  >(null);
  const [selectedFit, setSelectedFit] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const db = getFirestore(app);

  // Sort functionality
  const { sortField, sortDirection, sortedResults, toggleSort } =
    useResultSorting(results);

  // Fetch results on component mount or when selectedJob changes
  useEffect(() => {
    async function fetchResults() {
      if (!selectedJob) return;

      if (externalLoading === undefined) {
        setInternalLoading(true);
      }

      try {
        // Get the dynamic collection name
        const getCollectionNameFromJobTitle = (jobTitle: string): string => {
          const collectionName = jobTitle
            .trim()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase())
            .replace(/\s/g, "");
          return (
            collectionName.charAt(0).toLowerCase() +
            collectionName.slice(1) +
            "Submissions"
          );
        };

        const collectionName = getCollectionNameFromJobTitle(
          selectedJob.jobTitle
        );
        console.log(`Fetching results from collection: ${collectionName}`);

        // Try to fetch from job-specific collection first
        let resultsCollection;
        let resultsQuery;
        let resultsSnapshot;

        try {
          resultsCollection = collection(db, collectionName);
          resultsQuery = query(
            resultsCollection,
            where("jobId", "==", selectedJob.id),
            orderBy("createdAt", "desc")
          );
          resultsSnapshot = await getDocs(resultsQuery);

          // If no results in job-specific collection, fall back to main collection
          if (resultsSnapshot.empty) {
            console.log(
              "No results in job-specific collection, checking resumeSubmissions"
            );
            resultsCollection = collection(db, "resumeSubmissions");
            resultsQuery = query(
              resultsCollection,
              where("jobId", "==", selectedJob.id),
              orderBy("createdAt", "desc")
            );
            resultsSnapshot = await getDocs(resultsQuery);
          }
        } catch (error) {
          // If there's an error with the job-specific collection, fall back
          console.warn(
            `Error accessing ${collectionName}, falling back to resumeSubmissions`
          );
          resultsCollection = collection(db, "resumeSubmissions");
          resultsQuery = query(
            resultsCollection,
            where("jobId", "==", selectedJob.id),
            orderBy("createdAt", "desc")
          );
          resultsSnapshot = await getDocs(resultsQuery);
        }

        if (resultsSnapshot.empty) {
          setResults([]);
          toast({
            title: "No Results",
            description: "No evaluation results found for this position",
          });
        } else {
          const resultsData = resultsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              jobId: data.jobId,
              jobTitle: data.jobTitle,
              fileName: data.fileName,
              candidateName: data.candidateName || "Unnamed Candidate",
              similarity: data.similarity,
              similarityScores: data.similarityScores || {
                overall: data.similarity,
                skills: 0,
                education: 0,
                job_title: 0,
                responsibilities: 0,
              },
              entityData: data.entityData || {},
              matchDetails: data.matchDetails || {},
              bertPrediction: data.bertPrediction || null,
              createdAt: data.createdAt,
            };
          });

          setResults(resultsData);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        toast({
          title: "Error",
          description: "Failed to fetch evaluation results",
          variant: "destructive",
        });
      } finally {
        if (externalLoading === undefined) {
          setInternalLoading(false);
        }
      }
    }

    fetchResults();
  }, [db, selectedJob, toast, externalLoading]);

  // Update averages and top scorer when results change
  useEffect(() => {
    if (results.length > 0) {
      setAverageScores(calculateAverageScores(results));
      setTopScorer(findTopScorer(results));
    }
  }, [results]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const updateClassification = async (newFit: number, result: ResumeResult) => {
    setIsSubmitting(true);

    try {
      // Get the collection name from job title
      const getCollectionNameFromJobTitle = (jobTitle: string): string => {
        const collectionName = jobTitle
          .trim()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+(\w)/g, (_, letter) => letter.toUpperCase())
          .replace(/\s/g, "");
        return (
          collectionName.charAt(0).toLowerCase() +
          collectionName.slice(1) +
          "Submissions"
        );
      };

      const collectionName = getCollectionNameFromJobTitle(
        selectedJob.jobTitle
      );

      // Create new BERT prediction object
      const newBertPrediction = {
        match: bertLabelToText(newFit),
        prediction_label: newFit,
        probabilities: result.bertPrediction?.probabilities || [0, 0, 0],
        manually_updated: true,
        updated_at: new Date(),
        original_prediction: result.bertPrediction?.prediction_label,
      };

      // Create update data
      const updateData = {
        bertPrediction: newBertPrediction,
        feedback: {
          original_classification: result.bertPrediction?.prediction_label,
          updated_classification: newFit,
          job_id: selectedJob.id,
          job_title: selectedJob.jobTitle,
          job_description: selectedJob.description || "",
          resume_file_name: result.fileName,
          updated_by: "recruiter",
          updated_at: new Date(),
        },
      };

      let updateSuccessful = false;
      let documentLocations = [];

      // First try the job-specific collection
      try {
        const jobSpecificDocRef = doc(db, collectionName, result.id);
        await updateDoc(jobSpecificDocRef, updateData);
        updateSuccessful = true;
        documentLocations.push(collectionName);
      } catch (error) {
        console.log(
          `Document not found in ${collectionName}, trying resumeSubmissions instead`
        );
      }

      // If the update wasn't successful, try the generic collection
      if (!updateSuccessful) {
        try {
          const genericDocRef = doc(db, "resumeSubmissions", result.id);
          await updateDoc(genericDocRef, updateData);
          updateSuccessful = true;
          documentLocations.push("resumeSubmissions");
        } catch (error) {
          console.error(
            "Document not found in resumeSubmissions either",
            error
          );
        }
      }

      if (!updateSuccessful) {
        throw new Error(
          "Could not find the document to update in any collection"
        );
      }

      // Create a record in the classification feedback collection
      try {
        // First, we need to ensure we have the full resume text
        let resumeText = result.extractedText || "";

        // If the resume text is not available in the current result object, try to fetch it
        if (!resumeText) {
          try {
            // Try to fetch the full document from the collection where we found it
            const sourceCollection = documentLocations[0];
            const fullDocSnapshot = await getDoc(
              doc(db, sourceCollection, result.id)
            );

            if (fullDocSnapshot.exists()) {
              const fullData = fullDocSnapshot.data();
              resumeText = fullData.extractedText || "";
            }
          } catch (fetchError) {
            console.warn("Could not fetch full resume text:", fetchError);
          }
        }

        // Now let's get the full job description from the jobs collection
        let jobDescriptionText = "";
        try {
          const jobDocSnapshot = await getDoc(doc(db, "jobs", selectedJob.id));

          if (jobDocSnapshot.exists()) {
            const jobData = jobDocSnapshot.data();
            // Try both fields where job description might be stored
            jobDescriptionText =
              jobData.jobDescription || jobData.description || "";
          }
        } catch (jobFetchError) {
          console.warn("Could not fetch job description:", jobFetchError);
          // Fall back to what we have in selectedJob
          jobDescriptionText = selectedJob.description || "";
        }

        // Check if there's an existing feedback document for this resume
        const feedbackQuery = query(
          collection(db, "classificationFeedback"),
          where("resumeId", "==", result.id),
          where("jobId", "==", selectedJob.id)
        );

        const existingFeedbackSnapshot = await getDocs(feedbackQuery);

        // Prepare the feedback data
        const feedbackData = {
          jobId: selectedJob.id,
          jobTitle: selectedJob.jobTitle,
          resumeId: result.id,
          fileName: result.fileName,
          candidateName: result.candidateName,
          original_collection: documentLocations[0],

          // Classification info
          original_label: result.bertPrediction?.prediction_label,
          updated_label: newFit,
          original_match: result.bertPrediction
            ? bertLabelToText(result.bertPrediction.prediction_label)
            : "None",
          updated_match: bertLabelToText(newFit),

          // Full text content for training
          resumeText: resumeText,
          jobDescriptionText: jobDescriptionText,

          // Metadata
          similarityScores: result.similarityScores,
          updated_by: "recruiter",
          updated_at: new Date(),

          // Only set createdAt for new documents
          ...(existingFeedbackSnapshot.empty ? { createdAt: new Date() } : {}),

          // New field to track update history
          update_history: [
            {
              previous_label: result.bertPrediction?.prediction_label,
              new_label: newFit,
              timestamp: new Date(),
            },
          ],
        };

        // If there's an existing feedback document, update it
        if (!existingFeedbackSnapshot.empty) {
          const existingDoc = existingFeedbackSnapshot.docs[0];
          const existingData = existingDoc.data();

          // Get the existing update history or create a new one
          const existingHistory = existingData.update_history || [];

          // Add the current update to the history
          feedbackData.update_history = [
            ...existingHistory,
            {
              previous_label: result.bertPrediction?.prediction_label,
              new_label: newFit,
              timestamp: new Date(),
            },
          ];

          // Update the existing document
          await updateDoc(
            doc(db, "classificationFeedback", existingDoc.id),
            feedbackData
          );
          console.log("Updated existing classification feedback record");
        } else {
          // Create a new feedback document
          await addDoc(collection(db, "classificationFeedback"), feedbackData);
          console.log("Created new classification feedback record");
        }

        console.log("Classification feedback stored for future training");
      } catch (error) {
        console.error("Error storing classification feedback:", error);
        // This is non-critical, so we don't throw - just log the error
      }

      // Update the local state
      setResults(
        results.map((r) =>
          r.id === result.id ? { ...r, bertPrediction: newBertPrediction } : r
        )
      );

      toast({
        title: "Classification updated",
        description: `The candidate has been classified as "${bertLabelToText(
          newFit
        )}"`,
      });

      // Close the dialog
      setEditingClassification(null);
    } catch (error) {
      console.error("Error updating classification:", error);
      toast({
        title: "Update failed",
        description: "Could not update the classification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const classificationDialog = {
    isOpen: !!editingClassification,
    selectedFit,
    setSelectedFit,
    editingResult: results.find((r) => r.id === editingClassification),
    onClose: () => setEditingClassification(null),
    isSubmitting,
    onSubmit: async () => {
      const editingResult = results.find((r) => r.id === editingClassification);
      if (!editingResult) return;

      await updateClassification(selectedFit, editingResult);
    },
    setEditingClassification,
  };

  const sortOptions = {
    field: sortField,
    direction: sortDirection,
    toggleSort,
  };

  return {
    results,
    isLoading,
    sortedResults,
    averageScores,
    topScorer,
    expandedRows,
    sortOptions,
    classificationDialog,
    formatPercentage,
    getScoreColor,
    toggleRowExpand,
  };
}
