import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const userDataSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(100).trim(),
  role: z.enum(['super_admin', 'admin', 'faculty', 'student']),
  college_id: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  section: z.string().max(50).optional(),
  roll_number: z.string().max(50).optional()
})

const bulkCreateSchema = z.object({
  users: z.array(userDataSchema).min(1).max(100)
})

interface UserData {
  email: string
  password: string
  full_name: string
  role: 'super_admin' | 'admin' | 'faculty' | 'student'
  college_id?: string
  department?: string
  section?: string
  roll_number?: string
}

function getSafeErrorMessage(error: any): string {
  console.error('Detailed error:', error)
  if (error.code === '23505') return 'User already exists'
  if (error.code === '23503') return 'Invalid reference provided'
  if (error instanceof z.ZodError) {
    return `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
  }
  return 'An error occurred while processing the user'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has super_admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'super_admin') {
      throw new Error('Only super admins can bulk create users')
    }

    // Parse and validate request body
    const requestBody = await req.json()
    const validated = bulkCreateSchema.parse(requestBody)
    const { users } = validated

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[]
    }

    console.log(`Processing ${users.length} users...`)

    for (const userData of users) {
      try {
        // Create the user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name
          }
        })

        if (authError) {
          results.failed.push({
            email: userData.email,
            error: getSafeErrorMessage(authError)
          })
          continue
        }

        // Assign role
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ 
            user_id: authData.user.id, 
            role: userData.role,
            college_id: userData.college_id || null
          })

        if (roleInsertError) {
          results.failed.push({
            email: userData.email,
            error: getSafeErrorMessage(roleInsertError)
          })
          continue
        }

        // Update profile with additional info
        const profileUpdate: any = {
          college_id: userData.college_id || null
        }

        if (userData.role === 'student') {
          profileUpdate.department = userData.department || null
          profileUpdate.section = userData.section || null
          profileUpdate.roll_number = userData.roll_number || null
        }

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', authData.user.id)

        if (profileError) {
          console.error(`Profile update warning for ${userData.email}:`, profileError.message)
        }

        results.successful.push(userData.email)
        console.log(`Successfully created user: ${userData.email}`)
      } catch (error: any) {
        results.failed.push({
          email: userData.email,
          error: getSafeErrorMessage(error)
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: users.length,
          successful: results.successful.length,
          failed: results.failed.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: getSafeErrorMessage(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
