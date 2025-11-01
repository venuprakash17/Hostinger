import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { filePath, bucket } = await req.json();
    
    if (!filePath || !bucket) {
      throw new Error('Missing filePath or bucket parameter');
    }

    console.log(`Parsing document: ${filePath} from bucket: ${bucket}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    console.log('File downloaded successfully');

    // Get file extension
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    let extractedText = '';

    if (fileExtension === 'txt') {
      // For text files, just read the content
      extractedText = await fileData.text();
    } else if (fileExtension === 'pdf' || fileExtension === 'doc' || fileExtension === 'docx') {
      // Use Lovable AI to extract text from PDF and DOC files
      console.log('Using Lovable AI to extract text from document');
      
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('Lovable AI API key not configured');
      }

      try {
        const aiResponse = await fetch('https://api.lovable.app/v1/ai/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text content from this document. Return ONLY the extracted text, no additional commentary or formatting. Preserve the structure and content exactly as it appears in the document.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:application/${fileExtension};base64,${base64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0
          })
        });

        if (!aiResponse.ok) {
          const errorData = await aiResponse.text();
          console.error('Lovable AI error response:', errorData);
          throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
        }

        const aiResult = await aiResponse.json();
        extractedText = aiResult.choices[0].message.content.trim();
        
        console.log(`Extracted ${extractedText.length} characters using AI`);
      } catch (aiError) {
        console.error('AI extraction error:', aiError);
        throw new Error('Unable to extract text from document. Please copy the text and use the text area instead.');
      }
    } else {
      throw new Error('Unsupported file format. Please use TXT, PDF, DOC, or DOCX files.');
    }

    // Clean up the file from storage after extraction
    await supabase.storage.from(bucket).remove([filePath]);
    
    console.log(`Successfully extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: extractedText,
        length: extractedText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
