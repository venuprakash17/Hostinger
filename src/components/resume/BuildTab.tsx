import { PersonalInfoForm } from "./PersonalInfoForm";
import { EducationForm } from "./EducationForm";
import { ProjectsForm } from "./ProjectsForm";
import { SkillsForm } from "./SkillsForm";
import { CertificationsForm } from "./CertificationsForm";
import { AchievementsForm } from "./AchievementsForm";
import { ExtracurricularForm } from "./ExtracurricularForm";
import { ResumePreviewDialog } from "./ResumePreviewDialog";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function BuildTab() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  
  const {
    profile,
    education,
    projects,
    skills,
    certifications,
    achievements,
    extracurricular,
    isLoading,
    saveProfile,
  } = useStudentProfile();

  // Calculate profile completeness (only required sections)
  const calculateCompleteness = () => {
    let completed = 0;
    let total = 4; // Only count required sections

    // Required sections
    if (profile?.full_name && profile?.email && profile?.phone_number) completed++;
    if (education.length > 0) completed++;
    if (projects.length > 0) completed++;
    if (skills.length > 0) completed++;

    // Optional sections (certifications, achievements, extracurricular)
    // Not counted towards completeness

    return Math.round((completed / total) * 100);
  };

  const completeness = calculateCompleteness();

  const handleGenerateResume = async () => {
    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: { targetRole: null },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResumeContent({
        ...data.resumeContent,
        profile: data.profile,
      });
      setShowPreview(true);
      
      toast({
        title: "Resume generated successfully!",
        description: `ATS Score: ${data.resumeContent.atsScore || "N/A"}/100`,
      });
    } catch (error: any) {
      console.error("Error generating resume:", error);
      toast({
        title: "Failed to generate resume",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resumeContent || !profile) return;
    
    try {
      // Create a clean resume text without recommendations
      const resumeText = `
${profile.full_name}
${profile.email} | ${profile.phone_number}
${profile.linkedin_profile ? `LinkedIn: ${profile.linkedin_profile}` : ''}
${profile.github_portfolio ? `GitHub: ${profile.github_portfolio}` : ''}

PROFESSIONAL SUMMARY
${resumeContent.summary || 'Professional with strong technical skills and experience.'}

EDUCATION
${resumeContent.formattedEducation?.map((edu: any) => 
  `${edu.degree || edu.institution_name || ''}
${edu.institution_name || edu.field_of_study || ''}
${edu.start_date} - ${edu.is_current ? 'Present' : edu.end_date || 'Present'}
${edu.cgpa_percentage ? `CGPA: ${edu.cgpa_percentage}` : ''}`
).join('\n\n') || ''}

SKILLS
${resumeContent.formattedSkills ? Object.entries(resumeContent.formattedSkills).map(([category, skills]: [string, any]) => 
  `${category.toUpperCase()}: ${Array.isArray(skills) ? skills.join(', ') : skills}`
).join('\n') : ''}

PROJECTS
${resumeContent.formattedProjects?.map((proj: any) => 
  `${proj.project_title || proj.title}
${proj.description || ''}
Technologies: ${Array.isArray(proj.technologies_used) ? proj.technologies_used.join(', ') : proj.technologies_used || ''}
${proj.duration_start && proj.duration_end ? `Duration: ${proj.duration_start} - ${proj.duration_end}` : ''}`
).join('\n\n') || ''}

${resumeContent.formattedCertifications?.length ? 
  `CERTIFICATIONS\n${resumeContent.formattedCertifications.map((cert: any) => 
    `${cert.certification_name} - ${cert.issuing_organization}${cert.issue_date ? ` (${cert.issue_date})` : ''}`
  ).join('\n')}` : ''}

${resumeContent.formattedAchievements?.length ?
  `ACHIEVEMENTS\n${resumeContent.formattedAchievements.map((ach: any) => 
    `• ${ach.achievement_title}: ${ach.description}`
  ).join('\n')}` : ''}

${resumeContent.formattedExtracurricular?.length ?
  `EXTRACURRICULAR ACTIVITIES\n${resumeContent.formattedExtracurricular.map((extra: any) => 
    `${extra.activity_name}${extra.role ? ` - ${extra.role}` : ''}${extra.description ? `\n${extra.description}` : ''}`
  ).join('\n\n')}` : ''}
`.trim();

      // Create blob and download
      const blob = new Blob([resumeText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.full_name?.replace(/\s+/g, '_')}_Resume.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Resume Downloaded",
        description: "Your resume has been downloaded as a text file.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completeness Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Profile Completeness</h3>
            </div>
            <span className="text-2xl font-bold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {completeness === 100
              ? "Your profile is complete! You can now generate your resume."
              : "Complete all sections to unlock resume generation features."}
          </p>
        </CardContent>
      </Card>

      {/* Instructions Alert */}
      <Alert>
        <AlertDescription>
          Fill in the required sections below to create your resume profile. You can edit any section at any time.
          <strong className="block mt-2">Required:</strong> Personal Info, Education, Projects, Skills
          <strong className="block mt-1">Optional:</strong> Certifications, Achievements, Extracurricular
          {completeness < 100 && (
            <strong className="block mt-2 text-primary">
              Complete required sections ({completeness}% done) to unlock the "Generate Resume PDF" button.
            </strong>
          )}
        </AlertDescription>
      </Alert>

      {/* Personal Information */}
      <PersonalInfoForm
        initialData={profile || undefined}
        onSave={(data) => saveProfile.mutate(data)}
        isSaving={saveProfile.isPending}
      />

      {/* Education */}
      <EducationForm education={education} />

      {/* Projects */}
      <ProjectsForm projects={projects} />

      {/* Skills */}
      <SkillsForm skills={skills} />

      {/* Certifications */}
      <CertificationsForm certifications={certifications} />

      {/* Achievements */}
      <AchievementsForm achievements={achievements} />

      {/* Extracurricular */}
      <ExtracurricularForm extracurricular={extracurricular} />

      {/* Generate Resume Button */}
      {completeness === 100 && (
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Ready to Generate Your Resume!</h3>
              <p className="text-white/90">
                Your profile is complete. Generate a professional ATS-friendly resume now.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="w-full md:w-auto"
                onClick={handleGenerateResume}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Resume PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resume Preview Dialog */}
      <ResumePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        resumeContent={resumeContent}
        profile={profile}
        onDownload={handleDownloadPDF}
      />

      {/* AI Suggestions Section - Separate from Resume */}
      {resumeContent?.recommendations && resumeContent.recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              AI Recommendations for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These suggestions can help enhance your resume. They are not included in the downloaded PDF.
            </p>
            <ul className="space-y-2">
              {resumeContent.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
