from utils.logging import setup_logger

logger = setup_logger("data-formatter")

def format_for_matching(data, data_type="resume"):
    """
    Format entity data or job requirements for matching.
    Organizes data into sections that can be meaningfully compared.
    """
    formatted = {}
    
    if data_type == "resume":
        # Format resume data
        if "Skills" in data:
            formatted["skills"] = ", ".join(data["Skills"])
            logger.info(f"Resume skills formatted: {formatted['skills'][:100]}...")
        
        # Format education data
        education_parts = []
        if "Degree" in data:
            education_parts.extend(data["Degree"])
        if "Institution Name" in data:
            education_parts.extend(data["Institution Name"])
        if education_parts:
            formatted["education"] = ", ".join(education_parts)
            logger.info(f"Resume education formatted: {formatted['education'][:100] if 'education' in formatted else 'None'}")
        
        # Format responsibilities
        if "Responsibilities" in data:
            formatted["responsibilities"] = ", ".join(data["Responsibilities"])
            logger.info(f"Resume responsibilities formatted: {formatted['responsibilities'][:100] if 'responsibilities' in formatted else 'None'}")
        
        # Format certifications
        if "Certifications" in data:
            formatted["certifications"] = ", ".join(data["Certifications"])
            logger.info(f"Resume certifications formatted: {formatted['certifications'][:100] if 'certifications' in formatted else 'None'}")

        # Combine everything into an "all" field
        all_entities = []
        for category, values in data.items():
            all_entities.extend(values)
        formatted["all"] = " ".join(all_entities)
            
    elif data_type == "job":
        # Format job skills
        formatted["skills"] = _format_job_skills(data)
        
        # Format job education
        formatted["education"] = _format_job_education(data)
        
        # Format job responsibilities
        if "responsibilities" in data and data["responsibilities"]:
            if isinstance(data["responsibilities"], list):
                formatted["responsibilities"] = ", ".join(data["responsibilities"])
            else:
                formatted["responsibilities"] = str(data["responsibilities"])
            logger.info(f"Job responsibilities formatted: {formatted['responsibilities'][:100] if 'responsibilities' in formatted else 'None'}")
        
        # Combine all job fields
        formatted["all"] = _format_job_all_fields(data)
    
    return formatted

def _format_job_skills(data):
    """Helper function to format job skills."""
    job_skills = []
    
    # Add required skills
    if "requiredSkills" in data and data["requiredSkills"]:
        if isinstance(data["requiredSkills"], list):
            job_skills.extend(data["requiredSkills"])
        else:
            job_skills.append(str(data["requiredSkills"]))
    
    # Add preferred skills
    if "preferredSkills" in data and data["preferredSkills"]:
        if isinstance(data["preferredSkills"], list):
            job_skills.extend(data["preferredSkills"])
        else:
            job_skills.append(str(data["preferredSkills"]))
    
    if job_skills:
        formatted_skills = ", ".join(job_skills)
        logger.info(f"Job skills formatted: {formatted_skills[:100]}...")
        return formatted_skills
    
    return ""

def _format_job_education(data):
    """Helper function to format job education requirements."""
    education = []
    
    # Add preferred degree
    if "preferredDegree" in data and data["preferredDegree"]:
        education.append(str(data["preferredDegree"]))
    
    if education:
        formatted_education = ", ".join(education)
        logger.info(f"Job education formatted: {formatted_education[:100]}...")
        return formatted_education
    
    return ""

def _format_job_all_fields(data):
    """Helper function to combine all job fields into one text."""
    all_requirements = []
    
    for field in ["requiredSkills", "preferredSkills", "preferredDegree", "responsibilities", "description"]:
        if field in data and data[field]:
            value = data[field]
            if isinstance(value, list):
                all_requirements.extend(value)
            else:
                all_requirements.append(str(value))
    
    return " ".join(all_requirements)