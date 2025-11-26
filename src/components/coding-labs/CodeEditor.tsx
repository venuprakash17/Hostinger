/** Monaco Editor IDE Component for Coding Labs */
import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { proctoringService, ProctoringConfig } from '@/services/proctoringService';

interface CodeEditorProps {
  problemId: number;
  labId: number;
  starterCode?: string;
  defaultLanguage?: string;
  allowedLanguages?: string[];
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
  onCodeChange?: (code: string) => void;
  onSubmission?: (submission: any) => void;
  readOnly?: boolean;
  isProctored?: boolean;
  enforceFullscreen?: boolean;
  detectTabSwitch?: boolean;
  onTabSwitch?: () => void;
  onFullscreenExit?: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
];

export function CodeEditor({
  problemId,
  labId,
  starterCode = '',
  defaultLanguage = 'python',
  allowedLanguages = ['python', 'java', 'c', 'cpp', 'javascript'],
  timeLimitSeconds = 5,
  memoryLimitMb = 256,
  onCodeChange,
  onSubmission,
  readOnly = false,
  isProctored = false,
  enforceFullscreen = false,
  detectTabSwitch = false,
  onTabSwitch,
  onFullscreenExit,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [inputData, setInputData] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const proctoringInitialized = useRef(false);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor
    const editor = monaco.editor.create(containerRef.current, {
      value: starterCode || getDefaultCode(language),
      language: getMonacoLanguage(language),
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      readOnly: readOnly,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
    });

    editorRef.current = editor;

    // Handle code changes
    editor.onDidChangeModelContent(() => {
      const newCode = editor.getValue();
      setCode(newCode);
      onCodeChange?.(newCode);
    });

    // Initialize production-grade proctoring service
    if (isProctored && !proctoringInitialized.current) {
      const config: ProctoringConfig = {
        labId,
        isProctored,
        enforceFullscreen,
        detectTabSwitch,
        onViolation: (violation) => {
          // Handle violation
          if (violation.type === 'tab_switch') {
            setTabSwitches(prev => prev + 1);
            onTabSwitch?.();
            toast.warning(`Tab switch detected (${violation.severity} severity)`);
          } else if (violation.type === 'fullscreen_exit') {
            setFullscreenExits(prev => prev + 1);
            onFullscreenExit?.();
          }
        },
        onActivityUpdate: (activity) => {
          // Update local state
          setTabSwitches(activity.tabSwitches);
          setFullscreenExits(activity.fullscreenExits);
        },
      };

      proctoringService.initialize(config);
      proctoringInitialized.current = true;
    }

    return () => {
      editor.dispose();
      // Cleanup proctoring on unmount
      if (proctoringInitialized.current) {
        proctoringService.cleanup();
        proctoringInitialized.current = false;
      }
    };
  }, [language, starterCode, readOnly, isProctored, enforceFullscreen, detectTabSwitch, labId]);

  // Update proctoring service when code changes
  useEffect(() => {
    if (isProctored && proctoringInitialized.current) {
      proctoringService.updateActivity({
        currentCode: code,
        language,
        problemId,
      });
    }
  }, [code, language, problemId, isProctored]);

  // Update editor when language changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
      }
    }
  }, [language]);

  const getMonacoLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      python: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      javascript: 'javascript',
    };
    return langMap[lang] || 'plaintext';
  };

  const getDefaultCode = (lang: string): string => {
    const defaults: Record<string, string> = {
      python: '# Write your code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
      java: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
      c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
      javascript: '// Write your code here\n\nfunction main() {\n    // Your code\n}\n\nmain();',
    };
    return defaults[lang] || '';
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setExecutionResult(null);

    try {
      const result = await apiClient.executeCode({
        code,
        language,
        input_data: inputData || undefined,
        time_limit_seconds: timeLimitSeconds,
        memory_limit_mb: memoryLimitMb,
      });

      setExecutionResult(result);
      
      if (result.status === 'accepted') {
        setOutput(result.output || '');
        toast.success('Code executed successfully');
      } else {
        setOutput(result.error_message || 'Execution failed');
        toast.error(`Execution failed: ${result.status}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute code');
      setOutput(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunning(true);

    try {
      const submission = await apiClient.createLabSubmission({
        lab_id: labId,
        problem_id: problemId,
        code,
        language,
        is_final_submission: true,
      });

      toast.success('Submission successful!');
      setExecutionResult(submission);
      onSubmission?.(submission);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit code');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <Select value={language} onValueChange={setLanguage} disabled={readOnly}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.filter(lang => allowedLanguages.includes(lang.value)).map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isProctored && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {tabSwitches > 0 && (
                <span className="text-destructive">Tab switches: {tabSwitches}</span>
              )}
              {fullscreenExits > 0 && (
                <span className="text-destructive">Fullscreen exits: {fullscreenExits}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRun}
            disabled={isRunning || readOnly}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={isRunning} size="sm">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Editor and Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <div ref={containerRef} className="flex-1" />
        </div>

        {/* Output Panel */}
        <div className="w-96 border-l bg-muted/30 flex flex-col">
          <Tabs defaultValue="output" className="h-full flex flex-col">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="result">Result</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="flex-1 p-4 overflow-auto">
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Enter input data..."
                className="w-full h-full p-2 border rounded font-mono text-sm"
                disabled={readOnly}
              />
            </TabsContent>

            <TabsContent value="output" className="flex-1 p-4 overflow-auto">
              <pre className="font-mono text-sm whitespace-pre-wrap">{output || 'No output yet'}</pre>
            </TabsContent>

            <TabsContent value="result" className="flex-1 p-4 overflow-auto">
              {executionResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {executionResult.status === 'accepted' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-semibold">Status: {executionResult.status}</span>
                  </div>

                  {executionResult.score !== undefined && (
                    <div>
                      <span className="font-semibold">Score: </span>
                      {executionResult.score} / {executionResult.max_score || 100}
                    </div>
                  )}

                  {executionResult.test_cases_passed !== undefined && (
                    <div>
                      <span className="font-semibold">Test Cases: </span>
                      {executionResult.test_cases_passed} / {executionResult.test_cases_total} passed
                    </div>
                  )}

                  {executionResult.execution_time_ms && (
                    <div>
                      <span className="font-semibold">Execution Time: </span>
                      {executionResult.execution_time_ms}ms
                    </div>
                  )}

                  {executionResult.memory_used_mb && (
                    <div>
                      <span className="font-semibold">Memory Used: </span>
                      {executionResult.memory_used_mb.toFixed(2)} MB
                    </div>
                  )}

                  {executionResult.error_message && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="font-semibold text-destructive">Error</span>
                      </div>
                      <pre className="text-sm whitespace-pre-wrap">{executionResult.error_message}</pre>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

