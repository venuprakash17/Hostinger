import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, TrendingUp, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResumeSuggestionsPanelProps {
  atsScore?: number;
  recommendations?: string[];
  profile?: any;
  education?: any[];
  projects?: any[];
  skills?: any[];
}

export function ResumeSuggestionsPanel({
  atsScore,
  recommendations,
  profile,
  education,
  projects,
  skills,
}: ResumeSuggestionsPanelProps) {
  // Calculate basic completeness metrics
  const hasPersonalInfo = profile?.full_name && profile?.email && profile?.phone_number;
  const hasEducation = education && education.length > 0;
  const hasProjects = projects && projects.length > 0;
  const hasSkills = skills && skills.length > 0;

  // Generate suggestions based on current data
  const generateSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (!hasPersonalInfo) {
      suggestions.push("Complete your personal information (name, email, phone) for better ATS parsing");
    }

    if (!hasEducation) {
      suggestions.push("Add at least one education entry - this is required for ATS systems");
    }

    if (!hasProjects || (projects && projects.length === 0)) {
      suggestions.push("Add 2-3 projects with detailed descriptions to showcase your technical skills");
      suggestions.push("Include quantifiable achievements in projects (e.g., 'Improved performance by 40%')");
    }

    if (!hasSkills || (skills && skills.length === 0)) {
      suggestions.push("Add relevant technical skills - these are crucial for ATS keyword matching");
      suggestions.push("Include both hard skills (programming languages, tools) and soft skills (leadership, communication)");
    }

    if (projects && projects.length > 0) {
      const projectsWithoutDescriptions = projects.filter(p => !p.description || p.description.trim() === '');
      if (projectsWithoutDescriptions.length > 0) {
        suggestions.push("Add detailed descriptions to all projects - AI will enhance them automatically");
      }

      const projectsWithoutMetrics = projects.filter(p => {
        const desc = p.description || '';
        return !/\d+%|\d+\+|\d+\s*(users|requests|queries)/i.test(desc);
      });
      if (projectsWithoutMetrics.length > 0) {
        suggestions.push("Add quantifiable metrics to projects (percentages, numbers, scale) for better impact");
      }
    }

    if (education && education.length > 0) {
      const educationWithoutCGPA = education.filter(e => !e.cgpa_percentage);
      if (educationWithoutCGPA.length > 0 && education.length < 2) {
        suggestions.push("Include CGPA or GPA if above 3.0/4.0 - it helps ATS systems rank your profile");
      }
    }

    if (!recommendations || recommendations.length === 0) {
      suggestions.push("Add certifications to demonstrate continuous learning and expertise");
      suggestions.push("Include achievements or awards to stand out from other candidates");
      suggestions.push("Use strong action verbs in all descriptions (Developed, Architected, Optimized, Led)");
    }

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  };

  const autoSuggestions = generateSuggestions();
  const hasAISuggestions = recommendations && recommendations.length > 0;
  const displaySuggestions = hasAISuggestions ? recommendations : autoSuggestions;
  const finalAtsScore = atsScore || (hasPersonalInfo && hasEducation ? 65 : hasPersonalInfo || hasEducation ? 40 : 20);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="space-y-4">
      {/* ATS Score Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span>ATS Compatibility Score</span>
            </div>
            <Badge variant={getScoreBadge(finalAtsScore)} className="text-lg px-3 py-1">
              {finalAtsScore}/100
            </Badge>
          </CardTitle>
          <CardDescription>
            {hasAISuggestions 
              ? "AI-enhanced score based on your resume content"
              : "Estimated score - will improve after AI enhancement"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={finalAtsScore} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className={getScoreColor(finalAtsScore)}>
                {getScoreLabel(finalAtsScore)}
              </span>
              {finalAtsScore < 80 && (
                <span className="text-muted-foreground">
                  {80 - finalAtsScore} points to reach Excellent
                </span>
              )}
            </div>
            
            {/* Quick Status */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                {hasPersonalInfo ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={hasPersonalInfo ? "text-green-700" : "text-red-700"}>
                  Personal Info
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasEducation ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={hasEducation ? "text-green-700" : "text-red-700"}>
                  Education
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasProjects ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className={hasProjects ? "text-green-700" : "text-yellow-700"}>
                  Projects
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {hasSkills ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className={hasSkills ? "text-green-700" : "text-yellow-700"}>
                  Skills
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      {displaySuggestions && displaySuggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <span>
                {hasAISuggestions ? "AI Recommendations" : "Tips to Improve Your Resume"}
              </span>
              {hasAISuggestions && (
                <Badge variant="outline" className="ml-2">
                  AI-Powered
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {hasAISuggestions
                ? "Personalized suggestions based on your resume content and ATS best practices"
                : "Follow these tips to maximize your ATS score and improve resume quality"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {displaySuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* API Key Alert */}
      {!hasAISuggestions && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Want AI-powered enhancement?</strong> Add your Google AI Studio API key to your <code>.env</code> file as <code>VITE_GOOGLE_AI_API_KEY</code> to get:
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
              <li>Professional summary generation</li>
              <li>Enhanced project descriptions with metrics</li>
              <li>ATS score calculation</li>
              <li>Personalized improvement recommendations</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

