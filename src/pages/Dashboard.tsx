import { useState, useEffect } from "react";
import { FileText, Target, Calendar, Code2, Trophy, Clock, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/client";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, education, projects, skills, certifications, isLoading: profileLoading } = useStudentProfile();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    resumeCompletion: 0,
    atsScore: 0,
    attendance: {
      overall: 0,
      subjects: [] as Array<{ name: string; percentage: number; status: string }>
    },
    codingStats: {
      totalSolved: 0,
      easyCount: 0,
      mediumCount: 0,
      hardCount: 0,
      weeklyStreak: 0
    },
    upcomingTests: [] as Array<{ id: number; title: string; date: string; type: string }>,
    recentJobs: [] as Array<{ id: number; company: string; role: string; ctc: string; status: string; deadline: string }>,
    nextPlacementDrive: null as { company: string; role: string; date: string; status: string } | null
  });

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const calculateResumeCompletion = () => {
    if (!profile) return 0;
    
    let completed = 0;
    let total = 4; // Personal info, Education, Projects, Skills
    
    // Personal info (name, email, phone)
    if (profile.full_name && profile.email) completed++;
    
    // Education
    if (education && education.length > 0) completed++;
    
    // Projects
    if (projects && projects.length > 0) completed++;
    
    // Skills
    if (skills && skills.length > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate resume completion
      const resumeCompletion = calculateResumeCompletion();
      
      // Fetch attendance analytics
      let attendanceData = { overall: 0, subjects: [] };
      try {
        const attendanceAnalytics = await apiClient.getAttendanceAnalytics();
        if (attendanceAnalytics && attendanceAnalytics.summary) {
          attendanceData = {
            overall: attendanceAnalytics.summary.attendance_percentage || 0,
            subjects: Object.entries(attendanceAnalytics.by_subject || {}).map(([name, data]: [string, any]) => ({
              name,
              percentage: data.present && data.total ? Math.round((data.present / data.total) * 100) : 0,
              status: data.present && data.total && (data.present / data.total) >= 0.75 ? 'good' : 'warning'
            }))
          };
        }
      } catch (err) {
        console.warn("Could not fetch attendance analytics:", err);
      }
      
      // Fetch coding problems (for stats)
      let codingStats = { totalSolved: 0, easyCount: 0, mediumCount: 0, hardCount: 0, weeklyStreak: 0 };
      try {
        const problems = await apiClient.listCodingProblems({ is_active: true });
        // For now, we don't track solved problems, so show total available
        codingStats = {
          totalSolved: problems?.length || 0,
          easyCount: problems?.filter((p: any) => p.difficulty === "Easy").length || 0,
          mediumCount: problems?.filter((p: any) => p.difficulty === "Medium").length || 0,
          hardCount: problems?.filter((p: any) => p.difficulty === "Hard").length || 0,
          weeklyStreak: 0 // Would need to track this separately
        };
      } catch (err) {
        console.warn("Could not fetch coding problems:", err);
      }
      
      // Fetch upcoming quizzes/tests
      let upcomingTests: Array<{ id: number; title: string; date: string; type: string }> = [];
      try {
        const quizzes = await apiClient.listQuizzes({ is_active: true });
        const now = new Date();
        upcomingTests = (quizzes || [])
          .filter((q: any) => {
            if (!q.start_time) return false;
            const startTime = new Date(q.start_time);
            return startTime > now;
          })
          .slice(0, 3)
          .map((q: any) => ({
            id: q.id,
            title: q.title,
            date: q.start_time,
            type: "College"
          }));
      } catch (err) {
        console.warn("Could not fetch quizzes:", err);
      }
      
      // Fetch recent jobs
      let recentJobs: Array<{ id: number; company: string; role: string; ctc: string; status: string; deadline: string }> = [];
      let nextPlacementDrive: { company: string; role: string; date: string; status: string } | null = null;
      try {
        const jobs = await apiClient.listJobs({ is_active: true, limit: 5 });
        recentJobs = (jobs || []).slice(0, 3).map((job: any) => ({
          id: job.id,
          company: job.company,
          role: job.role,
          ctc: job.ctc || "Not specified",
          status: "Not Applied", // Would need to check applications
          deadline: job.deadline
        }));
        
        // Find next placement drive (job with closest deadline)
        if (jobs && jobs.length > 0) {
          const sortedJobs = [...jobs].sort((a: any, b: any) => 
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          );
          const nextJob = sortedJobs[0];
          if (nextJob) {
            nextPlacementDrive = {
              company: nextJob.company,
              role: nextJob.role,
              date: nextJob.deadline,
              status: "Registered"
            };
          }
        }
      } catch (err) {
        console.warn("Could not fetch jobs:", err);
      }
      
      // ATS Score - would need to calculate from resume or fetch from API
      const atsScore = 0; // Placeholder - would need ATS scoring API
      
      setDashboardData({
        resumeCompletion,
        atsScore,
        attendance: attendanceData,
        codingStats,
        upcomingTests,
        recentJobs,
        nextPlacementDrive
      });
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load some dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const { resumeCompletion, atsScore, nextPlacementDrive, attendance, codingStats, upcomingTests, recentJobs } = dashboardData;

  if (loading || profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your overview</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Resume Completion"
          value={`${resumeCompletion}%`}
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
          subtitle="Keep building!"
        />
        <StatCard
          title="ATS Score"
          value={atsScore}
          icon={Target}
          trend={{ value: 5, isPositive: true }}
          subtitle="Above average"
        />
        <StatCard
          title="Attendance"
          value={`${attendance.overall}%`}
          icon={Calendar}
          subtitle="Overall this semester"
        />
        <StatCard
          title="Problems Solved"
          value={codingStats.totalSolved}
          icon={Code2}
          trend={{ value: 8, isPositive: true }}
          subtitle={`${codingStats.weeklyStreak} day streak!`}
        />
      </div>

      {/* Next Placement Drive */}
      {nextPlacementDrive && (
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Next Placement Drive</CardTitle>
                <CardDescription>Upcoming opportunity</CardDescription>
              </div>
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-foreground">{nextPlacementDrive.company}</h3>
                  <p className="text-muted-foreground">{nextPlacementDrive.role}</p>
                </div>
                <Badge className="bg-success text-success-foreground">{nextPlacementDrive.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{new Date(nextPlacementDrive.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <Button className="w-full bg-gradient-primary" onClick={() => navigate('/jobs')}>View Details</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Overview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Attendance by Subject</CardTitle>
            <CardDescription>Current semester overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendance.subjects.length > 0 ? (
              attendance.subjects.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{subject.name}</span>
                    <span className={`font-semibold ${
                      subject.status === 'good' ? 'text-success' : 'text-warning'
                    }`}>
                      {subject.percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={subject.percentage} 
                    className={subject.status === 'good' ? '[&>div]:bg-success' : '[&>div]:bg-warning'}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance data available</p>
            )}
          </CardContent>
        </Card>

        {/* Coding Stats */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Coding Practice</CardTitle>
            <CardDescription>Your progress this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-success">{codingStats.easyCount}</p>
                  <p className="text-sm text-muted-foreground">Easy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{codingStats.mediumCount}</p>
                  <p className="text-sm text-muted-foreground">Medium</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{codingStats.hardCount}</p>
                  <p className="text-sm text-muted-foreground">Hard</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Weekly Streak</span>
                  <Badge variant="outline" className="bg-gradient-secondary text-white">
                    🔥 {codingStats.weeklyStreak} days
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate('/coding')}>Practice Now</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Tests */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upcoming Tests</CardTitle>
            <CardDescription>Don't miss these assessments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTests.length > 0 ? (
              upcomingTests.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium text-foreground">{test.title}</p>
                    <p className="text-sm text-muted-foreground">{new Date(test.date).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={test.type === 'College' ? 'default' : 'secondary'}>
                    {test.type}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming tests</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Job Postings</CardTitle>
            <CardDescription>Latest opportunities for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-start justify-between p-3 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => navigate('/jobs')}>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{job.company}</p>
                    <p className="text-sm text-muted-foreground">{job.role}</p>
                    <p className="text-sm font-semibold text-primary">{job.ctc}</p>
                  </div>
                  <Badge variant={job.status === 'Applied' ? 'default' : 'outline'}>
                    {job.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent jobs</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
