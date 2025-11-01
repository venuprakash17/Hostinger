import { useState } from "react";
import { FileText, Target, Briefcase, Mail, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildTab } from "@/components/resume/BuildTab";
import { ATSTab } from "@/components/resume/ATSTab";
import { RoleBasedTab } from "@/components/resume/RoleBasedTab";
import { CoverLetterTab } from "@/components/resume/CoverLetterTab";

export default function Resume() {
  const [activeTab, setActiveTab] = useState("build");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Resume Builder</h1>
        <p className="text-muted-foreground mt-1">Create, optimize, and manage your professional resume</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 gap-1">
          <TabsTrigger value="build" className="gap-1 sm:gap-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Build</span>
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
          <BuildTab />
        </TabsContent>

        {/* ATS Score */}
        <TabsContent value="ats" className="space-y-4">
          <ATSTab />
        </TabsContent>

        {/* Role-Based Resume */}
        <TabsContent value="role" className="space-y-4">
          <RoleBasedTab />
        </TabsContent>

        {/* Cover Letter */}
        <TabsContent value="cover" className="space-y-4">
          <CoverLetterTab />
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
