import { useState, lazy, Suspense } from "react";
import { FileText, Rocket, Mail, BarChart, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkOpenAIConfig } from "@/lib/resumeitnow/utils/envCheck";

// Lazy load tabs - only load when needed
const BuildTab = lazy(() => import("@/components/resume/BuildTab").then(module => ({ default: module.BuildTab })));
const JobApplicationGuide = lazy(() => import("@/components/resume/JobApplicationGuide").then(module => ({ default: module.JobApplicationGuide })));
const CoverLetterTab = lazy(() => import("@/components/resume/CoverLetterTab").then(module => ({ default: module.CoverLetterTab })));
const ResumeAnalytics = lazy(() => import("@/components/resume/ResumeAnalytics").then(module => ({ default: module.ResumeAnalytics })));

const TabLoader = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

export default function Resume() {
  const [activeTab, setActiveTab] = useState("build");
  const configCheck = checkOpenAIConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resume Builder</h1>
        <p className="text-muted-foreground mt-1">Create, optimize, and manage your professional resume</p>
      </div>

      {/* Configuration Warning Banner */}
      {!configCheck.configured && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Configuration Required</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            {configCheck.message}
            <br />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100 mt-1 inline-block"
            >
              Get your OpenAI API key here →
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger value="build" className="gap-1 sm:gap-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Build</span>
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1 sm:gap-2">
            <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Job Guide</span>
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
          <Suspense fallback={<TabLoader />}>
            <BuildTab />
          </Suspense>
        </TabsContent>

        {/* Job Application Guide & Mentor */}
        <TabsContent value="guide" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <JobApplicationGuide />
          </Suspense>
        </TabsContent>

        {/* Cover Letter */}
        <TabsContent value="cover" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <CoverLetterTab />
          </Suspense>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <ResumeAnalytics />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
