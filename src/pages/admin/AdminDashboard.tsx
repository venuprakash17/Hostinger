import { useState, useEffect } from "react";
import { Users, Building2, TrendingUp, Award, Briefcase, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { adminDashboardData } from "@/lib/mockData";
import { apiClient } from "@/integrations/api/client";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch jobs count
      const jobs = await apiClient.get<any[]>('/jobs?is_active=true');
      setStats({
        totalStudents: adminDashboardData.totalStudents, // TODO: Replace with API call
        totalFaculty: adminDashboardData.totalFaculty, // TODO: Replace with API call
        totalJobs: jobs?.length || 0,
        activeJobs: jobs?.filter((j: any) => j.is_active).length || 0,
        totalApplications: 0, // TODO: Calculate from applications
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use mock data on error
      setStats({
        totalStudents: adminDashboardData.totalStudents,
        totalFaculty: adminDashboardData.totalFaculty,
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">College-wide overview and management</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          subtitle="Registered students"
        />
        <StatCard
          title="Total Faculty"
          value={stats.totalFaculty}
          icon={Users}
          subtitle="Teaching staff"
        />
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          icon={Briefcase}
          subtitle={`${stats.totalJobs} total postings`}
        />
        <StatCard
          title="Placement Rate"
          value={`${adminDashboardData.placementRate}%`}
          icon={TrendingUp}
          subtitle="Overall success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate('/admin/jobs')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Manage Jobs</h3>
                <p className="text-sm text-muted-foreground">Create and manage job postings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate('/admin/users')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Manage Users</h3>
                <p className="text-sm text-muted-foreground">Add students and faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate('/admin/notifications')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <FileText className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Send announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Statistics */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Department Statistics</CardTitle>
            <CardDescription>Student count and placement rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={adminDashboardData.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="students" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="percentage" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Yearly Placement Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Placement Trend</CardTitle>
            <CardDescription>Year-over-year growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adminDashboardData.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="placed" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Recruiters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Top Recruiters</CardTitle>
          <CardDescription>Companies with most placements</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Students Placed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminDashboardData.topCompanies.map((company, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold">{company.company[0]}</span>
                      </div>
                      {company.company}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge>{company.students}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="text-sm text-primary hover:underline">View Details</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
