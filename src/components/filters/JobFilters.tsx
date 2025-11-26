import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  jobType: string;
  onJobTypeChange: (type: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  minCTC: string;
  onMinCTCChange: (ctc: string) => void;
  onClearFilters: () => void;
}

export function JobFilters({
  searchQuery,
  onSearchChange,
  jobType,
  onJobTypeChange,
  location,
  onLocationChange,
  minCTC,
  onMinCTCChange,
  onClearFilters,
}: JobFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const hasActiveFilters = jobType !== "all" || location || minCTC;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, role, or keywords..."
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
                    {[jobType !== "all" && "Type", location && "Location", minCTC && "CTC"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Jobs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Job Type</Label>
                  <Select value={jobType} onValueChange={onJobTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="On-Campus">On-Campus</SelectItem>
                      <SelectItem value="Off-Campus">Off-Campus</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Hyderabad, Remote"
                    value={location}
                    onChange={(e) => onLocationChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Minimum CTC</Label>
                  <Input
                    type="text"
                    placeholder="e.g., ₹10 LPA"
                    value={minCTC}
                    onChange={(e) => onMinCTCChange(e.target.value)}
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
            {jobType !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Type: {jobType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onJobTypeChange("all")}
                />
              </Badge>
            )}
            {location && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Location: {location}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onLocationChange("")}
                />
              </Badge>
            )}
            {minCTC && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Min CTC: {minCTC}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onMinCTCChange("")}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

