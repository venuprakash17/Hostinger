import { useState } from "react";
import { FileText, Target, Sparkles, Briefcase, Mail, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { resumeAnalytics } from "@/lib/mockData";
import { toast } from "sonner";
import { BuildTab } from "@/components/resume/BuildTab";
import { ATSTab } from "@/components/resume/ATSTab";

export default function Resume() {
  const [activeTab, setActiveTab] = useState("build");

  const handleGenerate = (type: string) => {
    toast.success(`${type} generation started!`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resume Builder</h1>
        <p className="text-muted-foreground mt-1">Create, optimize, and manage your professional resume</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
          <TabsTrigger value="build" className="gap-1 sm:gap-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Build</span>
          </TabsTrigger>
          <TabsTrigger value="ats" className="gap-1 sm:gap-2">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">ATS Score</span>
          </TabsTrigger>
          <TabsTrigger value="enhance" className="gap-1 sm:gap-2">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">AI Enhance</span>
          </TabsTrigger>
          <TabsTrigger value="role" className="gap-1 sm:gap-2">
            <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Role-Based</span>
          </TabsTrigger>
          <TabsTrigger value="cover" className="gap-1 sm:gap-2">
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Cover Letter</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 sm:gap-2">
            <BarChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Build from Profile */}
        <TabsContent value="build" className="space-y-4">
          <BuildTab />
        </TabsContent>

        {/* ATS Score */}
        <TabsContent value="ats" className="space-y-4">
          <ATSTab />
        </TabsContent>

        {/* AI Enhance */}
        <TabsContent value="enhance" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                AI-Powered Resume Enhancement
              </CardTitle>
              <CardDescription>Let AI improve your resume content and formatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-semibold text-foreground">AI Suggestions</h4>
                <ul className="space-y-2">
                  {resumeAnalytics.aiSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full bg-gradient-secondary" onClick={() => handleGenerate('AI Enhancement')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply AI Enhancements
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role-Based Resume */}
        <TabsContent value="role" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Generate Role-Specific Resume</CardTitle>
              <CardDescription>Tailor your resume for specific job roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Role</Label>
                <Input placeholder="e.g., Software Engineer, Data Scientist" />
              </div>
              <div className="space-y-2">
                <Label>Job Description (Optional)</Label>
                <Textarea 
                  placeholder="Paste the job description to optimize your resume..."
                  rows={6}
                />
              </div>
              <Button className="w-full bg-gradient-primary" onClick={() => handleGenerate('Role-specific Resume')}>
                Generate Tailored Resume
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cover Letter */}
        <TabsContent value="cover" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Generate Cover Letter</CardTitle>
              <CardDescription>Create a compelling cover letter for your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input placeholder="Google" />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input placeholder="Software Engineer" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Why are you interested?</Label>
                <Textarea 
                  placeholder="Explain your interest in this role and company..."
                  rows={4}
                />
              </div>
              <Button className="w-full bg-gradient-secondary" onClick={() => handleGenerate('Cover Letter')}>
                Generate Cover Letter
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Resume Performance</CardTitle>
                <CardDescription>Track your resume's effectiveness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profile Views</span>
                    <span className="font-semibold">127</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Resume Downloads</span>
                    <span className="font-semibold">43</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Applications Sent</span>
                    <span className="font-semibold">15</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Interview Calls</span>
                    <span className="font-semibold text-success">8</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your resume usage history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm">Resume updated - 2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">Applied to Google - 1 day ago</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-warning" />
                    <span className="text-sm">ATS score improved - 3 days ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
