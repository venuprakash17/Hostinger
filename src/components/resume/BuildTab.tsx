import { PersonalInfoForm } from "./PersonalInfoForm";
import { EducationForm } from "./EducationForm";
import { ProjectsForm } from "./ProjectsForm";
import { SkillsForm } from "./SkillsForm";
import { CertificationsForm } from "./CertificationsForm";
import { AchievementsForm } from "./AchievementsForm";
import { ExtracurricularForm } from "./ExtracurricularForm";
import { HobbiesForm } from "./HobbiesForm";
import { ResumePreviewDialog } from "./ResumePreviewDialog";
import { ResumePreviewModal } from "./ResumePreviewModal";
import { SmartResumeAnalysisModal } from "./SmartResumeAnalysisModal";
import { ProjectSuggestionModal } from "./ProjectSuggestionModal";
// Removed ResumeBuilderModeSelector - only AI-powered mode supported
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, Lightbulb, Download, Sparkles, Briefcase, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { ResumeSuggestionsPanel } from "./ResumeSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resumeStorage } from "@/lib/resumeStorage";
import { checkOpenAIConfig } from "@/lib/resumeitnow/utils/envCheck";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";

// Use ResumeItNow PDF generator service
import { generateATSSafePDF, downloadPDF } from "@/lib/resumeitnow/services/pdfGeneratorService";
import { handlePDFError, handleOpenAIError } from "@/lib/resumeitnow/utils/errorHandler";
import { trackPDFGeneration } from "@/lib/resumeitnow/utils/analytics";

export const BuildTab = memo(function BuildTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  const [localData, setLocalData] = useState<any>(null);
  const openAIConfig = checkOpenAIConfig();
  const [targetRole, setTargetRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showSmartAnalysis, setShowSmartAnalysis] = useState(false);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  // Removed mode selector - only AI-powered mode
  
  const {
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
  } = useStudentProfile();

  // Load saved data from localStorage once on mount
  useEffect(() => {
    const savedEducation = resumeStorage.load('education_saved') || [];
    const savedProjects = resumeStorage.load('projects_saved') || [];
    
    setLocalData({
      education: savedEducation,
      projects: savedProjects,
    });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // Listen for data updates and refresh query cache
    useEffect(() => {
      const handleUpdate = () => {
        const savedEducation = resumeStorage.load('education_saved') || [];
        const savedProjects = resumeStorage.load('projects_saved') || [];
        const savedProfile = resumeStorage.load('personal_info_saved');
        setLocalData({
          education: savedEducation,
          projects: savedProjects,
        });
        // Invalidate queries to trigger re-fetch (this will reload from localStorage)
        queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
        queryClient.invalidateQueries({ queryKey: ["studentEducation"] });
        queryClient.invalidateQueries({ queryKey: ["studentProjects"] });
        queryClient.invalidateQueries({ queryKey: ["studentSkills"] });
        queryClient.invalidateQueries({ queryKey: ["studentCertifications"] });
        queryClient.invalidateQueries({ queryKey: ["studentAchievements"] });
        queryClient.invalidateQueries({ queryKey: ["studentExtracurricular"] });
        queryClient.invalidateQueries({ queryKey: ["studentHobbies"] });
      };

      window.addEventListener('resumeDataUpdated', handleUpdate);
      return () => window.removeEventListener('resumeDataUpdated', handleUpdate);
    }, [queryClient]);

  // Merge API data with localStorage data
  const allEducation = useMemo(() => {
    const saved = localData?.education || [];
    // Merge and deduplicate by id
    const merged = [...education];
    saved.forEach((item: any) => {
      if (!merged.find((e: any) => e.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [education, localData?.education]);
  
  const allProjects = useMemo(() => {
    const saved = localData?.projects || [];
    const merged = [...projects];
    saved.forEach((item: any) => {
      if (!merged.find((p: any) => p.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [projects, localData?.projects]);

  // Merge skills from localStorage with props
  const allSkills = useMemo(() => {
    const savedSkills = resumeStorage.load('skills_saved') || [];
    const merged = [...skills];
    savedSkills.forEach((item: any) => {
      if (!merged.find((s: any) => s.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [skills]);

  // Memoize profile completeness calculation - Only 2 required sections
  const completeness = useMemo(() => {
    let completed = 0;
    let total = 2; // Only Personal Info and Education are required

    // Required sections
    if (profile?.full_name && profile?.email && profile?.phone_number) completed++;
    if (allEducation.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [profile?.full_name, profile?.email, profile?.phone_number, allEducation.length]);

  // Define handleDownloadPDF first to avoid circular dependency
  const handleDownloadPDF = useCallback(async (resumeData?: any) => {
    const contentToUse = resumeData || resumeContent;
    if (!contentToUse || !profile) {
      // If called without data, can't generate PDF
      return;
    }
    
    const startTime = Date.now();
    try {
      // Prepare ResumeItNow-compatible resume data structure
      const resumeItNowData = {
        profile: {
          full_name: profile.full_name,
          email: profile.email,
          phone_number: profile.phone_number,
          linkedin_profile: profile.linkedin_profile,
          github_portfolio: profile.github_portfolio,
          address: profile.address,
          website: profile.website,
        },
        summary: contentToUse.summary,
        education: contentToUse.formattedEducation || allEducation,
        work_experience: contentToUse.work_experience || [], // Include work experience
      extracurricular: contentToUse.formattedExtracurricular || extracurricular,
      hobbies: contentToUse.formattedHobbies || hobbies,
      languages: contentToUse.languages || [], // Include languages
        projects: contentToUse.formattedProjects || allProjects,
        skills: contentToUse.formattedSkills || formatSkillsForPDF(allSkills),
        // Template selection handled in preview modal
        certifications: contentToUse.formattedCertifications || certifications,
        achievements: contentToUse.formattedAchievements || achievements,
        extracurricular: contentToUse.formattedExtracurricular || extracurricular,
        hobbies: contentToUse.formattedHobbies || hobbies,
        languages: contentToUse.languages || [],
        references: contentToUse.references || [],
      };

      // Use ResumeItNow ATS-safe PDF generator with selected template
      // Use default template - actual template selection is in preview modal
      const pdfBlob = await generateATSSafePDF(resumeItNowData, 'fresher_classic');

      // Download PDF
      downloadPDF(pdfBlob, `${profile.full_name?.replace(/\s+/g, '_')}_Resume.pdf`);

      // Track PDF generation
      const duration = Date.now() - startTime;
      trackPDFGeneration(
        true,
        duration,
        undefined, // error
        {
          completeness,
          sections_completed: {
            personal_info: !!(profile?.full_name && profile?.email && profile?.phone_number),
            education: allEducation.length > 0,
            projects: allProjects.length > 0,
            skills: allSkills.length > 0,
            certifications: certifications.length > 0,
            achievements: achievements.length > 0,
            extracurricular: extracurricular.length > 0,
            hobbies: hobbies.length > 0,
          }
        }
      );

      toast({
        title: "Resume Downloaded",
        description: "Your ATS-safe resume has been downloaded as a PDF.",
      });
    } catch (error: any) {
      console.error("Download error:", error);
      const duration = Date.now() - startTime;
      const errorInfo = handlePDFError(error);
      trackPDFGeneration(false, duration, errorInfo.message);
      toast({
        title: errorInfo.message,
        description: errorInfo.actionable,
        variant: "destructive",
      });
    }
    }, [allEducation, allProjects, allSkills, certifications, achievements, extracurricular, hobbies, profile, toast, resumeContent]);

  // Helper function to format skills for PDF
  const formatSkillsForPDF = (skills: any[]) => {
    const formatted: Record<string, string[]> = {
      technical: [],
      soft: [],
      languages: [],
    };

    skills.forEach((skill: any) => {
      const category = skill.category || 'technical';
      const skillList = Array.isArray(skill.skills)
        ? skill.skills
        : (typeof skill.skills === 'string'
            ? skill.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []);
      
      if (!formatted[category]) formatted[category] = [];
      formatted[category].push(...skillList);
    });

    return formatted;
  };

  // Prepare resume data for preview modal - keeps skills as dict for templates
  const prepareResumeData = useCallback(() => {
    // Format skills as dictionary for template preview (templates need this format)
    const formattedSkills = formatSkillsForPDF(allSkills);
    
    return {
      profile: {
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone_number: profile?.phone_number || '',
        linkedin_profile: profile?.linkedin_profile || '',
        github_portfolio: profile?.github_portfolio || '',
        address: profile?.address || '',
        // company_name will be added during optimization in preview modal
      },
      summary: resumeContent?.summary,
      education: allEducation.map((edu: any) => ({
        degree: edu.degree || edu.degree_title || '',
        institution_name: edu.institution_name || edu.institution || edu.school || '',
        field_of_study: edu.field_of_study || edu.major || '',
        start_date: edu.start_date || edu.start || '',
        end_date: edu.end_date || edu.end || '',
        is_current: edu.is_current || false,
        cgpa_percentage: edu.cgpa_percentage || edu.cgpa || edu.gpa || '',
      })),
      projects: allProjects.map((proj: any) => ({
        project_title: proj.project_title || proj.title || '',
        description: proj.description || '',
        technologies_used: proj.technologies_used || [],
        contributions: proj.contributions || [],
        duration_start: proj.duration_start || proj.start_date || '',
        duration_end: proj.duration_end || proj.end_date || '',
      })),
      skills: formattedSkills,
      certifications: certifications.map((cert: any) => ({
        certification_name: cert.certification_name || cert.title || '',
        issuing_organization: cert.issuing_organization || cert.organization || '',
        issue_date: cert.issue_date || cert.date_issued || '',
      })),
      achievements: achievements.map((ach: any) => ({
        achievement_title: ach.achievement_title || ach.title || '',
        title: ach.achievement_title || ach.title || '',
        description: ach.description || '',
        date: ach.date || '',
        organization: ach.organization || '',
      })),
      extracurricular: extracurricular.map((extra: any) => ({
        activity_name: extra.activity_name || extra.name || '',
        activity_organization: extra.activity_organization || extra.organization || '',
        role: extra.role || '',
        description: extra.description || '',
        start_date: extra.start_date || '',
        end_date: extra.end_date || '',
      })),
      hobbies: hobbies.map((hobby: any) => (
        typeof hobby === 'string' 
          ? { hobby_name: hobby } 
          : { hobby_name: hobby.hobby_name || hobby.name || hobby.title || '', description: hobby.description || '' }
      )),
      languages: [], // Languages are included in skills, extract if needed
      work_experience: [],
    };
  }, [profile, allEducation, allProjects, allSkills, certifications, achievements, extracurricular, hobbies, resumeContent]);

  // Handle resume optimization for job application
  const handleOptimizeResume = useCallback(async () => {
    if (!targetRole.trim()) {
      toast({
        title: "Target Role Required",
        description: "Please enter the job role you are applying for",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const resumeData = prepareResumeData();
      
      // Format skills for API (backend expects flat list)
      const formatSkillsForAPI = (skills: Record<string, string[]> | undefined): string[] => {
        if (!skills) return [];
        const flatList: string[] = [];
        Object.values(skills).forEach(categorySkills => {
          if (Array.isArray(categorySkills)) {
            flatList.push(...categorySkills.filter(s => typeof s === 'string' && s.trim().length > 0));
          }
        });
        return flatList;
      };

      const apiData = {
        ...resumeData,
        skills: formatSkillsForAPI(resumeData.skills as Record<string, string[]>),
      };

      const result = await optimizeResume(
        apiData as any,
        targetRole,
        jobDescription || undefined
      );

      const optimized = result.optimized_resume || result;
      
      // Convert skills back to dict format if needed
      if (optimized.skills && Array.isArray(optimized.skills)) {
        optimized.skills = { technical: optimized.skills };
      }

      // Ensure profile structure is maintained
      if (!optimized.profile && resumeData.profile) {
        optimized.profile = resumeData.profile;
      }

      setOptimizedResumeData(optimized);
      
      // Check if we should suggest adding projects
      const currentProjectsCount = allProjects.length;
      if (currentProjectsCount < 3 && targetRole) {
        // Show project suggestion modal after a short delay
        setTimeout(() => {
          setShowProjectSuggestions(true);
        }, 1000);
      }
      
      toast({
        title: "Resume Optimized!",
        description: `Your resume has been tailored for ${targetRole} with ${result.improvements_made?.length || 0} improvements. Ready to preview and download!${currentProjectsCount < 3 ? ' We\'ll suggest some projects to strengthen your resume.' : ''}`,
      });
    } catch (error) {
      console.error('Error optimizing resume:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [targetRole, jobDescription, prepareResumeData, toast, allProjects.length]);

  // Handle adding missing sections
  const handleAddSections = useCallback((sections: string[]) => {
    // Scroll to the relevant section in the form
    sections.forEach((section) => {
      const sectionId = section.replace('_', '-') + '-section';
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the section briefly
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    });
    
    toast({
      title: "Sections Ready",
      description: `Please fill in the ${sections.length} section(s) below.`,
    });
  }, [toast]);

  // Handle project suggestions
  const handleGetProjectSuggestions = useCallback(() => {
    if (!targetRole) {
      toast({
        title: "Target Role Required",
        description: "Please enter a target role first to get project suggestions.",
        variant: "destructive",
      });
      return;
    }
    setShowProjectSuggestions(true);
  }, [targetRole, toast]);

  // Handle adding suggested projects (from Smart Analysis Modal)
  const handleAddProjectsFromAnalysis = useCallback(async (newProjects: any[]) => {
    try {
      const existingProjects = resumeStorage.load('projects_saved') || [];
      const projectsToAdd = newProjects.map((proj, idx) => ({
        ...proj,
        id: `suggested_${Date.now()}_${idx}`,
        created_at: new Date().toISOString(),
      }));
      const allProjectsToSave = [...existingProjects, ...projectsToAdd];
      resumeStorage.save('projects_saved', allProjectsToSave);
      window.dispatchEvent(new Event('resumeDataUpdated'));
      
      toast({
        title: "Projects Added!",
        description: `Added ${newProjects.length} project(s). Please fill in the details below.`,
      });
      
      // Scroll to projects section
      setTimeout(() => {
        const projectsSection = document.getElementById('projects-section');
        if (projectsSection) {
          projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      console.error('Error adding projects:', error);
      toast({
        title: "Error",
        description: "Failed to add projects. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle removing irrelevant projects
  const handleRemoveProjects = useCallback(async (projectTitles: string[]) => {
    try {
      const existingProjects = resumeStorage.load('projects_saved') || [];
      const filteredProjects = existingProjects.filter(
        (proj: any) => !projectTitles.includes(proj.project_title || proj.title || '')
      );
      resumeStorage.save('projects_saved', filteredProjects);
      window.dispatchEvent(new Event('resumeDataUpdated'));
      
      toast({
        title: "Projects Removed",
        description: `Removed ${projectTitles.length} project(s). Consider adding more relevant projects.`,
      });
      
      // Scroll to projects section
      setTimeout(() => {
        const projectsSection = document.getElementById('projects-section');
        if (projectsSection) {
          projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      console.error('Error removing projects:', error);
      toast({
        title: "Error",
        description: "Failed to remove projects. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle proceeding to preview after analysis
  const handleProceedToPreview = useCallback(() => {
    // Directly show preview for AI-powered mode
    setShowPreview(true);
  }, []);

  // Define handleGenerateResume - directly opens AI-powered analysis
  const handleGenerateResume = useCallback(() => {
    if (!targetRole.trim()) {
      toast({
        title: "Target Role Required",
        description: "Please enter the target role you are applying for",
        variant: "destructive",
      });
      return;
    }
      
    if (!profile || !profile.full_name || !profile.email || !profile.phone_number) {
      toast({
        title: "Personal Information Required",
        description: "Please complete your personal information (name, email, phone) first",
        variant: "destructive",
      });
      return;
    }

    if (allEducation.length === 0) {
      toast({
        title: "Education Required",
        description: "Please add at least one education entry",
        variant: "destructive",
      });
      return;
    }

    // Directly show smart analysis modal for AI-powered mode
    setShowSmartAnalysis(true);
  }, [profile, allEducation.length, targetRole, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Application Details - FIRST SECTION (Above Personal Info) - Enhanced */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-md">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  Job Application Details
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Optimization
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1.5 text-base">
                  Enter the job details you're applying for. Our smart system will optimize your resume accordingly.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., Google, Microsoft, Amazon"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRole">
                Target Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="targetRole"
                placeholder="e.g., Software Developer, Data Scientist"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description (Recommended)</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description here for better optimization..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: Include the full job description for best results. We'll extract keywords and optimize your resume.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Completeness Card - Enhanced */}
      <Card className={`border-2 shadow-lg transition-all duration-300 ${
        completeness === 100 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-800' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-300 dark:border-blue-800'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-md ${
                completeness === 100 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' 
                  : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20'
              }`}>
                {completeness === 100 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg">Profile Completeness</h3>
                <p className="text-sm text-muted-foreground">
                  {completeness === 100
                    ? "All required sections completed!"
                    : `${100 - completeness}% remaining to complete`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-bold ${
                completeness === 100 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {completeness}%
              </span>
            </div>
          </div>
          <Progress 
            value={completeness} 
            className={`h-3 ${completeness === 100 ? 'bg-green-200 dark:bg-green-900' : ''}`}
          />
          <div className="mt-4 flex items-center gap-2">
            {completeness === 100 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Your profile is complete! You can now generate your resume.
                </p>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-muted-foreground">
                  Complete all sections to unlock resume generation features.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OpenAI Configuration Warning */}
      {!openAIConfig.configured && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>AI Features Disabled:</strong> {openAIConfig.message}
            <br />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100 mt-1 inline-block"
            >
              Get your OpenAI API key here →
            </a>
            <br />
            <span className="text-sm mt-2 block">
              Note: Resume generation will still work, but AI enhancement features will be limited.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Template selection moved to preview modal */}


      {/* Instructions Alert - Enhanced */}
      <Alert className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-sm">
        <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="space-y-3">
          <div>
            <strong className="block mb-3 text-base text-blue-900 dark:text-blue-100">📋 Quick Start Guide:</strong>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="text-sm">
                    Enter <strong>Job Application Details</strong> above (Company, Role, JD)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="text-sm">
                    Fill in your <strong>Personal Information</strong> and <strong>Education</strong> (Required)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="text-sm">
                    Add <strong>Projects, Skills, Certifications</strong> to strengthen your resume
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div className="text-sm">
                    Click <strong>"Build & Optimize Resume"</strong> button below
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <div className="text-sm">
                    Our AI will analyze and suggest improvements
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                    6
                  </div>
                  <div className="text-sm">
                    Preview, customize, and download your professional resume
                  </div>
                </div>
              </div>
            </div>
          </div>
          {completeness < 100 && (
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <strong className="block text-sm text-blue-800 dark:text-blue-200">
                ⚡ Complete required sections ({completeness}% done) to unlock the "Build & Optimize Resume" button.
            </strong>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* ATS Score & Suggestions Panel - Always Visible */}
      <ResumeSuggestionsPanel
        atsScore={resumeContent?.atsScore}
        recommendations={resumeContent?.recommendations}
        profile={profile}
        education={allEducation}
        projects={allProjects}
        skills={allSkills}
      />

      {/* Personal Information */}
      <div id="personal-info-section">
      <PersonalInfoForm
        initialData={profile || undefined}
        onSave={(data) => saveProfile.mutate(data)}
        isSaving={saveProfile.isPending}
      />
      </div>

      {/* Education */}
      <div id="education-section">
      <EducationForm education={allEducation} />
      </div>

      {/* Projects */}
      <div id="projects-section">
      <ProjectsForm projects={allProjects} />
      </div>

      {/* Skills */}
      <div id="skills-section">
      <SkillsForm skills={allSkills} />
      </div>

      {/* Certifications */}
      <div id="certifications-section">
      <CertificationsForm certifications={certifications} />
      </div>

      {/* Achievements */}
      <div id="achievements-section">
      <AchievementsForm achievements={achievements} />
      </div>

      {/* Extracurricular */}
      <ExtracurricularForm extracurricular={extracurricular} />

      {/* Hobbies */}
      <HobbiesForm hobbies={hobbies} />

      {/* Generate Resume Button - Stunning Design */}
      {completeness === 100 && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-white border-0 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] opacity-50" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32" />
          
          <CardContent className="pt-8 pb-8 relative z-10">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Ready to Build Your Resume!</h3>
              </div>
              
              <p className="text-lg text-white/90 leading-relaxed">
                {targetRole 
                  ? (
                    <>
                      Click below to analyze and build your <strong>AI-optimized resume</strong> for{' '}
                      <span className="font-semibold">{targetRole}</span>
                      {companyName && <span> at <span className="font-semibold">{companyName}</span></span>}.
                    </>
                  )
                  : 'Enter job details above, then click below to build your optimized resume.'}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                variant="secondary"
                  className="w-full sm:w-auto min-w-[280px] h-14 text-base font-bold shadow-xl hover:shadow-2xl transition-all duration-300 bg-white text-primary hover:bg-white/95"
                onClick={handleGenerateResume}
                  disabled={!targetRole.trim()}
              >
                  <FileText className="w-5 h-5 mr-2" />
                  {targetRole ? (
                  <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Build & Optimize Resume
                  </>
                ) : (
                    'Enter Target Role First'
                )}
              </Button>
              </div>
              
              {!targetRole && (
                <div className="flex items-center justify-center gap-2 text-sm text-white/80 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please enter a target role in the "Job Application Details" section above</span>
                </div>
              )}
              
              {targetRole && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold">5+</div>
                    <div className="text-xs text-white/80">Templates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-xs text-white/80">ATS Safe</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">AI</div>
                    <div className="text-xs text-white/80">Optimized</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Resume Analysis Modal */}
      {targetRole && (
        <SmartResumeAnalysisModal
          open={showSmartAnalysis}
          onOpenChange={setShowSmartAnalysis}
          resumeData={prepareResumeData()}
          targetRole={targetRole}
          companyName={companyName}
          jobDescription={jobDescription}
          onAddSections={handleAddSections}
          onAddProjects={handleGetProjectSuggestions}
          onRemoveProjects={handleRemoveProjects}
          onProceed={handleProceedToPreview}
        />
      )}

      {/* Project Suggestion Modal */}
      {targetRole && (
        <ProjectSuggestionModal
          open={showProjectSuggestions}
          onOpenChange={setShowProjectSuggestions}
          targetRole={targetRole}
          jobDescription={jobDescription}
          companyName={companyName}
          currentProjects={allProjects}
          onAddProjects={handleAddProjectsFromAnalysis}
        />
      )}

      {/* Resume Preview Modal - AI-Powered mode only */}
      <ResumePreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        resumeData={prepareResumeData()}
        targetRole={targetRole}
        companyName={companyName}
        jobDescription={jobDescription}
        mode="ai-powered"
      />

      {/* Keep old dialog for backward compatibility if needed */}
      <ResumePreviewDialog
        open={false}
        onOpenChange={() => {}}
        resumeContent={resumeContent}
        profile={profile}
        onDownload={handleDownloadPDF}
      />

    </div>
  );
});
