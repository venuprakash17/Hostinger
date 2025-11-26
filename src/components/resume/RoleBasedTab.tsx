import { useState, useMemo } from "react";
import { Briefcase, Download, Loader2, Lightbulb, Target, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ResumePreviewDialog } from "./ResumePreviewDialog";
import { pdf } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { tailorResumeForRole, enhanceWithAI } from "@/lib/roleBasedTailorer";
import { Badge } from "@/components/ui/badge";
import { resumeStorage } from "@/lib/resumeStorage";

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

      // Try to enhance with AI if available
      const enhanced = await enhanceWithAI(tailored, resumeData, targetRole, jobDescription || undefined);

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
      toast.error(error instanceof Error ? error.message : "Failed to generate tailored resume");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resumeContent || !profile) return;

    try {
      // PDF styles - Optimized for single page (no empty spaces)
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

      const MyDocument = () => (
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
            {resumeContent.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
                <Text style={styles.summary}>{resumeContent.summary}</Text>
              </View>
            )}

            {/* Education - Compact Layout */}
            {resumeContent.formattedEducation?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EDUCATION</Text>
                {resumeContent.formattedEducation
                  .sort((a: any, b: any) => {
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
            {resumeContent.formattedSkills && Object.keys(resumeContent.formattedSkills).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SKILLS</Text>
                {Object.entries(resumeContent.formattedSkills).map(
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
            {resumeContent.formattedProjects?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROJECTS</Text>
                {resumeContent.formattedProjects.slice(0, 3).map((project: any, idx: number) => (
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
            {resumeContent.formattedCertifications && resumeContent.formattedCertifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {resumeContent.formattedCertifications
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
            {resumeContent.formattedAchievements && resumeContent.formattedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                {resumeContent.formattedAchievements
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
            {resumeContent.formattedExtracurricular && resumeContent.formattedExtracurricular.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EXTRACURRICULAR</Text>
                {resumeContent.formattedExtracurricular.slice(0, 2).map((extra: any, idx: number) => (
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
            {resumeContent.formattedHobbies && resumeContent.formattedHobbies.length > 0 && (
              <View style={[styles.section, { marginTop: 4 }]}>
                <Text style={styles.sectionTitle}>INTERESTS</Text>
                <Text style={styles.text}>
                  {resumeContent.formattedHobbies
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

      const blob = await pdf(<MyDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${profile.full_name.replace(/\s+/g, "_")}_${targetRole.replace(/\s+/g, "_")}_Resume.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Resume downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
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
