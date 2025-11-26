import { useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { useStudentProfile } from "@/hooks/useStudentProfile";

interface ATSAnalysis {
  overallScore: number;
  categoryScores: {
    format: number;
    keywords: number;
    experience: number;
    skills: number;
    contact: number;
    readability: number;
  };
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
  recommendations: string[];
}

export function ATSTab() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [jobDescription, setJobDescription] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsAnalyzing(true);

    try {
      let resumeText = "";
      
      if (file.type === 'text/plain') {
        resumeText = await file.text();
      } else {
        try {
          if (file.type === 'application/pdf') {
            toast.info("Extracting text from PDF...");
            const arrayBuffer = await file.arrayBuffer();
            // Dynamic import to keep bundle light
            const pdfjs: any = await import('pdfjs-dist');
            const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
            pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let extracted = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const strings = (content.items as any[]).map((it: any) => it.str ?? '').join(' ');
              extracted += strings + '\n';
            }
            resumeText = extracted;
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            toast.info("Extracting text from DOCX...");
            const { default: mammoth }: any = await import('mammoth/mammoth.browser');
            const arrayBuffer = await file.arrayBuffer();
            const { value } = await mammoth.extractRawText({ arrayBuffer });
            resumeText = value || '';
          } else if (file.type === 'application/msword') {
            toast.error("Legacy .doc files are not supported. Please convert to DOCX or PDF.");
            setIsAnalyzing(false);
            return;
          } else {
            toast.error("Unsupported file format.");
            setIsAnalyzing(false);
            return;
          }
        } catch (ex) {
          console.error("Client-side extraction failed:", ex);
          toast.error("Text could not be extracted from the document.");
          setIsAnalyzing(false);
          return;
        }
        if (!resumeText.trim()) {
          toast.error("Text could not be extracted from the document.");
          setIsAnalyzing(false);
          return;
        }
        toast.success("Document text extracted successfully!");
      }

      // Reflect extracted text in the textarea
      setResumeText(resumeText);

      // Analyze using backend API
      await analyzeResumeWithAPI(resumeText, jobDescription);
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { profile, education, projects, skills } = useStudentProfile();
  const [resumeText, setResumeText] = useState("");

  const analyzeResumeWithAPI = async (text: string, jobDesc?: string) => {
    try {
      // Prepare resume data from profile
      const resumeData = {
        personal_info: profile ? {
          full_name: profile.full_name,
          email: profile.email,
        } : undefined,
        education: education?.map(edu => ({
          degree: edu.degree,
          institution: edu.institution,
          field_of_study: edu.field_of_study,
          start_date: edu.start_date,
          end_date: edu.end_date,
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

      const result = await apiClient.calculateATSScore({
        resume_data: resumeData,
        job_description: jobDesc || undefined,
      });

      // Convert API response to component format
      const analysis: ATSAnalysis = {
        overallScore: result.score,
        categoryScores: {
          format: result.breakdown.personal_info || 0,
          keywords: result.breakdown.keyword_matching || 0,
          experience: result.breakdown.experience || 0,
          skills: result.breakdown.skills || 0,
          contact: result.breakdown.personal_info || 0,
          readability: result.breakdown.education || 0,
        },
        strengths: result.strengths || [],
        improvements: result.recommendations || [],
        missingKeywords: result.missing_keywords || [],
        recommendations: result.recommendations || [],
      };

      setAnalysis(analysis);
      toast.success("Resume analyzed successfully!");
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    }
  };

  const handleTextAnalysis = async (text: string) => {
    if (!text.trim()) {
      toast.error("Please enter your resume text");
      return;
    }

    setIsAnalyzing(true);

    try {
      await analyzeResumeWithAPI(text, jobDescription || undefined);
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Score Display */}
      {analysis && (
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-4xl font-bold text-primary">{analysis.overallScore}</CardTitle>
            <CardDescription>Overall ATS Score</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={analysis.overallScore} className="[&>div]:bg-primary" />
          </CardContent>
        </Card>
      )}

      {/* Upload and Input Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>Upload your resume file (TXT format recommended)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer block">
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isAnalyzing}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">TXT, PDF, DOC, DOCX (Max 5MB)</p>
            </label>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Or Paste Resume Text</CardTitle>
            <CardDescription>Copy and paste your resume content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your resume text here..."
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              disabled={isAnalyzing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Job Description */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Job Description (Optional)</CardTitle>
          <CardDescription>Add a job description to get targeted analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste the job description here for better keyword matching..."
            rows={4}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isAnalyzing}
          />
        </CardContent>
      </Card>

      {/* Analyze Button */}
      <Button 
        className="w-full bg-gradient-primary" 
        onClick={() => handleTextAnalysis(resumeText)}
        disabled={isAnalyzing || !resumeText.trim()}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Analyze Resume
          </>
        )}
      </Button>

      {/* Results */}
      {analysis && (
        <>
          {/* Category Scores */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Category Scores</CardTitle>
              <CardDescription>Detailed breakdown by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analysis.categoryScores).map(([key, score]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{key}</span>
                    <Badge variant={score >= 15 ? 'default' : 'secondary'}>
                      {score}
                    </Badge>
                  </div>
                  <Progress value={(score / 25) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strengths and Improvements */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-success">Strengths</CardTitle>
                <CardDescription>What your resume does well</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-success mt-1">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-warning">Areas for Improvement</CardTitle>
                <CardDescription>Focus on these to boost your score</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-warning mt-1">!</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Missing Keywords */}
          {analysis.missingKeywords.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Missing Keywords</CardTitle>
                <CardDescription>Important keywords to consider adding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((keyword, idx) => (
                    <Badge key={idx} variant="outline">{keyword}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Actionable steps to improve your resume</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.recommendations.map((recommendation, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">{idx + 1}.</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
