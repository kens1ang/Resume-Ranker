from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import shutil
from pathlib import Path
import PyPDF2
import spacy
import uvicorn
import json
import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Log to console
    ]
)
logger = logging.getLogger("resume-parser")

app = FastAPI()

# Configure CORS for your Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get absolute path to the NER model
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "NER-model")
logger.info(f"Looking for NER model at: {model_path}")

# Load your NER model
try:
    nlp = spacy.load(model_path)
    logger.info("NER model loaded successfully.")
    # Print available entity types to verify the model loaded correctly
    entity_labels = nlp.get_pipe('ner').labels
    logger.info(f"Available entity types: {entity_labels}")
except Exception as e:
    logger.error(f"Error loading NER model: {e}")
    nlp = None

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file using PyPDF2."""
    text = ""
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in range(len(pdf_reader.pages)):
                page_text = pdf_reader.pages[page].extract_text() or ""
                text += page_text + "\n"
        
        if not text.strip():
            logger.warning(f"No text extracted from PDF at {file_path}")
            return None
        
        logger.info(f"Successfully extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return None

def save_upload_file_tmp(upload_file: UploadFile) -> Path:
    """Save an upload file to a temporary file and return its path."""
    try:
        suffix = Path(upload_file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(upload_file.file, tmp)
            return Path(tmp.name)
    except Exception as e:
        logger.error(f"Error saving upload file: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "PDF Text Extraction & NER API is running"}

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Endpoint that extracts text from a PDF file and performs NER analysis.
    Returns the raw text and structured entities by category.
    """
    logger.info(f"Received file: {file.filename} for resume parsing")
    
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    if not nlp:
        logger.error("NER model is not loaded, cannot process resume")
        raise HTTPException(status_code=500, detail="NER model is not loaded")
    
    temp_file_path = save_upload_file_tmp(file)
    logger.info(f"Saved uploaded file to temporary path: {temp_file_path}")
    
    try:
        # Extract text from PDF
        extracted_text = extract_text_from_pdf(temp_file_path)
        if not extracted_text:
            logger.error(f"No text could be extracted from {file.filename}")
            raise HTTPException(status_code=422, detail="Could not extract text from PDF")
        
        # Normalize whitespace in the extracted text
        normalized_text = " ".join(extracted_text.split())
        logger.info(f"Successfully extracted and normalized text ({len(normalized_text)} chars)")
        
        # Process with spaCy NER model
        logger.info("Applying NER model to extracted text...")
        doc = nlp(normalized_text)
        
        # Focus only on extracting entity_data (organized by category)
        entity_data = {}
        
        for ent in doc.ents:
            # Organize entities by label
            if ent.label_ not in entity_data:
                entity_data[ent.label_] = []
            
            if ent.text not in entity_data[ent.label_]:
                entity_data[ent.label_].append(ent.text)
        
        # Log summary of entity types found
        entity_count_by_type = {label: len(items) for label, items in entity_data.items()}
        logger.info(f"Entity counts by type: {entity_count_by_type}")
        
        # Log each entity for better visibility
        for label, values in entity_data.items():
            logger.info(f"Extracted {label}: {values}")
        
        # Create a simplified response focused on entity_data
        response_data = {
            "filename": file.filename,
            "text": normalized_text,
            "entity_data": entity_data
        }
        
        logger.info(f"Successfully processed resume: {file.filename}")
        return response_data
    
    except Exception as e:
        logger.error(f"Error processing resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")
    
    finally:
        if temp_file_path.exists():
            temp_file_path.unlink()
            logger.info(f"Cleaned up temporary file: {temp_file_path}")

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("extractText:app", host="0.0.0.0", port=8000, log_level="info")