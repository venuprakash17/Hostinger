-- Create student_profiles table for personal information
CREATE TABLE public.student_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone_number text,
  linkedin_profile text,
  github_portfolio text,
  address_city text,
  father_name text,
  father_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create student_education table
CREATE TABLE public.student_education (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  degree text NOT NULL,
  field_of_study text,
  start_date date,
  end_date date,
  cgpa_percentage text,
  relevant_coursework text,
  is_current boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_projects table
CREATE TABLE public.student_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_title text NOT NULL,
  duration_start date,
  duration_end date,
  description text,
  technologies_used text[],
  role_contribution text,
  github_demo_link text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_skills table
CREATE TABLE public.student_skills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'technical', 'soft', 'languages'
  skills text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_certifications table
CREATE TABLE public.student_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_name text NOT NULL,
  issuing_organization text NOT NULL,
  date_issued date,
  credential_url text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_achievements table
CREATE TABLE public.student_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  issuing_body text,
  achievement_date date,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_extracurricular table
CREATE TABLE public.student_extracurricular (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_organization text NOT NULL,
  role text,
  duration_start date,
  duration_end date,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create resume_versions table to track generated resumes
CREATE TABLE public.resume_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_type text NOT NULL, -- 'general', 'role-based', 'custom'
  target_role text,
  file_url text,
  ats_score integer,
  generated_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

-- Create resume_analytics table to track all resume actions
CREATE TABLE public.resume_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'generate', 'download', 'ats_check', 'ai_enhance', 'cover_letter', 'view'
  action_details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_extracurricular ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view their own profile"
  ON public.student_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.student_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON public.student_profiles FOR DELETE
  USING (user_id = auth.uid());

-- Education policies
CREATE POLICY "Users can manage their own education"
  ON public.student_education FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can manage their own projects"
  ON public.student_projects FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Skills policies
CREATE POLICY "Users can manage their own skills"
  ON public.student_skills FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Certifications policies
CREATE POLICY "Users can manage their own certifications"
  ON public.student_certifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Achievements policies
CREATE POLICY "Users can manage their own achievements"
  ON public.student_achievements FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Extracurricular policies
CREATE POLICY "Users can manage their own extracurricular"
  ON public.student_extracurricular FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Resume versions policies
CREATE POLICY "Users can view their own resume versions"
  ON public.resume_versions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own resume versions"
  ON public.resume_versions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Resume analytics policies
CREATE POLICY "Users can view their own analytics"
  ON public.resume_analytics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own analytics"
  ON public.resume_analytics FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Faculty and Admin can view student data for their college
CREATE POLICY "Faculty can view student profiles"
  ON public.student_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'faculty'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Create indexes for better performance
CREATE INDEX idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX idx_student_education_user_id ON public.student_education(user_id);
CREATE INDEX idx_student_projects_user_id ON public.student_projects(user_id);
CREATE INDEX idx_student_skills_user_id ON public.student_skills(user_id);
CREATE INDEX idx_student_certifications_user_id ON public.student_certifications(user_id);
CREATE INDEX idx_student_achievements_user_id ON public.student_achievements(user_id);
CREATE INDEX idx_student_extracurricular_user_id ON public.student_extracurricular(user_id);
CREATE INDEX idx_resume_versions_user_id ON public.resume_versions(user_id);
CREATE INDEX idx_resume_analytics_user_id ON public.resume_analytics(user_id);
CREATE INDEX idx_resume_analytics_action_type ON public.resume_analytics(action_type);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_education_updated_at
  BEFORE UPDATE ON public.student_education
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_projects_updated_at
  BEFORE UPDATE ON public.student_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_skills_updated_at
  BEFORE UPDATE ON public.student_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_certifications_updated_at
  BEFORE UPDATE ON public.student_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_achievements_updated_at
  BEFORE UPDATE ON public.student_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_extracurricular_updated_at
  BEFORE UPDATE ON public.student_extracurricular
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();