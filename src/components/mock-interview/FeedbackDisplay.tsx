/**
 * Feedback Display Component
 * Shows analysis of user's answer
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Lightbulb, ArrowRight, TrendingUp } from 'lucide-react';

interface FeedbackDisplayProps {
  question: { question: string; questionType: string; questionNumber: number; totalQuestions: number };
  answer: string;
  analysis: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    missing_points: string[];
    improved_answer: string;
    communication_tips: string[];
  };
  questionNumber: number;
  totalQuestions: number;
  onContinue: () => void;
}

export function FeedbackDisplay({
  question,
  answer,
  analysis,
  questionNumber,
  totalQuestions,
  onContinue,
}: FeedbackDisplayProps) {
  const scorePercentage = (analysis.score / 5) * 100;
  const scoreColor = scorePercentage >= 80 ? 'text-green-600' : scorePercentage >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Answer Feedback</CardTitle>
            <Badge variant="secondary">
              Question {questionNumber} of {totalQuestions}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center space-y-2">
            <div className={`text-5xl font-bold ${scoreColor}`}>
              {analysis.score.toFixed(1)}/5.0
            </div>
            <Progress value={scorePercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">Overall Answer Quality</p>
          </div>

          {/* Question & Answer */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
              <p className="text-sm">{question.question}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
              <p className="text-sm">{answer}</p>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-800 dark:text-green-200 mb-2">Strengths:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                  {analysis.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Weaknesses */}
          {analysis.weaknesses && analysis.weaknesses.length > 0 && (
            <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-800 dark:text-red-200 mb-2">Areas for Improvement:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                  {analysis.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Points */}
          {analysis.missing_points && analysis.missing_points.length > 0 && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Points You Could Have Mentioned:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.missing_points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Improved Answer */}
          {analysis.improved_answer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Improved Answer Example
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed bg-muted p-4 rounded-lg">
                  {analysis.improved_answer}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Communication Tips */}
          {analysis.communication_tips && analysis.communication_tips.length > 0 && (
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Communication Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {analysis.communication_tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            className="w-full"
            size="lg"
          >
            {questionNumber < totalQuestions ? (
              <>
                Continue to Next Question
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                View Final Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


