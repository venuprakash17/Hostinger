import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Code2, Play, Check, Loader2, CheckCircle2, XCircle, Clock, Zap, RotateCcw, Copy, ArrowLeft, ChevronDown, ChevronUp, Minimize2, Maximize2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { useCodingFilters } from "@/contexts/CodingFiltersContext";
import Editor from "@monaco-editor/react";

interface CodingProblem {
  id: number;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  difficulty: string;
  tags?: string[];
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  test_cases?: Array<{
    stdin: string;
    expected_output: string;
    is_public?: boolean;
  }>;
  is_active?: boolean;
  year?: number;
  allowed_languages?: string[];
  restricted_languages?: string[];
  recommended_languages?: string[];
  starter_code_python?: string;
  starter_code_c?: string;
  starter_code_cpp?: string;
  starter_code_java?: string;
  starter_code_javascript?: string;
  time_limit?: number;
  memory_limit?: number;
  scope_type?: string;
  college_id?: number;
  department?: string;
  section_id?: number;
  problem_code?: string;
}

interface TestCaseResult {
  test_case: number;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
  is_public: boolean;
}

interface SubmissionResult {
  success: boolean;
  passed: number;
  failed: number;
  total_tests: number;
  results?: TestCaseResult[];
  execution_time?: number;
  memory_used?: number;
}

export default function Coding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const problemIdParam = searchParams.get("problem");
  const filters = useCodingFilters();
  
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [code, setCode] = useState("// Write your code here\n\n");
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [runOutput, setRunOutput] = useState("");
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [testCaseResults, setTestCaseResults] = useState<Map<number, any>>(new Map());
  const [runningTestCaseIndex, setRunningTestCaseIndex] = useState<number | null>(null);
  const [isTestCasesMinimized, setIsTestCasesMinimized] = useState(false);
  
  // Analytics tracking
  const [sessionStartTime] = useState(Date.now());
  const [problemStartTime, setProblemStartTime] = useState<number | null>(null);
  const [timeSpentInterval, setTimeSpentInterval] = useState<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  // Load single problem when problemIdParam is provided
  useEffect(() => {
    if (problemIdParam) {
      fetchSingleProblem(parseInt(problemIdParam));
    } else {
      // If no problem ID, redirect to browse page
      navigate("/coding-problems");
    }
  }, [problemIdParam]);

  // Track analytics: Start timing when problem loads
  useEffect(() => {
    if (selectedProblem) {
      setProblemStartTime(Date.now());
      
      // Track time spent every minute
      const interval = setInterval(() => {
        trackTimeSpent();
      }, 60000); // Every minute
      
      setTimeSpentInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedProblem]);

  // Track analytics: Send final time when component unmounts
  useEffect(() => {
    return () => {
      if (selectedProblem && problemStartTime) {
        trackTimeSpent(true); // Final tracking
      }
      if (timeSpentInterval) {
        clearInterval(timeSpentInterval);
      }
    };
  }, [selectedProblem, problemStartTime]);

  useEffect(() => {
    if (selectedProblem) {
      if (selectedProblem.restricted_languages && selectedProblem.restricted_languages.length > 0) {
        if (!selectedProblem.restricted_languages.includes(language)) {
          setLanguage(selectedProblem.restricted_languages[0]);
          return;
        }
      } else {
        const allowed = selectedProblem.allowed_languages || ['python', 'c', 'cpp', 'java', 'javascript'];
        if (!allowed.includes(language)) {
          setLanguage(allowed[0]);
          return;
        }
      }
      
      loadSavedCode(selectedProblem.id, language).then((savedCode) => {
        if (!savedCode || !savedCode.code) {
          loadBoilerplate(selectedProblem, language);
        }
      });
      
      loadSubmissions(selectedProblem.id);
      setSubmissionResult(null);
      setRunOutput("");
      setCustomInput(selectedProblem.sample_input || "");
      setTestCaseResults(new Map()); // Clear test case results when problem changes
    }
  }, [selectedProblem, language]);

  const loadSubmissions = async (problemId: number) => {
    try {
      setLoadingSubmissions(true);
      const data = await apiClient.getProblemSubmissions(problemId);
      setSubmissions((data as any[]) || []);
    } catch (error) {
      console.error("Error loading submissions:", error);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadSavedCode = async (problemId: number, lang: string): Promise<any> => {
    try {
      const savedCode = await apiClient.getSavedCode(problemId, lang) as any;
      if (savedCode && savedCode.code) {
        setCode(savedCode.code);
        return savedCode;
      }
      return null;
    } catch (error) {
      console.error("Error loading saved code:", error);
      return null;
    }
  };

  const fetchSingleProblem = async (problemId: number) => {
    try {
      setLoading(true);
      const problem = await apiClient.getCodingProblem(problemId) as CodingProblem;
      setSelectedProblem(problem);
    } catch (error: any) {
      console.error("Error fetching coding problem:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load coding problem",
        variant: "destructive",
      });
      navigate("/coding-problems");
    } finally {
      setLoading(false);
    }
  };

  // Analytics: Track time spent on problem
  const trackTimeSpent = async (isFinal: boolean = false) => {
    if (!selectedProblem || !problemStartTime) return;
    
    try {
      const timeSpent = Math.floor((Date.now() - problemStartTime) / 1000); // seconds
      const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds
      
      // Track analytics via API
      await apiClient.trackCodingActivity({
        problem_id: selectedProblem.id,
        problem_code: selectedProblem.problem_code,
        time_spent_seconds: timeSpent,
        session_time_seconds: sessionTime,
        is_final: isFinal,
        action: isFinal ? "session_end" : "time_track",
      });
    } catch (error) {
      console.error("Error tracking analytics:", error);
    }
  };

  const handleBack = () => {
    if (code.trim() && code !== "// Write your code here\n\n") {
      setShowBackConfirm(true);
    } else {
      trackTimeSpent(true); // Final tracking before leaving
      navigate("/coding-problems");
    }
  };

  const confirmBack = () => {
    trackTimeSpent(true); // Final tracking before leaving
    setShowBackConfirm(false);
    navigate("/coding-problems");
  };

  useEffect(() => {
    if (!selectedProblem || !code || code.trim().length === 0) return;
    
    // Only save if code is different from starter code
    const isStarterCode = code === "// Write your code here\n\n" || 
                          code.trim().length < 10; // Don't save very short code
    
    if (isStarterCode) return;
    
    const timeoutId = setTimeout(() => {
      saveCode(selectedProblem.id, language, code);
    }, 2000); // Increased debounce to 2 seconds
    
    return () => clearTimeout(timeoutId);
  }, [code, selectedProblem, language]);

  const saveCode = async (problemId: number, lang: string, codeToSave: string) => {
    try {
      // Ensure we're calling the correct endpoint
      await apiClient.saveCode(problemId, lang, codeToSave);
    } catch (error: any) {
      // Silently fail - code saving is not critical
      if (error?.status !== 404) {
        console.error("Error saving code:", error);
      }
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

  const handleRun = async () => {
    if (!selectedProblem) {
      toast({ title: "Error", description: "Please select a problem first", variant: "destructive" });
      return;
    }

    if (!code || code.trim().length === 0) {
      toast({ title: "Error", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunningTest(true);
    setRunOutput("Executing...");
    
    try {
      const result = await apiClient.executeCode(
        selectedProblem.id,
        language,
        code,
        customInput || selectedProblem.sample_input || ""
      ) as any;
      
      if (result.error) {
        setRunOutput(`Error:\n${result.error}`);
        toast({ 
          title: "Execution Error", 
          description: result.error.substring(0, 100),
          variant: "destructive"
        });
      } else {
        setRunOutput(result.output || "No output");
        toast({ 
          title: "Code Executed", 
          description: "Check output below"
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Execution failed';
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      setRunOutput(`Error: ${errorMsg}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleRunTestCase = async (testCaseIndex: number) => {
    if (!selectedProblem || !code || code.trim().length === 0) {
      toast({ title: "Error", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setRunningTestCaseIndex(testCaseIndex);
    
    try {
      const result = await apiClient.runTestCase(
        selectedProblem.id,
        language,
        code,
        testCaseIndex
      ) as any;
      
      const newResults = new Map(testCaseResults);
      newResults.set(testCaseIndex, result);
      setTestCaseResults(newResults);
      
      if (result.passed) {
        toast({
          title: `Test Case ${testCaseIndex + 1} Passed`,
          description: "✓",
        });
      } else {
        toast({
          title: `Test Case ${testCaseIndex + 1} Failed`,
          description: result.error || "Output mismatch",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Test case execution failed';
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      const newResults = new Map(testCaseResults);
      newResults.set(testCaseIndex, { passed: false, error: errorMsg });
      setTestCaseResults(newResults);
    } finally {
      setRunningTestCaseIndex(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem) {
      toast({ title: "Error", description: "Please select a problem first", variant: "destructive" });
      return;
    }

    if (!code || code.trim().length === 0) {
      toast({ title: "Error", description: "Please write some code first", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setSubmissionResult(null);
    
    try {
      const response = await apiClient.submitSolution(
        selectedProblem.id,
        language,
        code
      ) as any;
      
      // Transform backend response to match frontend SubmissionResult interface
      const result: SubmissionResult = {
        success: response.status === "accepted",
        passed: response.passed || 0,
        failed: (response.total || 0) - (response.passed || 0),
        total_tests: response.total || 0,
        results: response.results || [],
        execution_time: response.execution_time,
        memory_used: response.memory_used
      };
      
      await saveCode(selectedProblem.id, language, code);
      await loadSubmissions(selectedProblem.id);
      
      setSubmissionResult(result);
      
      // Track submission analytics
      if (problemStartTime) {
        const solveTime = Math.floor((Date.now() - problemStartTime) / 1000);
        await apiClient.trackCodingActivity({
          problem_id: selectedProblem.id,
          problem_code: selectedProblem.problem_code,
          time_spent_seconds: solveTime,
          session_time_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
          is_final: false,
          action: result.success ? "submission_accepted" : "submission_failed",
        });
      }
      
      if (result.success) {
        toast({
          title: "🎉 Accepted!",
          description: `All ${result.total_tests} test cases passed!`,
        });
      } else {
        toast({
          title: "Some Tests Failed",
          description: `Passed: ${result.passed}/${result.total_tests}`,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Submission failed';
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      console.error("Submit error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const resetCode = () => {
    if (selectedProblem) {
      loadBoilerplate(selectedProblem, language);
      toast({ title: "Code Reset", description: "Code has been reset to starter template" });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Code copied to clipboard" });
  };

  const getMonacoLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      'python': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'javascript': 'javascript',
      'js': 'javascript'
    };
    return langMap[lang] || 'plaintext';
  };

  const loadBoilerplate = (problem: CodingProblem, lang: string) => {
    const boilerplateMap: Record<string, keyof CodingProblem> = {
      'python': 'starter_code_python',
      'c': 'starter_code_c',
      'cpp': 'starter_code_cpp',
      'java': 'starter_code_java',
      'javascript': 'starter_code_javascript',
      'js': 'starter_code_javascript'
    };

    const field = boilerplateMap[lang];
    if (field && problem[field]) {
      setCode(problem[field] as string || getDefaultCode(lang));
    } else {
      setCode(getDefaultCode(lang));
    }
  };

  const getDefaultCode = (lang: string): string => {
    const defaults: Record<string, string> = {
      python: "# Write your code here\n\ndef solution():\n    pass\n\nif __name__ == '__main__':\n    solution()",
      cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}",
      c: "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}",
      java: "public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}",
      javascript: "// Write your code here\n\nfunction main() {\n    // Your code\n}\n\nmain();"
    };
    return defaults[lang] || "// Write your code here\n\n";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedProblem) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Card>
          <CardContent className="py-12 text-center">
            <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No problem selected</p>
            <Button onClick={() => navigate("/coding-problems")}>
              Browse Problems
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-background overflow-hidden">
      {/* Top Bar - LeetCode Style */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Problem</span>
            <Badge className={`${getDifficultyColor(selectedProblem.difficulty)} text-xs font-medium`} variant="outline">
              {selectedProblem.difficulty}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={isRunningTest}
            className="h-8 gap-2"
          >
            <Play className="h-3 w-3" />
            Run
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isRunning}
            className="h-8 gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-3 w-3" />
            {isRunning ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>

      {/* Split Screen Layout - LeetCode Style with Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left Panel - Problem Description (LeetCode Style) */}
        <ResizablePanel defaultSize={50} minSize={30} maxSize={70} className="border-r bg-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/50">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="h-8">
                <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
                <TabsTrigger value="submissions" className="text-xs">
                  Submissions {submissions.length > 0 && `(${submissions.length})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-hidden p-6 min-h-0 flex flex-col">
            <Tabs defaultValue="description" className="h-full flex flex-col min-h-0">
              <TabsContent value="description" className="mt-0 space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Problem Title and Meta */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl font-semibold">{selectedProblem.title}</h1>
                    <Badge className={`${getDifficultyColor(selectedProblem.difficulty)} font-medium`} variant="outline">
                      {selectedProblem.difficulty}
                    </Badge>
                    {selectedProblem.scope_type === "svnapro" ? (
                      <Badge variant="default" className="bg-blue-600">
                        SvnaPro
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-600 text-green-600">
                        College
                      </Badge>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {selectedProblem.tags && selectedProblem.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      {selectedProblem.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Problem Description */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedProblem.description || "No description available"}
                  </div>
                </div>

                {/* Examples */}
                {selectedProblem.sample_input && selectedProblem.sample_output && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold">Example:</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium mb-1 text-muted-foreground">Input:</div>
                        <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap border">
                          {selectedProblem.sample_input}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1 text-muted-foreground">Output:</div>
                        <div className="bg-muted/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap border">
                          {selectedProblem.sample_output}
                        </div>
                      </div>
                      {selectedProblem.sample_input.includes('\n') && (
                        <div className="text-xs text-muted-foreground italic">
                          Explanation: Run your code to see detailed explanation.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {selectedProblem.constraints && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">Constraints:</h3>
                    <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono border">
                      {selectedProblem.constraints}
                    </div>
                  </div>
                )}

                {/* Input/Output Format */}
                {(selectedProblem.input_format || selectedProblem.output_format) && (
                  <div className="space-y-3">
                    {selectedProblem.input_format && (
                      <div>
                        <h3 className="text-base font-semibold mb-2">Input Format:</h3>
                        <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono border">
                          {selectedProblem.input_format}
                        </div>
                      </div>
                    )}
                    {selectedProblem.output_format && (
                      <div>
                        <h3 className="text-base font-semibold mb-2">Output Format:</h3>
                        <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono border">
                          {selectedProblem.output_format}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Time/Memory Limits */}
                {(selectedProblem.time_limit || selectedProblem.memory_limit) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                    {selectedProblem.time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Time Limit: {selectedProblem.time_limit}s
                      </span>
                    )}
                    {selectedProblem.memory_limit && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        Memory Limit: {selectedProblem.memory_limit}MB
                      </span>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="submissions" className="mt-0 flex-1 overflow-y-auto min-h-0">
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No submissions yet. Submit your solution to see it here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {submission.status === 'accepted' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <Badge variant={
                              submission.status === 'accepted' ? 'default' : 
                              submission.status === 'wrong_answer' ? 'destructive' : 
                              'secondary'
                            }>
                              {submission.status === 'accepted' ? 'Accepted' : 
                               submission.status === 'wrong_answer' ? 'Wrong Answer' : 
                               submission.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground font-mono">
                              {submission.language.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>
                            <strong>{submission.passed_tests}/{submission.total_tests}</strong> test cases passed
                          </p>
                          {submission.execution_time && (
                            <p className="text-muted-foreground flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {submission.execution_time.toFixed(2)}s
                              </span>
                              {submission.memory_used && (
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  {submission.memory_used.toFixed(2)}MB
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors w-1 cursor-col-resize active:bg-primary" />

        {/* Right Panel - Code Editor (LeetCode Style) */}
        <ResizablePanel defaultSize={50} minSize={30} maxSize={70} className="bg-card overflow-hidden flex flex-col">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Code</span>
              {selectedProblem.restricted_languages && selectedProblem.restricted_languages.length > 0 ? (
                <Select 
                  value={language} 
                  onValueChange={(val) => {
                    if (selectedProblem.restricted_languages?.includes(val)) {
                      setLanguage(val);
                    }
                  }}
                  disabled={selectedProblem.restricted_languages.length === 1}
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProblem.restricted_languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang === 'cpp' ? 'C++' : lang === 'js' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedProblem.allowed_languages || ['python', 'c', 'cpp', 'java', 'javascript']).map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang === 'cpp' ? 'C++' : lang === 'js' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={resetCode} className="h-7 w-7 p-0" title="Reset code">
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={copyCode} className="h-7 w-7 p-0" title="Copy code">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                },
              }}
            />
          </div>

          {/* Test Results / Output - Collapsible Section */}
          <div className={`border-t bg-card transition-all duration-200 shrink-0 flex flex-col min-h-0 ${isTestCasesMinimized ? 'h-10' : 'flex-1'}`}>
            {submissionResult ? (
              <div className="p-4 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {submissionResult.success ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-base font-semibold text-green-600 dark:text-green-400">
                          Accepted
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({submissionResult.passed}/{submissionResult.total_tests} test cases passed)
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-base font-semibold text-red-600 dark:text-red-400">
                          Wrong Answer
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({submissionResult.passed}/{submissionResult.total_tests} test cases passed)
                        </span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTestCasesMinimized(!isTestCasesMinimized)}
                    className="h-7 w-7 p-0"
                  >
                    {isTestCasesMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                {!isTestCasesMinimized && submissionResult.results && submissionResult.results.length > 0 && (
                  <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                    {submissionResult.results.filter((r: TestCaseResult) => r.is_public).map((result: TestCaseResult, idx: number) => (
                      <div key={idx} className={`p-3 rounded border ${result.passed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {result.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className={`text-sm font-medium ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            Testcase {result.test_case}: {result.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        {!result.passed && (
                          <div className="mt-2 space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Expected: </span>
                              <code className="bg-background/70 px-2 py-1 rounded font-mono text-xs">{result.expected}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Got: </span>
                              <code className="bg-background/70 px-2 py-1 rounded font-mono text-xs">{result.actual || result.error || 'N/A'}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Tabs defaultValue="testcases" className="w-full flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between border-b bg-card shrink-0">
                  <TabsList className="h-9 rounded-none border-0 shrink-0 bg-transparent">
                    <TabsTrigger value="testcases" className="text-xs px-4 h-9 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      Testcase
                    </TabsTrigger>
                    <TabsTrigger value="result" className="text-xs px-4 h-9 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      Test Result
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTestCasesMinimized(!isTestCasesMinimized)}
                    className="h-8 w-8 p-0 mr-2"
                    title={isTestCasesMinimized ? "Expand test cases" : "Minimize test cases"}
                  >
                    {isTestCasesMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </Button>
                </div>
                {!isTestCasesMinimized && (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <TabsContent value="testcases" className="m-0 p-4 overflow-y-auto space-y-3 flex-1 min-h-0">
                      {/* Multiple Test Cases - LeetCode Style */}
                      {selectedProblem.test_cases && selectedProblem.test_cases.length > 0 ? (
                        <>
                          {selectedProblem.test_cases.filter(tc => tc.is_public !== false).map((testCase, index) => {
                            const originalIndex = selectedProblem.test_cases!.findIndex((tc, i) => tc === testCase && tc.is_public !== false);
                            const result = testCaseResults.get(originalIndex);
                            return (
                              <div key={originalIndex} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Testcase {originalIndex + 1}</span>
                                    {result && (
                                      <div className={`flex items-center gap-1 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                                        {result.passed ? (
                                          <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                          <XCircle className="h-4 w-4" />
                                        )}
                                        <span className="text-xs font-medium">{result.passed ? 'Passed' : 'Failed'}</span>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRunTestCase(originalIndex)}
                                    disabled={runningTestCaseIndex === originalIndex || isRunning}
                                    className="h-7 text-xs gap-1 px-2"
                                  >
                                    {runningTestCaseIndex === originalIndex ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Running...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3" />
                                        Run
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Input:</div>
                                    <div className="p-2 bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded font-mono text-xs whitespace-pre-wrap border border-border">
                                      {testCase.stdin || "(empty)"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Expected Output:</div>
                                    <div className="p-2 bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded font-mono text-xs whitespace-pre-wrap border border-border">
                                      {testCase.expected_output || "(empty)"}
                                    </div>
                                  </div>
                                  {result && result.actual !== undefined && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Your Output:</div>
                                      <div className={`p-2 rounded font-mono text-xs whitespace-pre-wrap border ${
                                        result.passed 
                                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                                          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                      }`}>
                                        {result.actual}
                                      </div>
                                    </div>
                                  )}
                                  {result && result.error && (
                                    <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                                      <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error:</div>
                                      <code className="text-xs text-red-600 dark:text-red-400 break-all">{result.error}</code>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {/* Custom Input Test Case */}
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Custom Testcase</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRun}
                                disabled={isRunningTest || isRunning}
                                className="h-7 text-xs gap-1 px-2"
                              >
                                {isRunningTest ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Running...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" />
                                    Run
                                  </>
                                )}
                              </Button>
                            </div>
                            <textarea
                              value={customInput}
                              onChange={(e) => setCustomInput(e.target.value)}
                              className="w-full h-24 p-2 font-mono text-xs bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Enter custom input..."
                            />
                            {runOutput && (
                              <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-1">Output:</div>
                                <div className="p-2 bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded font-mono text-xs whitespace-pre-wrap border border-border">
                                  {runOutput}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No test cases available</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="result" className="m-0 p-4 flex-1 min-h-0 overflow-y-auto">
                      <div className="w-full h-full">
                        {runOutput ? (
                          <div className="p-3 bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded font-mono text-sm whitespace-pre-wrap border border-border">
                            {runOutput}
                          </div>
                        ) : isRunningTest ? (
                          <div className="flex items-center gap-2 text-muted-foreground py-8">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Running your code...</span>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">You must run your code first</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                )}
              </Tabs>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Back Confirmation Dialog */}
      <AlertDialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go Back?</AlertDialogTitle>
            <AlertDialogDescription>
              Going back will reset the editor and you'll lose your current code. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
