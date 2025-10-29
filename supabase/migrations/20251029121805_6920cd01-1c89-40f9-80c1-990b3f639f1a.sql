-- Fix 1: Add admin/faculty visibility to profiles table
CREATE POLICY "Admins can view all profiles in their college"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Faculty can view students in their sections"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'faculty'::app_role) AND
  id IN (
    SELECT DISTINCT a.student_id 
    FROM attendance a
    WHERE a.marked_by = auth.uid()
  )
);

-- Fix 2: Protect quiz correct answers - Create view for students
CREATE VIEW quiz_questions_student AS
SELECT id, quiz_id, question, option_a, option_b, option_c, option_d, marks, created_at
FROM quiz_questions;

-- Drop the existing student policy on quiz_questions
DROP POLICY IF EXISTS "Students can view questions during quiz" ON public.quiz_questions;

-- Create restrictive policy - only faculty/admin can see full questions
CREATE POLICY "Faculty can view all quiz questions"
ON public.quiz_questions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'faculty'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant students access to view (without correct_answer)
GRANT SELECT ON quiz_questions_student TO authenticated;

-- Fix 3: Allow admins to view user roles in their college
CREATE POLICY "Admins can view roles in their college"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) AND
  college_id IN (
    SELECT college_id FROM user_roles 
    WHERE user_id = auth.uid()
  )) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix 4: Allow faculty to update attendance they marked
CREATE POLICY "Faculty can update attendance they marked"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'faculty'::app_role) AND
  marked_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'faculty'::app_role) AND
  marked_by = auth.uid()
);

CREATE POLICY "Admins can update all attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix 5: Allow admins to manage notifications
CREATE POLICY "Admins can update notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix 6: Allow faculty to delete their own quizzes
CREATE POLICY "Faculty can delete their own quizzes"
ON public.quizzes FOR DELETE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Admins can delete any quiz"
ON public.quizzes FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);