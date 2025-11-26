import { useState, useEffect } from "react";
import { ClipboardCheck, Clock, Calendar, Award, BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { QuizFilters } from "@/components/filters/QuizFilters";

interface Test {
  id: number;
  title: string;
  subject?: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  start_time?: string;
  end_time?: string;
  expiry_date?: string;
  is_active: boolean;
  status?: "Upcoming" | "Ongoing" | "Completed";
  score?: number;
  type?: string;
}

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const [activeTab, setActiveTab] = useState<"college" | "svnapro">("college");
  const [collegeTests, setCollegeTests] = useState<Test[]>([]);
  const [svnaproTests, setSvnaproTests] = useState<Test[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [minMarks, setMinMarks] = useState("");
  const [maxDuration, setMaxDuration] = useState("");

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      // Fetch college quizzes
      const collegeQuizzes = await apiClient.listQuizzes({ is_active: true, scope_type: 'college' });
      
      // Fetch SvnaPro quizzes
      const svnaproQuizzes = await apiClient.listQuizzes({ is_active: true, scope_type: 'svnapro' });
      
      // Transform quizzes to tests format
      const now = new Date();
      const transformQuiz = (quiz: any, type: string) => {
        let status: "Upcoming" | "Ongoing" | "Completed" = "Upcoming";
        if (quiz.start_time && quiz.end_time) {
          const startTime = new Date(quiz.start_time);
          const endTime = new Date(quiz.end_time);
          if (now < startTime) {
            status = "Upcoming";
          } else if (now >= startTime && now <= endTime) {
            status = "Ongoing";
          } else {
            status = "Completed";
          }
        }
        
        return {
          id: quiz.id,
          title: quiz.title,
          subject: quiz.subject,
          description: quiz.description,
          duration_minutes: quiz.duration_minutes || 30,
          total_marks: quiz.total_marks || 100,
          start_time: quiz.start_time,
          end_time: quiz.end_time,
          expiry_date: quiz.expiry_date,
          is_active: quiz.is_active,
          status,
          type
        };
      };
      
      const college = (collegeQuizzes || []).map((q: any) => transformQuiz(q, "College"));
      const svnapro = (svnaproQuizzes || []).map((q: any) => transformQuiz(q, "SvnaPro"));
      
      setCollegeTests(college);
      setSvnaproTests(svnapro);
      setTests([...college, ...svnapro]);
    } catch (error: any) {
      console.error("Error fetching tests:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Upcoming": return "bg-warning text-warning-foreground";
      case "Ongoing": return "bg-primary text-primary-foreground";
      case "Completed": return "bg-success text-success-foreground";
      default: return "bg-muted";
    }
  };

  const handleStartTest = (testId: number) => {
    toast({
      title: "Test Started",
      description: "Redirecting to test interface...",
    });
    // TODO: Navigate to test taking interface
  };

  const getFilteredTests = (tests: Test[]) => {
    return tests.filter(test => {
      const matchesSearch = !searchQuery ||
        test.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSubject = !subject ||
        (test.subject && test.subject.toLowerCase().includes(subject.toLowerCase()));
      
      const matchesMinMarks = !minMarks ||
        (test.total_marks >= parseInt(minMarks));
      
      const matchesMaxDuration = !maxDuration ||
        (test.duration_minutes <= parseInt(maxDuration));
      
      return matchesSearch && matchesSubject && matchesMinMarks && matchesMaxDuration;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSubject("");
    setMinMarks("");
    setMaxDuration("");
  };

  const renderTestCard = (test: Test) => (
    <Card 
      key={test.id} 
      className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
      onClick={() => setSelectedTest(test)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{test.title}</CardTitle>
            <CardDescription>{test.subject}</CardDescription>
          </div>
          <Badge className={getStatusColor(test.status)}>
            {test.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {test.start_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(test.start_time).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {test.duration_minutes} minutes
            {test.start_time && test.end_time && (
              <span className="ml-2">
                ({new Date(test.start_time).toLocaleTimeString()} - {new Date(test.end_time).toLocaleTimeString()})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="h-4 w-4" />
            Total Marks: {test.total_marks}
          </div>
        </div>

        {test.status === "Completed" && test.score && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Score</span>
              <span className="text-2xl font-bold text-primary">
                {test.score}/{test.total_marks}
              </span>
            </div>
          </div>
        )}

        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            if (test.status === "Upcoming") {
              toast({
                title: "Not Yet Available",
                description: "Test will be available at the scheduled time.",
                variant: "destructive"
              });
            } else if (test.status === "Ongoing") {
              handleStartTest(test.id);
            }
          }}
          variant={test.status === "Completed" ? "outline" : "default"}
          disabled={test.status === "Upcoming"}
        >
          {test.status === "Completed" ? "View Results" : test.status === "Ongoing" ? "Start Test" : "Scheduled"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tests</h1>
        <p className="text-muted-foreground mt-1">View and attempt college and placement tests</p>
      </div>

      {/* Filters */}
      <QuizFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        subject={subject}
        onSubjectChange={setSubject}
        minMarks={minMarks}
        onMinMarksChange={setMinMarks}
        maxDuration={maxDuration}
        onMaxDurationChange={setMaxDuration}
        onClearFilters={clearFilters}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "college" | "svnapro")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="college" className="gap-2">
            <BookOpen className="h-4 w-4" />
            College
          </TabsTrigger>
          <TabsTrigger value="svnapro" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            SvnaPro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="college" className="space-y-4">
          {loading ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tests...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredTests(collegeTests).map(renderTestCard)}
              </div>
              {getFilteredTests(collegeTests).length === 0 && collegeTests.length > 0 && (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tests match your filters</p>
                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
              {collegeTests.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No college tests available</p>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </TabsContent>

        <TabsContent value="svnapro" className="space-y-4">
          {loading ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tests...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredTests(svnaproTests).map(renderTestCard)}
              </div>
              {getFilteredTests(svnaproTests).length === 0 && svnaproTests.length > 0 && (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tests match your filters</p>
                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
              {svnaproTests.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No SvnaPro tests available</p>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Detail Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">{selectedTest?.title}</DialogTitle>
                <DialogDescription className="text-lg mt-1">{selectedTest?.subject}</DialogDescription>
              </div>
              <Badge className={getStatusColor(selectedTest?.status || "")}>
                {selectedTest?.status}
              </Badge>
            </div>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {selectedTest.start_time && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(selectedTest.start_time).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedTest.duration_minutes} minutes</p>
                </div>
                {selectedTest.start_time && selectedTest.end_time && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {new Date(selectedTest.start_time).toLocaleTimeString()} - {new Date(selectedTest.end_time).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Marks</p>
                  <p className="font-medium">{selectedTest.total_marks}</p>
                </div>
              </div>

              {selectedTest.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedTest.description}</p>
                </div>
              )}

              {selectedTest.status === "Completed" && selectedTest.score && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-3xl font-bold text-primary mt-1">
                          {selectedTest.score}/{selectedTest.total_marks}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Percentage</p>
                        <p className="text-3xl font-bold text-success mt-1">
                          {Math.round((selectedTest.score / selectedTest.total_marks) * 100)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => {
                  if (selectedTest.status === "Ongoing") {
                    handleStartTest(selectedTest.id);
                  }
                }}
                disabled={selectedTest.status === "Upcoming"}
                variant={selectedTest.status === "Completed" ? "outline" : "default"}
              >
                {selectedTest.status === "Completed" ? "View Detailed Results" : 
                 selectedTest.status === "Ongoing" ? "Start Test Now" : "Test Not Yet Available"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
