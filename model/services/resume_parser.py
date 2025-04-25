import json
from fastapi import HTTPException
from utils.logging import setup_logger
from extractors.pdf_extractor import extract_text_from_pdf, save_upload_file_tmp
from extractors.entity_extractor import extract_entities
from matchers.formatter import format_for_matching
from matchers.similarity import calculate_similarity
from services.openrouter import extract_responsibilities

logger = setup_logger("resume-parser-service")

async def parse_resume_document(file, job_description=None, job_requirements=None):
    """
    Process a resume PDF file, extract text, identify entities,
    and calculate similarity with job requirements if provided.
    """
    # Save uploaded file to temporary location
    temp_file_path = save_upload_file_tmp(file)
    logger.info(f"Saved uploaded file to temporary path: {temp_file_path}")
    
    try:
        # Extract text from the PDF
        extracted_text = extract_text_from_pdf(temp_file_path)
        if not extracted_text:
            logger.error(f"No text could be extracted from {file.filename}")
            raise HTTPException(status_code=422, detail="Could not extract text from PDF")
        
        # Normalize the extracted text
        normalized_text = " ".join(extracted_text.split())
        logger.info(f"Successfully extracted and normalized text ({len(normalized_text)} chars)")
        
        # Extract entities from the text
        entity_data = extract_entities(normalized_text)

        # Get responsibilities using OpenRouter
        responsibilities = await extract_responsibilities(normalized_text)
        logger.info(f"Raw responsibilities from OpenRouter: {responsibilities}")

        if responsibilities:
            # Add the OpenRouter-extracted responsibilities to entity_data
            entity_data["Responsibilities"] = responsibilities
            logger.info(f"Added {len(responsibilities)} responsibilities from OpenRouter")
        else:
            logger.warning("No responsibilities were extracted from the resume")

        # Calculate similarity scores
        similarity_scores = await _calculate_similarities(
            normalized_text, entity_data, job_description, job_requirements
        )
        
        # Prepare response data
        job_req_data = json.loads(job_requirements) if job_requirements else {}
        
        response_data = {
            "filename": file.filename,
            "text": normalized_text,
            "entity_data": entity_data,
            "similarity": similarity_scores["overall"], 
            "similarity_scores": similarity_scores,
            "match_details": _generate_match_details(entity_data, job_req_data, similarity_scores, job_requirements)
        }
        
        logger.info(f"Successfully processed resume: {file.filename}")
        return response_data
        
    except Exception as e:
        logger.error(f"Error processing resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")
        
    finally:
        # Clean up temporary file
        if temp_file_path.exists():
            temp_file_path.unlink()
            logger.info(f"Cleaned up temporary file: {temp_file_path}")

async def _calculate_similarities(normalized_text, entity_data, job_description, job_requirements):
    """Calculate similarity scores between resume and job."""
    # Initialize similarity scores
    similarity_scores = {
        "overall": 0.0, 
        "skills": 0.0, 
        "education": 0.0, 
        "responsibilities": 0.0,
    }

    # Process job requirements if available
    if job_requirements:
        try:
            job_req_data = json.loads(job_requirements)
            
            # Format data for matching
            resume_formatted = format_for_matching(entity_data, "resume")
            job_formatted = format_for_matching(job_req_data, "job")
            
            # Calculate similarities for each category
            for category in ["skills", "education", "responsibilities"]:
                if category in resume_formatted and category in job_formatted:
                    resume_text = resume_formatted[category]
                    job_text = job_formatted[category]
                    similarity_scores[category] = calculate_similarity(resume_text, job_text)
            
            # Calculate weighted overall score using the weightages from job_req_data
            if "weightages" in job_req_data:
                weightages = job_req_data["weightages"]
                total_weight = sum(weightages.values()) if weightages else 100
                
                # These weightages are already percentages
                weighted_score = 0
                for category in ["skills", "education", "responsibilities"]:
                    if category in weightages and category in similarity_scores:
                        weighted_score += similarity_scores[category] * (weightages[category] / 100)
                
                similarity_scores["overall"] = weighted_score
            else:
                # Fallback: equal weights if no weightages provided
                valid_scores = [score for category, score in similarity_scores.items() 
                               if category != "overall" and score > 0]
                if valid_scores:
                    similarity_scores["overall"] = sum(valid_scores) / len(valid_scores)
                    
        except json.JSONDecodeError:
            logger.error("Invalid JSON in job_requirements")
        except Exception as e:
            logger.error(f"Error during similarity calculation: {e}")
    
    # If no overall score was calculated with job requirements, use job description
    if job_description and similarity_scores["overall"] == 0.0:
        # Direct comparison without weightages as fallback
        similarity_scores["overall"] = calculate_similarity(normalized_text, job_description)
        
        # Also calculate skill-specific similarity if available
        if "Skills" in entity_data and entity_data["Skills"]:
            skills_text = ", ".join(entity_data["Skills"])
            similarity_scores["skills"] = calculate_similarity(skills_text, job_description)
    
    return similarity_scores

def _generate_match_details(entity_data, job_req_data, similarity_scores, job_requirements):
    """Generate detailed matching information for the response."""

    details = {}
    weightages = {}
    
    if job_requirements:
        try:
            job_req_data = json.loads(job_requirements)
            if "weightages" in job_req_data:
                weightages = job_req_data["weightages"]
                # Include the weightages in the response for frontend reference
                details["applied_weightages"] = weightages
        except:
            pass

    # Include details about each component's contribution to the overall score
    details["skills_match"] = {
        "score": similarity_scores["skills"],
        "weight": weightages.get("skills", 33),  # Default to 33% if not specified
        "contribution": similarity_scores["skills"] * (weightages.get("skills", 33) / 100)
    }
    
    details["education_match"] = {
        "score": similarity_scores["education"],
        "weight": weightages.get("education", 33),
        "contribution": similarity_scores["education"] * (weightages.get("education", 33) / 100)
    }
    
    details["responsibilities_match"] = {
        "score": similarity_scores["responsibilities"],
        "weight": weightages.get("responsibilities", 34),
        "contribution": similarity_scores["responsibilities"] * (weightages.get("responsibilities", 34) / 100)
    }

    return {
        "skills_match": {
            "score": similarity_scores["skills"],
            "resume_skills": entity_data.get("Skills", []),
            "job_skills": (job_req_data.get("requiredSkills", []) + 
                          job_req_data.get("preferredSkills", [])) 
                          if job_requirements else []
        },
        "education_match": {
            "score": similarity_scores["education"],
            "resume_education": entity_data.get("Degree", []) + entity_data.get("Institution Name", []),
            "job_education": [job_req_data.get("requiredDegree", ""), 
                             job_req_data.get("preferredDegree", "")] 
                             if job_requirements else []
        },
        "responsibilities_match": {
            "score": similarity_scores["responsibilities"],
            "resume_responsibilities": entity_data.get("Responsibilities", []),
            "job_responsibilities": job_req_data.get("responsibilities", []) 
                                   if job_requirements else []
        }
    }