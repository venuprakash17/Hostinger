/**
 * Setup Screen for Mock Interview
 * User provides job details and resume
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resumeStorage } from '@/lib/resumeStorage';

interface SetupScreenProps {
  onComplete: (data: {
    jobRole: string;
    companyName: string;
    jobDescription: string;
    experienceLevel: string;
    resumeData: any;
  }) => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [jobRole, setJobRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStart = async () => {
    if (!jobRole.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the job role you are applying for.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Load resume data from localStorage if available
      let resumeData = null;
      try {
        const profile = resumeStorage.load('profile_saved');
        const projects = resumeStorage.load('projects_saved') || [];
        const education = resumeStorage.load('education_saved') || [];
        const skills = resumeStorage.load('skills_saved') || {};
        const certifications = resumeStorage.load('certifications_saved') || [];
        
        resumeData = {
          profile,
          projects,
          education,
          skills,
          certifications,
          target_role: jobRole,
          experience_level: experienceLevel,
        };
      } catch (error) {
        console.warn('Could not load resume data:', error);
      }

      // Call backend to start interview and get first question
      // Helper function to get API base URL (already includes /api/v1)
      const getAPIBase = () => {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
          return 'http://localhost:8000/api/v1';
        }
        return envUrl || 'http://localhost:8000/api/v1';
      };
      
      const API_BASE = getAPIBase();
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE}/mock-interview-ai/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_role: jobRole,
          company_name: companyName || undefined,
          job_description: jobDescription || undefined,
          experience_level: experienceLevel,
          resume_data: resumeData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start interview');
      }

      const firstQuestion = await response.json();
      
      onComplete({
        jobRole,
        companyName,
        jobDescription,
        experienceLevel,
        resumeData: { ...resumeData, firstQuestion },
      });
      
      toast({
        title: 'Interview Started!',
        description: 'Get ready for your first question.',
      });
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to start interview. Please try again.';
      
      // Provide helpful message if Ollama is not available
      if (errorMessage.includes('Ollama') || errorMessage.includes('503')) {
        errorMessage = 'Ollama AI service is not running. Please install and start Ollama:\n\n1. Install: Visit https://ollama.ai\n2. Start: Run "ollama serve" in terminal\n3. Pull model: Run "ollama pull llama3.2:3b"\n\nThen refresh and try again.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000, // Show longer for setup instructions
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Interview Setup
        </CardTitle>
        <CardDescription>
          Provide details about the job you're applying for. Our AI will tailor questions accordingly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your resume data will be automatically loaded if you've created one. You can still proceed without it.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="jobRole">Job Role *</Label>
            <Input
              id="jobRole"
              placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="e.g., Google, Microsoft, Amazon"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresher">Fresher (0-1 years)</SelectItem>
                <SelectItem value="1-2 years">1-2 years</SelectItem>
                <SelectItem value="3-5 years">3-5 years</SelectItem>
                <SelectItem value="5+ years">5+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="jobDescription">Job Description (Optional)</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the job description here for more targeted questions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="mt-1 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Providing a job description helps our AI ask more relevant questions.
            </p>
          </div>
        </div>

        <Button
          onClick={handleStart}
          disabled={isLoading || !jobRole.trim()}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Interview...
            </>
          ) : (
            <>
              Start Mock Interview
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          💡 Tip: Make sure your microphone is enabled. You'll answer questions using voice!
        </p>
      </CardContent>
    </Card>
  );
}


