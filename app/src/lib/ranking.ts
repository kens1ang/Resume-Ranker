/**
 * Fusion scoring system that combines semantic similarity scores with BERT classification results
 * to produce more robust candidate evaluation scores with confidence metrics.
 */

// Define types
export type BertPrediction = {
    prediction_label: number;
    probabilities: number[];
  };
  
  export type FusionResult = {
    fusionScore: number;
    confidence: number;
    agreementLevel: "high" | "medium" | "low";
    edgeCase: {
      isEdgeCase: boolean;
      edgeCaseType: string | null;
      recommendedAction: string | null;
    };
    weights: {
      appliedSemanticWeight: number;
      appliedClassificationWeight: number;
    };
  };
  
  // Convert BERT prediction label to normalized score
  export function bertLabelToScore(predictionLabel: number): number {
    switch (predictionLabel) {
      case 0: // No Fit
        return 0.0;
      case 1: // Potential Fit
        return 0.5;
      case 2: // Good Fit
        return 1.0;
      default:
        return 0.5; // Default to Potential Fit if unknown
    }
  }
  
  // Convert BERT prediction label to text representation
  export function bertLabelToText(predictionLabel: number): string {
    switch (predictionLabel) {
      case 0:
        return "No Fit";
      case 1:
        return "Potential Fit";
      case 2:
        return "Good Fit";
      default:
        return "Unknown";
    }
  }
  
  // Calculate agreement between semantic score and classification score
  export function calculateAgreement(
    semanticScore: number,
    classificationScore: number,
    threshold = 0.2
  ): {
    agreementLevel: "high" | "medium" | "low";
    confidenceAdjustment: number;
  } {
    const difference = Math.abs(semanticScore - classificationScore);
    
    if (difference <= threshold) {
      return {
        agreementLevel: "high",
        confidenceAdjustment: 0.1, // Boost for high agreement
      };
    } else if (difference <= threshold * 2) {
      return {
        agreementLevel: "medium",
        confidenceAdjustment: 0, // No adjustment for medium agreement
      };
    } else {
      return {
        agreementLevel: "low",
        confidenceAdjustment: -0.1, // Penalty for low agreement
      };
    }
  }
  
  // Check for edge cases that need special handling
  export function detectEdgeCases(
    semanticScore: number,
    bertLabel: number
  ): {
    isEdgeCase: boolean;
    edgeCaseType: string | null;
    recommendedAction: string | null;
  } {
    // Edge case 1: Low semantic score but good classification fit
    if (semanticScore < 0.3 && bertLabel === 2) {
      return {
        isEdgeCase: true,
        edgeCaseType: "low_semantic_high_classification",
        recommendedAction: "Lower trust in classification, review candidate manually",
      };
    }
    
    // Edge case 2: High semantic score but poor classification fit
    if (semanticScore >= 0.7 && bertLabel === 0) {
      return {
        isEdgeCase: true,
        edgeCaseType: "high_semantic_low_classification",
        recommendedAction: "Flag for recruiter review, may be a false negative",
      };
    }
    
    // No edge case detected
    return {
      isEdgeCase: false,
      edgeCaseType: null,
      recommendedAction: null,
    };
  }
  
  // Calculate fusion score combining semantic similarity and BERT classification
  export function calculateFusionScore(
    semanticScore: number,
    bertPrediction: BertPrediction | null,
    weights = { semantic: 0.6, classification: 0.4, agreement: 0.1 }
  ): FusionResult {
    // Default values if BERT prediction is not available
    if (!bertPrediction) {
      return {
        fusionScore: semanticScore,
        confidence: 0.5, // Medium confidence with only semantic score
        agreementLevel: "medium",
        edgeCase: {
          isEdgeCase: false,
          edgeCaseType: null,
          recommendedAction: null,
        },
        weights: {
          appliedSemanticWeight: 1.0,
          appliedClassificationWeight: 0.0,
        },
      };
    }
  
    // Convert BERT prediction to normalized score
    const classificationScore = bertLabelToScore(bertPrediction.prediction_label);
    
    // Calculate agreement between scores
    const agreement = calculateAgreement(semanticScore, classificationScore);
    
    // Check for edge cases
    const edgeCase = detectEdgeCases(semanticScore, bertPrediction.prediction_label);
    
    // Adjust weights based on agreement
    let adjustedWeights = { ...weights };
    
    if (agreement.agreementLevel === "low") {
      // When agreement is low, see which score has higher certainty
      
      // Extract BERT confidence from its probability distribution
      const bertConfidence = bertPrediction.probabilities[bertPrediction.prediction_label];
      
      if (bertConfidence > 0.8) {
        // If BERT is very confident, shift weight toward classification
        adjustedWeights.semantic = weights.semantic - 0.1;
        adjustedWeights.classification = weights.classification + 0.1;
      } else {
        // Otherwise shift weight toward semantic score
        adjustedWeights.semantic = weights.semantic + 0.1;
        adjustedWeights.classification = weights.classification - 0.1;
      }
      
      // Apply edge case rules
      if (edgeCase.isEdgeCase) {
        if (edgeCase.edgeCaseType === "low_semantic_high_classification") {
          // Further reduce classification weight when semantic is very low
          adjustedWeights.semantic = weights.semantic + 0.2;
          adjustedWeights.classification = weights.classification - 0.2;
        } else if (edgeCase.edgeCaseType === "high_semantic_low_classification") {
          // Boost semantic weight when it's high but classification is low
          adjustedWeights.semantic = weights.semantic + 0.3;
          adjustedWeights.classification = weights.classification - 0.3;
        }
      }
    }
    
    // Normalize weights to ensure they sum to 1.0
    const totalWeight = adjustedWeights.semantic + adjustedWeights.classification;
    const normalizedSemanticWeight = adjustedWeights.semantic / totalWeight;
    const normalizedClassificationWeight = adjustedWeights.classification / totalWeight;
    
    // Calculate fusion score
    // Formula: Total Fit Score = α⋅S + β⋅C + γ⋅AgreementBoost
    const agreementBoost = agreement.agreementLevel === "high" ? weights.agreement : 0;
    const fusionScore = (
      normalizedSemanticWeight * semanticScore + 
      normalizedClassificationWeight * classificationScore + 
      agreementBoost
    );
    
    // Calculate confidence based on agreement and BERT confidence
    const bertConfidence = Math.max(...bertPrediction.probabilities);
    const confidence = (
      0.5 + // Base confidence
      agreement.confidenceAdjustment + // Agreement-based adjustment
      (bertConfidence > 0.9 ? 0.1 : 0) // High BERT confidence boost
    );
    
    // Cap the fusion score at 1.0
    const capped_fusion_score = Math.min(1.0, Math.max(0, fusionScore));
    
    return {
      fusionScore: capped_fusion_score,
      confidence: Math.min(1.0, Math.max(0, confidence)),
      agreementLevel: agreement.agreementLevel,
      edgeCase,
      weights: {
        appliedSemanticWeight: normalizedSemanticWeight,
        appliedClassificationWeight: normalizedClassificationWeight,
      }
    };
  }
  
  // Helper function to get display information for a fusion result
  export function getFusionDisplayInfo(result: FusionResult) {
    return {
      score: result.fusionScore,
      confidence: result.confidence,
      agreementLevel: result.agreementLevel,
      hasEdgeCase: result.edgeCase.isEdgeCase,
      edgeCaseRecommendation: result.edgeCase.recommendedAction,
      weights: {
        semantic: Math.round(result.weights.appliedSemanticWeight * 100),
        classification: Math.round(result.weights.appliedClassificationWeight * 100),
      }
    };
  }