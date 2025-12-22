/**
 * Job Application Guide - End-to-End Mentor & Guide
 * Complete job application preparation with resume optimization, 
 * interview preparation, and career guidance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Sparkles, 
  Target, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb,
  TrendingUp,
  FileText,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Users,
  Rocket
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  optimizeResume,
  calculateATSScore,
  type ResumeData,
  type ATSScoreResponse,
} from '@/services/resumeOptimizationService';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResumePreviewModal } from './ResumePreviewModal';
import { Button as UIButton } from '@/components/ui/button';

interface JobApplicationGuideProps {
  onOptimizedResumeReady?: (resumeData: ResumeData) => void;
}

export function JobApplicationGuide({ onOptimizedResumeReady }: JobApplicationGuideProps) {
  const { toast } = useToast();
  const {
    profile,
    education,
    projects,
    skills,
    certifications,
    achievements,
    extracurricular,
    hobbies,
  } = useStudentProfile();

  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [atsScore, setAtsScore] = useState<ATSScoreResponse | null>(null);
  const [preparationGuide, setPreparationGuide] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('optimize');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Prepare current resume data
  const currentResumeData: ResumeData = {
    profile: profile || {},
    education: education || [],
    projects: projects || [],
    skills: skills || {},
    certifications: certifications || [],
    achievements: achievements || [],
    extracurricular: extracurricular || [],
    hobbies: hobbies || [],
  };

  const handleOptimizeForJob = async () => {
    if (!targetRole.trim()) {
      toast({
        title: 'Target Role Required',
        description: 'Please enter the job role you are applying for',
        variant: 'destructive',
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const result = await optimizeResume(
        currentResumeData,
        targetRole,
        jobDescription || undefined
      );

      setOptimizedResume(result.optimized_resume);
      
      // Calculate ATS score for optimized resume
      setIsAnalyzing(true);
      const score = await calculateATSScore(
        result.optimized_resume,
        jobDescription || undefined
      );
      setAtsScore(score);
      setIsAnalyzing(false);

      // Generate preparation guide
      await generatePreparationGuide(result.optimized_resume, targetRole, jobDescription);

      toast({
        title: 'Resume Optimized!',
        description: `Your resume has been tailored for ${targetRole} with ${result.improvements_made.length} improvements`,
      });

      if (onOptimizedResumeReady) {
        onOptimizedResumeReady(result.optimized_resume);
      }

      // Auto-open preview modal after optimization
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error optimizing resume:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to optimize resume',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const generatePreparationGuide = async (resumeData: ResumeData, role: string, jd?: string) => {
    // Generate comprehensive preparation guide based on role and JD
    try {
      // Try to use backend API for advanced insights if available
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      if (token && jobDescription) {
        try {
          // Get skill gap analysis
          const skillGapResponse = await fetch(`${API_BASE_URL}/api/resume/skill-gap-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              resume_data: resumeData,
              target_role: role,
              job_description: jobDescription,
            }),
          });

          // Get career insights
          const insightsResponse = await fetch(`${API_BASE_URL}/api/resume/career-insights`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              resume_data: resumeData,
              target_role: role,
            }),
          });

          if (skillGapResponse.ok && insightsResponse.ok) {
            const skillGaps = await skillGapResponse.json();
            const insights = await insightsResponse.json();

            const guide = {
              interviewPreparation: [
                `Prepare to discuss your ${role} projects in detail, emphasizing impact and results`,
                `Review common ${role} interview questions and prepare STAR method answers`,
                `Practice explaining your technical skills and how they apply to this role`,
                `Research ${companyName || 'the company'} - their products, culture, and recent news`,
                `Prepare 3-5 thoughtful questions to ask about the role, team, and company`,
                `Practice behavioral interview questions using examples from your projects`,
              ],
              skillGaps: skillGaps.missing_skills?.map((skill: string) => `Consider strengthening: ${skill}`) || [
                'Review job requirements and identify areas to strengthen',
                'Consider online courses or certifications if needed',
              ],
              resumeTips: insights.suggestions || [
                'Highlight relevant projects and achievements',
                'Use keywords from the job description',
                'Quantify your achievements with specific numbers',
              ],
              careerInsights: insights.insights || [],
            };

            setPreparationGuide(guide);
            return;
          }
        } catch (error) {
          console.log('Advanced guide generation failed, using basic guide:', error);
        }
      }

      // Fallback to basic guide
      const guide = {
        interviewPreparation: [
          `Prepare to discuss your ${role} projects in detail, emphasizing impact and results`,
          `Review common ${role} interview questions and prepare STAR method answers`,
          `Practice explaining your technical skills and how they apply to this role`,
          `Research ${companyName || 'the company'} - their products, culture, and recent news`,
          `Prepare 3-5 thoughtful questions to ask about the role, team, and company`,
          `Practice behavioral interview questions using examples from your projects`,
        ],
        skillGaps: [
          'Review job requirements and identify areas to strengthen',
          'Consider online courses or certifications if needed',
        ],
        resumeTips: [
          'Highlight relevant projects and achievements',
          'Use keywords from the job description',
          'Quantify your achievements with specific numbers',
        ],
      };

      setPreparationGuide(guide);
    } catch (error) {
      console.error('Error generating preparation guide:', error);
      // Still set a basic guide on error
      setPreparationGuide({
        interviewPreparation: [`Prepare for ${role} interview questions`, 'Review your projects and achievements'],
        skillGaps: ['Review job requirements'],
        resumeTips: ['Use keywords from job description'],
      });
    }
  };

  const completeness = targetRole ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Job Application Guide & Mentor</CardTitle>
              <CardDescription className="text-base mt-1">
                Get your resume optimized for specific jobs with personalized preparation guidance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Job Details Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Application Details
          </CardTitle>
          <CardDescription>
            Enter the job details to get personalized optimization and preparation guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                placeholder="e.g., Google, Microsoft, Amazon"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRole">
                Target Role * <span className="text-destructive">*</span>
              </Label>
              <Input
                id="targetRole"
                placeholder="e.g., Software Developer, Data Scientist, Product Manager"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobDescription">
              Job Description (Recommended for better optimization)
            </Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description here for AI-powered keyword optimization and personalized suggestions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: Include the full job description for best results. We'll extract keywords, 
              requirements, and create tailored suggestions.
            </p>
          </div>
          <Button
            onClick={handleOptimizeForJob}
            disabled={!targetRole.trim() || isOptimizing || isAnalyzing}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          >
            {isOptimizing || isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isOptimizing ? 'Optimizing Resume...' : 'Analyzing & Generating Guide...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Optimize Resume & Get Preparation Guide
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      {(optimizedResume || atsScore || preparationGuide) && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              ATS Score
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="prepare" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Preparation
            </TabsTrigger>
            <TabsTrigger value="improve" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Improve Resume
            </TabsTrigger>
          </TabsList>

          {/* ATS Score Tab */}
          <TabsContent value="optimize" className="space-y-4">
            {atsScore && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    ATS Compatibility Score
                  </CardTitle>
                  <CardDescription>
                    Your resume's compatibility with Applicant Tracking Systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Overall Score</span>
                      <Badge
                        variant={atsScore.score >= 80 ? 'default' : atsScore.score >= 60 ? 'secondary' : 'destructive'}
                        className="text-xl px-4 py-2"
                      >
                        {atsScore.score}/100
                      </Badge>
                    </div>
                    <Progress value={atsScore.score} className="h-4" />
                    <p className="text-sm text-muted-foreground">
                      {atsScore.score >= 80 
                        ? '🎉 Excellent! Your resume is highly ATS-compatible'
                        : atsScore.score >= 60
                        ? '✅ Good! Your resume has decent ATS compatibility'
                        : '⚠️ Needs improvement to pass ATS filters'
                      }
                    </p>
                  </div>

                  {atsScore.strengths && atsScore.strengths.length > 0 && (
                    <div>
                      <Label className="text-base font-semibold flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Strengths
                      </Label>
                      <ul className="space-y-2">
                        {atsScore.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {atsScore.improvements && atsScore.improvements.length > 0 && (
                    <div>
                      <Label className="text-base font-semibold flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        Areas for Improvement
                      </Label>
                      <ul className="space-y-2">
                        {atsScore.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-600 mt-1">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {atsScore.missing_keywords && atsScore.missing_keywords.length > 0 && (
                    <div>
                      <Label className="text-base font-semibold mb-2">Missing Keywords</Label>
                      <div className="flex flex-wrap gap-2">
                        {atsScore.missing_keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Consider adding these keywords naturally throughout your resume
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Personalized Suggestions
                </CardTitle>
                <CardDescription>
                  Actionable recommendations to improve your resume for this role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {atsScore?.improvements && atsScore.improvements.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Resume Enhancement Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {atsScore.improvements.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                          <span className="text-primary mt-1">💡</span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {preparationGuide?.resumeTips && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resume Best Practices
                    </h4>
                    <ul className="space-y-2">
                      {preparationGuide.resumeTips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {preparationGuide?.careerInsights && preparationGuide.careerInsights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Career Insights
                    </h4>
                    <ul className="space-y-2">
                      {preparationGuide.careerInsights.map((insight: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-primary/5 rounded">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preparation Guide Tab */}
          <TabsContent value="prepare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Interview Preparation Guide
                </CardTitle>
                <CardDescription>
                  Step-by-step guide to prepare for your {targetRole} interview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {preparationGuide?.interviewPreparation && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Interview Preparation Steps
                    </h4>
                    <ul className="space-y-3">
                      {preparationGuide.interviewPreparation.map((step: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-sm flex-1">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {preparationGuide?.skillGaps && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Skill Development Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {preparationGuide.skillGaps.map((recommendation: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Award className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro Tip:</strong> Research the company culture, recent news, and team structure. 
                    Prepare specific examples from your experience that relate to this role.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Improve Resume Tab */}
          <TabsContent value="improve" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resume Improvement Checklist
                </CardTitle>
                <CardDescription>
                  Action items to enhance your resume for better results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Resume Optimized for Role</p>
                      <p className="text-sm text-muted-foreground">
                        Your resume has been tailored for {targetRole}
                      </p>
                    </div>
                  </div>

                  {atsScore && atsScore.score < 80 && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-medium">Improve ATS Score</p>
                        <p className="text-sm text-muted-foreground">
                          Current score: {atsScore.score}/100. Review suggestions above to improve.
                        </p>
                      </div>
                    </div>
                  )}

                  {atsScore?.missing_keywords && atsScore.missing_keywords.length > 0 && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Code className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Add Missing Keywords</p>
                        <p className="text-sm text-muted-foreground">
                          Consider adding: {atsScore.missing_keywords.slice(0, 5).join(', ')}
                          {atsScore.missing_keywords.length > 5 && ` and ${atsScore.missing_keywords.length - 5} more`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Preview & Download Section */}
      {optimizedResume && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Ready to Preview & Download</h3>
                <p className="text-sm text-muted-foreground">
                  Your resume has been optimized for {targetRole}. Preview it in different templates and download as PDF.
                </p>
              </div>
              <UIButton
                onClick={() => setShowPreviewModal(true)}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
              >
                <FileText className="mr-2 h-5 w-5" />
                Preview & Download Resume
              </UIButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Rocket className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Your Personal Career Mentor
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                This guide provides end-to-end support: from resume optimization to interview preparation. 
                After optimizing, review your ATS score, follow the suggestions, and use the preparation guide 
                to ace your interview. Then preview and download your optimized resume.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {optimizedResume && (
        <ResumePreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          resumeData={optimizedResume}
        />
      )}
    </div>
  );
}

