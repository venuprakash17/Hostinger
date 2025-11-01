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
import { pdf } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";

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
      
      console.log("Current education data:", education);
      console.log("Current profile data:", profile);
      
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: { targetRole: null },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("Generated resume content:", data.resumeContent);
      console.log("Formatted education:", data.resumeContent.formattedEducation);

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
      // PDF styles
      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 11,
          fontFamily: 'Helvetica',
        },
        header: {
          marginBottom: 20,
          textAlign: 'center',
          borderBottom: '1pt solid #000',
          paddingBottom: 10,
        },
        name: {
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 5,
        },
        contact: {
          fontSize: 9,
          color: '#555',
          marginBottom: 2,
        },
        section: {
          marginTop: 15,
        },
        sectionTitle: {
          fontSize: 14,
          fontWeight: 'bold',
          borderBottom: '1pt solid #000',
          paddingBottom: 3,
          marginBottom: 8,
        },
        text: {
          fontSize: 10,
          lineHeight: 1.5,
          marginBottom: 5,
        },
        subsection: {
          marginBottom: 10,
        },
        title: {
          fontSize: 11,
          fontWeight: 'bold',
          marginBottom: 2,
        },
        subtitle: {
          fontSize: 10,
          color: '#555',
          marginBottom: 2,
        },
        date: {
          fontSize: 9,
          color: '#666',
          fontStyle: 'italic',
        },
        bullet: {
          fontSize: 10,
          marginLeft: 10,
          marginBottom: 2,
        },
        link: {
          color: '#0066cc',
          textDecoration: 'none',
        },
      });

      // Create PDF document
      const ResumePDF = (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.name}>{profile.full_name}</Text>
              <Text style={styles.contact}>
                {profile.email} | {profile.phone_number}
              </Text>
              {(profile.linkedin_profile || profile.github_portfolio) && (
                <Text style={styles.contact}>
                  {profile.linkedin_profile && `LinkedIn: ${profile.linkedin_profile}`}
                  {profile.linkedin_profile && profile.github_portfolio && ' | '}
                  {profile.github_portfolio && `GitHub: ${profile.github_portfolio}`}
                </Text>
              )}
            </View>

            {/* Summary */}
            {resumeContent.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
                <Text style={styles.text}>{resumeContent.summary}</Text>
              </View>
            )}

            {/* Education */}
            {resumeContent.formattedEducation?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EDUCATION</Text>
                {resumeContent.formattedEducation.map((edu: any, idx: number) => (
                  <View key={idx} style={styles.subsection}>
                    <Text style={styles.title}>
                      {edu.degree || edu.institution_name}
                    </Text>
                    <Text style={styles.subtitle}>
                      {edu.institution_name || edu.field_of_study}
                    </Text>
                    <Text style={styles.date}>
                      {edu.start_date} - {edu.is_current ? 'Present' : edu.end_date}
                    </Text>
                    {edu.cgpa_percentage && (
                      <Text style={styles.text}>CGPA: {edu.cgpa_percentage}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Skills */}
            {resumeContent.formattedSkills && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SKILLS</Text>
                {Object.entries(resumeContent.formattedSkills).map(
                  ([category, skills]: [string, any]) => (
                    <Text key={category} style={styles.text}>
                      <Text style={{ fontWeight: 'bold' }}>{category.toUpperCase()}: </Text>
                      {Array.isArray(skills) ? skills.join(', ') : skills}
                    </Text>
                  )
                )}
              </View>
            )}

            {/* Projects */}
            {resumeContent.formattedProjects?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROJECTS</Text>
                {resumeContent.formattedProjects.map((project: any, idx: number) => (
                  <View key={idx} style={styles.subsection}>
                    <Text style={styles.title}>
                      {project.project_title || project.title}
                    </Text>
                    {project.description && (
                      <Text style={styles.text}>{project.description}</Text>
                    )}
                    {project.technologies_used && (
                      <Text style={styles.subtitle}>
                        Technologies: {Array.isArray(project.technologies_used) 
                          ? project.technologies_used.join(', ') 
                          : project.technologies_used}
                      </Text>
                    )}
                    {project.duration_start && project.duration_end && (
                      <Text style={styles.date}>
                        {project.duration_start} - {project.duration_end}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Certifications */}
            {resumeContent.formattedCertifications?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
                {resumeContent.formattedCertifications.map((cert: any, idx: number) => (
                  <Text key={idx} style={styles.bullet}>
                    • {cert.certification_name} - {cert.issuing_organization}
                    {cert.issue_date && ` (${cert.issue_date})`}
                  </Text>
                ))}
              </View>
            )}

            {/* Achievements */}
            {resumeContent.formattedAchievements?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                {resumeContent.formattedAchievements.map((ach: any, idx: number) => (
                  <Text key={idx} style={styles.bullet}>
                    • {ach.achievement_title}: {ach.description}
                  </Text>
                ))}
              </View>
            )}

            {/* Extracurricular */}
            {resumeContent.formattedExtracurricular?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EXTRACURRICULAR ACTIVITIES</Text>
                {resumeContent.formattedExtracurricular.map((extra: any, idx: number) => (
                  <View key={idx} style={styles.subsection}>
                    <Text style={styles.title}>
                      {extra.activity_name}{extra.role && ` - ${extra.role}`}
                    </Text>
                    {extra.description && (
                      <Text style={styles.text}>{extra.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Page>
        </Document>
      );

      // Generate PDF blob
      const blob = await pdf(ResumePDF).toBlob();

      // Download PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.full_name?.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Resume Downloaded",
        description: "Your resume has been downloaded as a PDF.",
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
