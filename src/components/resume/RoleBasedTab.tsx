import { useState, useMemo } from "react";
import { Briefcase, Download, Loader2, Lightbulb, Target, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ResumePreviewDialog } from "./ResumePreviewDialog";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { tailorResumeForRole, enhanceWithAI } from "@/lib/roleBasedTailorer";
import { enhanceResumeForRoleWithOpenAI } from "@/lib/resumeitnow/services/openaiService";
import { generateATSSafePDF, downloadPDF } from "@/lib/resumeitnow/services/pdfGeneratorService";
import { Badge } from "@/components/ui/badge";
import { resumeStorage } from "@/lib/resumeStorage";
import { handleOpenAIError, handlePDFError } from "@/lib/resumeitnow/utils/errorHandler";
import { trackPDFGeneration } from "@/lib/resumeitnow/utils/analytics";

export function RoleBasedTab() {
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  
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
  } = useStudentProfile();

  // Load saved data from localStorage
  const localEducation = useMemo(() => resumeStorage.load('education_saved') || [], []);
  const localProjects = useMemo(() => resumeStorage.load('projects_saved') || [], []);
  const localSkills = useMemo(() => resumeStorage.load('skills_saved') || [], []);

  // Merge API data with localStorage data
  const allEducation = useMemo(() => {
    const merged = [...education];
    localEducation.forEach((item: any) => {
      if (!merged.find((e: any) => e.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [education, localEducation]);

  const allProjects = useMemo(() => {
    const merged = [...projects];
    localProjects.forEach((item: any) => {
      if (!merged.find((p: any) => p.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [projects, localProjects]);

  const allSkills = useMemo(() => {
    const merged = [...skills];
    localSkills.forEach((item: any) => {
      if (!merged.find((s: any) => s.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [skills, localSkills]);

  const handleGenerateTailoredResume = async () => {
    if (!targetRole.trim()) {
      toast.error("Please enter a target role");
      return;
    }

    if (!profile) {
      toast.error("Please complete your profile first");
      return;
    }

    if (allEducation.length === 0) {
      toast.error("Please add at least one education entry in the Build section");
      return;
    }

    setIsGenerating(true);

    try {
      toast.info("Tailoring your resume for " + targetRole + "...");

      // Prepare resume data from Build section
      const resumeData = {
        profile,
        education: allEducation,
        projects: allProjects.length > 0 ? allProjects : undefined,
        skills: allSkills.length > 0 ? allSkills : undefined,
        certifications: certifications.length > 0 ? certifications : undefined,
        achievements: achievements.length > 0 ? achievements : undefined,
        extracurricular: extracurricular.length > 0 ? extracurricular : undefined,
        hobbies: hobbies.length > 0 ? hobbies : undefined,
      };

      // Tailor resume for role
      const tailored = tailorResumeForRole(resumeData, targetRole, jobDescription || undefined);

      // Try ResumeItNow OpenAI enhancement first, fallback to existing AI
      let enhanced = tailored;
      try {
        const openAIEnhanced = await enhanceResumeForRoleWithOpenAI(resumeData, targetRole, jobDescription || undefined);
        enhanced = {
          ...tailored,
          summary: openAIEnhanced.summary || tailored.summary,
          tailoredProjects: openAIEnhanced.tailoredProjects || tailored.tailoredProjects,
          tailoredSkills: openAIEnhanced.tailoredSkills || tailored.tailoredSkills,
          recommendations: openAIEnhanced.recommendations || tailored.recommendations,
          suggestedProjects: openAIEnhanced.suggestedProjects || tailored.suggestedProjects,
          suggestedSkills: openAIEnhanced.suggestedSkills || tailored.suggestedSkills,
          atsScore: openAIEnhanced.atsScore || tailored.atsScore,
        };
      } catch (error) {
        console.warn('ResumeItNow OpenAI enhancement failed, using fallback:', error);
        // Fallback to existing AI enhancement
        enhanced = await enhanceWithAI(tailored, resumeData, targetRole, jobDescription || undefined);
      }

      // Format for display (combine with original data)
      const formattedContent = {
        summary: enhanced.summary,
        formattedEducation: resumeData.education,
        formattedProjects: enhanced.tailoredProjects.length > 0 
          ? enhanced.tailoredProjects 
          : (resumeData.projects || []),
        formattedSkills: enhanced.tailoredSkills,
        formattedCertifications: resumeData.certifications || [],
        formattedAchievements: resumeData.achievements || [],
        formattedExtracurricular: resumeData.extracurricular || [],
        formattedHobbies: resumeData.hobbies || [],
        atsScore: enhanced.atsScore,
      };

      setResumeContent(formattedContent);
      setSuggestions({
        recommendations: enhanced.recommendations,
        suggestedProjects: enhanced.suggestedProjects,
        suggestedSkills: enhanced.suggestedSkills,
      });
      
      toast.success(`Resume tailored for ${targetRole} successfully!`);
    } catch (error) {
      console.error("Error generating tailored resume:", error);
      const errorInfo = handleOpenAIError(error);
      toast.error(errorInfo.message, {
        description: errorInfo.actionable,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resumeContent || !profile) return;

    const startTime = Date.now();
    try {
      // Use ResumeItNow ATS-safe PDF generator
      const pdfBlob = await generateATSSafePDF({
        profile,
        summary: resumeContent.summary,
        education: resumeContent.formattedEducation || allEducation,
        projects: resumeContent.formattedProjects || allProjects,
        skills: resumeContent.formattedSkills || formatSkillsForPDF(allSkills),
        certifications: resumeContent.formattedCertifications || certifications,
        achievements: resumeContent.formattedAchievements || achievements,
        extracurricular: resumeContent.formattedExtracurricular || extracurricular,
        hobbies: resumeContent.formattedHobbies || hobbies,
      }, 'modern'); // Use modern template for role-based resumes

      // Download PDF
      downloadPDF(pdfBlob, `${profile.full_name.replace(/\s+/g, "_")}_${targetRole.replace(/\s+/g, "_")}_Resume.pdf`);
      
      // Track PDF generation
      const duration = Date.now() - startTime;
      trackPDFGeneration(
        true,
        duration,
        undefined, // error
        {
          target_role: targetRole,
          job_description_provided: !!jobDescription,
        }
      );
      
      toast.success("Resume downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      const duration = Date.now() - startTime;
      const errorInfo = handlePDFError(error);
      trackPDFGeneration(false, duration, errorInfo.message);
      toast.error(errorInfo.message, {
        description: errorInfo.actionable,
      });
    }
  };

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

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Generate Role-Specific Resume
          </CardTitle>
          <CardDescription>
            Tailor your resume to match specific job roles and increase your chances of getting hired
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetRole">Target Role *</Label>
            <Input
              id="targetRole"
              placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description (Optional)</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here to optimize your resume for specific requirements and keywords..."
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <Button
            className="w-full bg-gradient-primary"
            onClick={handleGenerateTailoredResume}
            disabled={isGenerating || !targetRole.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Tailored Resume...
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4 mr-2" />
                Generate Tailored Resume
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Suggestions & Recommendations */}
      {suggestions && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Recommendations
              </CardTitle>
              <CardDescription>Improve your resume for {targetRole}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {suggestions.recommendations?.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Suggested Projects
              </CardTitle>
              <CardDescription>Projects to build for {targetRole}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {suggestions.suggestedProjects?.map((project: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{project}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggested Skills */}
      {suggestions && suggestions.suggestedSkills && suggestions.suggestedSkills.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Suggested Skills to Learn</CardTitle>
            <CardDescription>Skills that would strengthen your {targetRole} profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestions.suggestedSkills.map((skill: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {resumeContent && profile && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Generated Resume</CardTitle>
            <CardDescription>
              Your resume has been tailored for: <strong>{targetRole}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setShowPreview(true)} variant="outline" className="flex-1">
                Preview Resume
              </Button>
              <Button onClick={handleDownloadPDF} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            {resumeContent.atsScore && (
              <div className="text-sm text-muted-foreground">
                Estimated ATS Score: <strong>{resumeContent.atsScore}/100</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ResumePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        resumeContent={resumeContent}
        profile={profile}
        onDownload={handleDownloadPDF}
      />
    </div>
  );
}

