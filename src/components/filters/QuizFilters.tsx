import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface QuizFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  minMarks: string;
  onMinMarksChange: (marks: string) => void;
  maxDuration: string;
  onMaxDurationChange: (duration: string) => void;
  onClearFilters: () => void;
}

export function QuizFilters({
  searchQuery,
  onSearchChange,
  subject,
  onSubjectChange,
  minMarks,
  onMinMarksChange,
  maxDuration,
  onMaxDurationChange,
  onClearFilters,
}: QuizFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const hasActiveFilters = subject || minMarks || maxDuration;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quizzes by title, subject, or description..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {[subject && "Subject", minMarks && "Marks", maxDuration && "Duration"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Quizzes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Input
                    placeholder="e.g., Mathematics, Computer Science"
                    value={subject}
                    onChange={(e) => onSubjectChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Minimum Marks</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={minMarks}
                    onChange={(e) => onMinMarksChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Maximum Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 60"
                    value={maxDuration}
                    onChange={(e) => onMaxDurationChange(e.target.value)}
                  />
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={onClearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {subject && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Subject: {subject}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onSubjectChange("")}
                />
              </Badge>
            )}
            {minMarks && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Min Marks: {minMarks}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onMinMarksChange("")}
                />
              </Badge>
            )}
            {maxDuration && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Max Duration: {maxDuration}m
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onMaxDurationChange("")}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

