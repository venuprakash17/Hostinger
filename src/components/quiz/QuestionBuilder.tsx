import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, CheckCircle2, X, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface Question {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  marks: number;
  timer_seconds?: number;  // Timer for this specific question (in seconds)
}

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    marks: 1,
    timer_seconds: undefined,
  });
  const { toast } = useToast();

  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast({
        title: "Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    if (!currentQuestion.option_a.trim() || !currentQuestion.option_b.trim() || 
        !currentQuestion.option_c.trim() || !currentQuestion.option_d.trim()) {
      toast({
        title: "Error",
        description: "All four options are required",
        variant: "destructive",
      });
      return;
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
    setCurrentQuestion({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      marks: 1,
      timer_seconds: undefined,
    });

    toast({
      title: "Success",
      description: editingIndex !== null ? "Question updated" : "Question added",
    });
  };

  const handleEditQuestion = (index: number) => {
    setCurrentQuestion(questions[index]);
    setEditingIndex(index);
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
    setCurrentQuestion({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      marks: 1,
      timer_seconds: undefined,
    });
  };

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
          <p className="text-sm text-muted-foreground">
            Total Marks: {totalMarks} | Add questions to build your quiz
          </p>
        </div>
        {questions.length > 0 && (
          <Badge variant="outline">
            {questions.length} {questions.length === 1 ? "Question" : "Questions"}
          </Badge>
        )}
      </div>

      {/* Question Form */}
      <Card id="question-form" className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">
            {editingIndex !== null ? `Edit Question ${editingIndex + 1}` : "Add New Question"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Question Text *</Label>
            <Textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              placeholder="Enter your question here..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Option A *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={currentQuestion.option_a}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                  placeholder="Option A"
                  required
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
                  value={currentQuestion.option_b}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                  placeholder="Option B"
                  required
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
                  value={currentQuestion.option_c}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                  placeholder="Option C"
                  required
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
                  value={currentQuestion.option_d}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                  placeholder="Option D"
                  required
                />
                {currentQuestion.correct_answer === "D" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Correct Answer *</Label>
              <Select
                value={currentQuestion.correct_answer}
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
            <div>
              <Label>Marks *</Label>
              <Input
                type="number"
                min="1"
                value={currentQuestion.marks}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) || 1 })}
                required
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
            {editingIndex !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                      <Badge variant="secondary">{q.marks} {q.marks === 1 ? "mark" : "marks"}</Badge>
                      {q.timer_seconds && (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">
                          ⏱️ {q.timer_seconds}s
                        </Badge>
                      )}
                      <Badge className="bg-green-500 text-white">
                        Correct: {q.correct_answer}
                      </Badge>
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
              Use the form above to add questions to your quiz
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

