import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(100).trim(),
  role: z.enum(['super_admin', 'admin', 'faculty', 'student']),
  collegeId: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  section: z.string().max(50).optional(),
  rollNumber: z.string().max(50).optional()
})

function getSafeErrorMessage(error: any): string {
  console.error('Detailed error:', error)
  if (error.code === '23505') return 'User already exists with this email'
  if (error.code === '23503') return 'Invalid reference provided'
  if (error instanceof z.ZodError) {
    return `Validation error: ${error.errors.map(e => e.message).join(', ')}`
  }
  return 'An error occurred while creating the user'
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

    // Check if user has super_admin or admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, college_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData) {
      throw new Error('Unauthorized - No role found')
    }

    const isAuthorized = roleData.role === 'super_admin' || roleData.role === 'admin'
    if (!isAuthorized) {
      throw new Error('Only super admins and college admins can create users')
    }

    // Create the new user
    const requestBody = await req.json()
    
    // Validate input
    const validated = createUserSchema.parse(requestBody)
    const { email, password, fullName, role, collegeId, department, section, rollNumber } = validated

    // For college admins, ensure they can only create users for their college
    if (roleData.role === 'admin' && collegeId && collegeId !== roleData.college_id) {
      throw new Error('College admins can only create users for their own college')
    }

    // Determine final college_id
    const finalCollegeId = roleData.role === 'admin' ? roleData.college_id : (collegeId || null)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) throw authError

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ 
        user_id: authData.user.id, 
        role,
        college_id: finalCollegeId
      })

    if (roleInsertError) throw roleInsertError

    // Update profile with additional info for students
    if (role === 'student') {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          department: department || null,
          section: section || null,
          roll_number: rollNumber || null,
          college_id: finalCollegeId
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError.message)
      }
    } else {
      // Update college_id for all users
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ college_id: finalCollegeId })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: getSafeErrorMessage(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
