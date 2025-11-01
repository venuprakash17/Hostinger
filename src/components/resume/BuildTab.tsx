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
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  // Calculate profile completeness
  const calculateCompleteness = () => {
    let completed = 0;
    let total = 7;

    if (profile?.full_name && profile?.email && profile?.phone_number) completed++;
    if (education.length > 0) completed++;
    if (projects.length > 0) completed++;
    if (skills.length > 0) completed++;
    if (certifications.length > 0) completed++;
    if (achievements.length > 0) completed++;
    if (extracurricular.length > 0) completed++;

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

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download using react-pdf or similar
    toast({
      title: "PDF Download",
      description: "PDF generation will be implemented soon",
    });
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
          Fill in all sections below to create your comprehensive resume profile. You can edit any section at any time.
          Each section supports multiple entries where applicable (education, projects, skills, etc.).
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
    </div>
  );
}
