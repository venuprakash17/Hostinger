import { useState, useEffect } from "react";
import { RefreshCw, Download, Search, Loader2, Briefcase, ExternalLink, Plus, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUpload } from "@/components/ui/file-upload";

interface AggregatedJob {
  id: number;
  source: 'linkedin' | 'indeed' | 'naukri' | 'glassdoor' | 'monster' | 'other';
  title: string;
  company: string;
  role: string;
  description?: string;
  location?: string;
  ctc?: string;
  job_type?: string;
  source_url?: string;
  is_imported: boolean;
  posted_date?: string;
}

export default function JobAggregation() {
  const [jobs, setJobs] = useState<AggregatedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'linkedin' | 'indeed' | 'naukri'>('all');
  const { toast } = useToast();

  const [syncData, setSyncData] = useState({
    sources: ['linkedin', 'indeed'] as string[],
    keywords: ['software engineer', 'developer'],
    location: '',
    max_results: 50,
  });

  useEffect(() => {
    fetchJobs();
  }, [sourceFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (sourceFilter !== 'all') filters.source = sourceFilter;
      filters.is_imported = false; // Show only non-imported jobs
      const data = await apiClient.getAggregatedJobs(filters);
      setJobs(data || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await apiClient.syncJobsFromSources(syncData);
      
      toast({
        title: "Success",
        description: result.message || "Jobs synced successfully",
      });

      setOpen(false);
      fetchJobs();
    } catch (error: any) {
      console.error("Error syncing jobs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync jobs",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async (jobId: number) => {
    try {
      await apiClient.importAggregatedJob(jobId);
      toast({
        title: "Success",
        description: "Job imported successfully",
      });
      fetchJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import job",
        variant: "destructive",
      });
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'linkedin': return 'bg-blue-500 text-white';
      case 'indeed': return 'bg-purple-500 text-white';
      case 'naukri': return 'bg-green-500 text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Aggregation</h1>
          <p className="text-muted-foreground mt-1">Sync and manage jobs from external sources</p>
        </div>
        <div className="flex gap-2">
          <FileUpload
            endpoint="/job-aggregation/bulk-upload"
            accept=".xlsx,.xls,.csv"
            label="Upload Jobs"
            description="Upload jobs from Excel/CSV file"
            onSuccess={(result) => {
              toast({
                title: "Success",
                description: result.message || "Jobs uploaded successfully",
              });
              fetchJobs();
            }}
            onError={(error) => {
              toast({
                title: "Upload Error",
                description: error.message || "Failed to upload jobs",
                variant: "destructive",
              });
            }}
          />
          <Button variant="outline" onClick={() => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://72.60.101.14:8000/api/v1';
            window.open(`${apiBaseUrl}/job-aggregation/template`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Jobs
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sync Jobs from External Sources</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sources</Label>
                <div className="flex gap-2 mt-2">
                  {['linkedin', 'indeed', 'naukri'].map((source) => (
                    <Button
                      key={source}
                      variant={syncData.sources.includes(source) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (syncData.sources.includes(source)) {
                          setSyncData({
                            ...syncData,
                            sources: syncData.sources.filter(s => s !== source),
                          });
                        } else {
                          setSyncData({
                            ...syncData,
                            sources: [...syncData.sources, source],
                          });
                        }
                      }}
                    >
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Keywords (comma-separated)</Label>
                <Input
                  value={syncData.keywords.join(', ')}
                  onChange={(e) => setSyncData({
                    ...syncData,
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k),
                  })}
                  placeholder="software engineer, developer, data scientist"
                />
              </div>

              <div>
                <Label>Location (Optional)</Label>
                <Input
                  value={syncData.location}
                  onChange={(e) => setSyncData({ ...syncData, location: e.target.value })}
                  placeholder="e.g., Hyderabad, Remote"
                />
              </div>

              <div>
                <Label>Max Results</Label>
                <Input
                  type="number"
                  value={syncData.max_results}
                  onChange={(e) => setSyncData({ ...syncData, max_results: parseInt(e.target.value) || 50 })}
                  min={1}
                  max={200}
                />
              </div>

              <Button onClick={handleSync} className="w-full" disabled={syncing || syncData.sources.length === 0}>
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Jobs
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="indeed">Indeed</SelectItem>
            <SelectItem value="naukri">Naukri</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading jobs...</p>
          </CardContent>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sync jobs from external sources to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Aggregated Jobs ({filteredJobs.length})</CardTitle>
            <CardDescription>Jobs from external sources - click Import to add to main jobs list</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>CTC</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Badge className={getSourceColor(job.source)}>
                          {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.role}</p>
                        </div>
                      </TableCell>
                      <TableCell>{job.company}</TableCell>
                      <TableCell>{job.location || 'N/A'}</TableCell>
                      <TableCell>{job.ctc || 'N/A'}</TableCell>
                      <TableCell>
                        {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.source_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {!job.is_imported && (
                            <Button variant="default" size="sm" onClick={() => handleImport(job.id)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Import
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

