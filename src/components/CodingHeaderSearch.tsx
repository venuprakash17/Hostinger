import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CodingHeaderSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  difficultyFilter: string;
  onDifficultyChange: (difficulty: string) => void;
  tagsFilter: string;
  onTagsChange: (tags: string) => void;
  yearFilter: string;
  onYearChange: (year: string) => void;
  languageFilter: string;
  onLanguageChange: (language: string) => void;
  scopeTypeFilter: string;
  onScopeTypeChange: (scope: string) => void;
  onClearFilters: () => void;
}

export function CodingHeaderSearch({
  searchQuery,
  onSearchChange,
  difficultyFilter,
  onDifficultyChange,
  tagsFilter,
  onTagsChange,
  yearFilter,
  onYearChange,
  languageFilter,
  onLanguageChange,
  scopeTypeFilter,
  onScopeTypeChange,
  onClearFilters,
}: CodingHeaderSearchProps) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isCodingPage = location.pathname === "/coding" || location.pathname === "/coding-problems";

  if (!isCodingPage) return null;

  return (
    <div className="flex items-center gap-2 flex-1 max-w-2xl mx-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search coding problems..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter Problems</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficultyFilter} onValueChange={onDifficultyChange}>
                <SelectTrigger>
                  <SelectValue />
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
                placeholder="e.g., array, string"
                value={tagsFilter}
                onChange={(e) => onTagsChange(e.target.value)}
              />
            </div>
            <div>
              <Label>Year</Label>
              <Select value={yearFilter} onValueChange={onYearChange}>
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label>Language</Label>
              <Select value={languageFilter} onValueChange={onLanguageChange}>
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label>Source</Label>
              <Select value={scopeTypeFilter} onValueChange={onScopeTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="svnapro">SvnaPro</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={onClearFilters} className="w-full">
              Clear Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {location.pathname === "/coding" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/coding-problems")}
          className="h-9 gap-2"
        >
          Browse All
        </Button>
      )}
    </div>
  );
}

