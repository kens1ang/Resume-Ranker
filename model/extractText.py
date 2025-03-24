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
from sentence_transformers import SentenceTransformer, util  
from typing import Optional

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

# Load the sentence transformer model for semantic matching
try:
    # Load the SentenceTransformer model (you can use a more specific model if needed)
    sentence_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    logger.info("Sentence transformer model loaded successfully for semantic matching.")
except Exception as e:
    logger.error(f"Error loading sentence transformer model: {e}")
    sentence_model = None

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

def calculate_similarity(resume_text: str, job_description: str) -> float:
    """
    Calculate similarity between resume text and job description using sentence transformers.
    Returns a similarity score between 0 and 1.
    """
    if not sentence_model:
        logger.warning("Sentence transformer model not loaded, skipping similarity calculation")
        return 0.0
    
    try:
        # Encode both texts into embeddings
        resume_embedding = sentence_model.encode(resume_text, convert_to_tensor=True)
        job_desc_embedding = sentence_model.encode(job_description, convert_to_tensor=True)
        
        # Compute cosine similarity
        cosine_sim = util.pytorch_cos_sim(resume_embedding, job_desc_embedding)
        similarity = cosine_sim.item()  # Convert to Python float
        
        logger.info(f"Calculated similarity score: {similarity:.4f}")
        return similarity
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        return 0.0

def format_for_matching(data, data_type="resume"):
    """
    Format entity data or job requirements for matching.
    Organizes data into sections that can be meaningfully compared.
    
    Parameters:
    - data: Dictionary of entity data or job requirements
    - data_type: Either "resume" or "job" to specify formatting approach
    
    Returns:
    - Dictionary with formatted text by category
    """
    formatted = {}
    
    # Common fields to extract and format
    if data_type == "resume":
        # Format resume entity data
        if "Skills" in data:
            formatted["skills"] = ", ".join(data["Skills"])
            logger.info(f"Resume skills formatted: {formatted['skills'][:100]}...")
        
        if "Degree" in data or "College Name" in data:
            education = []
            if "Degree" in data:
                education.extend(data["Degree"])
            if "College Name" in data:
                education.extend(data["College Name"])
            formatted["education"] = ", ".join(education)
            logger.info(f"Resume education formatted: {formatted['education'][:100] if 'education' in formatted else 'None'}")
        
        if "Job title" in data:
            formatted["job_title"] = ", ".join(data["Job title"])
            logger.info(f"Resume job titles formatted: {formatted['job_title'][:100] if 'job_title' in formatted else 'None'}")
        
        if "Responsibilities" in data:
            formatted["responsibilities"] = ", ".join(data["Responsibilities"])
            logger.info(f"Resume responsibilities formatted: {formatted['responsibilities'][:100] if 'responsibilities' in formatted else 'None'}")
        
        # Include all entity data in a combined field for overall matching
        all_entities = []
        for category, values in data.items():
            all_entities.extend(values)
        formatted["all"] = " ".join(all_entities)
            
    elif data_type == "job":
        # Format job requirements data
        # Skills matching
        job_skills = []
        if "requiredSkills" in data and data["requiredSkills"]:
            if isinstance(data["requiredSkills"], list):
                job_skills.extend(data["requiredSkills"])
            else:
                job_skills.append(str(data["requiredSkills"]))
        
        if "preferredSkills" in data and data["preferredSkills"]:
            if isinstance(data["preferredSkills"], list):
                job_skills.extend(data["preferredSkills"])
            else:
                job_skills.append(str(data["preferredSkills"]))
        
        if job_skills:
            formatted["skills"] = ", ".join(job_skills)
            logger.info(f"Job skills formatted: {formatted['skills'][:100]}...")
        
        # Education/Degree matching
        education = []
        if "requiredDegree" in data and data["requiredDegree"]:
            education.append(str(data["requiredDegree"]))
        
        if "preferredDegree" in data and data["preferredDegree"]:
            education.append(str(data["preferredDegree"]))
        
        if education:
            formatted["education"] = ", ".join(education)
            logger.info(f"Job education formatted: {formatted['education'][:100] if 'education' in formatted else 'None'}")
        
        # Job title matching
        if "jobTitle" in data and data["jobTitle"]:
            formatted["job_title"] = str(data["jobTitle"])
            logger.info(f"Job title formatted: {formatted['job_title'][:100] if 'job_title' in formatted else 'None'}")
        
        # Responsibilities matching
        if "responsibilities" in data and data["responsibilities"]:
            if isinstance(data["responsibilities"], list):
                formatted["responsibilities"] = ", ".join(data["responsibilities"])
            else:
                formatted["responsibilities"] = str(data["responsibilities"])
            
            logger.info(f"Job responsibilities formatted: {formatted['responsibilities'][:100] if 'responsibilities' in formatted else 'None'}")
        
        # Combine everything into an "all" field for overall matching
        all_requirements = []
        for field in ["requiredSkills", "preferredSkills", "requiredDegree", 
                      "preferredDegree", "responsibilities", "jobTitle", 
                      "additionalRequirements", "description"]:
            if field in data and data[field]:
                value = data[field]
                if isinstance(value, list):
                    all_requirements.extend(value)
                else:
                    all_requirements.append(str(value))
        formatted["all"] = " ".join(all_requirements)
    
    return formatted

@app.get("/")
def read_root():
    return {"message": "PDF Text Extraction & NER API is running"}

@app.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...), 
    job_description: Optional[str] = Form(None),
    job_requirements: Optional[str] = Form(None)
):
    """
    Endpoint that extracts text from a PDF file, performs NER analysis, 
    and calculates similarity with job requirements if provided.
    Returns the raw text, extracted entities, and similarity scores.
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
        
        # Calculate similarity scores
        similarity_scores = {
            "overall": 0.0, 
            "skills": 0.0, 
            "education": 0.0, 
            "job_title": 0.0, 
            "responsibilities": 0.0,
            "experience": 0.0
        }        

        logger.info("Starting similarity calculation")
        logger.info(f"Sentence model loaded: {sentence_model is not None}")

        # First try with structured job requirements if provided
        if job_requirements:
            try:
                # Parse the JSON string into a dictionary
                job_req_data = json.loads(job_requirements)
                logger.info(f"Received job requirements: {list(job_req_data.keys())}")
                
                # Format both datasets for matching
                resume_formatted = format_for_matching(entity_data, "resume")
                job_formatted = format_for_matching(job_req_data, "job")
                
                logger.info(f"Resume formatted data: {resume_formatted.keys()}")
                logger.info(f"Job formatted data: {job_formatted.keys()}")
        
                # Calculate similarity for each section where we have data on both sides
                for category in ["skills", "education", "job_title", "responsibilities", "all"]:
                    if category in resume_formatted and category in job_formatted:
                        resume_text = resume_formatted[category]
                        job_text = job_formatted[category]

                        logger.info(f"Calculating similarity for {category}")
                        logger.info(f"Resume {category} text: {resume_text[:100]}...")
                        logger.info(f"Job {category} text: {job_text[:100]}...")
                        
                        if category == "all":
                            similarity_scores["overall"] = calculate_similarity(resume_text, job_text)
                            logger.info(f"Overall similarity score: {similarity_scores['overall']:.4f}")
                        else:
                            similarity_scores[category] = calculate_similarity(resume_text, job_text)
                            logger.info(f"{category.capitalize()} similarity score: {similarity_scores[category]:.4f}")
                
                    else:
                        logger.info(f"Skipping {category} - not found in both resume and job data")
                        if category not in resume_formatted:
                            logger.info(f"Resume missing {category}")
                        if category not in job_formatted:
                            logger.info(f"Job missing {category}")

            except json.JSONDecodeError as json_err:
                logger.error(f"Invalid JSON in job_requirements: {json_err}")
                logger.error(f"Raw job requirements (first 200 chars): {job_requirements[:200]}")
                # Fall back to simple text matching with job description
            except Exception as e:
                logger.error(f"Error during similarity calculation with job requirements: {e}", exc_info=True)
                
        # Fall back to job description text if no structured requirements or as additional data
        if job_description and similarity_scores["overall"] == 0.0:
            logger.info("Calculating similarity with provided job description text")
            text_similarity = calculate_similarity(normalized_text, job_description)
            
            # If we don't have an overall score yet, use this as the overall
            similarity_scores["overall"] = text_similarity
            
            logger.info(f"Text description similarity score: {text_similarity:.4f}")
            
            # Skills-only similarity if available
            if "Skills" in entity_data and entity_data["Skills"]:
                skills_text = ", ".join(entity_data["Skills"])
                skills_similarity = calculate_similarity(skills_text, job_description)
                
                # If we don't have a skills score yet, use this
                similarity_scores["skills"] = skills_similarity
                
                logger.info(f"Skills-only similarity score: {skills_similarity:.4f}")
        
        # Create response with extracted entities and similarity scores
        response_data = {
            "filename": file.filename,
            "text": normalized_text,
            "entity_data": entity_data,
            "similarity": similarity_scores["overall"],  # For backward compatibility
            "similarity_scores": similarity_scores,
            "match_details": {
                "skills_match": {
                    "score": similarity_scores["skills"],
                    "resume_skills": entity_data.get("Skills", []),
                    "job_skills": job_req_data.get("requiredSkills", []) + job_req_data.get("preferredSkills", []) if job_requirements else []
                },
                "education_match": {
                    "score": similarity_scores["education"],
                    "resume_education": entity_data.get("Degree", []) + entity_data.get("College Name", []),
                    "job_education": [job_req_data.get("requiredDegree", ""), job_req_data.get("preferredDegree", "")] if job_requirements else []
                },
                "job_title_match": {
                    "score": similarity_scores["job_title"],
                    "resume_titles": entity_data.get("Job title", []),
                    "job_title": job_req_data.get("jobTitle", "") if job_requirements else ""
                },
                "responsibilities_match": {
                    "score": similarity_scores["responsibilities"],
                    "resume_responsibilities": entity_data.get("Responsibilities", []),
                    "job_responsibilities": job_req_data.get("responsibilities", []) if job_requirements else []
                }
            }
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

@app.get("/test-similarity")
async def test_similarity():
    """
    Test endpoint to verify the similarity calculation is working.
    Returns a sample similarity calculation result.
    """
    if not sentence_model:
        return {"error": "Sentence transformer model not loaded"}
    
    try:
        # Sample texts for testing
        text1 = "Software engineer with 5 years of experience in Python, Java, and cloud computing."
        text2 = "Looking for a software developer who knows Python and has experience with AWS."
        
        # Calculate similarity
        sim_score = calculate_similarity(text1, text2)
        
        return {
            "text1": text1,
            "text2": text2,
            "similarity_score": sim_score,
            "model_used": "sentence-transformers/all-MiniLM-L6-v2"
        }
    except Exception as e:
        logger.error(f"Error in test similarity: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("extractText:app", host="0.0.0.0", port=8000, log_level="info")