import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Edit2, CheckCircle2, X, FileQuestion, Upload, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { FileUpload } from "@/components/ui/file-upload";

export interface Question {
  question: string;
  question_type: "mcq" | "fill_blank" | "true_false";
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: "A" | "B" | "C" | "D";
  correct_answer_text?: string;
  is_true?: boolean;
  marks: number;
  timer_seconds?: number;
}

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(true); // Default to open
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: "",
    question_type: "mcq",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    marks: 1,
    timer_seconds: undefined,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddQuestion = () => {
    // If form is empty, just reset it (don't show error)
    if (!currentQuestion.question.trim()) {
      resetForm();
      setIsAddQuestionOpen(false); // Collapse the form
      return;
    }

    // Validate based on question type
    if (currentQuestion.question_type === "mcq") {
      if (!currentQuestion.option_a?.trim() || !currentQuestion.option_b?.trim() || 
          !currentQuestion.option_c?.trim() || !currentQuestion.option_d?.trim()) {
        toast({
          title: "Error",
          description: "All four options are required for MCQ",
          variant: "destructive",
        });
        return;
      }
      if (!currentQuestion.correct_answer) {
        toast({
          title: "Error",
          description: "Please select the correct answer",
          variant: "destructive",
        });
        return;
      }
    } else if (currentQuestion.question_type === "fill_blank") {
      if (!currentQuestion.correct_answer_text?.trim()) {
        toast({
          title: "Error",
          description: "Correct answer text is required",
          variant: "destructive",
        });
        return;
      }
    } else if (currentQuestion.question_type === "true_false") {
      if (currentQuestion.is_true === undefined) {
        toast({
          title: "Error",
          description: "Please select True or False",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingIndex !== null) {
      // Update existing question
      const updated = [...questions];
      updated[editingIndex] = currentQuestion;
      onChange(updated);
      setEditingIndex(null);
    } else {
      // Add new question
      onChange([...questions, currentQuestion]);
    }

    // Reset form
    resetForm();
    
    // Collapse form after adding question
    setIsAddQuestionOpen(false);

    toast({
      title: "Success",
      description: editingIndex !== null ? "Question updated" : "Question added",
    });
  };

  const resetForm = () => {
    setCurrentQuestion({
      question: "",
      question_type: "mcq",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      marks: 1,
      timer_seconds: undefined,
    });
  };

  const handleEditQuestion = (index: number) => {
    setCurrentQuestion(questions[index]);
    setEditingIndex(index);
    setIsAddQuestionOpen(true); // Open form when editing
    // Scroll to form
    document.getElementById("question-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const updated = questions.filter((_, i) => i !== index);
      onChange(updated);
      toast({
        title: "Success",
        description: "Question deleted",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    resetForm();
    setIsAddQuestionOpen(false); // Collapse form after cancel
  };

  const handleBulkUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await apiClient.bulkUploadQuestions(file);
      
      if (response.questions && response.questions.length > 0) {
        // Add uploaded questions to existing questions
        const newQuestions = response.questions.map((q: any) => ({
          question: q.question,
          question_type: q.question_type || "mcq",
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          correct_answer_text: q.correct_answer_text,
          is_true: q.is_true,
          marks: q.marks || 1,
          timer_seconds: q.timer_seconds,
        }));
        
        onChange([...questions, ...newQuestions]);
        
        toast({
          title: "Success",
          description: `Successfully uploaded ${newQuestions.length} question(s)`,
        });
        
        if (response.errors && response.errors.length > 0) {
          toast({
            title: "Warning",
            description: `${response.errors.length} question(s) had errors. Check console for details.`,
            variant: "destructive",
          });
          console.error("Upload errors:", response.errors);
        }
      } else {
        toast({
          title: "Error",
          description: "No valid questions found in the file",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload questions",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    apiClient.downloadQuestionTemplate('xlsx');
  };

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "mcq": return "MCQ";
      case "fill_blank": return "Fill in the Blank";
      case "true_false": return "True/False";
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
          <p className="text-sm text-muted-foreground">
            Total Marks: {totalMarks} | Add questions manually or bulk upload
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
          <FileUpload
            endpoint="/bulk-upload/questions"
            accept=".xlsx,.xls,.csv,.json"
            label="Bulk Upload"
            description="Upload questions from file"
            onSuccess={(response: any) => {
              if (response.questions && response.questions.length > 0) {
                const newQuestions = response.questions.map((q: any) => ({
                  question: q.question,
                  question_type: q.question_type || "mcq",
                  option_a: q.option_a,
                  option_b: q.option_b,
                  option_c: q.option_c,
                  option_d: q.option_d,
                  correct_answer: q.correct_answer,
                  correct_answer_text: q.correct_answer_text,
                  is_true: q.is_true,
                  marks: q.marks || 1,
                  timer_seconds: q.timer_seconds,
                }));
                onChange([...questions, ...newQuestions]);
                toast({
                  title: "Success",
                  description: `Successfully uploaded ${newQuestions.length} question(s)`,
                });
              }
            }}
            onError={(error) => {
              toast({
                title: "Upload Error",
                description: error.message || "Failed to upload questions",
                variant: "destructive",
              });
            }}
          />
        </div>
      </div>

      {/* Question Form - Collapsible */}
      <Collapsible open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <Card id="question-form" className="border-2 border-dashed">
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-base">
                  {editingIndex !== null ? `Edit Question ${editingIndex + 1}` : "Add New Question"}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {isAddQuestionOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          <div>
            <Label>Question Type *</Label>
            <Select
              value={currentQuestion.question_type}
              onValueChange={(value: "mcq" | "fill_blank" | "true_false") => {
                setCurrentQuestion({
                  ...currentQuestion,
                  question_type: value,
                  // Reset fields when changing type
                  option_a: value === "mcq" || value === "true_false" ? currentQuestion.option_a || "" : undefined,
                  option_b: value === "mcq" || value === "true_false" ? currentQuestion.option_b || "" : undefined,
                  option_c: value === "mcq" ? currentQuestion.option_c || "" : undefined,
                  option_d: value === "mcq" ? currentQuestion.option_d || "" : undefined,
                  correct_answer: value === "mcq" || value === "true_false" ? currentQuestion.correct_answer || "A" : undefined,
                  correct_answer_text: value === "fill_blank" ? currentQuestion.correct_answer_text || "" : undefined,
                  is_true: value === "true_false" ? currentQuestion.is_true : undefined,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Question Text *</Label>
            <Textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              placeholder="Enter your question here..."
              rows={3}
            />
          </div>

          {/* MCQ Options */}
          {currentQuestion.question_type === "mcq" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Option A *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentQuestion.option_a || ""}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                    placeholder="Option A"
                  />
                  {currentQuestion.correct_answer === "A" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <Label>Option B *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentQuestion.option_b || ""}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                    placeholder="Option B"
                  />
                  {currentQuestion.correct_answer === "B" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <Label>Option C *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentQuestion.option_c || ""}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                    placeholder="Option C"
                  />
                  {currentQuestion.correct_answer === "C" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <Label>Option D *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentQuestion.option_d || ""}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                    placeholder="Option D"
                  />
                  {currentQuestion.correct_answer === "D" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* True/False Options */}
          {currentQuestion.question_type === "true_false" && (
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded border-2 cursor-pointer ${currentQuestion.is_true === true ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}
                onClick={() => setCurrentQuestion({ ...currentQuestion, is_true: true, correct_answer: "A", option_a: "True", option_b: "False" })}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={currentQuestion.is_true === true} readOnly />
                  <Label className="cursor-pointer">True</Label>
                </div>
              </div>
              <div className={`p-4 rounded border-2 cursor-pointer ${currentQuestion.is_true === false ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}
                onClick={() => setCurrentQuestion({ ...currentQuestion, is_true: false, correct_answer: "B", option_a: "True", option_b: "False" })}>
                <div className="flex items-center gap-2">
                  <input type="radio" checked={currentQuestion.is_true === false} readOnly />
                  <Label className="cursor-pointer">False</Label>
                </div>
              </div>
            </div>
          )}

          {/* Fill in the Blank */}
          {currentQuestion.question_type === "fill_blank" && (
            <div>
              <Label>Correct Answer *</Label>
              <Textarea
                value={currentQuestion.correct_answer_text || ""}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer_text: e.target.value })}
                placeholder="Enter the correct answer (e.g., Paris)"
                rows={2}
              />
            </div>
          )}

          {/* Correct Answer Selection for MCQ */}
          {currentQuestion.question_type === "mcq" && (
            <div>
              <Label>Correct Answer *</Label>
              <Select
                value={currentQuestion.correct_answer || "A"}
                onValueChange={(value: "A" | "B" | "C" | "D") =>
                  setCurrentQuestion({ ...currentQuestion, correct_answer: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - {currentQuestion.option_a || "Option A"}</SelectItem>
                  <SelectItem value="B">B - {currentQuestion.option_b || "Option B"}</SelectItem>
                  <SelectItem value="C">C - {currentQuestion.option_c || "Option C"}</SelectItem>
                  <SelectItem value="D">D - {currentQuestion.option_d || "Option D"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Marks *</Label>
              <Input
                type="number"
                min="1"
                value={currentQuestion.marks}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Timer (seconds) - Optional</Label>
              <Input
                type="number"
                min="0"
                value={currentQuestion.timer_seconds || ""}
                onChange={(e) => setCurrentQuestion({ 
                  ...currentQuestion, 
                  timer_seconds: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="e.g., 60 for 1 minute"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Time limit for this specific question (leave empty for no timer)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAddQuestion}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? "Update Question" : "Add Question"}
            </Button>
            {editingIndex !== null ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsAddQuestionOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Form
              </Button>
            )}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Added Questions ({questions.length})</h4>
          {questions.map((q, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      <Badge variant="secondary">{getQuestionTypeLabel(q.question_type)}</Badge>
                      <Badge variant="secondary">{q.marks} {q.marks === 1 ? "mark" : "marks"}</Badge>
                      {q.timer_seconds && (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">
                          ⏱️ {q.timer_seconds}s
                        </Badge>
                      )}
                      {q.question_type === "mcq" && q.correct_answer && (
                        <Badge className="bg-green-500 text-white">
                          Correct: {q.correct_answer}
                        </Badge>
                      )}
                      {q.question_type === "true_false" && (
                        <Badge className="bg-green-500 text-white">
                          Correct: {q.is_true ? "True" : "False"}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{q.question}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuestion(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {q.question_type === "mcq" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-2 rounded border ${q.correct_answer === "A" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}>
                      <span className="font-medium">A:</span> {q.option_a}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "B" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}>
                      <span className="font-medium">B:</span> {q.option_b}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "C" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}>
                      <span className="font-medium">C:</span> {q.option_c}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "D" ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-border"}`}>
                      <span className="font-medium">D:</span> {q.option_d}
                    </div>
                  </div>
                )}
                {q.question_type === "true_false" && (
                  <div className="p-3 rounded border bg-muted">
                    <span className="font-medium">Correct Answer: </span>
                    {q.is_true ? "True" : "False"}
                  </div>
                )}
                {q.question_type === "fill_blank" && (
                  <div className="p-3 rounded border bg-muted">
                    <span className="font-medium">Correct Answer: </span>
                    {q.correct_answer_text}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No questions added yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the form above to add questions manually or bulk upload from a file
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
