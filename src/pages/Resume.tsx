import { useState, lazy, Suspense } from "react";
import { FileText, Target, Briefcase, Mail, BarChart, Loader2, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy load tabs - only load when needed
const BuildTab = lazy(() => import("@/components/resume/BuildTab").then(module => ({ default: module.BuildTab })));
const ATSTab = lazy(() => import("@/components/resume/ATSTab").then(module => ({ default: module.ATSTab })));
const RoleBasedTab = lazy(() => import("@/components/resume/RoleBasedTab").then(module => ({ default: module.RoleBasedTab })));
const CoverLetterTab = lazy(() => import("@/components/resume/CoverLetterTab").then(module => ({ default: module.CoverLetterTab })));
const ResumeAnalytics = lazy(() => import("@/components/resume/ResumeAnalytics").then(module => ({ default: module.ResumeAnalytics })));
const MyCertificatesTab = lazy(() => import("@/components/resume/MyCertificatesTab").then(module => ({ default: module.MyCertificatesTab })));

const TabLoader = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

export default function Resume() {
  const [activeTab, setActiveTab] = useState("build");

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
          <TabsTrigger value="certificates" className="gap-1 sm:gap-2">
            <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">My Certificates</span>
          </TabsTrigger>
          <TabsTrigger value="ats" className="gap-1 sm:gap-2">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">ATS Score</span>
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
          <Suspense fallback={<TabLoader />}>
            <BuildTab />
          </Suspense>
        </TabsContent>

        {/* My Certificates */}
        <TabsContent value="certificates" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <MyCertificatesTab />
          </Suspense>
        </TabsContent>

        {/* ATS Score */}
        <TabsContent value="ats" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <ATSTab />
          </Suspense>
        </TabsContent>

        {/* Role-Based Resume */}
        <TabsContent value="role" className="space-y-4">
          <Suspense fallback={<TabLoader />}>
            <RoleBasedTab />
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
