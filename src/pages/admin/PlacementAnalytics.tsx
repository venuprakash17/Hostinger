import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, TrendingUp, Users, CheckCircle2, XCircle, 
  Download, Filter, Building2, Calendar, Award
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";

interface AnalyticsData {
  total_jobs: number;
  total_applications: number;
  selected_count: number;
  overall_selection_rate: number;
  jobs: Array<{
    job_id: number;
    company: string;
    role: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
    company_logo?: string | null;
  }>;
  round_wise_stats: Array<{
    job_id: number;
    job_title: string;
    round_id: number;
    round_name: string;
    round_order: number;
    total_students: number;
    qualified: number;
    rejected: number;
    absent: number;
    pending: number;
    pass_rate: number;
  }>;
  year_wise_stats: Array<{
    year: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
  }>;
  branch_wise_stats: Array<{
    branch: string;
    total_applications: number;
    selected: number;
    selection_rate: number;
  }>;
}

export default function PlacementAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedJob, selectedYear]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedJob !== "all") {
        filters.job_id = parseInt(selectedJob);
      }
      if (selectedYear !== "all") {
        filters.year = selectedYear;
      }
      const jobId = selectedJob !== "all" ? parseInt(selectedJob) : undefined;
      const data = await apiClient.getJobAnalytics(jobId, filters);
      setAnalytics(data);
    } catch (error: any) {
      toast.error("Failed to load analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Placement Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into placement performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {analytics.jobs.map((job) => (
                <SelectItem key={job.job_id} value={job.job_id.toString()}>
                  {job.company} - {job.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {analytics.year_wise_stats.map((stat) => (
                <SelectItem key={stat.year} value={stat.year}>
                  {stat.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_jobs}</div>
            <p className="text-xs text-muted-foreground">Active job postings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_applications}</div>
            <p className="text-xs text-muted-foreground">Student applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.selected_count}</div>
            <p className="text-xs text-muted-foreground">Final selections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overall_selection_rate}%</div>
            <p className="text-xs text-muted-foreground">Overall success rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rounds">Round Analysis</TabsTrigger>
          <TabsTrigger value="year">Year-wise</TabsTrigger>
          <TabsTrigger value="branch">Branch-wise</TabsTrigger>
          <TabsTrigger value="drilldown">Drill-Down</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Performance</CardTitle>
              <CardDescription>Selection rates by job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.jobs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="company" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_applications" fill="#8884d8" name="Applications" />
                    <Bar dataKey="selected" fill="#82ca9d" name="Selected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {analytics.jobs.map((job) => (
                  <div key={job.job_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {job.company_logo && (
                          <img src={job.company_logo} alt={job.company} className="h-10 w-10 object-contain" />
                        )}
                        <div>
                          <h3 className="font-semibold">{job.company}</h3>
                          <p className="text-sm text-muted-foreground">{job.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{job.selection_rate}%</div>
                        <p className="text-xs text-muted-foreground">Selection Rate</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Applications: {job.total_applications}</span>
                        <span>Selected: {job.selected}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${job.selection_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Round-wise Performance</CardTitle>
              <CardDescription>Pass/fail rates for each round</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.round_wise_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="round_name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="qualified" fill="#82ca9d" name="Qualified" />
                    <Bar dataKey="rejected" fill="#ff6b6b" name="Rejected" />
                    <Bar dataKey="absent" fill="#ffa500" name="Absent" />
                    <Bar dataKey="pending" fill="#8884d8" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {analytics.round_wise_stats.map((stat) => (
                  <div key={`${stat.job_id}-${stat.round_id}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{stat.round_name}</h3>
                        <p className="text-sm text-muted-foreground">{stat.job_title}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stat.pass_rate}%</div>
                        <p className="text-xs text-muted-foreground">Pass Rate</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="font-semibold">{stat.qualified}</div>
                        <div className="text-xs text-muted-foreground">Qualified</div>
                      </div>
                      <div>
                        <div className="font-semibold">{stat.rejected}</div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                      </div>
                      <div>
                        <div className="font-semibold">{stat.absent}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div>
                        <div className="font-semibold">{stat.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(stat.qualified / stat.total_students) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Year-wise Performance</CardTitle>
              <CardDescription>Selection rates by student year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.year_wise_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_applications" fill="#8884d8" name="Applications" />
                    <Bar dataKey="selected" fill="#82ca9d" name="Selected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {analytics.year_wise_stats.map((stat) => (
                  <div key={stat.year} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{stat.year} Year</h3>
                        <p className="text-sm text-muted-foreground">
                          {stat.total_applications} applications
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stat.selection_rate}%</div>
                        <p className="text-xs text-muted-foreground">Selection Rate</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Selected: {stat.selected}</span>
                        <span>Total: {stat.total_applications}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${stat.selection_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branch-wise Performance</CardTitle>
              <CardDescription>Selection rates by department/branch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.branch_wise_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="branch" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_applications" fill="#8884d8" name="Applications" />
                    <Bar dataKey="selected" fill="#82ca9d" name="Selected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {analytics.branch_wise_stats.map((stat) => (
                  <div key={stat.branch} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{stat.branch}</h3>
                        <p className="text-sm text-muted-foreground">
                          {stat.total_applications} applications
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stat.selection_rate}%</div>
                        <p className="text-xs text-muted-foreground">Selection Rate</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Selected: {stat.selected}</span>
                        <span>Total: {stat.total_applications}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${stat.selection_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drilldown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Drill-Down Analysis</CardTitle>
              <CardDescription>Deep dive into placement metrics and student performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Round Performance Comparison */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Round Performance Comparison</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.round_wise_stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="round_name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pass_rate" fill="#8884d8" name="Pass Rate %" />
                        <Bar dataKey="qualified" fill="#82ca9d" name="Qualified" />
                        <Bar dataKey="rejected" fill="#ff6b6b" name="Rejected" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Year vs Branch Performance */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Year vs Branch Performance Matrix</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.year_wise_stats}
                            dataKey="total_applications"
                            nameKey="year"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {analytics.year_wise_stats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.branch_wise_stats}
                            dataKey="total_applications"
                            nameKey="branch"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {analytics.branch_wise_stats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Selection Rate Trends */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Selection Rate Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.jobs}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="company" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="selection_rate" stroke="#8884d8" name="Selection Rate %" strokeWidth={2} />
                        <Line type="monotone" dataKey="total_applications" stroke="#82ca9d" name="Applications" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary Statistics Table */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Summary Statistics</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Metric</th>
                          <th className="p-3 text-right">Value</th>
                          <th className="p-3 text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-3">Total Jobs</td>
                          <td className="p-3 text-right font-semibold">{analytics.total_jobs}</td>
                          <td className="p-3 text-right">-</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Total Applications</td>
                          <td className="p-3 text-right font-semibold">{analytics.total_applications}</td>
                          <td className="p-3 text-right">100%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Selected</td>
                          <td className="p-3 text-right font-semibold text-green-600">{analytics.selected_count}</td>
                          <td className="p-3 text-right text-green-600">{analytics.overall_selection_rate}%</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Not Selected</td>
                          <td className="p-3 text-right font-semibold text-red-600">{analytics.total_applications - analytics.selected_count}</td>
                          <td className="p-3 text-right text-red-600">{100 - analytics.overall_selection_rate}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
