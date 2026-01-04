import { useState, lazy, Suspense } from "react";
import { FileText, Rocket, Mail, BarChart, Loader2, AlertCircle, Sparkles, Zap, Award, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-8">
      {/* Hero Section - Stunning & Modern */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                    Resume Builder
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Powered
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Award className="h-3 w-3 mr-1" />
                      ATS-Optimized
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Zap className="h-3 w-3 mr-1" />
                      Instant Preview
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
                Create, optimize, and download professional resumes that pass ATS systems and impress recruiters. 
                Powered by AI to help you land your dream job.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">5+</div>
                  <div className="text-sm text-white/80">Templates</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-white/80">ATS Safe</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">AI</div>
                  <div className="text-sm text-white/80">Optimized</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl font-bold">PDF</div>
                  <div className="text-sm text-white/80">Download</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 gap-2 h-auto p-1.5 bg-muted/50 rounded-xl">
          <TabsTrigger 
            value="build" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 py-3"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 data-[state=active]:bg-primary/20 transition-colors">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-sm">Build</div>
              <div className="text-xs text-muted-foreground">Create Resume</div>
            </div>
            <span className="sm:hidden font-medium">Build</span>
          </TabsTrigger>
          <TabsTrigger 
            value="guide" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 py-3"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 data-[state=active]:bg-primary/20 transition-colors">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-sm">Job Guide</div>
              <div className="text-xs text-muted-foreground">Application Help</div>
            </div>
            <span className="sm:hidden font-medium">Guide</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cover" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 py-3"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 data-[state=active]:bg-primary/20 transition-colors">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-sm">Cover Letter</div>
              <div className="text-xs text-muted-foreground">Write Letter</div>
            </div>
            <span className="sm:hidden font-medium">Cover</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200 py-3"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 data-[state=active]:bg-primary/20 transition-colors">
              <BarChart className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-sm">Analytics</div>
              <div className="text-xs text-muted-foreground">Track Progress</div>
            </div>
            <span className="sm:hidden font-medium">Stats</span>
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
