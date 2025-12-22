/**
 * Final Interview Report Component
 * Shows overall performance and improvement roadmap
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, RefreshCw, CheckCircle2, XCircle, Target, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateATSSafePDF } from '@/lib/resumeitnow/services/pdfGeneratorService';

interface FinalReportProps {
  report: {
    overall_score: number;
    technical_readiness: string;
    communication_rating: string;
    strong_areas: string[];
    weak_areas: string[];
    improvement_roadmap: Array<{ day: string; tasks: string }>;
  };
  allAnswers: any[];
  interviewData: any;
  onRestart: () => void;
}

export function FinalReport({ report, allAnswers, interviewData, onRestart }: FinalReportProps) {
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your interview report...',
      });

      // Create a simple PDF document with the report
      const reportText = `
AI MOCK INTERVIEW REPORT
========================

Job Role: ${interviewData?.jobRole || 'N/A'}
Company: ${interviewData?.companyName || 'N/A'}
Experience Level: ${interviewData?.experienceLevel || 'N/A'}

OVERALL PERFORMANCE
-------------------
Overall Score: ${report.overall_score.toFixed(1)}/10.0
Technical Readiness: ${report.technical_readiness}
Communication Rating: ${report.communication_rating}

STRONG AREAS
------------
${report.strong_areas.map((area, idx) => `${idx + 1}. ${area}`).join('\n')}

AREAS FOR IMPROVEMENT
---------------------
${report.weak_areas.map((area, idx) => `${idx + 1}. ${area}`).join('\n')}

7-DAY IMPROVEMENT ROADMAP
-------------------------
${report.improvement_roadmap.map(item => `${item.day}: ${item.tasks}`).join('\n\n')}

QUESTION-BY-QUESTION BREAKDOWN
-------------------------------
${allAnswers.map((ans, idx) => `
Question ${idx + 1}: ${ans.question}
Your Answer: ${ans.answer}
Score: ${ans.analysis.score}/5.0
Strengths: ${ans.analysis.strengths.join(', ')}
Improvements: ${ans.analysis.weaknesses.join(', ')}
`).join('\n')}

Generated on: ${new Date().toLocaleDateString()}
      `;

      // For now, create a simple text download
      // In future, use a proper PDF library
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-report-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'Your interview report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRatingColor = (rating: string) => {
    const lower = rating.toLowerCase();
    if (lower.includes('excellent')) return 'text-green-600';
    if (lower.includes('good')) return 'text-blue-600';
    if (lower.includes('average')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallPercentage = (report.overall_score / 10) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Interview Complete! 🎉</CardTitle>
          <CardDescription>
            Here's your comprehensive performance analysis and improvement roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="text-center space-y-4">
            <div className={`text-6xl font-bold ${getRatingColor(report.technical_readiness)}`}>
              {report.overall_score.toFixed(1)}/10.0
            </div>
            <Progress value={overallPercentage} className="w-full h-3" />
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Technical: {report.technical_readiness}
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Communication: {report.communication_rating}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
            <Button onClick={onRestart} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Strong Areas */}
      {report.strong_areas && report.strong_areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Your Strong Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strong_areas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weak Areas */}
      {report.weak_areas && report.weak_areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Areas to Focus On
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.weak_areas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Target className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improvement Roadmap */}
      {report.improvement_roadmap && report.improvement_roadmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              7-Day Improvement Roadmap
            </CardTitle>
            <CardDescription>
              Follow this structured plan to improve your interview skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.improvement_roadmap.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-sm font-semibold">
                      {item.day}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.tasks}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Question-by-Question Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allAnswers.map((ans, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">Q{idx + 1}</Badge>
                  <Badge variant={ans.analysis.score >= 4 ? 'default' : ans.analysis.score >= 3 ? 'secondary' : 'destructive'}>
                    {ans.analysis.score.toFixed(1)}/5.0
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1">{ans.question}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{ans.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


