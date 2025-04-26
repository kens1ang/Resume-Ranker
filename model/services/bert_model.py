import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from utils.logging import setup_logger

logger = setup_logger("bert-model-service")

# Class labels
LABEL_MAP = {0: "No Fit", 1: "Potential Fit", 2: "Good Fit"}

# Correct model paths - point to the specific directories
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # model directory
BERT_DIR = os.path.join(BASE_DIR, "BERT-model")  # main BERT folder
MODEL_DIR = os.path.join(BERT_DIR, "best_model")
TOKENIZER_DIR = os.path.join(BERT_DIR, "best_tokenizer")

# Initialize model
try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading tokenizer from {TOKENIZER_DIR}")
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_DIR)
    
    logger.info(f"Loading model from {MODEL_DIR}")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR).to(device)
    model.eval()
    logger.info(f"BERT model loaded successfully on {device}")
except Exception as e:
    logger.error(f"Error loading BERT model: {e}")
    logger.exception("Full traceback:")
    tokenizer = None
    model = None

async def predict_match(resume_text: str, job_text: str):
    """
    Predict the match quality between a resume and job description.
    Returns a dictionary with prediction and probabilities.
    """
    if not model or not tokenizer:
        logger.warning("BERT model not loaded, skipping prediction")
        return {"match": "Unknown", "probabilities": [0.0, 0.0, 0.0], "error": "Model not loaded"}

    try:
        # Tokenize inputs
        inputs = tokenizer(
            resume_text,
            job_text,
            padding="max_length",
            truncation="longest_first",
            max_length=512,
            return_tensors="pt"
        ).to(device)

        # Make prediction
        with torch.no_grad():
            logits = model(**inputs).logits

        # Get probabilities and label
        probs = torch.softmax(logits, dim=-1)[0].tolist()
        pred_label = int(torch.argmax(logits, dim=-1)[0])
        predicted_match = LABEL_MAP[pred_label]

        logger.info(f"BERT prediction: {predicted_match}, probabilities: {probs}")
        return {
            "match": predicted_match,
            "probabilities": probs,
            "prediction_label": pred_label
        }

    except Exception as e:
        logger.error(f"Error in BERT prediction: {e}")
        return {"match": "Error", "probabilities": [0.0, 0.0, 0.0], "error": str(e)}