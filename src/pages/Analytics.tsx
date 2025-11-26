import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Award, Code2, Calendar, FileText, Briefcase, Users, CheckCircle2, Clock, Target, BarChart3, Loader2, MessageSquare, Ticket } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalStudents: 0,
    codingSections: 0,
    mockInterviews: 0,
    weeklyMockTests: 0,
    projects: 0,
    studentsByDepartment: {} as Record<string, number>,
    studentsBySection: {} as Record<string, number>,
    studentsByYear: {} as Record<string, number>,
  });
  const [applications, setApplications] = useState<any[]>([]);
  const [codingProblems, setCodingProblems] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [apps, problems, interviewData, users] = await Promise.all([
        apiClient.getMyApplications().catch(() => []),
        apiClient.listCodingProblems({}).catch(() => []),
        apiClient.getMyInterviews({}).catch(() => []),
        apiClient.listUsers({ role: 'student' }).catch(() => []),
      ]);

      setApplications(apps || []);
      setCodingProblems(problems || []);
      setInterviews(interviewData || []);

      // Calculate stats
      const students = users || [];
      const studentsByDept: Record<string, number> = {};
      const studentsBySec: Record<string, number> = {};
      const studentsByYr: Record<string, number> = {};

      students.forEach((student: any) => {
        const profile = student.profile;
        if (profile?.department) {
          studentsByDept[profile.department] = (studentsByDept[profile.department] || 0) + 1;
        }
        if (profile?.section) {
          studentsBySec[profile.section] = (studentsBySec[profile.section] || 0) + 1;
        }
        if (profile?.present_year) {
          studentsByYr[profile.present_year] = (studentsByYr[profile.present_year] || 0) + 1;
        }
      });

      setStats({
        activeStudents: students.length, // Simplified - in production, track active sessions
        totalStudents: students.length,
        codingSections: problems.length,
        mockInterviews: interviewData.length,
        weeklyMockTests: 0, // Would need quiz data
        projects: 0, // Would need project data
        studentsByDepartment: studentsByDept,
        studentsBySection: studentsBySec,
        studentsByYear: studentsByYr,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const performanceData = [
    { category: "DSA", score: 85 },
    { category: "Web Dev", score: 72 },
    { category: "ML", score: 78 },
    { category: "Database", score: 88 },
    { category: "Networks", score: 70 },
  ];

  const codingTrend = [
    { month: "Jun", solved: 20 },
    { month: "Jul", solved: 32 },
    { month: "Aug", solved: 28 },
    { month: "Sep", solved: 35 },
    { month: "Oct", solved: 30 },
  ];

  const improvementIndex = [
    { subject: "Technical Skills", value: 85 },
    { subject: "Problem Solving", value: 78 },
    { subject: "Communication", value: 72 },
    { subject: "Resume Quality", value: 82 },
    { subject: "Coding Practice", value: 75 },
  ];

  // Prepare department segmentation data
  const departmentData = Object.entries(stats.studentsByDepartment).map(([dept, count]) => ({
    name: dept,
    value: count,
  }));

  // Prepare section segmentation data
  const sectionData = Object.entries(stats.studentsBySection).map(([section, count]) => ({
    name: section,
    value: count,
  }));

  // Prepare year segmentation data
  const yearData = Object.entries(stats.studentsByYear).map(([year, count]) => ({
    name: year,
    value: count,
  }));

  // Application analytics
  const applicationStats = {
    total: applications.length,
    shortlisted: applications.filter((a: any) => a.status === 'Shortlisted').length,
    offered: applications.filter((a: any) => a.status === 'Selected' || a.status === 'Offer').length,
    inProgress: applications.filter((a: any) => a.status === 'Interview' || a.status === 'In Progress').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Offered": return "bg-success text-success-foreground";
      case "Shortlisted": return "bg-primary text-primary-foreground";
      case "In Progress": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time insights and performance tracking</p>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">{stats.activeStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <Code2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coding Problems</p>
                <p className="text-2xl font-bold">{stats.codingSections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <MessageSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mock Interviews</p>
                <p className="text-2xl font-bold">{stats.mockInterviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl font-bold">{applicationStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segmentation Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        {departmentData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Students by Department</CardTitle>
              <CardDescription>Department-wise distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {sectionData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Students by Section</CardTitle>
              <CardDescription>Section-wise distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {yearData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Students by Year</CardTitle>
              <CardDescription>Year-wise distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Job Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-success/10">
                    <Code2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coding Problems</p>
                    <p className="text-2xl font-bold">{stats.codingSections}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <MessageSquare className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mock Interviews</p>
                    <p className="text-2xl font-bold">{stats.mockInterviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <BarChart3 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Applications</p>
                    <p className="text-2xl font-bold">{applicationStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="resume" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="coding">Coding</TabsTrigger>
              <TabsTrigger value="correlation">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Application Status</CardTitle>
                    <CardDescription>Your job application status distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Applied', value: applications.filter((a: any) => a.status === 'Applied').length },
                            { name: 'Shortlisted', value: applicationStats.shortlisted },
                            { name: 'Interview', value: applicationStats.inProgress },
                            { name: 'Selected', value: applicationStats.offered },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2, 3].map((index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Coding Problems</CardTitle>
                    <CardDescription>Available coding problems by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[{ name: 'Total', value: stats.codingSections }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                    <CardDescription>Comparative analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Improvement Index</CardTitle>
                    <CardDescription>Multi-dimensional analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={improvementIndex}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="coding" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Coding Activity Trend</CardTitle>
                  <CardDescription>Problems solved per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={codingTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="solved" stroke="hsl(var(--warning))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlation" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                  <CardDescription>Key performance indicators and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Performance insights and correlations will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {/* Application Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applicationStats.total}</div>
                <p className="text-xs text-muted-foreground">Across all companies</p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applicationStats.shortlisted}</div>
                <p className="text-xs text-success">
                  {applicationStats.total > 0 ? Math.round((applicationStats.shortlisted / applicationStats.total) * 100) : 0}% conversion
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offers Received</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applicationStats.offered}</div>
                <p className="text-xs text-success">
                  {applicationStats.total > 0 ? Math.round((applicationStats.offered / applicationStats.total) * 100) : 0}% overall conversion
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{applicationStats.inProgress}</div>
                <p className="text-xs text-muted-foreground">Active applications</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Applications by Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Applied', value: applications.filter((a: any) => a.status === 'Applied').length },
                        { name: 'Shortlisted', value: applicationStats.shortlisted },
                        { name: 'Interview', value: applicationStats.inProgress },
                        { name: 'Selected', value: applicationStats.offered },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mock Interviews */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Mock Interviews</CardTitle>
                <CardDescription>Interview status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Scheduled', value: interviews.filter((i: any) => i.status === 'scheduled').length },
                    { name: 'Completed', value: interviews.filter((i: any) => i.status === 'completed').length },
                    { name: 'In Progress', value: interviews.filter((i: any) => i.status === 'in_progress').length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Applications Table */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Your latest job applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Current Round</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ATS Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No applications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      applications.slice(0, 10).map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.job?.company || 'N/A'}</TableCell>
                          <TableCell>{app.job?.role || 'N/A'}</TableCell>
                          <TableCell>{new Date(app.applied_at).toLocaleDateString()}</TableCell>
                          <TableCell>{app.current_round || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {app.ats_score ? (
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{app.ats_score}%</div>
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${app.ats_score}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
