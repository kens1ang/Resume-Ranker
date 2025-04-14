import spacy
import os
from utils.logging import setup_logger

logger = setup_logger("entity-extractor")

# Get absolute path to the NER model
script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(script_dir, "NER-model")
logger.info(f"Looking for NER model at: {model_path}")

# Load NER model
try:
    nlp = spacy.load(model_path)
    logger.info("NER model loaded successfully.")
    entity_labels = nlp.get_pipe('ner').labels
    logger.info(f"Available entity types: {entity_labels}")
except Exception as e:
    logger.error(f"Error loading NER model: {e}")
    nlp = None

def extract_entities(text):
    """Extract named entities from the given text."""
    if not nlp:
        logger.error("NER model is not loaded, cannot extract entities")
        return {}
        
    try:
        logger.info("Applying NER model to text...")
        doc = nlp(text)
        
        entity_data = {}
        for ent in doc.ents:
            if ent.label_ not in entity_data:
                entity_data[ent.label_] = []
            if ent.text not in entity_data[ent.label_]:
                entity_data[ent.label_].append(ent.text)
        
        entity_count_by_type = {label: len(items) for label, items in entity_data.items()}
        logger.info(f"Entity counts by type: {entity_count_by_type}")
        
        return entity_data
    except Exception as e:
        logger.error(f"Error extracting entities: {e}")
        return {}