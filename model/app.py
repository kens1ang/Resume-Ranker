from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
from dotenv import load_dotenv
import json
import firebase_admin
from firebase_admin import credentials, firestore
import torch

from utils.logging import setup_logger
from services.resume_parser import parse_resume_document
from services.wikidata import fetch_academic_degrees
from services.bert_model import predict_match  # Add this import
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

try:
    firebase_app = firebase_admin.get_app()
except ValueError:
    # Use a service account
    cred_path = os.path.join(os.path.dirname(__file__), "service-account.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_app = firebase_admin.initialize_app(cred)
    else:
        logger.warning("Firebase credentials file not found. Some features may not work.")

async def get_job_by_id(job_id: str) -> dict:
    """
    Fetch job details from Firestore by job ID.
    
    Args:
        job_id: The ID of the job to fetch
        
    Returns:
        Dictionary containing the job data
        
    Raises:
        HTTPException: If job not found or there's a database error
    """
    try:
        # Access Firestore client
        db = firestore.client()
        
        # Get job document from the 'jobs' collection
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            logger.warning(f"Job with ID {job_id} not found")
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
            
        # Return job data as dictionary
        job_data = job_doc.to_dict()
        logger.info(f"Successfully fetched job with ID: {job_id}")
        return job_data
        
    except Exception as e:
        logger.error(f"Error fetching job with ID {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching job: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "PDF Text Extraction, NER & Semantic Matching API is running"}

@app.get("/model-status")
async def model_status():
    """Get status of loaded models."""
    from services.bert_model import model as bert_model
    
    return {
        "ner_model": nlp is not None,
        "bert_model": bert_model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.get("/degrees")
async def get_degrees():
    """Endpoint to fetch a list of academic degrees from Wikidata."""
    degrees = await fetch_academic_degrees()
    return {"degrees": degrees}

@app.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...), 
    job_description: str = Form(None),
    job_requirements: str = Form(None),
    job_id: Optional[str] = Form(None)
):
    """
    Endpoint to process a resume PDF, extract text and entities,
    and calculate similarity with job requirements.
    """
    if job_id:
        job = await get_job_by_id(job_id)
        job_description = job.get("jobDescription")
        job_requirements = json.dumps({
            "preferredDegree": job.get("preferredDegree", ""),
            "requiredSkills": job.get("requiredSkills", []),
            "preferredSkills": job.get("preferredSkills", []),
            "responsibilities": job.get("responsibilities", []),
            "weightages": job.get("weightages", {
                "skills": 33,
                "education": 33, 
                "responsibilities": 34
            })
        })
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Check if NER model is loaded
    if not nlp:
        logger.error("NER model is not loaded, cannot process resume")
        raise HTTPException(status_code=500, detail="NER model is not loaded")
    
    # Process the resume
    result = await parse_resume_document(file, job_description, job_requirements)
    return result

@app.post("/predict-match")
async def predict_resume_match(
    resume_text: str = Form(...),
    job_text: str = Form(...),
):
    """Endpoint to predict match quality between resume and job description using BERT."""
    try:
        result = await predict_match(resume_text, job_text)
        return result
    except Exception as e:
        logger.error(f"Error predicting match: {e}")
        raise HTTPException(status_code=500, detail=f"Error predicting match: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, log_level="info")