/**
 * Resume Preview Page
 * Live preview with template selector, optimization, ATS scoring, and PDF generation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Sparkles, Target, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResumeTemplate, TEMPLATE_CONFIGS } from '@/lib/resumeitnow/types/templates';
import {
  FresherClassic,
  ProjectFocused,
  SkillsFirst,
  InternshipFocused,
  MinimalATSPro,
} from './templates';
import {
  optimizeResume,
  calculateATSScore,
  generateResumePDF,
  downloadPDF,
  type ResumeData,
  type ATSScoreResponse,
} from '@/services/resumeOptimizationService';

interface ResumePreviewPageProps {
  resumeData: ResumeData;
  onClose?: () => void;
}

export function ResumePreviewPage({ resumeData, onClose }: ResumePreviewPageProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>('fresher_classic');
  const [optimizedData, setOptimizedData] = useState<ResumeData>(resumeData);
  const [atsScore, setAtsScore] = useState<ATSScoreResponse | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Calculate ATS score on mount and when data changes
  useEffect(() => {
    calculateATS();
  }, [optimizedData]);

  const calculateATS = async () => {
    setIsScoring(true);
    try {
      const score = await calculateATSScore(
        optimizedData,
        jobDescription || undefined
      );
      setAtsScore(score);
    } catch (error) {
      console.error('Error calculating ATS score:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to calculate ATS score',
        variant: 'destructive',
      });
    } finally {
      setIsScoring(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await optimizeResume(
        optimizedData,
        targetRole || undefined,
        jobDescription || undefined
      );
      setOptimizedData(result.optimized_resume);
      toast({
        title: 'Resume Optimized',
        description: `Applied ${result.improvements_made.length} improvements`,
      });
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

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await generateResumePDF(optimizedData, selectedTemplate);
      const filename = `resume_${optimizedData.profile?.full_name || 'resume'}_${selectedTemplate}.pdf`;
      downloadPDF(blob, filename);
      toast({
        title: 'PDF Generated',
        description: 'Your resume PDF has been downloaded',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderTemplate = () => {
    const props = { resumeData: optimizedData };
    switch (selectedTemplate) {
      case 'fresher_classic':
        return <FresherClassic {...props} />;
      case 'project_focused':
        return <ProjectFocused {...props} />;
      case 'skills_first':
        return <SkillsFirst {...props} />;
      case 'internship_focused':
        return <InternshipFocused {...props} />;
      case 'minimal_ats':
        return <MinimalATSPro {...props} />;
      default:
        return <FresherClassic {...props} />;
    }
  };

  // Filter to show only new fresher templates
  const fresherTemplates = ['fresher_classic', 'project_focused', 'skills_first', 'internship_focused', 'minimal_ats'] as ResumeTemplate[];

  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resume Preview & Optimization</h1>
          <p className="text-muted-foreground mt-1">Optimize, preview, and download your ATS-friendly resume</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Optimization
          </CardTitle>
          <CardDescription>
            Optimize your resume with AI-powered improvements for better ATS compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-role">Target Role (Optional)</Label>
              <Input
                id="target-role"
                placeholder="e.g., Software Developer, Data Analyst"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description (Optional)</Label>
              <Textarea
                id="job-description"
                placeholder="Paste job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Resume
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ATS Score */}
      {atsScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              ATS Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge
                  variant={
                    atsScore.score >= 80
                      ? 'default'
                      : atsScore.score >= 60
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {atsScore.score}/100
                </Badge>
              </div>
              <Progress value={atsScore.score} className="h-2" />
            </div>
            {atsScore.strengths && atsScore.strengths.length > 0 && (
              <div>
                <Label className="text-green-700 dark:text-green-400">Strengths</Label>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {atsScore.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {atsScore.improvements && atsScore.improvements.length > 0 && (
              <div>
                <Label className="text-amber-700 dark:text-amber-400">Improvements</Label>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  {atsScore.improvements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={calculateATS}
              disabled={isScoring}
            >
              {isScoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Score
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Choose Template
          </CardTitle>
          <CardDescription>
            Select an ATS-friendly template. Preview updates instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTemplate}
            onValueChange={(value) => setSelectedTemplate(value as ResumeTemplate)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fresherTemplates.map((templateId) => {
                const config = TEMPLATE_CONFIGS[templateId];
                return (
                  <SelectItem key={templateId} value={templateId}>
                    {config.name} - {config.description}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Resume Preview</CardTitle>
          <CardDescription>
            This is how your resume will look when downloaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white overflow-auto" style={{ maxHeight: '800px' }}>
            {renderTemplate()}
          </div>
        </CardContent>
      </Card>

      {/* Download Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            size="lg"
            className="w-full"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

