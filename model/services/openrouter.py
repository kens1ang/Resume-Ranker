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
- Return ONLY a JSON array of strings WITHOUT any explanation or notes
- Format should be ["Responsibility 1", "Responsibility 2", "Responsibility 3"]
- Each responsibility should be a complete, standalone statement 
- Focus on the most recent and relevant 10-15 responsibilities
- Prioritize responsibilities that demonstrate technical skills, leadership, or measurable impact
- Ensure each statement is specific and descriptive (avoid vague statements)

Example output format:
["Developed a machine learning model that improved prediction accuracy by 25%", 
 "Managed a team of 5 developers to deliver project milestones on time", 
 "Implemented CI/CD pipeline reducing deployment time by 40%"]

Resume text:
{resume_text[:4000]}
"""     
        # Prepare the request payload
        payload = {
            "model": "deepseek/deepseek-r1:free", 
            "temperature": 0.01, 
            "messages": [
                {
            "role": "system",
            "content": """You are an expert resume analyzer that extracts professional responsibilities from resumes.
YOUR ONLY OUTPUT MUST BE a valid JSON array of strings. DO NOT include any explanation, comments, or extra text.
FORMAT: ["Responsibility 1", "Responsibility 2", "Responsibility 3"]
If you can't extract any responsibilities, return ONLY an empty array: []"""
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

                        # 1. First, handle markdown code blocks if present
                        if "```json" in response_text:
                            parts = response_text.split("```json")
                            response_text = parts[1].split("```")[0].strip()
                        elif "```" in response_text:
                            parts = response_text.split("```")
                            if len(parts) >= 3:  # Need at least opening, content, and closing
                                response_text = parts[1].strip()
                                # If the content starts with a language identifier line, skip it
                                if "\n" in response_text:
                                    potential_lang_identifier = response_text.split("\n")[0].strip()
                                    if not (potential_lang_identifier.startswith("[") or potential_lang_identifier.startswith("{")):
                                        response_text = "\n".join(response_text.split("\n")[1:])

                        # 2. Direct JSON parsing attempt - most reliable case
                        try:
                            responsibilities = json.loads(response_text)
                            if isinstance(responsibilities, list):
                                # Filter out empty strings or very short entries
                                responsibilities = [r for r in responsibilities if isinstance(r, str) and len(r) > 10]
                                if responsibilities:
                                    logger.info(f"Successfully extracted {len(responsibilities)} responsibilities with direct parsing")
                                    return responsibilities
                        except json.JSONDecodeError:
                            # Continue to next approach if this fails
                            pass

                        # 3. Try pattern matching to extract any JSON array in the response
                        import re
                        array_match = re.search(r'\[(.*)\]', response_text, re.DOTALL)
                        if array_match:
                            array_content = array_match.group(0)
                            try:
                                responsibilities = json.loads(array_content)
                                if isinstance(responsibilities, list):
                                    responsibilities = [str(r) for r in responsibilities if r]
                                    responsibilities = [r for r in responsibilities if len(r) > 10]
                                    if responsibilities:
                                        logger.info(f"Successfully extracted {len(responsibilities)} responsibilities via regex array match")
                                        return responsibilities
                            except json.JSONDecodeError:
                                # Continue to next approach
                                pass

                        # 4. Try extracting quoted strings - common when the model formats JSON-like but not valid JSON
                        quoted_strings = re.findall(r'"([^"]*?)"', response_text)
                        if quoted_strings:
                            responsibilities = [s for s in quoted_strings if len(s) > 10]
                            if responsibilities:
                                logger.info(f"Extracted {len(responsibilities)} responsibilities from quoted strings")
                                return responsibilities

                        # 5. Look for numbered items - last resort when model outputs a numbered list
                        numbered_items = re.findall(r'\d+\.?\s*([^\n]+)', response_text)
                        if numbered_items:
                            responsibilities = [item.strip() for item in numbered_items if len(item.strip()) > 10]
                            if responsibilities:
                                logger.info(f"Extracted {len(responsibilities)} responsibilities from numbered list")
                                return responsibilities

                        # If all extraction methods failed
                        logger.error("Could not extract responsibilities using any method")
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
        logger.error(f"Error extracting responsibilities: {e}")
        return []