import { ResumeResult } from "@/types/evaluation";
import { calculateFusionScore, bertLabelToScore } from "@/lib/ranking";

/**
 * Calculate SHAP values to explain the resume matching score.
 */
export function calculateShapValues(result: ResumeResult) {
  const { similarityScores } = result;
  const fusionResult = calculateFusionScore(
    similarityScores.overall,
    result.bertPrediction || null
  );

  // Define the base value (expected value without any features)
  const baseValue = 0.5; // Middle point as baseline

  // Calculate contribution of each feature
  const featureContributions: Record<string, number> = {};

  // Skills contribution
  const skillsWeight = result.matchDetails?.applied_weightages?.skills || 33;
  const skillsContribution =
    (similarityScores.skills - baseValue) * (skillsWeight / 100);
  featureContributions["Skills"] = skillsContribution;

  // Education contribution
  const educationWeight =
    result.matchDetails?.applied_weightages?.education || 33;
  const educationContribution =
    (similarityScores.education - baseValue) * (educationWeight / 100);
  featureContributions["Education"] = educationContribution;

  // Responsibilities contribution
  const respWeight =
    result.matchDetails?.applied_weightages?.responsibilities || 34;
  const respContribution =
    (similarityScores.responsibilities - baseValue) * (respWeight / 100);
  featureContributions["Experience"] = respContribution;

  // Add BERT classification contribution if available
  if (result.bertPrediction) {
    const bertScore = bertLabelToScore(result.bertPrediction.prediction_label);
    const bertWeight = fusionResult.weights.appliedClassificationWeight;
    const bertContribution = (bertScore - baseValue) * bertWeight;
    featureContributions["AI Classification"] = bertContribution;
  }

  // Add agreement boost
  if (fusionResult.agreementLevel === "high") {
    featureContributions["Agreement Bonus"] = 0.1;
  } else if (fusionResult.agreementLevel === "low") {
    featureContributions["Agreement Penalty"] = -0.1;
  }

  return {
    baseValue,
    featureContributions,
    totalScore: fusionResult.fusionScore,
  };
}

/**
 * Calculate average scores across all results.
 */
export function calculateAverageScores(results: ResumeResult[]) {
  if (results.length === 0) return {};

  const avgScores: Record<string, number> = {};

  // Only proceed if we have results
  if (results.length > 0) {
    const categories = Object.keys(results[0].similarityScores);

    categories.forEach((category) => {
      if (category in results[0].similarityScores) {
        const sum = results.reduce(
          (acc, result) =>
            acc +
            result.similarityScores[
              category as keyof typeof result.similarityScores
            ],
          0
        );
        avgScores[category] = sum / results.length;
      }
    });
  }

  // Add fusion score average
  const fusionSum = results.reduce(
    (acc, result) =>
      acc +
      calculateFusionScore(
        result.similarityScores.overall,
        result.bertPrediction || null
      ).fusionScore,
    0
  );
  avgScores["fusion"] = fusionSum / results.length;

  return avgScores;
}
/**
 * Find the top scoring result.
 */
export function findTopScorer(results: ResumeResult[]) {
  if (results.length === 0) return null;

  let topResult = results[0];
  let topScore = calculateFusionScore(
    results[0].similarityScores.overall,
    results[0].bertPrediction || null
  ).fusionScore;

  for (let i = 1; i < results.length; i++) {
    const score = calculateFusionScore(
      results[i].similarityScores.overall,
      results[i].bertPrediction || null
    ).fusionScore;

    if (score > topScore) {
      topScore = score;
      topResult = results[i];
    }
  }

  return topResult;
}
