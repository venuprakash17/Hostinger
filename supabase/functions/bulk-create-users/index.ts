import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  email: string;
  password: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'faculty' | 'student';
  college_id?: string;
  department?: string;
  section?: string;
  year?: number;
  roll_number?: string;
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

    const { users } = await req.json() as { users: UserData[] }

    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new Error('Invalid users array')
    }

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[]
    }

    console.log(`Processing ${users.length} users...`)

    for (const userData of users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.password || !userData.full_name || !userData.role) {
          results.failed.push({
            email: userData.email || 'unknown',
            error: 'Missing required fields'
          })
          continue
        }

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
            error: authError.message
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
            error: `Role assignment failed: ${roleInsertError.message}`
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
          error: error.message
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
    console.error('Error in bulk user creation:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
