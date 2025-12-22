import { useState } from "react";
import { Mail, Download, Loader2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { apiClient } from "@/integrations/api/client";
import { generateCoverLetterWithOpenAI } from "@/lib/resumeitnow/services/openaiService";
import { handleOpenAIError } from "@/lib/resumeitnow/utils/errorHandler";

interface CoverLetterResult {
  coverLetter: string;
  subject: string;
  highlights: string[];
}

export function CoverLetterTab() {
  const { profile, education, projects, skills, isLoading } = useStudentProfile();
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [whyInterested, setWhyInterested] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!companyName.trim() || !position.trim()) {
      toast.error("Please fill in company name and position");
      return;
    }

    if (!profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsGenerating(true);

    try {
      toast.info("Generating your cover letter...");

      // Prepare resume data for API
      const resumeData = {
        personal_info: profile ? {
          full_name: profile.full_name,
          email: profile.email,
        } : undefined,
        education: education?.map(edu => ({
          degree: edu.degree,
          institution: edu.institution,
          field_of_study: edu.field_of_study,
        })),
        experience: [],
        projects: projects?.map(proj => ({
          project_title: proj.title,
          description: proj.description,
          technologies_used: proj.technologies,
        })),
        skills: skills || [],
        certifications: [],
        achievements: [],
      };

      // Try ResumeItNow OpenAI service first, fallback to backend API
      let coverLetterText = '';
      try {
        coverLetterText = await generateCoverLetterWithOpenAI(
          resumeData,
          jobDescription || "Software Engineer position",
          companyName,
          position
        );
      } catch (error) {
        const errorInfo = handleOpenAIError(error);
        console.warn('ResumeItNow OpenAI service failed, falling back to backend API:', errorInfo.message);
        try {
          // Fallback to backend API
          const apiResult = await apiClient.generateCoverLetter({
            resume_data: resumeData,
            job_description: jobDescription || "Software Engineer position",
            company_name: companyName,
            role: position,
          });
          coverLetterText = apiResult.cover_letter;
        } catch (fallbackError) {
          // If fallback also fails, throw the original OpenAI error
          throw error;
        }
      }

      // Convert to component format
      const result: CoverLetterResult = {
        coverLetter: coverLetterText,
        subject: `Application for ${position} Position at ${companyName}`,
        highlights: skills?.slice(0, 3) || [],
      };

      setResult(result);
      toast.success("Cover letter generated successfully!");
    } catch (error) {
      console.error("Error generating cover letter:", error);
      const errorInfo = handleOpenAIError(error);
      toast.error(errorInfo.message, {
        description: errorInfo.actionable,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result.coverLetter);
      setCopied(true);
      toast.success("Cover letter copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const content = `Subject: ${result.subject}\n\n${result.coverLetter}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, "_")}_Cover_Letter.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Cover letter downloaded!");
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Generate AI Cover Letter
          </CardTitle>
          <CardDescription>
            Create a personalized, professional cover letter tailored to the job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="e.g., Google, Microsoft, Amazon"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                placeholder="e.g., Software Engineer, Data Analyst"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyInterested">Why are you interested? (Optional)</Label>
            <Textarea
              id="whyInterested"
              placeholder="Share your motivation for applying to this role..."
              rows={3}
              value={whyInterested}
              onChange={(e) => setWhyInterested(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description (Optional)</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here for a more tailored cover letter..."
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <Button
            className="w-full bg-gradient-primary"
            onClick={handleGenerate}
            disabled={isGenerating || !companyName.trim() || !position.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Cover Letter...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Subject Line */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Email Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{result.subject}</p>
            </CardContent>
          </Card>

          {/* Highlights */}
          {result.highlights.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Key Highlights</CardTitle>
                <CardDescription>What this cover letter emphasizes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.highlights.map((highlight, idx) => (
                    <Badge key={idx} variant="secondary">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cover Letter Content */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Cover Letter</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-6 whitespace-pre-wrap text-sm leading-relaxed">
                {result.coverLetter}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
