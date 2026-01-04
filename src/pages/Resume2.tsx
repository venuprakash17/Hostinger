/**
 * Resume 2 - ResumeItNow Style Resume Builder
 * Complete end-to-end resume building experience
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Resume2PersonalInfo } from '@/components/resume2/Resume2PersonalInfo';
import { Resume2Education } from '@/components/resume2/Resume2Education';
import { Resume2Experience } from '@/components/resume2/Resume2Experience';
import { Resume2Projects } from '@/components/resume2/Resume2Projects';
import { Resume2Skills } from '@/components/resume2/Resume2Skills';
import { Resume2Preview } from '@/components/resume2/Resume2Preview';
import { Resume2Templates } from '@/components/resume2/Resume2Templates';
import { generateATSSafePDF } from '@/lib/resumeitnow/services/pdfGeneratorService';
import { ResumeTemplate } from '@/lib/resumeitnow/types/templates';

export interface Resume2Data {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
    summary: string;
  };
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    field: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    gpa: string;
    description: string;
  }>;
  experience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url: string;
    startDate: string;
    endDate: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    url: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
  }>;
}

const initialResumeData: Resume2Data = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
    summary: '',
  },
  education: [],
  experience: [],
  projects: [],
  skills: {
    technical: [],
    soft: [],
    languages: [],
  },
  certifications: [],
  achievements: [],
};

export default function Resume2() {
  const { toast } = useToast();
  const [resumeData, setResumeData] = useState<Resume2Data>(initialResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>('fresher_classic');
  const [activeTab, setActiveTab] = useState('personal');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('resume2_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResumeData(parsed);
      } catch (error) {
        console.error('Error loading saved resume data:', error);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('resume2_data', JSON.stringify(resumeData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeData]);

  const updatePersonalInfo = (data: Partial<Resume2Data['personalInfo']>) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...data },
    }));
  };

  const updateEducation = (education: Resume2Data['education']) => {
    setResumeData(prev => ({ ...prev, education }));
  };

  const updateExperience = (experience: Resume2Data['experience']) => {
    setResumeData(prev => ({ ...prev, experience }));
  };

  const updateProjects = (projects: Resume2Data['projects']) => {
    setResumeData(prev => ({ ...prev, projects }));
  };

  const updateSkills = (skills: Resume2Data['skills']) => {
    setResumeData(prev => ({ ...prev, skills }));
  };

  const handleDownloadPDF = async () => {
    if (!resumeData.personalInfo.fullName) {
      toast({
        title: 'Incomplete Resume',
        description: 'Please fill in at least your name before downloading.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Convert Resume2Data to format expected by PDF generator
      const pdfData = {
        profile: {
          full_name: resumeData.personalInfo.fullName,
          email: resumeData.personalInfo.email,
          phone_number: resumeData.personalInfo.phone,
          address: resumeData.personalInfo.location,
          linkedin_profile: resumeData.personalInfo.linkedin,
          github_portfolio: resumeData.personalInfo.github,
          website: resumeData.personalInfo.website,
        },
        summary: resumeData.personalInfo.summary,
        education: resumeData.education.map(edu => ({
          degree: edu.degree,
          institution_name: edu.institution,
          field_of_study: edu.field,
          start_date: edu.startDate,
          end_date: edu.endDate,
          is_current: edu.isCurrent,
          cgpa_percentage: edu.gpa,
        })),
        work_experience: resumeData.experience.map(exp => ({
          job_title: exp.jobTitle,
          company: exp.company,
          location: exp.location,
          start_date: exp.startDate,
          end_date: exp.endDate,
          is_current: exp.isCurrent,
          description: exp.description,
        })),
        projects: resumeData.projects.map(proj => ({
          project_title: proj.name,
          description: proj.description,
          technologies_used: proj.technologies,
          url: proj.url,
          duration_start: proj.startDate,
          duration_end: proj.endDate,
        })),
        skills: resumeData.skills,
        certifications: resumeData.certifications.map(cert => ({
          name: cert.name,
          issuer: cert.issuer,
          date: cert.date,
          url: cert.url,
        })),
        achievements: resumeData.achievements.map(ach => ({
          title: ach.title,
          description: ach.description,
          date: ach.date,
        })),
      };

      const blob = await generateATSSafePDF(pdfData as any, selectedTemplate);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume_${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_${selectedTemplate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF Downloaded',
        description: 'Your resume has been downloaded successfully!',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Resume Builder 2.0
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a professional, ATS-friendly resume in minutes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('preview')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="gap-2"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Template Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Choose Template
          </CardTitle>
          <CardDescription>
            Select a professional template for your resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Resume2Templates
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <Resume2PersonalInfo
                data={resumeData.personalInfo}
                onUpdate={updatePersonalInfo}
              />
            </TabsContent>

            <TabsContent value="education" className="mt-6">
              <Resume2Education
                data={resumeData.education}
                onUpdate={updateEducation}
              />
            </TabsContent>

            <TabsContent value="experience" className="mt-6">
              <Resume2Experience
                data={resumeData.experience}
                onUpdate={updateExperience}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-6">
              <Resume2Projects
                data={resumeData.projects}
                onUpdate={updateProjects}
              />
            </TabsContent>

            <TabsContent value="skills" className="mt-6">
              <Resume2Skills
                data={resumeData.skills}
                onUpdate={updateSkills}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how your resume looks in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Resume2Preview
                data={resumeData}
                template={selectedTemplate}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

