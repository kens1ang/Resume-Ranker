from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
from dotenv import load_dotenv

from utils.logging import setup_logger
from services.resume_parser import parse_resume_document
from services.wikidata import fetch_academic_degrees
from extractors.entity_extractor import nlp

load_dotenv()
logger = setup_logger("resume-parser-api")

# Define request models
class ExplanationRequest(BaseModel):
    entity_data: dict
    job_requirements: dict

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PDF Text Extraction, NER & Semantic Matching API is running"}

@app.get("/degrees")
async def get_degrees():
    """Endpoint to fetch a list of academic degrees from Wikidata."""
    degrees = await fetch_academic_degrees()
    return {"degrees": degrees}

@app.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...), 
    job_description: Optional[str] = Form(None),
    job_requirements: Optional[str] = Form(None)
):
    """
    Endpoint to process a resume PDF, extract text and entities,
    and calculate similarity with job requirements.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Check if NER model is loaded
    if not nlp:
        logger.error("NER model is not loaded, cannot process resume")
        raise HTTPException(status_code=500, detail="NER model is not loaded")
    
    # Process the resume
    return await parse_resume_document(file, job_description, job_requirements)

# Add other endpoints as needed

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")