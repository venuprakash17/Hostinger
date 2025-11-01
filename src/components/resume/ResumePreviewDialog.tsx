import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ResumePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeContent: any;
  profile: any;
  onDownload?: () => void;
}

export function ResumePreviewDialog({
  open,
  onOpenChange,
  resumeContent,
  profile,
  onDownload,
}: ResumePreviewDialogProps) {
  if (!resumeContent || !profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Resume Preview</DialogTitle>
              <DialogDescription>
                ATS Score: {resumeContent.atsScore || "N/A"}/100
              </DialogDescription>
            </div>
            {resumeContent.atsScore && (
              <div className="flex items-center gap-2">
                <Progress value={resumeContent.atsScore} className="w-24" />
                <Badge
                  variant={
                    resumeContent.atsScore >= 80
                      ? "default"
                      : resumeContent.atsScore >= 60
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {resumeContent.atsScore >= 80
                    ? "Excellent"
                    : resumeContent.atsScore >= 60
                    ? "Good"
                    : "Needs Work"}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-3xl font-bold">{profile.full_name}</h1>
            <div className="flex flex-wrap justify-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{profile.email}</span>
              {profile.phone_number && <span>•</span>}
              {profile.phone_number && <span>{profile.phone_number}</span>}
              {profile.linkedin_profile && <span>•</span>}
              {profile.linkedin_profile && (
                <a
                  href={profile.linkedin_profile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LinkedIn
                </a>
              )}
              {profile.github_portfolio && <span>•</span>}
              {profile.github_portfolio && (
                <a
                  href={profile.github_portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Summary */}
          {resumeContent.summary && (
            <div>
              <h2 className="text-xl font-semibold border-b pb-2 mb-3">
                Professional Summary
              </h2>
              <p className="text-sm leading-relaxed">{resumeContent.summary}</p>
            </div>
          )}

          {/* Education */}
          {resumeContent.formattedEducation &&
            resumeContent.formattedEducation.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Education</h2>
                <div className="space-y-3">
                  {resumeContent.formattedEducation.map((edu: any, idx: number) => {
                    const institution = edu.institution_name || edu.institution || edu.school || edu.university || edu.college;
                    const degree = edu.degree || edu.degree_title || edu.title;
                    const field = edu.field_of_study || edu.major || edu.specialization;
                    const start = edu.start_date || edu.start || edu.startDate;
                    const endRaw = edu.end_date || edu.end || edu.endDate;
                    const isCurrent = (edu.is_current ?? edu.current) ?? (typeof endRaw === 'string' && /present/i.test(endRaw));
                    const end = isCurrent ? 'Present' : endRaw;
                    const cgpa = edu.cgpa_percentage || edu.cgpa || edu.gpa || edu.score;
                    return (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">
                              {degree || institution}
                            </h3>
                            {(institution || field) && (
                              <p className="text-muted-foreground">
                                {institution || field}
                              </p>
                            )}
                          </div>
                          {(start || end) && (
                            <span className="text-muted-foreground text-xs">
                              {start} - {end}
                            </span>
                          )}
                        </div>
                        {cgpa && (
                          <p className="text-muted-foreground mt-1">
                            CGPA: {cgpa}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Skills */}
          {resumeContent.formattedSkills && (
            <div>
              <h2 className="text-xl font-semibold border-b pb-2 mb-3">Skills</h2>
              <div className="space-y-2">
                {Object.entries(resumeContent.formattedSkills).map(
                  ([category, skills]: [string, any]) => (
                    <div key={category} className="text-sm">
                      <span className="font-semibold capitalize">{category}: </span>
                      <span className="text-muted-foreground">
                        {Array.isArray(skills) ? skills.join(", ") : skills}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeContent.formattedProjects &&
            resumeContent.formattedProjects.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Projects</h2>
                <div className="space-y-4">
                  {resumeContent.formattedProjects.map((project: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{project.project_title}</h3>
                        <span className="text-muted-foreground text-xs">
                          {project.duration_start} - {project.duration_end}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-muted-foreground mt-1">
                          {project.description}
                        </p>
                      )}
                      {project.technologies_used && (
                        <p className="text-xs mt-1">
                          <span className="font-medium">Technologies: </span>
                          {Array.isArray(project.technologies_used)
                            ? project.technologies_used.join(", ")
                            : project.technologies_used}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Certifications */}
          {resumeContent.formattedCertifications &&
            resumeContent.formattedCertifications.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Certifications</h2>
                <ul className="space-y-2">
                  {resumeContent.formattedCertifications.map((cert: any, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {cert.certification_name} - {cert.issuing_organization}
                      {cert.date_issued && <span> ({cert.date_issued})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Achievements */}
          {resumeContent.formattedAchievements &&
            resumeContent.formattedAchievements.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Achievements</h2>
                <ul className="space-y-2">
                  {resumeContent.formattedAchievements.map((achievement: any, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {achievement.title}
                      {achievement.description && `: ${achievement.description}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Extracurricular */}
          {resumeContent.formattedExtracurricular &&
            resumeContent.formattedExtracurricular.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Extracurricular Activities</h2>
                <div className="space-y-3">
                  {resumeContent.formattedExtracurricular.map((activity: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <h3 className="font-semibold">
                        {activity.activity_organization}
                        {activity.role && ` - ${activity.role}`}
                      </h3>
                      {activity.description && (
                        <p className="text-muted-foreground mt-1">{activity.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Hobbies */}
          {resumeContent.formattedHobbies &&
            resumeContent.formattedHobbies.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mb-3">Hobbies & Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {resumeContent.formattedHobbies.map((hobby: any, idx: number) => {
                    const label = typeof hobby === 'string' ? hobby : (hobby.hobby_name || hobby.name || hobby.title || '');
                    return (
                      <span key={idx} className="text-sm px-3 py-1 bg-muted rounded-full">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
