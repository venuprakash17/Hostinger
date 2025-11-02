import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify user is super admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole || userRole.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { companyId, materialType, data: materialsData } = await req.json();

    if (!companyId || !materialType || !materialsData || !Array.isArray(materialsData)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing upload:', { companyId, materialType, count: materialsData.length });

    let insertedCount = 0;
    let errors: string[] = [];

    // Process based on material type
    if (materialType === 'quizzes') {
      for (const row of materialsData) {
        try {
          const { error } = await supabaseClient
            .from('company_quizzes')
            .insert({
              company_id: companyId,
              title: row.title,
              description: row.description || null,
              questions: row.questions,
              difficulty: row.difficulty || null,
              duration_minutes: row.duration_minutes || null,
            });

          if (error) throw error;
          insertedCount++;
        } catch (err) {
          errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (materialType === 'coding') {
      for (const row of materialsData) {
        try {
          const { error } = await supabaseClient
            .from('company_coding_problems')
            .insert({
              company_id: companyId,
              title: row.title,
              description: row.description,
              difficulty: row.difficulty,
              sample_input: row.sample_input || null,
              sample_output: row.sample_output || null,
              constraints: row.constraints || null,
              test_cases: row.test_cases || null,
            });

          if (error) throw error;
          insertedCount++;
        } catch (err) {
          errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (materialType === 'gd') {
      for (const row of materialsData) {
        try {
          const { error } = await supabaseClient
            .from('company_gd_topics')
            .insert({
              company_id: companyId,
              topic: row.topic,
              description: row.description || null,
              key_points: row.key_points || null,
              dos_and_donts: row.dos_and_donts || null,
            });

          if (error) throw error;
          insertedCount++;
        } catch (err) {
          errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else if (materialType === 'interview') {
      for (const row of materialsData) {
        try {
          const { error } = await supabaseClient
            .from('company_interview_questions')
            .insert({
              company_id: companyId,
              question: row.question,
              category: row.category || null,
              expected_answer: row.expected_answer || null,
              tips: row.tips || null,
            });

          if (error) throw error;
          insertedCount++;
        } catch (err) {
          errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid material type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Inserted ${insertedCount} records with ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        total: materialsData.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-company-materials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
