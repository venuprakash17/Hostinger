import { PersonalInfoForm } from "./PersonalInfoForm";
import { EducationForm } from "./EducationForm";
import { ProjectsForm } from "./ProjectsForm";
import { SkillsForm } from "./SkillsForm";
import { CertificationsForm } from "./CertificationsForm";
import { AchievementsForm } from "./AchievementsForm";
import { ExtracurricularForm } from "./ExtracurricularForm";
import { HobbiesForm } from "./HobbiesForm";
import { ResumePreviewDialog } from "./ResumePreviewDialog";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, Lightbulb } from "lucide-react";
import { ResumeSuggestionsPanel } from "./ResumeSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resumeStorage } from "@/lib/resumeStorage";

// Lazy load heavy PDF library only when needed
let pdfLib: any = null;
let pdfComponents: any = null;

const loadPdfLib = async () => {
  if (!pdfLib) {
    pdfLib = (await import("@react-pdf/renderer")).pdf;
    pdfComponents = await import("@react-pdf/renderer");
  }
  return { pdf: pdfLib, components: pdfComponents };
};

export const BuildTab = memo(function BuildTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resumeContent, setResumeContent] = useState<any>(null);
  const [localData, setLocalData] = useState<any>(null);
  
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
    
    try {
      // Lazy load PDF library
      const { pdf, components } = await loadPdfLib();
      const { Document, Page, Text, View, StyleSheet } = components;

      // PDF styles - Optimized for single page
      const styles = StyleSheet.create({
        page: {
          padding: 30,
          fontSize: 10,
          fontFamily: 'Helvetica',
          lineHeight: 1.3,
        },
        header: {
          marginBottom: 12,
          textAlign: 'center',
          borderBottom: '1pt solid #000',
          paddingBottom: 6,
        },
        name: {
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 3,
          letterSpacing: 0.5,
        },
        contact: {
          fontSize: 8,
          color: '#555',
          marginBottom: 1,
          lineHeight: 1.4,
        },
        section: {
          marginTop: 8,
          marginBottom: 6,
        },
        sectionTitle: {
          fontSize: 11,
          fontWeight: 'bold',
          borderBottom: '1pt solid #000',
          paddingBottom: 2,
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        text: {
          fontSize: 9,
          lineHeight: 1.3,
          marginBottom: 3,
        },
        summary: {
          fontSize: 9,
          lineHeight: 1.4,
          marginBottom: 8,
          textAlign: 'justify',
        },
        subsection: {
          marginBottom: 6,
        },
        title: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 1,
        },
        subtitle: {
          fontSize: 9,
          color: '#555',
          marginBottom: 1,
          lineHeight: 1.3,
        },
        date: {
          fontSize: 8,
          color: '#666',
          fontStyle: 'italic',
          marginBottom: 2,
        },
        bullet: {
          fontSize: 9,
          marginLeft: 8,
          marginBottom: 1.5,
          lineHeight: 1.3,
        },
        link: {
          color: '#0066cc',
          textDecoration: 'none',
        },
        compactRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 2,
        },
        skillCategory: {
          fontSize: 9,
          fontWeight: 'bold',
          marginBottom: 2,
        },
        skillItems: {
          fontSize: 9,
          lineHeight: 1.4,
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
                  {profile.linkedin_profile && (
                    profile.linkedin_profile.startsWith('http') 
                      ? profile.linkedin_profile 
                      : `https://www.linkedin.com/in/${profile.linkedin_profile.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}`
                  )}
                  {profile.linkedin_profile && profile.github_portfolio && ' | '}
                  {profile.github_portfolio && (
                    profile.github_portfolio.startsWith('http')
                      ? profile.github_portfolio
                      : `https://github.com/${profile.github_portfolio.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')}`
                  )}
                </Text>
              )}
            </View>

            {/* Summary */}
            {contentToUse.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
                <Text style={styles.summary}>{contentToUse.summary}</Text>
              </View>
            )}

              {/* Education - Compact Layout */}
              {contentToUse.formattedEducation?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EDUCATION</Text>
                  {contentToUse.formattedEducation
                    .sort((a: any, b: any) => {
                      // Sort by end date (most recent first), or by start date if both are current
                      const aEnd = a.end_date || a.end || a.endDate || '';
                      const bEnd = b.end_date || b.end || b.endDate || '';
                      const aCurrent = a.is_current || /present/i.test(aEnd);
                      const bCurrent = b.is_current || /present/i.test(bEnd);
                      
                      if (aCurrent && !bCurrent) return -1;
                      if (!aCurrent && bCurrent) return 1;
                      if (aEnd && bEnd) return bEnd.localeCompare(aEnd);
                      return 0;
                    })
                    .map((edu: any, idx: number) => {
                  const institution = edu.institution_name || edu.institution || edu.school || edu.university || edu.college;
                  let degree = edu.degree || edu.degree_title || edu.title || '';
                  // Fix common degree abbreviations
                  degree = degree.replace(/^B\.tech$/i, 'B.Tech').replace(/^b\.tech$/i, 'B.Tech');
                  degree = degree.replace(/^M\.tech$/i, 'M.Tech').replace(/^m\.tech$/i, 'M.Tech');
                  const field = edu.field_of_study || edu.major || edu.specialization;
                  const start = edu.start_date ? edu.start_date.substring(0, 4) : (edu.start ? edu.start.substring(0, 4) : (edu.startDate ? edu.startDate.substring(0, 4) : ''));
                  const endRaw = edu.end_date || edu.end || edu.endDate;
                  const isCurrent = (edu.is_current ?? edu.current) ?? (typeof endRaw === 'string' && /present/i.test(endRaw));
                  const end = isCurrent ? 'Present' : (endRaw ? endRaw.substring(0, 4) : '');
                  const cgpa = edu.cgpa_percentage || edu.cgpa || edu.gpa || edu.score;

                  return (
                    <View key={idx} style={styles.subsection}>
                      <View style={styles.compactRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{degree || institution}</Text>
                          {(institution || field) && (
                            <Text style={styles.subtitle}>
                              {institution}{field ? ` • ${field}` : ''}
                              {cgpa ? ` • CGPA: ${cgpa}` : ''}
                            </Text>
                          )}
                        </View>
                        {(start || end) && (
                          <Text style={styles.date}>{start} - {end}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

              {/* Skills - Compact Layout */}
              {contentToUse.formattedSkills && Object.keys(contentToUse.formattedSkills).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SKILLS</Text>
                  {Object.entries(contentToUse.formattedSkills).map(
                  ([category, skills]: [string, any]) => {
                    const skillList = Array.isArray(skills) ? skills : [];
                    if (skillList.length === 0) return null;
                    return (
                      <View key={category} style={{ marginBottom: 3 }}>
                        <Text style={styles.skillCategory}>{category.charAt(0).toUpperCase() + category.slice(1)}: </Text>
                        <Text style={styles.skillItems}>{skillList.join(' • ')}</Text>
                      </View>
                    );
                  }
                )}
              </View>
            )}

              {/* Projects - Compact Layout */}
              {contentToUse.formattedProjects?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROJECTS</Text>
                  {contentToUse.formattedProjects.slice(0, 3).map((project: any, idx: number) => (
                  <View key={idx} style={styles.subsection}>
                    <View style={styles.compactRow}>
                      <Text style={styles.title}>
                        {project.project_title || project.title}
                      </Text>
                      {project.duration_start && project.duration_end && (
                        <Text style={styles.date}>
                          {project.duration_start.substring(0, 4)} - {project.duration_end.substring(0, 4)}
                        </Text>
                      )}
                    </View>
                    {project.technologies_used && project.technologies_used.length > 0 && (
                      <Text style={styles.subtitle}>
                        {Array.isArray(project.technologies_used) 
                          ? project.technologies_used.slice(0, 8).join(' • ') 
                          : project.technologies_used}
                      </Text>
                    )}
                    {project.contributions && project.contributions.length > 0 && (
                      <View style={{ marginTop: 2 }}>
                        {project.contributions.slice(0, 4).map((contribution: string, cIdx: number) => (
                          <Text key={cIdx} style={styles.bullet}>
                            • {contribution}
                          </Text>
                        ))}
                      </View>
                    )}
                    {/* Fallback: Use role_contribution if contributions array is not available */}
                    {(!project.contributions || project.contributions.length === 0) && project.role_contribution && (
                      <Text style={styles.bullet}>
                        • {project.role_contribution}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

              {/* Certifications - Inline Layout */}
              {contentToUse.formattedCertifications && contentToUse.formattedCertifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {contentToUse.formattedCertifications
                      .filter((cert: any) => cert && (cert.certification_name || cert.title))
                      .slice(0, 5)
                      .map((cert: any, idx: number, arr: any[]) => {
                        const certName = cert.certification_name || cert.title || cert.name || '';
                        const org = cert.issuing_organization || cert.organization || cert.issuer || '';
                        const date = cert.issue_date || cert.date_issued || cert.date || '';
                        
                        let certText = certName;
                        if (org && org.trim() && org.trim() !== certName.trim()) {
                          certText += `, ${org}`;
                        }
                        if (date && date.trim()) {
                          const formattedDate = date.length > 4 ? date.substring(0, 4) : date;
                          certText += ` (${formattedDate})`;
                        }
                        
                        return (
                          <Text key={idx} style={[styles.bullet, { marginRight: 8 }]}>
                            {idx > 0 ? '• ' : ''}{certText}{idx < arr.length - 1 ? '' : ''}
                          </Text>
                        );
                      })}
                  </View>
              </View>
            )}

              {/* Achievements - Compact */}
              {contentToUse.formattedAchievements && contentToUse.formattedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                  {contentToUse.formattedAchievements
                    .filter((ach: any) => ach && (ach.achievement_title || ach.title))
                    .slice(0, 3)
                    .map((ach: any, idx: number) => {
                      const title = ach.achievement_title || ach.title || '';
                      const desc = ach.description || '';
                      const issuer = ach.issuing_body || ach.issuer || '';
                      
                      let achievementText = title;
                      if (desc && desc.trim() && desc.length < 80) {
                        achievementText += `: ${desc}`;
                      } else if (desc && desc.trim()) {
                        achievementText += `: ${desc.substring(0, 80)}...`;
                      }
                      if (issuer && issuer.trim()) {
                        achievementText += ` (${issuer})`;
                      }
                      
                      return (
                        <Text key={idx} style={styles.bullet}>
                          • {achievementText}
                        </Text>
                      );
                    })}
              </View>
            )}

              {/* Extracurricular - Compact */}
              {contentToUse.formattedExtracurricular && contentToUse.formattedExtracurricular.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EXTRACURRICULAR</Text>
                  {contentToUse.formattedExtracurricular.slice(0, 2).map((extra: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 3 }}>
                    <Text style={styles.bullet}>
                      • <Text style={styles.title}>
                        {extra.activity_organization || extra.activity_name}
                        {extra.role && ` - ${extra.role}`}
                      </Text>
                      {extra.description && extra.description.length < 60 && (
                        <Text style={styles.text}>: {extra.description}</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            )}

              {/* Hobbies - Inline */}
              {contentToUse.formattedHobbies && contentToUse.formattedHobbies.length > 0 && (
              <View style={[styles.section, { marginTop: 4 }]}>
                <Text style={styles.sectionTitle}>INTERESTS</Text>
                  <Text style={styles.text}>
                    {contentToUse.formattedHobbies
                    .map((hobby: any) => typeof hobby === 'string' ? hobby : (hobby.hobby_name || hobby.name || hobby.title || ''))
                    .filter((s: string) => s && s.trim())
                    .slice(0, 6)
                    .join(' • ')}
                </Text>
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
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
    }, [allEducation, allProjects, allSkills, certifications, achievements, extracurricular, hobbies, profile, toast, resumeContent]);

  // Define handleGenerateResume after handleDownloadPDF
  const handleGenerateResume = useCallback(async () => {
    try {
      setIsGenerating(true);
      
      if (!profile || !profile.full_name || !profile.email || !profile.phone_number) {
        toast({
          title: "Personal Information Required",
          description: "Please complete your personal information (name, email, phone) first",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      if (allEducation.length === 0) {
        toast({
          title: "Education Required",
          description: "Please add at least one education entry",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      toast({
        title: "Enhancing Resume with AI",
        description: "Generating ATS-friendly resume... This may take a few seconds.",
      });

      // Prepare resume data for AI enhancement
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

      // Import and call AI enhancer
      const { enhanceResumeWithAI } = await import("@/lib/aiResumeEnhancer");
      const enhancedResume = await enhanceResumeWithAI(resumeData);

      setResumeContent(enhancedResume);
      
      // Generate and download PDF using the AI-enhanced resume
      await handleDownloadPDF(enhancedResume);
      
      toast({
        title: "Resume Generated Successfully!",
        description: enhancedResume.atsScore 
          ? `Your ATS-friendly resume has been generated (ATS Score: ${enhancedResume.atsScore}/100)`
          : "Your ATS-friendly resume has been generated and downloaded!",
        variant: "default",
      });
      
      setIsGenerating(false);
    } catch (error: any) {
      console.error("Error generating resume:", error);
      toast({
        title: "Failed to generate resume",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  }, [profile, allEducation, allProjects, allSkills, certifications, achievements, extracurricular, hobbies, handleDownloadPDF, toast]);

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
          <strong className="block mt-2">Required:</strong> Personal Info, Education
          <strong className="block mt-1">Optional (Enhance Resume):</strong> Projects, Skills, Certifications, Achievements, Extracurricular, Hobbies
          {completeness < 100 && (
            <strong className="block mt-2 text-primary">
              Complete required sections ({completeness}% done) to unlock the "Generate Resume PDF" button.
            </strong>
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
      <PersonalInfoForm
        initialData={profile || undefined}
        onSave={(data) => saveProfile.mutate(data)}
        isSaving={saveProfile.isPending}
      />

      {/* Education */}
      <EducationForm education={allEducation} />

      {/* Projects */}
      <ProjectsForm projects={allProjects} />

      {/* Skills */}
      <SkillsForm skills={allSkills} />

      {/* Certifications */}
      <CertificationsForm certifications={certifications} />

      {/* Achievements */}
      <AchievementsForm achievements={achievements} />

      {/* Extracurricular */}
      <ExtracurricularForm extracurricular={extracurricular} />

      {/* Hobbies */}
      <HobbiesForm hobbies={hobbies} />

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
});
