import os
import json
import asyncio
import aiohttp
from utils.logging import setup_logger
from dotenv import load_dotenv

logger = setup_logger("openrouter-service")

dotenv_path = os.path.join(os.getcwd(), '.env.local')
logger.info(f"Looking for .env.local at: {dotenv_path}")
load_dotenv(dotenv_path)

# Add debug logging to check if the API key is loaded
api_key = os.environ.get("OPENROUTER_API_KEY")
logger.info(f"After load_dotenv, API key exists: {'Yes' if api_key else 'No'}")

async def extract_responsibilities(resume_text: str) -> list:
    """
    Use OpenRouter API to extract work and project experiences from resumes.
    
    Args:
        resume_text: The full text of the resume
        
    Returns:
        A list of experience statements extracted from the resume
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
        
        # Prepare the prompt for extracting work experiences
        prompt = f"""
                    Extract professional work and project experiences from the following resume.

                    Focus on:
                    1. Action-oriented statements describing work performed (e.g., "Developed", "Managed", "Implemented")
                    2. Project and work responsibilities that show technical skills
                    3. Team collaboration and project involvement
                    4. Tools and technologies used in projects

                    FORMAT REQUIREMENTS:
                    - Return your response as a JSON object with this structure: {{"experiences": ["Experience 1", "Experience 2", "Experience 3"]}}
                    - Each experience should be a complete, standalone statement
                    - Keep statements factual and descriptive of work actually performed

                    Resume text:
                    {resume_text[:4000]}
                """
        # Prepare the request payload
        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free", 
            "temperature": 0.2,  # Slightly higher temperature for better extraction
            "messages": [
                {
                    "role": "system",
                    "content": """You are an expert resume analyzer that extracts professional work and project experiences.
Your response must be valid JSON in this format: {"experiences": ["Experience 1", "Experience 2"]}
If you can't extract any experiences, return {"experiences": []}"""
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
            "HTTP-Referer": "https://localhost:3000",  
            "X-Title": "Resume Parser",
            "Content-Type": "application/json"
        }

        logger.debug(f"Using auth header starting with: Bearer {api_key[:5]}...")
        logger.debug(f"Using headers: {headers}")

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                response_text = await response.text()
                if response.status != 200:
                    logger.error(f"OpenRouter API error: {response.status} - {response_text}")
                    logger.error(f"Request headers: {headers}")
                    logger.error(f"Request payload first 100 chars: {str(payload)[:100]}...")
                    return []
                            
                # Get the response JSON
                try:
                    data = await response.json()
                    logger.debug(f"Raw API response: {data}")
                    
                    # Extract the content from the response
                    if "choices" in data and len(data["choices"]) > 0 and "message" in data["choices"][0]:
                        response_text = data["choices"][0]["message"]["content"]
                        logger.debug(f"Raw content from API: {response_text[:200]}...")
                        
                        # Clean the response text to ensure it's valid JSON
                        response_text = response_text.strip()

                        # Log the raw response for debugging
                        logger.debug(f"Raw response text: {response_text[:500]}")

                        # Process the JSON response with more robust extraction
                        experiences = extract_json_from_text(response_text)
                        
                        # If we successfully got a dict with experiences key
                        if isinstance(experiences, dict) and "experiences" in experiences:
                            experience_list = experiences["experiences"]
                            if isinstance(experience_list, list):
                                # Filter out empty strings or very short entries
                                experience_list = [r for r in experience_list if isinstance(r, str) and len(r) > 10]
                                if experience_list:
                                    logger.info(f"Successfully extracted {len(experience_list)} experiences")
                                    return experience_list
                        
                        # If we got a list directly
                        elif isinstance(experiences, list):
                            experience_list = [r for r in experiences if isinstance(r, str) and len(r) > 10]
                            if experience_list:
                                logger.info(f"Successfully extracted {len(experience_list)} experiences as direct list")
                                return experience_list
                        
                        # If all extraction methods failed
                        logger.error("Could not extract experiences using any method")
                        logger.error(f"Final response content: {response_text[:300]}")
                        return []
                    
                    else:
                        logger.error("Response missing expected structure with choices/message/content")
                        logger.error(f"Response structure: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
                        return []
                except Exception as e:
                    logger.error(f"Error processing API response: {str(e)}")
                    try:
                        raw_text = await response.text()
                        logger.error(f"Raw response text: {raw_text[:200]}...")
                    except:
                        logger.error("Could not extract raw response text")
                    return []
                    
    except Exception as e:
        logger.error(f"Error extracting experiences: {e}")
        return []


def extract_json_from_text(response_text):
    """
    More robust JSON extraction from text with multiple fallback methods.
    Returns dict, list, or empty list if extraction fails.
    """
    # 1. First, handle markdown code blocks if present
    if "```json" in response_text:
        parts = response_text.split("```json")
        response_text = parts[1].split("```")[0].strip()
    elif "```" in response_text:
        parts = response_text.split("```")
        if len(parts) >= 3:  # Need at least opening, content, and closing
            response_text = parts[1].strip()
            # If the content starts with a language identifier, skip it
            if "\n" in response_text and not (response_text.split("\n")[0].strip().startswith("{") or 
                                             response_text.split("\n")[0].strip().startswith("[")):
                response_text = "\n".join(response_text.split("\n")[1:])

    # 2. Direct JSON parsing - try object first, then array
    try:
        json_data = json.loads(response_text)
        logger.info(f"Successfully parsed JSON directly: {type(json_data)}")
        return json_data
    except json.JSONDecodeError:
        pass
    
    # 3. Try to match JSON object pattern
    import re
    object_match = re.search(r'\{[\s\S]*\}', response_text, re.DOTALL)
    if object_match:
        try:
            object_text = object_match.group(0)
            json_data = json.loads(object_text)
            logger.info(f"Successfully parsed JSON object via regex: {type(json_data)}")
            return json_data
        except json.JSONDecodeError:
            pass
            
    # 4. Try to match JSON array pattern
    array_match = re.search(r'\[([\s\S]*)\]', response_text, re.DOTALL)
    if array_match:
        try:
            array_text = array_match.group(0)
            json_data = json.loads(array_text)
            logger.info(f"Successfully parsed JSON array via regex: {len(json_data) if isinstance(json_data, list) else 'not list'}")
            return json_data
        except json.JSONDecodeError:
            pass

    # 5. Try extracting quoted strings - common when model formats JSON-like but not valid JSON
    quoted_strings = re.findall(r'"([^"]*?)"', response_text)
    if quoted_strings:
        experiences = [s for s in quoted_strings if len(s) > 10]
        if experiences:
            logger.info(f"Extracted {len(experiences)} experiences from quoted strings")
            return {"experiences": experiences}

    # 6. Look for numbered items - last resort when model outputs a numbered list
    numbered_items = re.findall(r'\d+\.?\s*([^\n]+)', response_text)
    if numbered_items:
        experiences = [item.strip() for item in numbered_items if len(item.strip()) > 10]
        if experiences:
            logger.info(f"Extracted {len(experiences)} experiences from numbered list")
            return {"experiences": experiences}
    
    # No valid data found
    return []