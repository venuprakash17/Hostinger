import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { Code, FileQuestion, Briefcase, Calendar, Filter, X, Loader2 } from "lucide-react";
import { formatYear } from "@/utils/yearFormat";

interface TrainingSession {
  id: number;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  target_type: string;
  target_departments: string[] | null;
  target_years: string[] | null;
  target_sections: string[] | null;
  creator_name: string | null;
  creator_role: string | null;
  created_at: string;
}

export default function TrainingSessions() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTrainingSessions({ is_active: true });
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      toast.error(error.message || "Failed to load training sessions");
    } finally {
      setLoading(false);
    }
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "coding": return <Code className="h-5 w-5" />;
      case "quiz": return <FileQuestion className="h-5 w-5" />;
      case "mock_interview": return <Briefcase className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  const filteredSessions = sessions.filter(session => {
    // Filter by type
    if (filterType !== "all" && session.session_type !== filterType) {
      return false;
    }

    // Filter by creator (super admin)
    if (filterCreator === "super_admin" && session.creator_role !== "super_admin") {
      return false;
    }
    if (filterCreator === "other" && session.creator_role === "super_admin") {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!session.title.toLowerCase().includes(searchLower) &&
          !(session.description?.toLowerCase().includes(searchLower))) {
        return false;
      }
    }

    return true;
  });

  const uniqueTypes = Array.from(new Set(sessions.map(s => s.session_type)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Training Sessions</h1>
        <p className="text-muted-foreground mt-2">View and join placement training sessions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Creator</label>
              <Select value={filterCreator} onValueChange={setFilterCreator}>
                <SelectTrigger>
                  <SelectValue placeholder="All creators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="other">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterType("all");
                  setFilterCreator("all");
                  setSearchTerm("");
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No training sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className={session.creator_role === "super_admin" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSessionIcon(session.session_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{session.title}</CardTitle>
                        {session.creator_role === "super_admin" && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Super Admin
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {session.session_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        {session.start_time && (
                          <span className="text-muted-foreground">
                            Starts: {new Date(session.start_time).toLocaleString()}
                          </span>
                        )}
                        {session.end_time && (
                          <span className="text-muted-foreground">
                            Ends: {new Date(session.end_time).toLocaleString()}
                          </span>
                        )}
                        {session.creator_name && (
                          <span className="text-muted-foreground">
                            Created by: {session.creator_name}
                          </span>
                        )}
                      </div>
                      {/* Target info */}
                      {session.target_type !== "all" && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {session.target_departments && session.target_departments.length > 0 && (
                            <Badge variant="secondary">
                              Dept: {session.target_departments.join(", ")}
                            </Badge>
                          )}
                          {session.target_years && session.target_years.length > 0 && (
                            <Badge variant="secondary">
                              Year: {session.target_years.map(y => formatYear(y)).join(", ")}
                            </Badge>
                          )}
                          {session.target_sections && session.target_sections.length > 0 && (
                            <Badge variant="secondary">
                              Section: {session.target_sections.join(", ")}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button>Join Session</Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

