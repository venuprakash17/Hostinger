import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StudentProfile {
  full_name?: string;
  email?: string;
  phone_number?: string;
  linkedin_profile?: string;
  github_portfolio?: string;
  address_city?: string;
  father_name?: string;
  father_number?: string;
}

export interface Education {
  id?: string;
  institution_name: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  cgpa_percentage?: string;
  relevant_coursework?: string;
  is_current?: boolean;
  display_order?: number;
}

export interface Project {
  id?: string;
  project_title: string;
  duration_start?: string;
  duration_end?: string;
  description?: string;
  technologies_used?: string[];
  role_contribution?: string;
  github_demo_link?: string;
  display_order?: number;
}

export interface Skill {
  id?: string;
  category: string;
  skills: string[];
}

export interface Certification {
  id?: string;
  certification_name: string;
  issuing_organization: string;
  date_issued?: string;
  credential_url?: string;
  display_order?: number;
}

export interface Achievement {
  id?: string;
  title: string;
  issuing_body?: string;
  achievement_date?: string;
  description?: string;
  display_order?: number;
}

export interface Extracurricular {
  id?: string;
  activity_organization: string;
  role?: string;
  duration_start?: string;
  duration_end?: string;
  description?: string;
  display_order?: number;
}

export function useStudentProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch education
  const { data: education = [], isLoading: educationLoading } = useQuery({
    queryKey: ["studentEducation"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_education")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["studentProjects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch skills
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["studentSkills"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_skills")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch certifications
  const { data: certifications = [], isLoading: certificationsLoading } = useQuery({
    queryKey: ["studentCertifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch achievements
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ["studentAchievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch extracurricular
  const { data: extracurricular = [], isLoading: extracurricularLoading } = useQuery({
    queryKey: ["studentExtracurricular"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_extracurricular")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
  });

  // Save profile mutation
  const saveProfile = useMutation({
    mutationFn: async (profileData: StudentProfile) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("student_profiles")
        .upsert({
          user_id: user.id,
          ...profileData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      toast({ title: "Profile saved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error saving profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const isLoading = profileLoading || educationLoading || projectsLoading || 
                    skillsLoading || certificationsLoading || achievementsLoading || 
                    extracurricularLoading;

  return {
    profile,
    education,
    projects,
    skills,
    certifications,
    achievements,
    extracurricular,
    isLoading,
    saveProfile,
  };
}
