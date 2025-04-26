// This function extracts structured information from job descriptions using the OpenRouter API.

interface ExtractedJobData {
  workArrangement?: string;
  roleSummary?: string;
  companyDescription?: string;
  preferredDegree: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
}

export async function extractJobData(
  jobDescription: string
): Promise<ExtractedJobData | null> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${
            process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""
          }`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Resume Matcher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: [
            {
              role: "system",
              content:
                "You are a job description parser that extracts structured information from job descriptions. Return only valid JSON with no additional text.",
            },
            {
              role: "user",
              content: `Extract the following information from this job description:

1. Work arrangement (remote, hybrid, on-site) if specified
2. Role summary (brief description of the role)
3. Company description if available
4. Preferred degree requirements (as a semicolon-separated list)
5. Required skills (as an array of strings)
6. Preferred skills (as an array of strings)
7. Responsibilities (as an array of strings)

Important formatting guidelines:
- For skills (both required and preferred): Keep them concise (1-4 words), like "Python", "React", "Communication skills", "Project management"
- Separate distinct skills into individual array items
- Don't include sentences, explanations, or bullet points in skills
- For responsibilities: These can be longer and more descriptive

Format your response as a JSON object with these keys: 
workArrangement, roleSummary, companyDescription, preferredDegree, requiredSkills, preferredSkills, responsibilities

Here's the job description:
${jobDescription}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (
      !data ||
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message ||
      !data.choices[0].message.content
    ) {
      console.error("Invalid API response structure:", data);
      throw new Error("Invalid API response structure");
    }

    const content = data.choices[0].message.content;
    console.log("Raw API response content:", content);

    // Extract JSON from the response
    let jsonContent = content;

    try {
      // First, try to parse the entire content as JSON
      JSON.parse(content);
      jsonContent = content;
    } catch (e) {
      // If that fails, try to extract JSON from markdown or other format
      if (content.includes("```json")) {
        jsonContent = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        jsonContent = content.split("```")[1].split("```")[0].trim();
      } else {
        // Last resort: try to find anything that looks like JSON
        const jsonRegex = /\{[\s\S]*\}/;
        const match = content.match(jsonRegex);
        if (match && match[0]) {
          jsonContent = match[0];
        } else {
          throw new Error("Could not extract valid JSON from API response");
        }
      }
    }

    try {
      const extractedData = JSON.parse(jsonContent) as ExtractedJobData;

      // Apply defaults and validation
      return {
        workArrangement: extractedData.workArrangement || "",
        roleSummary: extractedData.roleSummary || "",
        companyDescription: extractedData.companyDescription || "",
        preferredDegree: extractedData.preferredDegree || "",
        requiredSkills: Array.isArray(extractedData.requiredSkills)
          ? extractedData.requiredSkills
          : [],
        preferredSkills: Array.isArray(extractedData.preferredSkills)
          ? extractedData.preferredSkills
          : [],
        responsibilities: Array.isArray(extractedData.responsibilities)
          ? extractedData.responsibilities
          : [],
      };
    } catch (jsonError) {
      console.error("Failed to parse JSON:", jsonContent);
      console.error("Parse error:", jsonError);
      throw new Error("Failed to parse extracted job data as valid JSON");
    }
  } catch (error) {
    console.error("Error extracting job data:", error);
    return null;
  }
}
