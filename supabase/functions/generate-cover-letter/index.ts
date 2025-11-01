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

    const { companyName, position, whyInterested, jobDescription } = await req.json();

    if (!companyName || !position) {
      throw new Error("Company name and position are required");
    }

    // Fetch student profile
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error("Profile not found. Please complete your profile first.");
    }

    // Fetch education and projects for context
    const [educationRes, projectsRes, skillsRes] = await Promise.all([
      supabase.from("student_education").select("*").eq("user_id", user.id).order("display_order").limit(2),
      supabase.from("student_projects").select("*").eq("user_id", user.id).order("display_order").limit(3),
      supabase.from("student_skills").select("*").eq("user_id", user.id),
    ]);

    const systemPrompt = `You are a professional cover letter writer. Create compelling, personalized cover letters that:
- Are concise (3-4 paragraphs, ~300 words)
- Show genuine interest and research about the company
- Highlight relevant skills and experiences
- Demonstrate value proposition
- Include a strong call to action
- Use professional yet personable tone
- Are ATS-friendly

Return ONLY a valid JSON object with:
{
  "coverLetter": "The complete cover letter text with proper formatting",
  "subject": "Suggested email subject line",
  "highlights": ["Key points emphasized in the letter"]
}`;

    const userPrompt = `Write a cover letter for:
Company: ${companyName}
Position: ${position}
Why interested: ${whyInterested}
${jobDescription ? `Job Description: ${jobDescription}` : ""}

Applicant Profile:
Name: ${profile.full_name}
Email: ${profile.email}
Education: ${JSON.stringify(educationRes.data || [])}
Recent Projects: ${JSON.stringify(projectsRes.data || [])}
Skills: ${JSON.stringify(skillsRes.data || [])}`;

    console.log("Calling Lovable AI for cover letter generation...");

    const aiResponse = await supabase.functions.invoke("ai-chat", {
      body: {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      },
    });

    if (aiResponse.error) {
      console.error("AI API Error:", aiResponse.error);
      throw new Error(`AI API error: ${aiResponse.error.message || "Unknown error"}`);
    }

    const content = aiResponse.data?.choices?.[0]?.message?.content || "";

    console.log("AI Response received");

    // Parse AI response
    let result;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      result = {
        coverLetter: content,
        subject: `Application for ${position} at ${companyName}`,
        highlights: ["Generated cover letter"],
      };
    }

    // Track analytics
    await supabase.from("resume_analytics").insert({
      user_id: user.id,
      action_type: "cover_letter",
      action_details: { companyName, position },
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-cover-letter:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate cover letter";
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
