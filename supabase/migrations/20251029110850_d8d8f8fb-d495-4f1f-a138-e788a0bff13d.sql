-- Add department and section to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  college_id UUID REFERENCES public.colleges(id),
  hod_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create sections table
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  college_id UUID REFERENCES public.colleges(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, name, year, semester)
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Create faculty_sections table for assignments
CREATE TABLE IF NOT EXISTS public.faculty_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, section_id, subject)
);

ALTER TABLE public.faculty_sections ENABLE ROW LEVEL SECURITY;

-- Update attendance table to include section
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id);

-- Drop the old unique constraint if exists and create new one
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_student_id_subject_date_key;

-- Add new unique constraint that allows multiple subjects per day
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_subject_date_unique 
UNIQUE(student_id, subject, date, section_id);

-- RLS Policies for departments
CREATE POLICY "Everyone can view departments"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "HOD can manage their department"
  ON public.departments FOR ALL
  USING (hod_id = auth.uid())
  WITH CHECK (hod_id = auth.uid());

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for sections
CREATE POLICY "Everyone can view sections"
  ON public.sections FOR SELECT
  USING (true);

CREATE POLICY "HOD can manage sections in their department"
  ON public.sections FOR ALL
  USING (
    department_id IN (
      SELECT id FROM public.departments WHERE hod_id = auth.uid()
    )
  )
  WITH CHECK (
    department_id IN (
      SELECT id FROM public.departments WHERE hod_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sections"
  ON public.sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for faculty_sections
CREATE POLICY "Faculty can view their assigned sections"
  ON public.faculty_sections FOR SELECT
  USING (faculty_id = auth.uid());

CREATE POLICY "Everyone can view faculty assignments"
  ON public.faculty_sections FOR SELECT
  USING (true);

CREATE POLICY "HOD can manage faculty sections in their department"
  ON public.faculty_sections FOR ALL
  USING (
    section_id IN (
      SELECT s.id FROM public.sections s
      JOIN public.departments d ON s.department_id = d.id
      WHERE d.hod_id = auth.uid()
    )
  )
  WITH CHECK (
    section_id IN (
      SELECT s.id FROM public.sections s
      JOIN public.departments d ON s.department_id = d.id
      WHERE d.hod_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all faculty sections"
  ON public.faculty_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Insert sample departments and sections
WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.departments (name, code, college_id) 
SELECT 'Computer Science Engineering', 'CSE', college.id FROM college
ON CONFLICT (code) DO NOTHING;

WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.departments (name, code, college_id)
SELECT 'Electronics and Communication Engineering', 'ECE', college.id FROM college
ON CONFLICT (code) DO NOTHING;

-- Insert sample sections
WITH dept AS (SELECT id FROM public.departments WHERE code = 'CSE' LIMIT 1),
     college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.sections (name, department_id, year, semester, college_id)
SELECT 'A', dept.id, 3, 5, college.id FROM dept, college
ON CONFLICT DO NOTHING;

WITH dept AS (SELECT id FROM public.departments WHERE code = 'CSE' LIMIT 1),
     college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.sections (name, department_id, year, semester, college_id)
SELECT 'B', dept.id, 3, 5, college.id FROM dept, college
ON CONFLICT DO NOTHING;