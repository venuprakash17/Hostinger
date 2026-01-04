/**
 * Interview Welcome Screen
 * Professional opening message before starting interview
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Clock, CheckCircle2, Info } from 'lucide-react';
import { InterviewerAvatar } from './InterviewerAvatar';

interface InterviewWelcomeProps {
  companyName: string;
  jobRole: string;
  experienceLevel: string;
  interviewRound: string;
  totalQuestions: number;
  onStart: () => void;
}

export function InterviewWelcome({
  companyName,
  jobRole,
  experienceLevel,
  interviewRound,
  totalQuestions,
  onStart,
}: InterviewWelcomeProps) {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <InterviewerAvatar isSpeaking={false} isListening={false} />
        </div>
        <CardTitle className="text-2xl">Welcome to Your Mock Interview</CardTitle>
        <p className="text-muted-foreground mt-2">
          Get ready for a realistic interview experience
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interview Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Company</p>
            <p className="font-semibold">{companyName || 'General'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-semibold">{jobRole}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Experience Level</p>
            <p className="font-semibold">{experienceLevel}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interview Round</p>
            <p className="font-semibold capitalize">{interviewRound}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Questions</p>
            <p className="font-semibold">{totalQuestions}</p>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Interview Guidelines:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Each question will be spoken by the AI interviewer</li>
              <li>You'll answer using your microphone</li>
              <li>Take your time - there's no rush</li>
              <li>Be honest and authentic in your responses</li>
              <li>You'll receive feedback after each answer</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Tips */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Ensure your microphone is working</p>
              <p className="text-sm text-muted-foreground">
                Click the mic button when ready to answer
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Speak clearly and confidently</p>
              <p className="text-sm text-muted-foreground">
                Your answers will be transcribed in real-time
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Review your transcript before submitting</p>
              <p className="text-sm text-muted-foreground">
                Make sure your answer is complete and accurate
              </p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStart}
          size="lg"
          className="w-full"
        >
          <Mic className="mr-2 h-5 w-5" />
          Preview Questions
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          💡 This is a practice interview. Relax and do your best!
        </p>
      </CardContent>
    </Card>
  );
}

