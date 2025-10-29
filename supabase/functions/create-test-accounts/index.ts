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

    const testAccounts = [
      { 
        email: 'student@test.com', 
        password: 'student123', 
        role: 'student',
        full_name: 'Test Student',
        roll_number: 'CS2024001'
      },
      { 
        email: 'faculty@test.com', 
        password: 'faculty123', 
        role: 'faculty',
        full_name: 'Test Faculty'
      },
      { 
        email: 'admin@test.com', 
        password: 'admin123', 
        role: 'admin',
        full_name: 'Test Admin'
      },
      { 
        email: 'hod@test.com', 
        password: 'hod123', 
        role: 'faculty',
        full_name: 'Test HOD',
        is_hod: true
      }
    ]

    const results = []
    const collegeId = '1cc07bc1-3bfd-4bd8-91e1-2ab9fa7ac526' // SBIT college ID
    const cseDeptId = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('code', 'CSE')
      .single()

    const sectionId = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('name', 'A')
      .limit(1)
      .single()

    for (const account of testAccounts) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUser.users.some(u => u.email === account.email)

      let userId: string

      if (userExists) {
        const existing = existingUser.users.find(u => u.email === account.email)
        userId = existing!.id
        results.push({ email: account.email, status: 'already_exists', role: account.role })
      } else {
        // Create user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.full_name
          }
        })

        if (authError) {
          results.push({ email: account.email, status: 'error', message: authError.message })
          continue
        }

        userId = authData.user.id

        // Update profile
        await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: account.full_name,
            roll_number: account.roll_number || null,
            department: cseDeptId.data?.id || null,
            section: sectionId.data?.id || null
          })
          .eq('id', userId)

        // Assign role
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: account.role })

        results.push({ 
          email: account.email, 
          password: account.password,
          role: account.role, 
          status: 'created' 
        })
      }

      // Special setup for HOD
      if (account.is_hod && cseDeptId.data) {
        await supabaseAdmin
          .from('departments')
          .update({ hod_id: userId })
          .eq('id', cseDeptId.data.id)
      }

      // Setup faculty section assignment
      if (account.role === 'faculty' && sectionId.data) {
        await supabaseAdmin
          .from('faculty_sections')
          .upsert({
            faculty_id: userId,
            section_id: sectionId.data.id,
            subject: 'Data Structures'
          }, {
            onConflict: 'faculty_id,section_id,subject'
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Test accounts processed', 
        results,
        credentials: testAccounts.map(a => ({
          email: a.email,
          password: a.password,
          role: a.role
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error creating test accounts:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
