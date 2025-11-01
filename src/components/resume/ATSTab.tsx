import { useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        // For PDF and DOC files, upload to storage and parse
        const fileName = `resume-${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, file);

        if (uploadError) {
          // If bucket doesn't exist, show helpful message
          if (uploadError.message.includes('not found')) {
            toast.error("Storage not configured. Please use the text area to paste your resume.");
            setIsAnalyzing(false);
            return;
          }
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName);

        // For PDF/DOC, we need to extract text - for now, show message
        toast.info("Extracting text from document...");
        
        // Since we don't have a document parser integrated yet, 
        // ask user to use text area instead
        toast.error("PDF/DOC parsing not yet available. Please copy your resume text and paste it in the text area below.");
        
        // Clean up uploaded file
        await supabase.storage.from('resumes').remove([fileName]);
        
        setIsAnalyzing(false);
        return;
      }

      // Call analyze-ats function
      const { data, error } = await supabase.functions.invoke('analyze-ats', {
        body: { 
          resumeText,
          jobDescription: jobDescription || undefined
        }
      });

      if (error) throw error;

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        toast.success("Resume analyzed successfully!");
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalysis = async (text: string) => {
    if (!text.trim()) {
      toast.error("Please enter your resume text");
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-ats', {
        body: { 
          resumeText: text,
          jobDescription: jobDescription || undefined
        }
      });

      if (error) throw error;

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        toast.success("Resume analyzed successfully!");
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [resumeText, setResumeText] = useState("");

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
