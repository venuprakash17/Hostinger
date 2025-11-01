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
                  {resumeContent.formattedEducation.map((edu: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {edu.degree || edu.institution_name}
                          </h3>
                          <p className="text-muted-foreground">
                            {edu.institution_name || edu.field_of_study}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {edu.start_date} - {edu.is_current ? "Present" : edu.end_date}
                        </span>
                      </div>
                      {edu.cgpa_percentage && (
                        <p className="text-muted-foreground mt-1">
                          CGPA: {edu.cgpa_percentage}
                        </p>
                      )}
                    </div>
                  ))}
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
