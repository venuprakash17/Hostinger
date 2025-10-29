import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const testUsers = [
      { email: 'superadmin@test.com', password: 'Super@123', role: 'super_admin' },
      { email: 'admin@test.com', password: 'Admin@123', role: 'admin' },
      { email: 'faculty@test.com', password: 'Faculty@123', role: 'faculty' },
      { email: 'student@test.com', password: 'Student@123', role: 'student' },
    ]

    const results = []

    for (const user of testUsers) {
      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })

      if (authError) {
        console.error(`Error creating ${user.role}:`, authError)
        results.push({ email: user.email, status: 'error', message: authError.message })
        continue
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: user.role })

      if (roleError) {
        console.error(`Error assigning role to ${user.role}:`, roleError)
        results.push({ email: user.email, status: 'error', message: roleError.message })
      } else {
        results.push({ email: user.email, role: user.role, status: 'success' })
      }
    }

    return new Response(
      JSON.stringify({ message: 'Test users seeded', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
