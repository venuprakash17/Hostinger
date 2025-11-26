import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Play, Clock, Zap, Eye, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { useCodingFilters } from "@/contexts/CodingFiltersContext";
import { Loader2 } from "lucide-react";

interface CodingProblem {
  id: number;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  difficulty: string;
  tags?: string[];
  time_limit?: number;
  memory_limit?: number;
  scope_type?: string;
  year?: number;
  allowed_languages?: string[];
  restricted_languages?: string[];
}

export default function CodingProblemsList() {
  const navigate = useNavigate();
  const filters = useCodingFilters();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewProblem, setPreviewProblem] = useState<CodingProblem | null>(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [filters.difficultyFilter, filters.yearFilter, filters.languageFilter, filters.tagsFilter, filters.scopeTypeFilter, filters.searchQuery]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const filterParams: any = { is_active: true };
      if (filters.difficultyFilter !== "all") filterParams.difficulty = filters.difficultyFilter;
      if (filters.yearFilter !== "all") filterParams.year = parseInt(filters.yearFilter);
      if (filters.languageFilter !== "all") filterParams.language = filters.languageFilter;
      if (filters.tagsFilter) filterParams.tags = filters.tagsFilter;
      if (filters.scopeTypeFilter !== "all") filterParams.scope_type = filters.scopeTypeFilter;
      if (filters.searchQuery) filterParams.search = filters.searchQuery;
      
      const data = await apiClient.listCodingProblems(filterParams);
      setProblems(data || []);
    } catch (error: any) {
      console.error("Error fetching coding problems:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load coding problems",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-muted";
    }
  };

  const handleCodeNow = (problemId: number) => {
    navigate(`/coding?problem=${problemId}`);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Browse Problems</h1>
        <p className="text-muted-foreground">Explore and practice coding problems</p>
      </div>

      {/* Problems Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No coding problems found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {problems.map((problem) => (
            <Card 
              key={problem.id} 
              className="hover:shadow-lg transition-all border-2 hover:border-primary/50 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="text-lg leading-tight flex-1">{problem.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewProblem(problem);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getDifficultyColor(problem.difficulty)} text-xs font-medium`} variant="outline">
                    {problem.difficulty}
                  </Badge>
                  {problem.scope_type === "svnapro" ? (
                    <Badge variant="default" className="text-xs bg-blue-600">
                      SvnaPro
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-green-600 text-green-600">
                      College
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                  {problem.description}
                </p>
                {problem.tags && problem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {problem.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {problem.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{problem.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {problem.time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {problem.time_limit}s
                      </span>
                    )}
                    {problem.memory_limit && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {problem.memory_limit}MB
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProblem(problem);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCodeNow(problem.id);
                      }}
                      className="gap-2"
                    >
                      <Code2 className="h-4 w-4" />
                      Code Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewProblem} onOpenChange={(open) => !open && setPreviewProblem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {previewProblem && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <DialogTitle className="text-2xl">{previewProblem.title}</DialogTitle>
                      <Badge className={`${getDifficultyColor(previewProblem.difficulty)}`} variant="outline">
                        {previewProblem.difficulty}
                      </Badge>
                      {previewProblem.scope_type === "svnapro" ? (
                        <Badge variant="default" className="bg-blue-600">
                          SvnaPro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-600 text-green-600">
                          College
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {previewProblem.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPreviewProblem(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-6">
                {/* Problem Description */}
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {previewProblem.description}
                  </p>
                </div>

                {/* Input Format */}
                {previewProblem.input_format && (
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Input Format</h3>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {previewProblem.input_format}
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {previewProblem.output_format && (
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Output Format</h3>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {previewProblem.output_format}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {previewProblem.constraints && (
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Constraints</h3>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {previewProblem.constraints}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {(previewProblem.sample_input || previewProblem.sample_output) && (
                  <div>
                    <h3 className="font-semibold mb-2 text-lg">Example</h3>
                    <div className="space-y-3">
                      {previewProblem.sample_input && (
                        <div>
                          <div className="text-sm font-medium mb-1 text-muted-foreground">Input:</div>
                          <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {previewProblem.sample_input}
                          </div>
                        </div>
                      )}
                      {previewProblem.sample_output && (
                        <div>
                          <div className="text-sm font-medium mb-1 text-muted-foreground">Output:</div>
                          <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {previewProblem.sample_output}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Time and Memory Limits */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                  {previewProblem.time_limit && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Time Limit: {previewProblem.time_limit}s
                    </span>
                  )}
                  {previewProblem.memory_limit && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      Memory Limit: {previewProblem.memory_limit}MB
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setPreviewProblem(null);
                      handleCodeNow(previewProblem.id);
                    }}
                    className="flex-1 gap-2"
                  >
                    <Code2 className="h-4 w-4" />
                    Try Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setPreviewProblem(null)}
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
