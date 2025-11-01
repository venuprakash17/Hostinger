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

    const { targetRole } = await req.json();

    // Fetch all student data
    const [profileRes, educationRes, projectsRes, skillsRes, certificationsRes, achievementsRes, extracurricularRes] = await Promise.all([
      supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("student_education").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("student_projects").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("student_skills").select("*").eq("user_id", user.id),
      supabase.from("student_certifications").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("student_achievements").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("student_extracurricular").select("*").eq("user_id", user.id).order("display_order"),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) {
      throw new Error("Profile not found. Please complete your profile first.");
    }

    const profile = profileRes.data;
    const education = educationRes.data || [];
    const projects = projectsRes.data || [];
    const skills = skillsRes.data || [];
    const certifications = certificationsRes.data || [];
    const achievements = achievementsRes.data || [];
    const extracurricular = extracurricularRes.data || [];

    // Prepare data for AI
    const resumeData = {
      profile,
      education,
      projects,
      skills,
      certifications,
      achievements,
      extracurricular,
    };

    // Use Lovable AI to enhance and format resume content
    const systemPrompt = `You are an expert resume writer and ATS optimization specialist. 
Your task is to create an ATS-friendly resume in a structured format that can be easily converted to PDF.
Focus on:
- Clear, concise bullet points with action verbs
- Quantifiable achievements
- Keywords relevant to ${targetRole || "the student's field"}
- Professional formatting
- ATS-compatible structure

Return ONLY a valid JSON object with the following structure:
{
  "summary": "Professional summary paragraph",
  "formattedEducation": [enhanced education entries],
  "formattedProjects": [enhanced project descriptions with bullet points],
  "formattedSkills": {organized skills by category},
  "formattedCertifications": [formatted certifications],
  "formattedAchievements": [formatted achievements],
  "formattedExtracurricular": [formatted activities],
  "atsScore": estimated ATS score (0-100),
  "recommendations": [list of improvement suggestions]
}`;

    const userPrompt = `Create an ATS-optimized resume ${targetRole ? `tailored for ${targetRole} role` : ""} using this data:\n\n${JSON.stringify(resumeData, null, 2)}`;

    console.log("Calling Google AI for resume generation...");
    
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Google AI API Error:", errorData);
      throw new Error(`Google AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const enhancedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!enhancedContent) {
      throw new Error("No content in AI response");
    }
    
    console.log("AI Response received");

    // Parse AI response
    let resumeContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = enhancedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       enhancedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : enhancedContent;
      resumeContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      // Fallback: return structured data with AI content as text
      resumeContent = {
        summary: enhancedContent,
        formattedEducation: education,
        formattedProjects: projects,
        formattedSkills: skills,
        formattedCertifications: certifications,
        formattedAchievements: achievements,
        formattedExtracurricular: extracurricular,
        atsScore: 75,
        recommendations: ["Complete profile review recommended"],
      };
    }

    // Save resume version
    const { data: resumeVersion, error: saveError } = await supabase
      .from("resume_versions")
      .insert({
        user_id: user.id,
        resume_type: targetRole ? "role-based" : "general",
        target_role: targetRole || null,
        ats_score: resumeContent.atsScore || null,
        metadata: resumeContent,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving resume version:", saveError);
    }

    // Track analytics
    await supabase.from("resume_analytics").insert({
      user_id: user.id,
      action_type: "generate",
      action_details: { targetRole, atsScore: resumeContent.atsScore },
    });

    return new Response(
      JSON.stringify({
        success: true,
        resumeContent,
        resumeId: resumeVersion?.id,
        profile,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-resume:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate resume";
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
