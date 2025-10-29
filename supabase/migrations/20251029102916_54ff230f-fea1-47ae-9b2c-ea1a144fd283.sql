-- Create function to auto-assign super admin role for specific emails
CREATE OR REPLACE FUNCTION public.assign_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_emails TEXT[] := ARRAY[
    'saitejaerukulla123@gmail.com',
    'raghushetti7@gmail.com',
    'svnaprogithub@gmail.com',
    'karthikeyareddykesari@gmail.com',
    'venuprakash17@gmail.com'
  ];
BEGIN
  -- Check if the new user's email is in the super admin list
  IF LOWER(NEW.email) = ANY(
    SELECT LOWER(unnest(super_admin_emails))
  ) THEN
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_super_admin_role();

-- Insert dummy colleges
INSERT INTO public.colleges (name, code, city, state, address) VALUES
  ('Swarna Bharathi Institute of Science and Technology', 'SBIT', 'Khammam', 'Telangana', 'Pakala, Khammam'),
  ('JNTU Hyderabad', 'JNTUH', 'Hyderabad', 'Telangana', 'Kukatpally, Hyderabad'),
  ('Osmania University', 'OU', 'Hyderabad', 'Telangana', 'Amberpet, Hyderabad')
ON CONFLICT (code) DO NOTHING;

-- Insert dummy quizzes
WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.quizzes (title, description, subject, duration_minutes, total_marks, college_id, is_active, start_time, end_time) 
SELECT 
  'Data Structures Quiz 1',
  'Basic concepts of arrays, linked lists, and stacks',
  'Data Structures',
  45,
  50,
  college.id,
  true,
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '5 days'
FROM college
ON CONFLICT DO NOTHING;

WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.quizzes (title, description, subject, duration_minutes, total_marks, college_id, is_active, start_time, end_time)
SELECT
  'DBMS Mid Term Test',
  'Database normalization, SQL queries, and transactions',
  'Database Management',
  60,
  100,
  college.id,
  true,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '7 days'
FROM college
ON CONFLICT DO NOTHING;

-- Insert dummy coding problems
WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.coding_problems (title, description, difficulty, constraints, tags, test_cases, college_id, is_placement)
SELECT
  'Two Sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  'Easy',
  'Time Complexity: O(n), Space Complexity: O(n)',
  ARRAY['Array', 'Hash Table'],
  '[{"input": "[2,7,11,15], target=9", "output": "[0,1]", "explanation": "nums[0] + nums[1] == 9"}]'::jsonb,
  college.id,
  true
FROM college
ON CONFLICT DO NOTHING;

WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.coding_problems (title, description, difficulty, constraints, tags, test_cases, college_id, is_placement)
SELECT
  'Reverse Linked List',
  'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  'Medium',
  'Time Complexity: O(n), Space Complexity: O(1)',
  ARRAY['Linked List', 'Recursion'],
  '[{"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"}]'::jsonb,
  college.id,
  true
FROM college
ON CONFLICT DO NOTHING;

-- Insert dummy placement sessions  
WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.placement_sessions (title, description, session_type, start_time, end_time, college_id, is_active)
SELECT
  'Aptitude Test Practice Session',
  'Practice quantitative aptitude and logical reasoning',
  'aptitude',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '3 days' + INTERVAL '2 hours',
  college.id,
  true
FROM college
ON CONFLICT DO NOTHING;

WITH college AS (SELECT id FROM public.colleges WHERE code = 'SBIT' LIMIT 1)
INSERT INTO public.placement_sessions (title, description, session_type, start_time, end_time, college_id, is_active)
SELECT
  'Technical Mock Interview Round',
  'Practice technical interviews with industry experts',
  'mock_interview',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '5 days' + INTERVAL '3 hours',
  college.id,
  true
FROM college
ON CONFLICT DO NOTHING;