-- Fix security definer view warning by setting security_invoker
ALTER VIEW quiz_questions_student SET (security_invoker = true);