import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authHelpers } from "@/integrations/api/client";
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

export interface Hobby {
  id?: string;
  hobby_name: string;
  description?: string;
  display_order?: number;
}

export function useStudentProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile - using localStorage for now until API is ready
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) {
          // Try to load from localStorage anyway for offline support
          const { resumeStorage } = await import("@/lib/resumeStorage");
          return resumeStorage.load('personal_info_saved') || null;
        }

        // TODO: Replace with API call when backend endpoint is ready
        // For now, load from localStorage
        const { resumeStorage } = await import("@/lib/resumeStorage");
        const savedProfile = resumeStorage.load('personal_info_saved');
        return savedProfile || null;
      } catch (error) {
        // User not authenticated or API error - try localStorage
        try {
          const { resumeStorage } = await import("@/lib/resumeStorage");
          return resumeStorage.load('personal_info_saved') || null;
        } catch {
          return null;
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false, // Don't retry on auth errors
  });

  // Shared query options for better performance
  const sharedQueryOptions = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  };

  // Fetch education - using localStorage for now
  const { data: education = [], isLoading: educationLoading } = useQuery({
    queryKey: ["studentEducation"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        // For now, load from localStorage
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('education_saved') || [];
      } catch (error) {
        // Return empty array on error
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch projects - using localStorage for now
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["studentProjects"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('projects_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch skills - using localStorage for now
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["studentSkills"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        // For now, load from localStorage
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('skills_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch certifications - using localStorage for now
  const { data: certifications = [], isLoading: certificationsLoading } = useQuery({
    queryKey: ["studentCertifications"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('certifications_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch achievements - using localStorage for now
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ["studentAchievements"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('achievements_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch extracurricular - using localStorage for now
  const { data: extracurricular = [], isLoading: extracurricularLoading } = useQuery({
    queryKey: ["studentExtracurricular"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('extracurricular_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Fetch hobbies - using localStorage for now
  const { data: hobbies = [], isLoading: hobbiesLoading } = useQuery({
    queryKey: ["studentHobbies"],
    queryFn: async () => {
      try {
        const user = await authHelpers.getUser();
        if (!user) return [];

        // TODO: Replace with API call when backend endpoint is ready
        const { resumeStorage } = await import("@/lib/resumeStorage");
        return resumeStorage.load('hobbies_saved') || [];
      } catch (error) {
        return [];
      }
    },
    ...sharedQueryOptions,
    retry: false,
  });

  // Save profile mutation - using localStorage for now
  const saveProfile = useMutation({
    mutationFn: async (profileData: StudentProfile) => {
      try {
        const user = await authHelpers.getUser();
        if (!user) throw new Error("Not authenticated");

        // TODO: Replace with API call when backend endpoint is ready
        // For now, save to localStorage
        const { resumeStorage } = await import("@/lib/resumeStorage");
        resumeStorage.save('personal_info_saved', profileData);
        
        return profileData;
      } catch (error: any) {
        // Still save to localStorage even if auth fails
        const { resumeStorage } = await import("@/lib/resumeStorage");
        resumeStorage.save('personal_info_saved', profileData);
        return profileData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      toast({ title: "Profile saved successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error saving profile", 
        description: error.message || "Saved to local storage",
        variant: "destructive" 
      });
    },
  });

  const isLoading = profileLoading || educationLoading || projectsLoading || 
                    skillsLoading || certificationsLoading || achievementsLoading || 
                    extracurricularLoading || hobbiesLoading;

  return {
    profile,
    education,
    projects,
    skills,
    certifications,
    achievements,
    extracurricular,
    hobbies,
    isLoading,
    saveProfile,
  };
}
