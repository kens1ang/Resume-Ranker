import os
import json
import asyncio
import aiohttp
from utils.logging import setup_logger
from dotenv import load_dotenv

logger = setup_logger("openrouter-service")

load_dotenv()

async def extract_responsibilities(resume_text: str) -> list:
    """
    Use OpenRouter API to extract job responsibilities from resume text.
    
    Args:
        resume_text: The full text of the resume
        
    Returns:
        A list of responsibility statements extracted from the resume
    """
    try:
        # Get API key from environment variable
        api_key = os.environ.get("OPENROUTER_API_KEY")
        logger.info(f"API key found: {'Yes' if api_key else 'No'}")

        if not api_key:
            logger.error("OPENROUTER_API_KEY environment variable not set")
            logger.info(f"Current directory: {os.getcwd()}")
            return []
            
        # OpenRouter API endpoint
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        # Prepare the prompt for extracting responsibilities
        prompt = f"""
Extract professional responsibilities and achievements from the following resume.

Focus on:
1. Action-oriented statements beginning with strong verbs (e.g., "Developed", "Managed", "Implemented")
2. Quantifiable achievements and metrics where available (e.g., "Increased efficiency by 30%")
3. Technical responsibilities related to specific tools, technologies, or methodologies
4. Project management and team leadership experiences
5. Client or stakeholder interactions

FORMAT REQUIREMENTS:
- Return ONLY a JSON array of strings
- Each responsibility should be a complete, standalone statement
- Focus on the most recent and relevant 10-15 responsibilities
- Prioritize responsibilities that demonstrate technical skills, leadership, or measurable impact
- Ensure each statement is specific and descriptive (avoid vague statements)

Resume text:
{resume_text[:4000]}
"""
        
        system_content = """You are an expert resume analyzer specialized in extracting high-quality professional responsibilities from resumes for job matching purposes.

Your task is to identify responsibilities that would be most relevant for matching with job descriptions. Focus on extracting concrete accomplishments, technical skills in action, and leadership experiences.

When analyzing resumes:
1. Prioritize recent experience over older positions
2. Emphasize specific, measurable achievements over generic duties 
3. Highlight technical skills being applied in real scenarios
4. Include domain-specific knowledge demonstrations
5. Identify transferable skills across industries

Return ONLY the JSON array with no additional text, explanations, or markdown formatting.
"""
        
        # Prepare the request payload
        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free",  
            "messages": [
                {
                    "role": "system",
                    "content": system_content
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        # Send request to OpenRouter API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "localhost:3000",  
            "X-Title": "Resume Parser",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenRouter API error: {response.status} - {error_text}")
                    return []
                
                data = await response.json()
                
                # Extract the response content
                response_text = data["choices"][0]["message"]["content"]
                
                # Parse the JSON array
                try:
                    # Clean the response text to ensure it's valid JSON
                    response_text = response_text.strip()
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                    response_text = response_text.strip()

                    logger.debug(f"Cleaned response text: {response_text[:200]}...")
                    
                    responsibilities = json.loads(response_text)
                    if isinstance(responsibilities, list):
                        logger.info(f"Successfully extracted {len(responsibilities)} responsibilities")
                        return responsibilities
                    else:
                        logger.error(f"Response was not a list but: {type(responsibilities)}")
                        return []
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing JSON response: {str(e)}")
                    logger.error(f"Raw response: {response_text[:200]}...")
                    return []
                    
    except Exception as e:
        logger.error(f"Error extracting responsibilities: {e}")
        return []