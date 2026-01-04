/**
 * Questions Preview Component
 * Shows all interview questions before starting
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

interface QuestionData {
  question: string;
  questionType?: string;
  questionNumber: number;
  totalQuestions: number;
  category?: string;
  round?: string;
}

interface QuestionsPreviewProps {
  questions: QuestionData[];
  companyName: string;
  jobRole: string;
  experienceLevel: string;
  interviewRound: string;
  onStart: () => void;
  onBack?: () => void;
}

export function QuestionsPreview({
  questions,
  companyName,
  jobRole,
  experienceLevel,
  interviewRound,
  onStart,
  onBack,
}: QuestionsPreviewProps) {
  const getQuestionTypeColor = (type?: string) => {
    if (!type) return 'secondary';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('technical') || typeLower.includes('tech')) return 'default';
    if (typeLower.includes('behavioral') || typeLower.includes('hr')) return 'secondary';
    if (typeLower.includes('managerial') || typeLower.includes('manager')) return 'outline';
    if (typeLower.includes('company')) return 'default';
    return 'secondary';
  };

  const getQuestionTypeLabel = (type?: string, category?: string) => {
    if (!type && !category) return 'General';
    const combined = `${type || ''} ${category || ''}`.toLowerCase();
    if (combined.includes('introduction')) return 'Introduction';
    if (combined.includes('technical')) return 'Technical';
    if (combined.includes('behavioral')) return 'Behavioral';
    if (combined.includes('managerial')) return 'Managerial';
    if (combined.includes('company')) return 'Company';
    if (combined.includes('closing')) return 'Closing';
    return type || category || 'General';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Interview Questions Preview
              </CardTitle>
              <CardDescription className="mt-2">
                Review all {questions.length} questions before starting your interview
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {interviewRound.charAt(0).toUpperCase() + interviewRound.slice(1)} Round
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Interview Details Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="font-semibold text-sm">{companyName || 'General'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-semibold text-sm">{jobRole}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="font-semibold text-sm">{experienceLevel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Questions</p>
              <p className="font-semibold text-sm">{questions.length}</p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Preview Mode:</strong> You can review all questions here. Once you start the interview, 
              questions will be asked one at a time. Take your time to prepare!
            </AlertDescription>
          </Alert>

          {/* Questions List */}
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Q{question.questionNumber}
                          </Badge>
                          <Badge 
                            variant={getQuestionTypeColor(question.questionType || question.category)}
                            className="text-xs"
                          >
                            {getQuestionTypeLabel(question.questionType, question.category)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">
                          {question.question}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Ready to start?</span>
              </div>
              <Button onClick={onStart} size="lg" className="gap-2">
                Start Interview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: You can refer back to these questions during the interview, but try to answer naturally without reading them word-for-word.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
