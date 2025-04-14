from sentence_transformers import SentenceTransformer, util
from utils.logging import setup_logger

logger = setup_logger("similarity-matcher")

# Load the sentence transformer model
try:
    sentence_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    logger.info("Sentence transformer model loaded successfully")
except Exception as e:
    logger.error(f"Error loading sentence transformer model: {e}")
    sentence_model = None

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two texts using sentence transformers.
    Returns a similarity score between 0 and 1.
    """
    if not sentence_model:
        logger.warning("Sentence transformer model not loaded, skipping similarity calculation")
        return 0.0
    
    try:
        embedding1 = sentence_model.encode(text1, convert_to_tensor=True)
        embedding2 = sentence_model.encode(text2, convert_to_tensor=True)
        
        cosine_sim = util.pytorch_cos_sim(embedding1, embedding2)
        similarity = cosine_sim.item()
        
        logger.info(f"Calculated similarity score: {similarity:.4f}")
        return similarity
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        return 0.0