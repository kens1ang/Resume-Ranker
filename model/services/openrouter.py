import os
import json
import asyncio
import aiohttp
from utils.logging import setup_logger

logger = setup_logger("openrouter-service")

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
        if not api_key:
            logger.error("OPENROUTER_API_KEY environment variable not set")
            return []
            
        # OpenRouter API endpoint
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        # Prepare the prompt for extracting responsibilities
        prompt = f"""
        Extract a list of professional responsibilities from the following resume text. 
        Focus on action verbs and job duties. Ignore skills, education, or other information.
        Format your response as a JSON array of strings, with each string being a distinct responsibility.
        Only include the JSON array, nothing else.
        
        Resume:
        {resume_text[:4000]}  # Limit text length to avoid token limits
        """
        
        # Prepare the request payload
        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free",  
            "messages": [
                {
                    "role": "system",
                    "content": "You are an AI assistant that extracts job responsibilities from resume text. Respond only with extracted information in JSON format."
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
                    
                    responsibilities = json.loads(response_text)
                    if isinstance(responsibilities, list):
                        logger.info(f"Successfully extracted {len(responsibilities)} responsibilities")
                        return responsibilities
                    else:
                        logger.error("Response was not a list")
                        return []
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing JSON response: {e}")
                    logger.error(f"Raw response: {response_text}")
                    return []
                    
    except Exception as e:
        logger.error(f"Error extracting responsibilities: {e}")
        return []