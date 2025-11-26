import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CodingFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  difficulty: string;
  onDifficultyChange: (difficulty: string) => void;
  tags: string;
  onTagsChange: (tags: string) => void;
  year?: string;
  onYearChange?: (year: string) => void;
  language?: string;
  onLanguageChange?: (language: string) => void;
  complexity?: string;
  onComplexityChange?: (complexity: string) => void;
  solved?: boolean | null;
  onSolvedChange?: (solved: boolean | null) => void;
  scopeType?: string;
  onScopeTypeChange?: (scopeType: string) => void;
  onClearFilters: () => void;
}

export function CodingFilters({
  searchQuery,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  tags,
  onTagsChange,
  year = "all",
  onYearChange,
  language = "all",
  onLanguageChange,
  complexity = "all",
  onComplexityChange,
  solved = null,
  onSolvedChange,
  scopeType = "all",
  onScopeTypeChange,
  onClearFilters,
}: CodingFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const hasActiveFilters = difficulty !== "all" || tags || (year && year !== "all") || (language && language !== "all") || (complexity && complexity !== "all") || solved !== null || (scopeType && scopeType !== "all");

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coding problems by title, description, or tags..."
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
                    {[
                      difficulty !== "all" && "Difficulty",
                      tags && "Tags",
                      year && year !== "all" && "Year",
                      language && language !== "all" && "Language",
                      complexity && complexity !== "all" && "Complexity",
                      solved !== null && "Solved",
                      scopeType && scopeType !== "all" && "Source"
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Coding Problems</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={onDifficultyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    placeholder="e.g., array, string, dynamic-programming"
                    value={tags}
                    onChange={(e) => onTagsChange(e.target.value)}
                  />
                </div>
                {onYearChange && (
                  <div>
                    <Label>Year</Label>
                    <Select value={year} onValueChange={onYearChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {onLanguageChange && (
                  <div>
                    <Label>Language</Label>
                    <Select value={language} onValueChange={onLanguageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="c">C</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {onComplexityChange && (
                  <div>
                    <Label>Complexity</Label>
                    <Select value={complexity} onValueChange={onComplexityChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Complexities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Complexities</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {onSolvedChange && (
                  <div>
                    <Label>Solved Status</Label>
                    <Select value={solved === null ? "all" : solved ? "solved" : "unsolved"} onValueChange={(val) => {
                      if (val === "all") onSolvedChange(null);
                      else onSolvedChange(val === "solved");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Problems" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Problems</SelectItem>
                        <SelectItem value="solved">Solved</SelectItem>
                        <SelectItem value="unsolved">Unsolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {onScopeTypeChange && (
                  <div>
                    <Label>Source</Label>
                    <Select value={scopeType} onValueChange={onScopeTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="svnapro">SvnaPro</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
            {difficulty !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Difficulty: {difficulty}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onDifficultyChange("all")}
                />
              </Badge>
            )}
            {tags && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tags: {tags}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onTagsChange("")}
                />
              </Badge>
            )}
            {year && year !== "all" && onYearChange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Year: {year}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onYearChange("all")}
                />
              </Badge>
            )}
            {language && language !== "all" && onLanguageChange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Language: {language === 'cpp' ? 'C++' : language === 'js' ? 'JavaScript' : language.charAt(0).toUpperCase() + language.slice(1)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onLanguageChange("all")}
                />
              </Badge>
            )}
            {complexity && complexity !== "all" && onComplexityChange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Complexity: {complexity}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onComplexityChange("all")}
                />
              </Badge>
            )}
            {solved !== null && onSolvedChange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {solved ? "Solved" : "Unsolved"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onSolvedChange(null)}
                />
              </Badge>
            )}
            {scopeType && scopeType !== "all" && onScopeTypeChange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Source: {scopeType === "svnapro" ? "SvnaPro" : scopeType === "college" ? "College" : scopeType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onScopeTypeChange("all")}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

