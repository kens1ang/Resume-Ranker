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
import requests  # New: for querying Wikidata

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
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
        resume_embedding = sentence_model.encode(resume_text, convert_to_tensor=True)
        job_desc_embedding = sentence_model.encode(job_description, convert_to_tensor=True)
        
        cosine_sim = util.pytorch_cos_sim(resume_embedding, job_desc_embedding)
        similarity = cosine_sim.item()
        
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
    
    if data_type == "resume":
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
        
        # Combine everything into an "all" field
        all_entities = []
        for category, values in data.items():
            all_entities.extend(values)
        formatted["all"] = " ".join(all_entities)
            
    elif data_type == "job":
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
        
        education = []
        if "requiredDegree" in data and data["requiredDegree"]:
            education.append(str(data["requiredDegree"]))
        
        if "preferredDegree" in data and data["preferredDegree"]:
            education.append(str(data["preferredDegree"]))
        
        if education:
            formatted["education"] = ", ".join(education)
            logger.info(f"Job education formatted: {formatted['education'][:100] if 'education' in formatted else 'None'}")
        
        if "jobTitle" in data and data["jobTitle"]:
            formatted["job_title"] = str(data["jobTitle"])
            logger.info(f"Job title formatted: {formatted['job_title'][:100] if 'job_title' in formatted else 'None'}")
        
        if "responsibilities" in data and data["responsibilities"]:
            if isinstance(data["responsibilities"], list):
                formatted["responsibilities"] = ", ".join(data["responsibilities"])
            else:
                formatted["responsibilities"] = str(data["responsibilities"])
            logger.info(f"Job responsibilities formatted: {formatted['responsibilities'][:100] if 'responsibilities' in formatted else 'None'}")
        
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
    return {"message": "PDF Text Extraction, NER & Semantic Matching API is running"}

@app.get("/degrees")
async def fetch_degrees():
    """
    Endpoint to fetch a list of academic degrees from Wikidata.
    This queries Wikidata's SPARQL endpoint for entities that are instances of an academic degree.
    """
    url = "https://query.wikidata.org/sparql"
    query = """
    SELECT ?discipline ?disciplineLabel WHERE {
      ?discipline wdt:P31 wd:Q11862829. # instance of academic degree
      FILTER(?discipline NOT IN (
      wd:Q100997647, wd:Q101421733, wd:Q102245198, wd:Q10297161, wd:Q10403518, wd:Q104661042,
      wd:Q10472829, wd:Q10474537, wd:Q10480689, wd:Q10541492, wd:Q10543087, wd:Q10543355,
      wd:Q10554132, wd:Q10579236, wd:Q10606998, wd:Q106750491, wd:Q10693106, wd:Q109017688,
      wd:Q109043466, wd:Q109043468, wd:Q109043471, wd:Q109043473, wd:Q109043480, wd:Q109043483,
      wd:Q109043486, wd:Q109043490, wd:Q109043493, wd:Q109043499, wd:Q109043502, wd:Q109043504,
      wd:Q109043506, wd:Q109043508, wd:Q109043510, wd:Q109043512, wd:Q109043514, wd:Q109043516,
      wd:Q109043523, wd:Q109046081, wd:Q109046084, wd:Q109046087, wd:Q109046089, wd:Q109361897,
      wd:Q109969317, wd:Q110613578, wd:Q110613826, wd:Q110614011, wd:Q110966310, wd:Q111210263,
      wd:Q111210498, wd:Q111456914, wd:Q111516745, wd:Q111697204, wd:Q111740805, wd:Q113411101,
      wd:Q114243572, wd:Q11433104, wd:Q115868097, wd:Q11594544, wd:Q116033454, wd:Q11814195,
      wd:Q11814240, wd:Q11873342, wd:Q118976285, wd:Q119171281, wd:Q119262238, wd:Q11965727,
      wd:Q11965830, wd:Q11968240, wd:Q11979277, wd:Q11983053, wd:Q12034894, wd:Q120372749,
      wd:Q121115889, wd:Q12222332, wd:Q122272826, wd:Q1227190, wd:Q1227191, wd:Q1227192,
      wd:Q1227253, wd:Q123019270, wd:Q12305104, wd:Q12305107, wd:Q12305109, wd:Q12305110,
      wd:Q12305112, wd:Q12305113, wd:Q12305116, wd:Q12305117, wd:Q12305118, wd:Q12305119,
      wd:Q12305121, wd:Q12305122, wd:Q12305124, wd:Q12305125, wd:Q12326600, wd:Q12376601,
      wd:Q123777823, wd:Q124250078, wd:Q124346564, wd:Q125883329, wd:Q126711869, wd:Q131142918,
      wd:Q131376620, wd:Q131995099, wd:Q132351101, wd:Q132351181, wd:Q132544664, wd:Q133265884,
      wd:Q133265899, wd:Q133520162, wd:Q133797338, wd:Q133825588, wd:Q133825597, wd:Q133843562,
      wd:Q16323401, wd:Q16324350, wd:Q16530879, wd:Q17482275, wd:Q17622324, wd:Q1772363,
      wd:Q17770319, wd:Q1813373, wd:Q1839832, wd:Q18417522, wd:Q18450389, wd:Q18694269,
      wd:Q1907863, wd:Q19379316, wd:Q19388578, wd:Q19610187, wd:Q19610200, wd:Q19731935,
      wd:Q19731937, wd:Q20067383, wd:Q20067384, wd:Q20067385, wd:Q21014165, wd:Q21572920,
      wd:Q22934301, wd:Q22934317, wd:Q22978132, wd:Q24541494, wd:Q25427627, wd:Q25448174,
      wd:Q25458739, wd:Q26161488, wd:Q27077396, wd:Q27163385, wd:Q28046673, wd:Q28276536,
      wd:Q28280134, wd:Q28763030, wd:Q2946848, wd:Q3029057, wd:Q3029065, wd:Q3029101,
      wd:Q43236300, wd:Q47514955, wd:Q48746355, wd:Q48941152, wd:Q50295717, wd:Q50348784,
      wd:Q50357261, wd:Q50414325, wd:Q50414336, wd:Q50414356, wd:Q50416280, wd:Q50430770,
      wd:Q50433389, wd:Q50433457, wd:Q50524205, wd:Q50851921, wd:Q52687813, wd:Q55772728,
      wd:Q56324663, wd:Q56706577, wd:Q56706592, wd:Q59389138, wd:Q60172326, wd:Q6154512,
      wd:Q64402434, wd:Q65229493, wd:Q65393828, wd:Q67146338, wd:Q67146716, wd:Q72063862,
      wd:Q72317748, wd:Q80007435, wd:Q8201922, wd:Q82029193, wd:Q84824036, wd:Q87383747,
      wd:Q8772636, wd:Q8964831, wd:Q91106023, wd:Q95564761, wd:Q96274103, wd:Q96633883,
      wd:Q97662173, wd:Q98427619, wd:Q99228297))
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY ?disciplineLabel
    """
    headers = {"Accept": "application/json"}
    try:
        response = requests.get(url, params={"query": query}, headers=headers, timeout=10)
        if response.status_code == 200:
            results = response.json().get("results", {}).get("bindings", [])
            
            # Extract degree labels and their corresponding Wikidata IDs
            degree_items = [(item["discipline"]["value"], item["disciplineLabel"]["value"]) for item in results]
            
            # Create a dictionary to store unique degrees with their IDs
            unique_degrees = {}
            for item_id, label in degree_items:
                # If we haven't seen this label before, or we're replacing with a shorter ID 
                # (preference for simpler Wikidata entities)
                if label not in unique_degrees or len(item_id) < len(unique_degrees[label]):
                    unique_degrees[label] = item_id
            
            # Convert back to a sorted list of just the degree names
            degrees = sorted(unique_degrees.keys())
            
            logger.info(f"Fetched {len(degrees)} unique degrees from Wikidata (filtered from {len(results)} total results)")
            return {"degrees": degrees}
        else:
            logger.error(f"Wikidata query failed with status code: {response.status_code}")
            raise HTTPException(status_code=response.status_code, detail="Error fetching degrees from Wikidata")
    except Exception as e:
        logger.error(f"Exception during Wikidata query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching degrees: {str(e)}")

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
        extracted_text = extract_text_from_pdf(temp_file_path)
        if not extracted_text:
            logger.error(f"No text could be extracted from {file.filename}")
            raise HTTPException(status_code=422, detail="Could not extract text from PDF")
        
        normalized_text = " ".join(extracted_text.split())
        logger.info(f"Successfully extracted and normalized text ({len(normalized_text)} chars)")
        
        logger.info("Applying NER model to extracted text...")
        doc = nlp(normalized_text)
        
        entity_data = {}
        for ent in doc.ents:
            if ent.label_ not in entity_data:
                entity_data[ent.label_] = []
            if ent.text not in entity_data[ent.label_]:
                entity_data[ent.label_].append(ent.text)
        
        entity_count_by_type = {label: len(items) for label, items in entity_data.items()}
        logger.info(f"Entity counts by type: {entity_count_by_type}")
        for label, values in entity_data.items():
            logger.info(f"Extracted {label}: {values}")
        
        similarity_scores = {
            "overall": 0.0, 
            "skills": 0.0, 
            "education": 0.0, 
            "job_title": 0.0, 
            "responsibilities": 0.0,
        }        

        logger.info("Starting similarity calculation")
        logger.info(f"Sentence model loaded: {sentence_model is not None}")

        if job_requirements:
            try:
                job_req_data = json.loads(job_requirements)
                logger.info(f"Received job requirements: {list(job_req_data.keys())}")
                
                resume_formatted = format_for_matching(entity_data, "resume")
                job_formatted = format_for_matching(job_req_data, "job")
                
                logger.info(f"Resume formatted data: {resume_formatted.keys()}")
                logger.info(f"Job formatted data: {job_formatted.keys()}")
        
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
            except Exception as e:
                logger.error(f"Error during similarity calculation with job requirements: {e}", exc_info=True)
                
        if job_description and similarity_scores["overall"] == 0.0:
            logger.info("Calculating similarity with provided job description text")
            text_similarity = calculate_similarity(normalized_text, job_description)
            similarity_scores["overall"] = text_similarity
            logger.info(f"Text description similarity score: {text_similarity:.4f}")
            if "Skills" in entity_data and entity_data["Skills"]:
                skills_text = ", ".join(entity_data["Skills"])
                skills_similarity = calculate_similarity(skills_text, job_description)
                similarity_scores["skills"] = skills_similarity
                logger.info(f"Skills-only similarity score: {skills_similarity:.4f}")
        
        response_data = {
            "filename": file.filename,
            "text": normalized_text,
            "entity_data": entity_data,
            "similarity": similarity_scores["overall"], 
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

if __name__ == "__main__":
    logger.info("Starting FastAPI server...")
    uvicorn.run("extractText:app", host="0.0.0.0", port=8000, log_level="info")
