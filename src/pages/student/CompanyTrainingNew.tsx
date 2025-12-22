import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Code2, FileQuestion, MessageSquare, Briefcase, Play, Clock, Zap, Eye, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Company {
  id: number;
  name: string;
  logo_url?: string;
  description?: string;
  website?: string;
  is_active: boolean;
}

interface CompanyRole {
  id: number;
  company_id: number;
  role_name: string;
  description?: string;
  difficulty?: string;
  scope_type: string;
  is_active: boolean;
  company?: Company;
  practice_sections?: PracticeSection[];
}

interface PracticeSection {
  id: number;
  role_id: number;
  section_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  rounds?: Round[];
}

interface Round {
  id: number;
  practice_section_id: number;
  round_type: 'quiz' | 'coding' | 'gd' | 'interview';
  round_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
}

export default function CompanyTrainingNew() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listRoles(undefined, true);
      
      // Debug logging
      console.log("[CompanyTraining] API Response:", response);
      console.log("[CompanyTraining] Response type:", typeof response);
      console.log("[CompanyTraining] Is array?", Array.isArray(response));
      
      // Handle both array and object responses
      let rolesData: CompanyRole[] = [];
      if (Array.isArray(response)) {
        rolesData = response;
        console.log("[CompanyTraining] Parsed as array, length:", rolesData.length);
      } else if (response && typeof response === 'object') {
        // If it's an object, check if it has a data property or is a single role
        if ('data' in response && Array.isArray(response.data)) {
          rolesData = response.data;
          console.log("[CompanyTraining] Found data array, length:", rolesData.length);
        } else if ('id' in response) {
          rolesData = [response as CompanyRole];
          console.log("[CompanyTraining] Single role object found");
        } else {
          console.warn("[CompanyTraining] Unexpected response format:", Object.keys(response));
        }
      }
      
      console.log("[CompanyTraining] Final rolesData:", rolesData);
      setRoles(rolesData);
      
      if (rolesData.length === 0) {
        console.warn("[CompanyTraining] No company training roles found after parsing");
      } else {
        console.log(`[CompanyTraining] Successfully loaded ${rolesData.length} company training roles`);
      }
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load company training roles",
        variant: "destructive",
      });
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-muted";
    }
  };

  const getRoundIcon = (roundType: string) => {
    switch (roundType) {
      case 'quiz': return <FileQuestion className="h-4 w-4" />;
      case 'coding': return <Code2 className="h-4 w-4" />;
      case 'gd': return <MessageSquare className="h-4 w-4" />;
      case 'interview': return <Briefcase className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const handleStartPractice = (roleId: number) => {
    navigate(`/company-training/role/${roleId}`);
  };

  // Get unique companies for filter
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    roles.forEach(role => {
      if (role.company?.name) {
        companies.add(role.company.name);
      }
    });
    return Array.from(companies).sort();
  }, [roles]);

  // Filter roles based on search and filters
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          role.role_name.toLowerCase().includes(query) ||
          role.company?.name?.toLowerCase().includes(query) ||
          role.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Difficulty filter
      if (difficultyFilter !== "all" && role.difficulty?.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // Company filter
      if (companyFilter !== "all" && role.company?.name !== companyFilter) {
        return false;
      }

      return true;
    });
  }, [roles, searchQuery, difficultyFilter, companyFilter]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Company Training</h1>
        <p className="text-muted-foreground">Prepare for your dream company with role-specific training</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles, companies, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        {uniqueCompanies.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {uniqueCompanies.map(company => (
                <SelectItem key={company} value={company}>{company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results count */}
      {filteredRoles.length !== roles.length && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredRoles.length} of {roles.length} roles
        </div>
      )}

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No company training roles available yet</p>
            <p className="text-sm text-muted-foreground">Check back later or contact your administrator</p>
          </CardContent>
        </Card>
      ) : filteredRoles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No roles match your filters</p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("");
              setDifficultyFilter("all");
              setCompanyFilter("all");
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRoles.map((role) => (
            <Card 
            key={role.id} 
            className="coding-problem-card group hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {role.company?.logo_url ? (
                      <img 
                        src={role.company.logo_url} 
                        alt={role.company.name}
                        className="h-10 w-10 object-contain rounded"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{role.company?.name}</p>
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight">{role.role_name}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {role.difficulty && (
                  <Badge className={`${getDifficultyColor(role.difficulty)} text-xs font-medium`} variant="outline">
                    {role.difficulty}
                  </Badge>
                )}
                {role.scope_type === "svnapro" ? (
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
              {role.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                  {role.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Practice
                  </span>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleStartPractice(role.id)}
                  className="gap-2 text-xs sm:text-sm"
                >
                  <Play className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Start Practice</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}

