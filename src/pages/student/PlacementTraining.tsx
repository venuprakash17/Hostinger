import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Code, FileQuestion, Briefcase, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlacementSession {
  id: string;
  title: string;
  description: string;
  session_type: string;
  start_time: string;
  end_time: string;
}

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
}

export default function PlacementTraining() {
  const [sessions, setSessions] = useState<PlacementSession[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sessionsRes, problemsRes] = await Promise.all([
      supabase
        .from("placement_sessions")
        .select("*")
        .eq("is_active", true)
        .order("start_time", { ascending: false }),
      supabase
        .from("coding_problems")
        .select("*")
        .eq("is_placement", true)
        .order("created_at", { ascending: false })
    ]);

    if (sessionsRes.error) {
      toast({ title: "Error", description: sessionsRes.error.message, variant: "destructive" });
    } else {
      setSessions(sessionsRes.data || []);
    }

    if (problemsRes.error) {
      toast({ title: "Error", description: problemsRes.error.message, variant: "destructive" });
    } else {
      setCodingProblems(problemsRes.data || []);
    }

    setLoading(false);
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "coding": return <Code className="h-5 w-5" />;
      case "quiz": return <FileQuestion className="h-5 w-5" />;
      case "mock_interview": return <Briefcase className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-500";
      case "Medium": return "text-yellow-500";
      case "Hard": return "text-red-500";
      default: return "";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Placement Training</h1>
        <p className="text-muted-foreground mt-2">Prepare for your dream job with specialized training sessions</p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="sessions">Training Sessions</TabsTrigger>
          <TabsTrigger value="coding">Coding Practice</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <div className="grid gap-4">
            {loading ? (
              <p>Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active placement sessions at the moment</p>
                </CardContent>
              </Card>
            ) : (
              sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSessionIcon(session.session_type)}
                        <div>
                          <CardTitle>{session.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>Type: {session.session_type.replace("_", " ")}</span>
                            {session.start_time && (
                              <span>Starts: {new Date(session.start_time).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button>Join Session</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="coding" className="mt-6">
          <div className="grid gap-4">
            {loading ? (
              <p>Loading coding problems...</p>
            ) : codingProblems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No placement coding problems available yet</p>
                </CardContent>
              </Card>
            ) : (
              codingProblems.map((problem) => (
                <Card key={problem.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{problem.title}</CardTitle>
                          <span className={`text-sm font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                            {problem.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {problem.description}
                        </p>
                      </div>
                      <Button onClick={() => navigate('/coding')}>
                        Solve Problem
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
