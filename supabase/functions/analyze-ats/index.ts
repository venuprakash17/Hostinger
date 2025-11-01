import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { resumeText, jobDescription } = await req.json();

    if (!resumeText) {
      throw new Error("Resume text is required");
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const systemPrompt = `You are an ATS (Applicant Tracking System) analyzer expert. 
Analyze resumes for ATS compatibility and provide detailed scoring and recommendations.

Evaluate the resume on these criteria:
1. Format & Structure (20 points)
2. Keyword Optimization (25 points)
3. Experience & Achievements (20 points)
4. Skills & Certifications (15 points)
5. Contact Information (10 points)
6. Readability & Clarity (10 points)

${jobDescription ? `Compare against this job description:\n${jobDescription}\n\n` : ""}

Return a JSON object with:
{
  "overallScore": number (0-100),
  "categoryScores": {
    "format": number,
    "keywords": number,
    "experience": number,
    "skills": number,
    "contact": number,
    "readability": number
  },
  "strengths": [list of strong points],
  "improvements": [list of specific improvements with priorities],
  "missingKeywords": [important keywords not found],
  "recommendations": [actionable suggestions]
}`;

    const userPrompt = `Analyze this resume for ATS compatibility:\n\n${resumeText}`;

    console.log("Calling Google AI Studio for ATS analysis...");

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1536,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("AI Analysis received");

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = analysisContent.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : analysisContent;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      analysis = {
        overallScore: 70,
        categoryScores: {
          format: 15,
          keywords: 18,
          experience: 15,
          skills: 12,
          contact: 8,
          readability: 7,
        },
        strengths: ["Analysis in progress"],
        improvements: ["Unable to parse detailed analysis"],
        missingKeywords: [],
        recommendations: [analysisContent],
      };
    }

    // Track analytics
    await supabase.from("resume_analytics").insert({
      user_id: user.id,
      action_type: "ats_check",
      action_details: { score: analysis.overallScore },
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-ats:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze ATS";
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
