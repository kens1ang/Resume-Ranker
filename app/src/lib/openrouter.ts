/**
 * Utility function to make requests to the OpenRouter API
 */
export async function generateInstitutionSummary(institutionName: string): Promise<string> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Resume Matcher",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-chat-v3-0324:free",
          "messages": [
            {
              "role": "system",
              "content": "You are a helpful assistant that provides concise and informative summaries about educational institutions."
            },
            {
              "role": "user",
              "content": `Provide a brief summary (2-3 sentences) about ${institutionName}. Focus on its reputation, academic standing, and any notable facts. If you don't have specific information about this institution, make that clear.`
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating institution summary:", error);
      return "Unable to generate summary at this time.";
    }
  }